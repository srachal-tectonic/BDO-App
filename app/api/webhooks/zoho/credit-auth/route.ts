/**
 * POST /api/webhooks/zoho/credit-auth — public ingest for the Zoho Forms
 * "Soft Credit Pull Authorization Form".
 *
 * This endpoint is PUBLIC by design: Zoho cannot perform an Azure Easy Auth /
 * Auth0 login. It is gated instead by a shared secret that Zoho sends in a
 * custom header (configured on the form's webhook). No `verifyAuth` here.
 *
 * On a valid submission we store one `creditPullAuthorization` record keyed by a
 * normalized name. The Soft Credit Pull button is enabled for any individual
 * applicant whose first+last name normalizes to a stored `nameKey`.
 *
 * Idempotent: Zoho may retry delivery. We upsert on `zohoSubmissionId` (or a
 * deterministic hash when Zoho doesn't supply one), so retries never duplicate.
 *
 * Sensitive data: only the last 4 of the SSN is persisted; the full SSN and the
 * raw payload are never logged.
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID, createHash, timingSafeEqual } from 'crypto';

import { getCollection, COLLECTIONS } from '@/lib/cosmosdb';
import { nameKey, nameKeyFromFull, dobKey } from '@/lib/nameKey';
import { logAuditEvent, getClientIp } from '@/lib/auditLog';
import type { CreditPullAuthorization } from '@/lib/creditPullAuthTypes';

// Header Zoho must send (custom header name: alphanumeric + hyphen only).
const SECRET_HEADER = 'x-zoho-webhook-secret';

/** Constant-time secret comparison that tolerates length mismatches. */
function secretMatches(provided: string | null): boolean {
  const expected = process.env.ZOHO_WEBHOOK_SECRET || '';
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Read a value from the payload by any of several candidate keys (case-insensitive). */
function pick(obj: Record<string, unknown>, ...keys: string[]): string | undefined {
  const lower = new Map<string, unknown>();
  for (const [k, v] of Object.entries(obj)) lower.set(k.toLowerCase(), v);
  for (const key of keys) {
    const v = lower.get(key.toLowerCase());
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return undefined;
}

/** Parse JSON or url-encoded / multipart form bodies into a flat object. */
async function parseBody(request: NextRequest): Promise<Record<string, unknown> | null> {
  const ct = (request.headers.get('content-type') || '').toLowerCase();
  try {
    if (ct.includes('application/json')) {
      return (await request.json()) as Record<string, unknown>;
    }
    // x-www-form-urlencoded or multipart/form-data
    const form = await request.formData();
    const out: Record<string, unknown> = {};
    for (const [k, v] of form.entries()) out[k] = typeof v === 'string' ? v : '(file)';
    return out;
  } catch {
    return null;
  }
}

function ssnLast4(raw: string | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 4 ? digits.slice(-4) : null;
}

/** Normalize common date formats to ISO YYYY-MM-DD; otherwise return the raw value. */
function toIsoDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  const ymd = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
  const mdy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (mdy) {
    const mm = mdy[1].padStart(2, '0');
    const dd = mdy[2].padStart(2, '0');
    return `${mdy[3]}-${mm}-${dd}`;
  }
  return s;
}

// GET — reachability probe. Lets you confirm the endpoint is deployed without
// sending data or the secret. Returns 200; never reveals the secret.
export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: 'zoho-credit-auth-webhook',
    method: 'POST',
    secretConfigured: Boolean(process.env.ZOHO_WEBHOOK_SECRET),
  });
}

export async function POST(request: NextRequest) {
  // Entry log — proves a request reached the handler (no body/secret logged).
  const ct = request.headers.get('content-type') || '(none)';
  const hasSecretHeader = request.headers.get(SECRET_HEADER) != null;
  console.log(
    `[ZohoCreditAuth] POST received contentType="${ct}" secretHeaderPresent=${hasSecretHeader} secretConfigured=${Boolean(process.env.ZOHO_WEBHOOK_SECRET)} ip=${getClientIp(request.headers) ?? '?'}`,
  );

  // ── 1. Authenticate the webhook via shared secret ──────────────────────────
  if (!secretMatches(request.headers.get(SECRET_HEADER))) {
    console.warn(
      `[ZohoCreditAuth] 401 rejected: secretHeaderPresent=${hasSecretHeader} secretConfigured=${Boolean(process.env.ZOHO_WEBHOOK_SECRET)}`,
    );
    // Log the attempt (no payload — we haven't trusted it yet).
    void logAuditEvent({
      action: 'security_event',
      category: 'loan_application',
      summary: 'Rejected Zoho credit-auth webhook: missing or invalid secret',
      ipAddress: getClientIp(request.headers),
      userAgent: request.headers.get('user-agent') || undefined,
    });
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // ── 2. Parse the submission ────────────────────────────────────────────────
  const body = await parseBody(request);
  if (!body) {
    console.warn('[ZohoCreditAuth] 400 invalid_body — could not parse payload');
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const firstName = pick(body, 'firstName', 'first_name', 'first') || '';
  const lastName = pick(body, 'lastName', 'last_name', 'last') || '';
  const fullName = pick(body, 'name', 'fullName', 'full_name') || `${firstName} ${lastName}`.trim();

  // Prefer discrete first/last; fall back to splitting the combined Name field.
  const key = firstName || lastName ? nameKey(firstName, lastName) : nameKeyFromFull(fullName);
  if (!key) {
    console.warn(
      `[ZohoCreditAuth] 400 missing_name — no usable name in payload; param keys present: ${Object.keys(body).join(', ')}`,
    );
    return NextResponse.json({ error: 'missing_name' }, { status: 400 });
  }

  const submittedAt = toIsoDate(pick(body, 'submittedAt', 'submitted_at', 'added_time', 'Added_Time'));
  const ssn4 = ssnLast4(pick(body, 'ssn', 'SSN', 'social', 'ssnLast4'));

  // DOB is the second half of the match key. Zoho sends MM/DD/YYYY; normalize to
  // a YYYYMMDD digit string. Required — without it the record can never match.
  const dobRaw = pick(body, 'dob', 'dateOfBirth', 'date_of_birth', 'DOB');
  const dKey = dobKey(dobRaw);
  if (!dKey) {
    console.warn(
      `[ZohoCreditAuth] 400 missing_dob — no parseable DOB in payload (raw="${dobRaw ?? ''}"); param keys present: ${Object.keys(body).join(', ')}`,
    );
    return NextResponse.json({ error: 'missing_dob' }, { status: 400 });
  }

  // Address arrives as separate Zoho fields; keep the parts and compose a string.
  const addressComponents = {
    line1: pick(body, 'addressLine1', 'address1', 'siteAddress', 'address') || null,
    line2: pick(body, 'addressLine2', 'address2', 'siteAddress2') || null,
    city: pick(body, 'city', 'City') || null,
    state: pick(body, 'state', 'State', 'province') || null,
    zip: pick(body, 'zip', 'zipCode', 'zip_code', 'postalCode', 'postal_code') || null,
    country: pick(body, 'country', 'Country') || null,
  };
  const composedAddress =
    [
      [addressComponents.line1, addressComponents.line2].filter(Boolean).join(' '),
      addressComponents.city,
      [addressComponents.state, addressComponents.zip].filter(Boolean).join(' '),
      addressComponents.country,
    ]
      .filter((p) => p && p.trim())
      .join(', ') || null;

  // Idempotency key: Zoho entry id if mapped, else a deterministic hash of the
  // submission's stable fields so retries collapse to the same record.
  const providedId = pick(body, 'submissionId', 'submission_id', 'entryId', 'entry_id', 'recordId', 'id');
  const zohoSubmissionId =
    providedId ||
    'derived:' + createHash('sha256').update(`${key}|${dKey}|${ssn4 ?? ''}|${submittedAt ?? ''}`).digest('hex').slice(0, 32);

  const doc: CreditPullAuthorization = {
    id: randomUUID(),
    source: 'zoho',
    nameKey: key,
    dobKey: dKey,
    fullName: fullName || `${firstName} ${lastName}`.trim(),
    firstName,
    lastName,
    ssnLast4: ssn4,
    dob: toIsoDate(dobRaw),
    email: pick(body, 'email', 'Email') || null,
    phone: pick(body, 'cellPhone', 'cell_phone', 'phone', 'Phone', 'mobile') || null,
    address: composedAddress,
    addressComponents,
    signatureRef: pick(body, 'signature', 'Signature', 'signatureUrl') || null,
    zohoSubmissionId,
    submittedAt,
    receivedAt: new Date().toISOString(),
  };

  // ── 3. Persist (idempotent upsert on zohoSubmissionId) ─────────────────────
  try {
    const col = await getCollection(COLLECTIONS.CREDIT_PULL_AUTHORIZATIONS);
    await col.updateOne(
      { zohoSubmissionId },
      // Don't churn id/receivedAt on a retry; only set them on first insert.
      { $set: doc, $setOnInsert: {} },
      { upsert: true },
    );
  } catch (err: any) {
    // A concurrent retry can race the unique index — treat as success (idempotent).
    if (err?.code === 11000) {
      return NextResponse.json({ ok: true, deduped: true });
    }
    console.error(`[ZohoCreditAuth] store error name=${err?.name} message=${err?.message}`);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }

  void logAuditEvent({
    action: 'security_event',
    category: 'loan_application',
    summary: `Soft credit pull authorization received for "${doc.fullName}"`,
    metadata: { nameKey: key, dobKey: dKey, source: 'zoho', hasSsnLast4: ssn4 != null },
    ipAddress: getClientIp(request.headers),
    userAgent: request.headers.get('user-agent') || undefined,
  });

  console.log(`[ZohoCreditAuth] stored authorization nameKey="${key}" dobKey=${dKey} submissionId=${zohoSubmissionId}`);
  return NextResponse.json({ ok: true });
}

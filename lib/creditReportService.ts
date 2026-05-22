/**
 * Credit pull service for Soft Pull Solutions (SPS) — ported from the
 * Replit `server/lib/creditReportService.ts`.
 *
 * Legacy URL-encoded API: a single POST to `SPS_BASE_URL` with credentials
 * (ACCOUNT, PASSWD) in the body. No bearer token, no path. Response is XML
 * (per SPS confirmation); a JSON parser is kept as defensive fallback in
 * case the account is later switched to JSON output.
 *
 * Codebase deltas vs. the Replit source:
 *   - No Zod here. Env vars are checked at call time with an inline assert;
 *     request re-validation is skipped because `app/api/credit-pull/route.ts`
 *     already runs `validateCreditPullRequest()` before calling in.
 *   - Identity hash recipe matches Replit exactly (`firstName|lastName|ssn`).
 *
 * Compliance reminders:
 *   - Caller MUST have collected consumer authorization before calling.
 *   - `permissiblePurpose` must be valid under FCRA section 604.
 *   - Never log the request body or the raw response (contains SSN, PII,
 *     financial data). Only the size in bytes is persisted.
 *
 * Required env vars (already set in Azure App Service per slot; see
 * `.env.local.example` for local-dev placeholders):
 *   SPS_BASE_URL    SoftPullSolutions endpoint URL (the legacy API POSTs
 *                   straight to the base URL — no resource path appended)
 *   SPS_ACCOUNT     account credential (sent as `ACCOUNT` form field)
 *   SPS_PASSWORD    paired secret (sent as `PASSWD` form field)
 */

import { createHash } from 'crypto';
import { XMLParser } from 'fast-xml-parser';
import type {
  Bureau,
  CreditPullRequest,
  CreditPullResult,
} from '@/lib/creditPullTypes';

// ─── Exception classes ─────────────────────────────────────────────────────
// Shared base so callers can `instanceof CreditPullError` for a catch-all,
// then narrow to the specific subclass for HTTP-code mapping.

export class CreditPullError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'CreditPullError';
  }
}

export class CreditPullNetworkError extends CreditPullError {
  constructor(cause?: unknown) {
    super('Failed to reach credit bureau service', cause);
    this.name = 'CreditPullNetworkError';
  }
}

export class CreditPullValidationError extends CreditPullError {
  constructor(message: string) {
    super(message);
    this.name = 'CreditPullValidationError';
  }
}

export class CreditPullAuthError extends CreditPullError {
  constructor() {
    super('SPS credentials are invalid or inactive');
    this.name = 'CreditPullAuthError';
  }
}

export class CreditPullServiceError extends CreditPullError {
  constructor(message: string) {
    super(message);
    this.name = 'CreditPullServiceError';
  }
}

// ─── Env resolution ────────────────────────────────────────────────────────
// Resolved lazily so a misconfigured slot surfaces as a clear service error
// at call time, not at module-import time (which would crash the route).

interface SpsEnv {
  baseUrl: string;
  account: string;
  password: string;
}

function readEnv(): SpsEnv {
  const baseUrl = process.env.SPS_BASE_URL;
  const account = process.env.SPS_ACCOUNT;
  const password = process.env.SPS_PASSWORD;
  if (!baseUrl || !account || !password) {
    throw new CreditPullServiceError(
      'SPS environment is not configured (SPS_BASE_URL, SPS_ACCOUNT, SPS_PASSWORD).',
    );
  }
  return { baseUrl, account, password };
}

// ─── Identity hash ─────────────────────────────────────────────────────────
// SHA-256 over the consumer's identifying triple. Used to dedupe / correlate
// pulls of the same person across attempts without persisting raw PII beyond
// the masked SSN in the response payload.

export function computeConsumerIdentityHash(input: {
  firstName: string;
  lastName: string;
  ssn: string;
}): string {
  return createHash('sha256')
    .update(`${input.firstName.toLowerCase()}|${input.lastName.toLowerCase()}|${input.ssn}`)
    .digest('hex');
}

// ─── Pull entry point ──────────────────────────────────────────────────────

export interface PullCreditReportInput extends CreditPullRequest {
  initiatedByUserId: string;
}

export interface PullCreditReportOutput {
  result: CreditPullResult;
  consumerIdentityHash: string;
  /** Raw SPS response — kept for in-memory debugging only; NOT persisted. */
  rawResponse: string;
  /** Persisted into `rawReportSizeBytes` for capacity-planning visibility. */
  rawResponseSizeBytes: number;
}

export async function pullCreditReport(
  input: PullCreditReportInput,
): Promise<PullCreditReportOutput> {
  const env = readEnv();
  const consumerIdentityHash = computeConsumerIdentityHash(input);
  const body = buildLegacyInquiryBody(input, env);

  let response: Response;
  try {
    response = await fetch(env.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json, text/xml, text/html',
      },
      body: body.toString(),
    });
  } catch (e) {
    throw new CreditPullNetworkError(e);
  }

  const rawResponse = await response.text();

  if (response.status === 400) {
    throw new CreditPullValidationError('SPS rejected the request as malformed');
  }
  if (response.status === 401 || response.status === 403) {
    throw new CreditPullAuthError();
  }
  if (response.status === 405) {
    throw new CreditPullServiceError(
      'SPS endpoint returned 405 Method Not Allowed. The configured hostname is not accepting POST. Contact SPS support to confirm the correct API URL for this account.',
    );
  }
  if (response.status >= 500) {
    throw new CreditPullServiceError(`SPS server error: ${response.status}`);
  }
  if (response.status !== 200) {
    throw new CreditPullServiceError(`Unexpected HTTP status: ${response.status}`);
  }

  const result = parseSpsResponse(rawResponse, input.bureau);

  return {
    result,
    consumerIdentityHash,
    rawResponse,
    rawResponseSizeBytes: Buffer.byteLength(rawResponse, 'utf8'),
  };
}

/**
 * Legacy URL-encoded body per SPS User Guide. Field names are UPPERCASE.
 * Credentials (ACCOUNT, PASSWD) live in the body, not in an Authorization header.
 */
function buildLegacyInquiryBody(req: CreditPullRequest, env: SpsEnv): URLSearchParams {
  const body = new URLSearchParams({
    ACCOUNT: env.account,
    PASSWD: env.password,
    PASS: '2',
    PROCESS: 'PCCREDIT',
    PRODUCT: 'CREDIT',
    BUREAU: req.bureau,
    SPLITNAME: '1',
    NAMEFIRST: req.firstName.toUpperCase(),
    NAMELAST: req.lastName.toUpperCase(),
    ADDRESS: req.address.toUpperCase(),
    CITY: req.city.toUpperCase(),
    STATE: req.state,
    ZIP: req.zip,
    SSN: req.ssn,
  });

  if (req.middleName) body.set('NAMEMIDDLE', req.middleName.toUpperCase());
  if (req.generation) body.set('NAMEGEN', req.generation.toUpperCase());
  if (req.dob) body.set('DOB', req.dob);

  return body;
}

// ─── Response parsing ──────────────────────────────────────────────────────

function emptyResult(bureau: Bureau, errorCode: string, errorMessage: string): CreditPullResult {
  return {
    success: false,
    isHit: false,
    bureau,
    transactionId: null,
    reportDate: null,
    ssnMatchCode: null,
    ssnMatchValue: null,
    score: null,
    scoreModel: null,
    scoreReasons: [],
    publicRecords: null,
    collections: null,
    negativeTrades: null,
    totalTrades: null,
    inquiries: null,
    ofacStatus: null,
    errorCode,
    errorMessage,
  };
}

/** Coerce a value to a finite number or null. Handles strings ("700"), nums, blanks. */
function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const t = v.trim();
    if (t === '') return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Coerce to non-empty string or null. */
function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length === 0 ? null : s;
}

/** Coerce to boolean. SPS uses "true"/"false" strings as well as native bools. */
function bool(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return v.trim().toLowerCase() === 'true';
  return false;
}

/** Always return an array, treating null/undefined as empty and single objects as singletons. */
function asArray<T = any>(v: unknown): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? (v as T[]) : [v as T];
}

/**
 * Detect whether the response is XML or JSON and route to the appropriate parser.
 * Per SPS confirmation, the legacy PCCREDIT API returns XML; JSON parsing is
 * kept as a defensive fallback in case the account is switched to JSON output.
 */
function parseSpsResponse(rawResponse: string, bureau: Bureau): CreditPullResult {
  const trimmed = rawResponse.trimStart();
  if (trimmed.startsWith('<')) return parseSpsXmlResponse(rawResponse, bureau);
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return parseSpsJsonResponse(rawResponse, bureau);
  }
  return emptyResult(
    bureau,
    'UNRECOGNIZED_RESPONSE',
    'SPS response was neither XML nor JSON. Confirm account output type with SPS support.',
  );
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseAttributeValue: true,
  parseTagValue: true,
  trimValues: true,
  // Treat these tags as arrays even when only one occurs, so iteration is uniform.
  isArray: (name) =>
    ['subject', 'score', 'factor', 'publicRecord', 'collection', 'trade', 'inquiry'].includes(name),
});

/**
 * Map the SPS XML response to CreditPullResult.
 *
 * SPS XML mirrors the documented JSON schema. The structure may use either
 * child elements (`<code>Y</code>`) or attributes (`code="Y"`) for the same
 * datum depending on the bureau / account configuration, so we read both.
 */
function parseSpsXmlResponse(rawResponse: string, bureau: Bureau): CreditPullResult {
  let parsed: any;
  try {
    parsed = xmlParser.parse(rawResponse);
  } catch (e: any) {
    return emptyResult(
      bureau,
      'XML_PARSE_ERROR',
      `SPS XML response could not be parsed: ${e?.message ?? 'unknown'}`,
    );
  }

  // Root element name is unknown — unwrap whatever single top-level element exists.
  const rootKey = Object.keys(parsed).find((k) => !k.startsWith('@_'));
  const root = rootKey ? parsed[rootKey] : parsed;
  if (!root || typeof root !== 'object') {
    return emptyResult(bureau, 'XML_EMPTY_RESPONSE', 'SPS XML response had no usable root element.');
  }

  const isError = bool(root.isError ?? root['@_isError']);
  const transactionId = str(root.hctTransactionId ?? root['@_hctTransactionId']);
  const reportDate = str(root.reportDate ?? root['@_reportDate']);

  // `subjects` may be wrapped as <subjects><subject>...</subject></subjects>
  const subjectsContainer = root.subjects ?? null;
  const subjects = asArray<any>(subjectsContainer?.subject ?? subjectsContainer ?? []);
  const subject = subjects[0] ?? null;

  // hitIndicator: either <hitIndicator code="Y"/> or <hitIndicator><code>Y</code></hitIndicator>
  const header = subject?.subjectHeader ?? null;
  const hitCode = str(header?.hitIndicator?.code ?? header?.hitIndicator?.['@_code']);
  const isHit = hitCode === 'Y';

  const ssnMatchCode = str(
    header?.ssnMatchIndicator?.code ?? header?.ssnMatchIndicator?.['@_code'],
  );
  const ssnMatchValue = str(
    header?.ssnMatchIndicator?.value ?? header?.ssnMatchIndicator?.['@_value'],
  );

  const scoresContainer = subject?.scores ?? null;
  const scores = asArray<any>(scoresContainer?.score ?? scoresContainer ?? []);
  const firstScored = scores.find((s) => bool(s?.notScored) === false) ?? scores[0];
  const score = num(firstScored?.score ?? firstScored?.['@_score']);
  const scoreModel = str(
    firstScored?.model?.text ??
      firstScored?.model?.code ??
      firstScored?.model?.['@_text'] ??
      firstScored?.model?.['@_code'],
  );
  const factorsContainer = firstScored?.factors ?? null;
  const factors = asArray<any>(factorsContainer?.factor ?? factorsContainer ?? []);
  const scoreReasons: string[] = factors
    .map((f) => str(f?.text ?? f?.['@_text'] ?? f))
    .filter((t): t is string => !!t);

  const summary = subject?.bureauCreditSummary ?? {};
  const ofacStatus = str(
    subject?.ofacSearch?.searchStatus?.value ?? subject?.ofacSearch?.searchStatus?.['@_value'],
  );

  return {
    success: !isError,
    isHit,
    bureau,
    transactionId,
    reportDate,
    ssnMatchCode,
    ssnMatchValue,
    score,
    scoreModel,
    scoreReasons,
    publicRecords: num(summary?.publicRecords),
    collections: num(summary?.collections),
    negativeTrades: num(summary?.negativeTrades),
    totalTrades: num(summary?.trades),
    inquiries: num(summary?.inquiries),
    ofacStatus,
    errorCode: isError ? 'BUREAU_ERROR' : null,
    errorMessage: isError
      ? 'Bureau returned an error response. Inspect raw response for details.'
      : null,
  };
}

function parseSpsJsonResponse(rawResponse: string, bureau: Bureau): CreditPullResult {
  let parsed: any;
  try {
    parsed = JSON.parse(rawResponse);
  } catch {
    return emptyResult(
      bureau,
      'NON_JSON_RESPONSE',
      'SPS response was not JSON. Confirm account output type with SPS support.',
    );
  }

  const isError = parsed?.isError === true;
  const transactionId = parsed?.hctTransactionId ? String(parsed.hctTransactionId) : null;
  const reportDate = parsed?.reportDate ?? null;

  const subject = Array.isArray(parsed?.subjects) ? parsed.subjects[0] : null;
  const isHit = subject?.subjectHeader?.hitIndicator?.code === 'Y';

  const scores: any[] = Array.isArray(subject?.scores) ? subject.scores : [];
  const firstScored = scores.find((s) => s?.notScored === false) ?? scores[0];
  const score = typeof firstScored?.score === 'number' ? firstScored.score : null;
  const scoreModel = firstScored?.model?.text ?? firstScored?.model?.code ?? null;
  const scoreReasons: string[] = Array.isArray(firstScored?.factors)
    ? firstScored.factors
        .map((f: any) => f?.text)
        .filter((t: unknown): t is string => typeof t === 'string' && t.length > 0)
    : [];

  const summary = subject?.bureauCreditSummary ?? {};
  const ofacStatus = subject?.ofacSearch?.searchStatus?.value ?? null;

  return {
    success: !isError,
    isHit,
    bureau,
    transactionId,
    reportDate,
    ssnMatchCode: subject?.subjectHeader?.ssnMatchIndicator?.code ?? null,
    ssnMatchValue: subject?.subjectHeader?.ssnMatchIndicator?.value ?? null,
    score,
    scoreModel,
    scoreReasons,
    publicRecords:
      typeof summary?.publicRecords === 'number' ? summary.publicRecords : null,
    collections: typeof summary?.collections === 'number' ? summary.collections : null,
    negativeTrades:
      typeof summary?.negativeTrades === 'number' ? summary.negativeTrades : null,
    totalTrades: typeof summary?.trades === 'number' ? summary.trades : null,
    inquiries: typeof summary?.inquiries === 'number' ? summary.inquiries : null,
    ofacStatus,
    errorCode: isError ? 'BUREAU_ERROR' : null,
    errorMessage: isError
      ? 'Bureau returned an error response. Inspect raw response for details.'
      : null,
  };
}

/**
 * /api/credit-pull — Soft Credit Pull endpoints (SoftPullSolutions adapter).
 *
 * Ported from the Replit `server/routes.ts` Postgres implementation onto
 * Cosmos DB (MongoDB API). The HTTP contract — request body, response
 * shape, and error codes (`bureau_auth_failed`, `bureau_rejected_request`,
 * `bureau_unreachable`, `bureau_service_error`, `internal_error`,
 * `validation_failed`, `projectId_required`) — matches the source so the
 * front-end's `ERROR_COPY` map keeps working unchanged.
 *
 * Auth: all calls require an authenticated BDO staff user. The Replit
 * `x-staff-user` fallback ("staff") is intentionally NOT carried over;
 * `verifyAuth()` is the only path in.
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

import { verifyAuth, unauthorizedResponse } from '@/lib/apiAuth';
import { getCollection, COLLECTIONS } from '@/lib/cosmosdb';
import { validateCreditPullRequest } from '@/lib/creditPullTypes';
import type { CreditPullRow } from '@/lib/creditPullTypes';
import {
  pullCreditReport,
  CreditPullAuthError,
  CreditPullValidationError,
  CreditPullNetworkError,
  CreditPullServiceError,
} from '@/lib/creditReportService';

// Strip Mongo's _id before returning rows to the client.
function rowFromDoc(doc: any): CreditPullRow {
  const { _id, ...rest } = doc;
  return rest as CreditPullRow;
}

// ─── POST /api/credit-pull ─────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const authResult = await verifyAuth(request);
  if (!authResult.authenticated || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }
  const initiatedByUserId = authResult.user.email || authResult.user.uid;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parseResult = validateCreditPullRequest(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'validation_failed', issues: parseResult.issues },
      { status: 400 },
    );
  }
  const input = parseResult.data;

  const startedAt = Date.now();
  // Always trust the server clock for the attestation timestamp (FCRA audit trail).
  const consumerAuthorizedAt = new Date().toISOString();

  try {
    const { result, consumerIdentityHash, rawResponseSizeBytes } = await pullCreditReport({
      ...input,
      initiatedByUserId,
    });

    const reportDate = result.reportDate ? new Date(result.reportDate) : null;
    const safeReportDate =
      reportDate && !isNaN(reportDate.getTime()) ? reportDate.toISOString() : null;

    const pullId = randomUUID();
    const row: CreditPullRow = {
      id: pullId,
      projectId: input.projectId ?? null,
      applicantId: input.applicantId ?? null,
      initiatedByUserId,

      bureau: input.bureau,
      permissiblePurpose: input.permissiblePurpose,
      consumerAuthorizedAt,
      consumerAuthorizationRef: input.consumerAuthorizationRef ?? null,

      consumerIdentityHash,

      success: result.success,
      isHit: result.isHit,
      transactionId: result.transactionId,
      reportDate: safeReportDate,

      score: result.score,
      scoreModel: result.scoreModel,
      ssnMatchCode: result.ssnMatchCode,
      ofacStatus: result.ofacStatus,
      parsedSummary: result,

      errorCode: result.errorCode,
      errorMessage: result.errorMessage,

      // Raw SPS response is never persisted (FCRA / PII). Size is tracked
      // separately for capacity-planning visibility.
      rawReportRef: null,
      rawReportSizeBytes: rawResponseSizeBytes,

      pulledAt: new Date().toISOString(),
    };

    const col = await getCollection(COLLECTIONS.CREDIT_PULLS);
    await col.insertOne(row);

    console.log(
      `[CreditPull] pullId=${pullId} bureau=${input.bureau} success=${result.success} isHit=${result.isHit} elapsedMs=${Date.now() - startedAt}`,
    );

    return NextResponse.json({ pullId, result });
  } catch (err: any) {
    const elapsedMs = Date.now() - startedAt;
    console.error(
      `[CreditPull] bureau=${input.bureau} error=${err?.name ?? 'UnknownError'} message=${err?.message ?? '(no message)'} elapsedMs=${elapsedMs}`,
    );
    if (err instanceof CreditPullAuthError) {
      return NextResponse.json({ error: 'bureau_auth_failed' }, { status: 502 });
    }
    if (err instanceof CreditPullValidationError) {
      return NextResponse.json({ error: 'bureau_rejected_request' }, { status: 400 });
    }
    if (err instanceof CreditPullNetworkError) {
      return NextResponse.json({ error: 'bureau_unreachable' }, { status: 504 });
    }
    if (err instanceof CreditPullServiceError) {
      return NextResponse.json(
        { error: 'bureau_service_error', message: err.message },
        { status: 502 },
      );
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

// ─── GET /api/credit-pull?projectId=...&applicantId=... ────────────────────
// Returns the list of pulls for a project (optionally filtered to one
// applicant), newest first. `projectId` is required to prevent cross-project
// scans — matches the Replit behavior.
export async function GET(request: NextRequest) {
  const authResult = await verifyAuth(request);
  if (!authResult.authenticated || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId') || '';
  const applicantId = searchParams.get('applicantId') || '';

  if (!projectId) {
    return NextResponse.json({ error: 'projectId_required' }, { status: 400 });
  }

  try {
    const col = await getCollection(COLLECTIONS.CREDIT_PULLS);
    const filter: Record<string, unknown> = { projectId };
    if (applicantId) filter.applicantId = applicantId;
    const rows = await col
      .find(filter)
      .sort({ pulledAt: -1 })
      .toArray();
    return NextResponse.json(rows.map(rowFromDoc));
  } catch (err: any) {
    console.error(`[CreditPull] list error name=${err?.name} message=${err?.message}`);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

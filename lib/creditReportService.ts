/**
 * Credit pull service for Soft Pull Solutions (SPS).
 *
 * Bearer-token REST API. Two endpoints, both on the same host:
 *
 *   POST {SPS_BASE_URL}/api/Authentication/AuthenticationToken
 *     - Headers: Content-Type: application/json
 *     - Body:    {"userName": "...", "password": "..."}
 *     - Returns: bearer token (defensively parsed — see `parseAuthResponse`)
 *
 *   POST {SPS_BASE_URL}/api/CreditReport/standardInquiry
 *     - Headers: Authorization: Bearer <token>,
 *                Content-Type: application/x-www-form-urlencoded
 *     - Body:    Pass=2&Product=CREDIT&Bureau=...&NameFirst=...&... (PascalCase)
 *     - Returns: XML (we request `Rbp_Output=XML` explicitly)
 *
 * `SPS_BASE_URL` is the host root (e.g. https://reports.softpullsolutions.com).
 * Path segments are appended here, not in env.
 *
 * Compliance reminders:
 *   - Caller MUST have collected consumer authorization before calling.
 *   - `permissiblePurpose` must be valid under FCRA section 604.
 *   - Never log the request body or the raw response (contains SSN, PII,
 *     financial data). Only response size in bytes is persisted.
 */

import { createHash } from 'crypto';
import { XMLParser } from 'fast-xml-parser';
import type {
  Bureau,
  CreditPullRequest,
  CreditPullResult,
  CreditPullScoreModel,
  CreditPullSummaryByType,
} from '@/lib/creditPullTypes';

// ─── Exception classes ─────────────────────────────────────────────────────

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

interface SpsEnv {
  baseUrl: string;
  account: string;
  password: string;
}

function readEnv(): SpsEnv {
  // .trim() defends against trailing whitespace/newlines accidentally pasted
  // into Azure App Service Configuration values. Trailing slashes are stripped
  // so callers can safely concat `${baseUrl}/api/...`.
  const baseUrl = process.env.SPS_BASE_URL?.trim().replace(/\/+$/, '');
  const account = process.env.SPS_ACCOUNT?.trim();
  const password = process.env.SPS_PASSWORD?.trim();
  if (!baseUrl || !account || !password) {
    throw new CreditPullServiceError(
      'SPS environment is not configured (SPS_BASE_URL, SPS_ACCOUNT, SPS_PASSWORD).',
    );
  }
  return { baseUrl, account, password };
}

// ─── Token cache ───────────────────────────────────────────────────────────
// Module-scoped, per-process. Concurrent first-callers may each fetch a token;
// the last write wins. That's wasteful but not incorrect — coalescing is a
// future optimization, not a correctness fix.

const REFRESH_SAFETY_MS = 60_000;
const DEFAULT_TOKEN_LIFETIME_MS = 50 * 60_000;

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getToken(env: SpsEnv, force = false): Promise<string> {
  const now = Date.now();
  if (!force && cachedToken && cachedToken.expiresAt - REFRESH_SAFETY_MS > now) {
    return cachedToken.token;
  }

  const url = `${env.baseUrl}/api/Authentication/AuthenticationToken`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: '*/*',
      },
      body: JSON.stringify({ userName: env.account, password: env.password }),
      redirect: 'manual',
    });
  } catch (e) {
    throw new CreditPullNetworkError(e);
  }

  const rawAuth = await response.text();

  if (response.status < 200 || response.status >= 300) {
    logNon2xx(url, response, rawAuth);
  }

  if (response.status === 401 || response.status === 403) {
    throw new CreditPullAuthError();
  }
  if (response.status === 404) {
    throw new CreditPullServiceError(
      `SPS auth endpoint not found at ${response.url || url}. ` +
        'Confirm SPS_BASE_URL is the host root (e.g. https://reports.softpullsolutions.com).',
    );
  }
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('location') || '(no Location header)';
    throw new CreditPullServiceError(
      `SPS auth returned HTTP ${response.status} redirect to ${location}.`,
    );
  }
  if (response.status >= 500) {
    throw new CreditPullServiceError(`SPS auth server error: ${response.status}`);
  }
  if (response.status !== 200) {
    throw new CreditPullServiceError(`SPS auth unexpected HTTP status: ${response.status}`);
  }

  const { token, expiresInSec } = parseAuthResponse(rawAuth);
  const lifetimeMs = expiresInSec != null ? expiresInSec * 1000 : DEFAULT_TOKEN_LIFETIME_MS;
  cachedToken = { token, expiresAt: now + lifetimeMs };
  return token;
}

/**
 * Tolerant of three response shapes since the Postman collection didn't
 * pin the response down:
 *   1. JSON object — read `token | accessToken | access_token | Token`,
 *      optionally nested under `data`. Expiry: `expiresIn | expires_in`.
 *   2. JSON-string-quoted token: `"eyJ..."`.
 *   3. Plain string token: `eyJ...`.
 * Throws CreditPullServiceError if none of those yields a non-empty token.
 */
function parseAuthResponse(raw: string): { token: string; expiresInSec: number | null } {
  const trimmed = raw.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    let parsed: any;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      throw new CreditPullServiceError('SPS auth response was malformed JSON');
    }
    const token =
      parsed?.token ??
      parsed?.accessToken ??
      parsed?.access_token ??
      parsed?.Token ??
      parsed?.data?.token ??
      parsed?.data?.accessToken;
    if (typeof token !== 'string' || token.length === 0) {
      throw new CreditPullServiceError(
        'SPS auth response did not include a recognisable token field',
      );
    }
    const expiry =
      parsed?.expiresIn ??
      parsed?.expires_in ??
      parsed?.data?.expiresIn ??
      parsed?.data?.expires_in;
    let expiresInSec: number | null = null;
    if (typeof expiry === 'number' && Number.isFinite(expiry)) {
      expiresInSec = expiry;
    } else if (typeof expiry === 'string' && Number.isFinite(Number(expiry))) {
      expiresInSec = Number(expiry);
    }
    return { token, expiresInSec };
  }
  const unquoted = trimmed.replace(/^"|"$/g, '');
  if (unquoted.length === 0) {
    throw new CreditPullServiceError('SPS auth response was empty');
  }
  return { token: unquoted, expiresInSec: null };
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

  // First attempt with cached/fresh token. On 401, invalidate and retry once
  // with a freshly minted token — covers the case where SPS rotated keys or
  // our cached token expired earlier than DEFAULT_TOKEN_LIFETIME_MS estimated.
  let attempt = await postInquiry(env, input, await getToken(env));
  if (attempt.response.status === 401) {
    cachedToken = null;
    attempt = await postInquiry(env, input, await getToken(env, true));
  }

  const { response, rawResponse } = attempt;
  const inquiryUrl = `${env.baseUrl}/api/CreditReport/standardInquiry`;

  if (response.status < 200 || response.status >= 300) {
    logNon2xx(inquiryUrl, response, rawResponse);
  }

  if (response.status === 400) {
    throw new CreditPullValidationError('SPS rejected the request as malformed');
  }
  if (response.status === 401 || response.status === 403) {
    throw new CreditPullAuthError();
  }
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('location') || '(no Location header)';
    throw new CreditPullServiceError(
      `SPS returned HTTP ${response.status} redirect to ${location} on the inquiry call.`,
    );
  }
  if (response.status === 404) {
    throw new CreditPullServiceError(
      `SPS endpoint returned 404 at ${response.url || inquiryUrl}. ` +
        'Confirm SPS_BASE_URL is the host root and the account has standardInquiry access.',
    );
  }
  if (response.status === 405) {
    throw new CreditPullServiceError(
      'SPS endpoint returned 405 Method Not Allowed on standardInquiry. Contact SPS support.',
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

async function postInquiry(
  env: SpsEnv,
  input: PullCreditReportInput,
  token: string,
): Promise<{ response: Response; rawResponse: string }> {
  const url = `${env.baseUrl}/api/CreditReport/standardInquiry`;
  const body = buildInquiryBody(input);
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json, text/xml, text/html',
        Authorization: `Bearer ${token}`,
      },
      body: body.toString(),
      redirect: 'manual',
    });
  } catch (e) {
    throw new CreditPullNetworkError(e);
  }
  const rawResponse = await response.text();
  return { response, rawResponse };
}

/**
 * PascalCase form body per `pdfs/credit-report-openapi.json`:
 * `/api/CreditReport/standardInquiry` request body. Credentials are NOT in
 * the body — they go through the bearer token.
 *
 * `Rbp_Output=XML` is kept for forward-compatibility with the RBP-letter
 * flow (it pairs with `Rbp_Letter=1` / `Rbp_Print=1`). It does NOT control
 * the credit-report response format — that's set per-account by SPS support.
 */
function buildInquiryBody(req: CreditPullRequest): URLSearchParams {
  // Spec requires Zip = exactly 5 digits. Our request-level validator
  // accepts 5 or 9 (borrowers often type ZIP+4) so we truncate here on the
  // wire to satisfy SPS without rejecting valid borrower-portal input.
  const zip5 = req.zip.replace(/\D/g, '').slice(0, 5);

  const body = new URLSearchParams({
    Pass: '2',
    Product: 'CREDIT',
    Bureau: req.bureau,
    SplitName: '1',
    NameFirst: req.firstName.toUpperCase(),
    NameLast: req.lastName.toUpperCase(),
    Address: req.address.toUpperCase(),
    City: req.city.toUpperCase(),
    State: req.state,
    Zip: zip5,
    SSN: req.ssn,
    Rbp_Output: 'XML',
  });

  if (req.middleName) body.set('NameMiddle', req.middleName.toUpperCase());
  if (req.generation) body.set('NameGen', req.generation.toUpperCase());
  if (req.dob) body.set('DOB', req.dob);

  return body;
}

// ─── Diagnostic logging ────────────────────────────────────────────────────
// Logs just enough to debug environment-specific failures: the URL we hit,
// the status, a few diagnostic headers, and a clipped body preview. The
// request body is never logged (FCRA / PII). On a 4xx the response body is
// typically an HTML error page from SPS or an upstream WAF, not credit data.

function logNon2xx(requestedUrl: string, response: Response, rawResponse: string) {
  const diagHeaders: Record<string, string> = {};
  for (const name of [
    'content-type',
    'content-length',
    'server',
    'location',
    'x-cache',
    'cf-ray',
    'via',
    'www-authenticate',
  ]) {
    const v = response.headers.get(name);
    if (v) diagHeaders[name] = v;
  }
  console.warn('[CreditPull] non-2xx SPS response', {
    requestedUrl,
    finalUrl: response.url,
    status: response.status,
    statusText: response.statusText,
    type: response.type,
    headers: diagHeaders,
    bodyPreview: rawResponse.slice(0, 800),
  });
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
 * We request XML via `Rbp_Output=XML`; JSON parsing stays as a defensive fallback.
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
  // Normalize first letter to lowercase so a PascalCase REST response
  // (e.g. <Subjects><Subject><SubjectHeader>) feeds the same access paths
  // as the legacy camelCase XML (<subjects><subject><subjectHeader>) the
  // extractors below were originally written against. fast-xml-parser
  // invokes `isArray` with the transformed name, so the list below stays
  // lowercase.
  transformTagName: (name: string) => name.charAt(0).toLowerCase() + name.slice(1),
  transformAttributeName: (name: string) => name.charAt(0).toLowerCase() + name.slice(1),
  // Treat these tags as arrays even when only one occurs, so iteration is uniform.
  isArray: (name) =>
    ['subject', 'score', 'factor', 'publicRecord', 'collection', 'trade', 'inquiry'].includes(name),
});

/**
 * PII-safe tree printer: emits the key/type structure of a parsed XML
 * document without exposing any text content (names, SSN, scores, etc.).
 * Used to debug parser-vs-response schema drift on a 200/no-hit response.
 */
function describeStructure(obj: unknown, depth = 0, maxDepth = 6): string {
  if (depth > maxDepth) return '...';
  if (obj === null || obj === undefined) return String(obj);
  if (typeof obj === 'string') return 'string';
  if (typeof obj === 'number') return 'number';
  if (typeof obj === 'boolean') return 'boolean';
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    return `[${describeStructure(obj[0], depth + 1, maxDepth)} ×${obj.length}]`;
  }
  if (typeof obj === 'object') {
    const entries = Object.entries(obj as Record<string, unknown>).slice(0, 40);
    return (
      '{ ' +
      entries
        .map(([k, v]) => `${k}: ${describeStructure(v, depth + 1, maxDepth)}`)
        .join(', ') +
      ' }'
    );
  }
  return typeof obj;
}

/** Bureau code → Hart HX5 bureau-report container key (post tag normalization). */
const HX5_BUREAU_REPORT_KEY: Record<Bureau, string> = {
  TU: 'tU_Report',
  EFX: 'eFX_Report',
  XPN: 'xPN_Report',
};

/**
 * Format a Hart HX5 trans_date / trans_time element into a readable string.
 *   <trans_date fmt="YYYYMMDD">20260527</trans_date>  →  "2026-05-27"
 *   <trans_time fmt="HHMMSS">151312</trans_time>      →  "15:13:12"
 * Falls back to the raw stringified value when the format isn't an 8-digit
 * date or 6-digit time.
 */
function formatHx5DateTime(value: any): string | null {
  const raw = num(value?.['#text']) ?? num(value);
  if (raw === null) return null;
  const s = String(raw).padStart(8, '0');
  if (s.length === 8) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  if (s.length === 6) return `${s.slice(0, 2)}:${s.slice(2, 4)}:${s.slice(4, 6)}`;
  return s;
}

/**
 * Extract `#text` value from a Hart element that may be either a primitive
 * or a `{ '#text': ..., '@_code': ... }` object (tags with attributes parse
 * to objects).
 */
function elementText(value: any): string | null {
  if (value && typeof value === 'object') return str(value['#text']);
  return str(value);
}

/**
 * Map a Hart HX5 credit-report response to CreditPullResult.
 *
 * HX5 envelope shape (post tag-case normalization):
 *   hX5
 *     hX5_transaction_information { transid, token }
 *     bureau_xml_data
 *       tU_Report | eFX_Report | xPN_Report
 *         transaction_control { trans_date, trans_time, ... }
 *         subject_segments
 *           subject_header { file_hit{#text,@_code}, ssn_match_ind, ... }
 *           credit_summary { public_records, collections, trades, ... }
 *           scoring_segments [{ product_information, scoring{ score, factor1..4 } }]
 *           ofac_name_screen_segments { product_information { search_status } }
 */
function parseHx5Response(hx5: any, bureau: Bureau): CreditPullResult {
  const txInfo = hx5?.hX5_transaction_information ?? null;
  const transid = txInfo?.transid != null ? String(txInfo.transid) : null;
  // reviewReport's Ref param wants `${transid}-${account}`; we store transid
  // alone and the caller can re-concatenate with SPS_ACCOUNT when reviewing.
  const transactionId = transid;

  const bureauData = hx5?.bureau_xml_data ?? null;
  const report = bureauData?.[HX5_BUREAU_REPORT_KEY[bureau]] ?? null;

  if (!report || typeof report !== 'object') {
    return {
      success: true,
      isHit: false,
      bureau,
      transactionId,
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
      errorCode: 'NO_BUREAU_REPORT',
      errorMessage: `Response did not contain a ${bureau} report block.`,
    };
  }

  const reportDate = formatHx5DateTime(report.transaction_control?.trans_date);

  // `subject_segments` is a single object for a one-subject inquiry; wrap
  // defensively in case future co-applicant inquiries surface it as an array.
  const subjectSegments = asArray<any>(report.subject_segments)[0] ?? report.subject_segments;
  if (!subjectSegments || typeof subjectSegments !== 'object') {
    return {
      success: true,
      isHit: false,
      bureau,
      transactionId,
      reportDate,
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
      errorCode: 'NO_SUBJECT_SEGMENTS',
      errorMessage: 'Response did not contain subject_segments.',
    };
  }

  // ── Hit indicator ──
  // <file_hit code="N">…</file_hit>  →  { '#text': ..., '@_code': N }
  // Hart conventions: 0 = no file / no match, non-zero = hit.
  const fileHit = subjectSegments.subject_header?.file_hit ?? null;
  const fileHitCode = num(fileHit?.['@_code']);
  let isHit = fileHitCode !== null && fileHitCode !== 0;

  // ── SSN match ──
  const ssnMatch = subjectSegments.subject_header?.ssn_match_ind ?? null;
  const ssnMatchCode = ssnMatch?.['@_code'] != null ? String(ssnMatch['@_code']) : null;
  const ssnMatchValue = elementText(ssnMatch);

  // ── Credit summary counts ──
  const summary = subjectSegments.credit_summary ?? {};
  const publicRecords = num(summary.public_records);
  const collections = num(summary.collections);
  const negativeTrades = num(summary.negative_trades);
  const totalTrades = num(summary.trades);
  const inquiries = num(summary.inquiries);

  // ── OFAC ──
  const ofacStatus = elementText(
    subjectSegments.ofac_name_screen_segments?.product_information?.search_status,
  );

  // ── Score selection ──
  // Multiple scoring_segments come back (FICO / VantageScore / custom). Pick
  // the first with a real positive score; surface its product name + factor1–4
  // as the reason codes for display.
  const scoringSegments = asArray<any>(subjectSegments.scoring_segments);
  let score: number | null = null;
  let scoreModel: string | null = null;
  let scoreReasons: string[] = [];
  for (const seg of scoringSegments) {
    const scoring = seg?.scoring ?? {};
    const segScore = num(scoring.score);
    if (segScore !== null && segScore > 0) {
      score = segScore;
      scoreModel =
        elementText(seg.product_information?.product) ??
        str(scoring.product_code);
      scoreReasons = [scoring.factor1, scoring.factor2, scoring.factor3, scoring.factor4]
        .map((f) => elementText(f))
        .filter((t): t is string => !!t);
      break;
    }
  }

  // Belt-and-braces: if file_hit was missing/0 but we recovered a real score
  // and trade counts, the consumer was found — treat as a hit. Avoids the
  // ProminentZero false-negative if a bureau ever omits file_hit on a match.
  if (!isHit && (score !== null || (totalTrades ?? 0) > 0)) {
    isHit = true;
  }

  // ── HX5-only extended fields ──────────────────────────────────────────
  // All optional on CreditPullResult — older Cosmos rows won't have them.

  // Subject identity (name_information + personal_information + address_information).
  const nameInfo = subjectSegments.name_information ?? null;
  const subjectName = buildSubjectName(nameInfo);
  const personal = subjectSegments.personal_information ?? null;
  const subjectSsnMasked = personal?.ssn != null ? maskSsn(String(personal.ssn)) : null;
  const subjectDob = str(personal?.dob);
  const addrInfo = subjectSegments.address_information ?? null;
  const subjectAddress = buildSubjectAddress(addrInfo);
  const infileSince = formatHx5DateTime(subjectSegments.subject_header?.infile_since_date);

  // Descriptive text from <file_hit code="N">…text…</file_hit>.
  const fileHitText = elementText(fileHit);

  // All scoring models — same iteration as above but collected, not first-only.
  const allScores: CreditPullScoreModel[] = [];
  for (const seg of scoringSegments) {
    const scoring = seg?.scoring ?? {};
    const modelName =
      elementText(seg.product_information?.product) ??
      str(scoring.product_code) ??
      'Unknown model';
    const segScore = num(scoring.score);
    const segScoreRaw = scoring.score != null ? String(scoring.score) : null;
    const factors = [scoring.factor1, scoring.factor2, scoring.factor3, scoring.factor4]
      .map((f) => elementText(f))
      .filter((t): t is string => !!t);
    allScores.push({ model: modelName, score: segScore, scoreRaw: segScoreRaw, factors });
  }
  // DTI estimator is in its own block — surface it alongside the credit scores
  // because BDOs treat the DTI estimate as another decision input.
  const dtiSeg = subjectSegments.dti_estimator_3_segments ?? null;
  if (dtiSeg?.scoring) {
    const modelName =
      elementText(dtiSeg.product_information?.product) ??
      str(dtiSeg.scoring.product_code) ??
      'DTI Estimator';
    allScores.push({
      model: modelName,
      score: num(dtiSeg.scoring.score),
      scoreRaw: dtiSeg.scoring.score != null ? String(dtiSeg.scoring.score) : null,
      factors: [],
    });
  }

  // Additional summary counts.
  const mortgages = num(summary.mortgages);
  const openAccounts = num(summary.open_accounts);
  const revolvingAccounts = num(summary.revolving_and_check_credit_trades);
  const installmentAccounts = num(summary.installments);
  const histNegTrades = num(summary.trades_with_any_historical_negative);
  const histNegOccurrences = num(summary.occurrence_of_historical_negative);

  // Per-account-type $ rows. The bureau emits one credit_summary_description
  // element per type (R/I/T); fast-xml-parser hands it back as a single object
  // when there's exactly one, hence asArray() — and the amounts are returned
  // as zero-padded fixed-point strings ("000020100" → $201.00 / 1c units).
  const summaryByType: CreditPullSummaryByType[] = asArray<any>(
    subjectSegments.credit_summary_description,
  ).map((row: any) => ({
    type: elementText(row.summary_type) ?? 'Unknown',
    highCredit: hx5Money(row.high_credit),
    creditLimit: hx5Money(row.credit_limit),
    balance: hx5Money(row.balance),
    amountPastDue: hx5Money(row.amount_past_due),
    monthlyPayment: hx5Money(row.monthly_payment),
    percentAvailable: hx5Percent(row.percent_credit_available),
  }));

  // Military Lending Act search status — separate segment, mirrors OFAC's shape.
  const mlaStatus = elementText(
    subjectSegments.military_lending_act_search?.product_information?.search_status,
  );

  return {
    success: true,
    isHit,
    bureau,
    transactionId,
    reportDate,
    ssnMatchCode,
    ssnMatchValue,
    score,
    scoreModel,
    scoreReasons,
    publicRecords,
    collections,
    negativeTrades,
    totalTrades,
    inquiries,
    ofacStatus,
    errorCode: null,
    errorMessage: null,
    // Extended HX5-only fields
    subjectName,
    subjectAddress,
    subjectSsnMasked,
    subjectDob,
    infileSince,
    fileHitText,
    allScores,
    mortgages,
    openAccounts,
    revolvingAccounts,
    installmentAccounts,
    histNegTrades,
    histNegOccurrences,
    summaryByType,
    mlaStatus,
  };
}

// ─── HX5 subject helpers ───────────────────────────────────────────────────

function buildSubjectName(nameInfo: any): string | null {
  if (!nameInfo || typeof nameInfo !== 'object') return null;
  const last = str(nameInfo.lname);
  const first = str(nameInfo.fname);
  const middle = str(nameInfo.mname);
  const suffix = str(nameInfo.suffix);
  if (!last && !first) return null;
  const fm = [first, middle].filter(Boolean).join(' ');
  return [last, fm].filter(Boolean).join(', ') + (suffix ? ' ' + suffix : '');
}

function buildSubjectAddress(addr: any): string | null {
  if (!addr || typeof addr !== 'object') return null;
  const parts = [
    addr.house_number,
    addr.predirectional,
    addr.street_name,
    addr.street_type,
    addr.postdirectional,
    addr.apt_unit_number,
  ]
    .map((p) => str(p))
    .filter((p): p is string => !!p);
  const street = parts.join(' ');
  const city = str(addr.city);
  const state = str(addr.state);
  const zip = str(addr.zip);
  if (!street && !city) return null;
  const tail = [city, state].filter(Boolean).join(', ');
  return [street, tail, zip].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

function maskSsn(ssn: string): string | null {
  const digits = ssn.replace(/\D/g, '');
  if (digits.length < 4) return null;
  return `***-**-${digits.slice(-4)}`;
}

/**
 * Hart HX5 money fields are zero-padded fixed-point integers in cents
 * ("000026000" → 26000 → $260.00) … no wait — Hart actually emits the
 * value as whole dollars right-aligned ("000026000" → $26,000 per the
 * sample HTML report). Treat the value as a plain integer in dollars.
 */
function hx5Money(v: any): number | null {
  const s = elementText(v) ?? (typeof v === 'number' ? String(v) : null);
  if (!s) return null;
  const n = Number(s.replace(/^0+/, '') || '0');
  return Number.isFinite(n) ? n : null;
}

/** Hart's percent_credit_available is a 0–100 integer string. */
function hx5Percent(v: any): number | null {
  const s = elementText(v) ?? (typeof v === 'number' ? String(v) : null);
  if (!s) return null;
  const n = Number(s.replace(/^0+/, '') || '0');
  return Number.isFinite(n) ? n : null;
}

/**
 * Top-level XML response router. Hart HX5 (live SPS REST) lands on
 * `parseHx5Response`. We keep an `else` branch with a structure diagnostic
 * to surface any future schema drift we don't yet have a parser for.
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

  // tag-case normalization lowers the first char, so <HX5> → hX5.
  const hx5 = parsed?.hX5 ?? parsed?.hx5;
  if (hx5 && typeof hx5 === 'object') {
    const result = parseHx5Response(hx5, bureau);
    // Keep the PII-safe diagnostic for a beat: if HX5 was present but we
    // still couldn't pull a hit out, log the structure so we can adjust paths
    // without another deploy.
    if (!result.errorCode && !result.isHit) {
      console.warn('[CreditPull] standardInquiry 200 HX5 with isHit=false', {
        bureauReportKey: HX5_BUREAU_REPORT_KEY[bureau],
        topLevelKeys: Object.keys(hx5).slice(0, 30),
        structure: describeStructure(hx5),
      });
    }
    return result;
  }

  // Non-HX5 200 — log structure and stamp a clear error so this surfaces as
  // a bureau_service_error rather than a silent no-hit.
  console.warn('[CreditPull] standardInquiry 200 with no HX5 envelope', {
    topLevelKeys:
      parsed && typeof parsed === 'object' ? Object.keys(parsed).slice(0, 30) : null,
    structure: describeStructure(parsed),
  });
  return emptyResult(
    bureau,
    'UNRECOGNIZED_XML_SCHEMA',
    'SPS returned XML with no recognisable HX5 envelope. Paste the [CreditPull] standardInquiry 200 log line to adjust the parser.',
  );
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

  // Same PII-safe diagnostic as the XML path: when SPS returns 200 + no
  // error but our extractor reads no-hit, log the structure so we can see
  // where the hit indicator actually lives in the account's response.
  if (!isError && !isHit) {
    console.warn('[CreditPull] standardInquiry 200 JSON with isHit=false', {
      topLevelKeys:
        parsed && typeof parsed === 'object' ? Object.keys(parsed).slice(0, 30) : null,
      structure: describeStructure(parsed),
    });
  }

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

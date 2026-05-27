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

  const rootKey = Object.keys(parsed).find((k) => !k.startsWith('@_'));
  const root = rootKey ? parsed[rootKey] : parsed;
  if (!root || typeof root !== 'object') {
    return emptyResult(bureau, 'XML_EMPTY_RESPONSE', 'SPS XML response had no usable root element.');
  }

  const isError = bool(root.isError ?? root['@_isError']);
  const transactionId = str(root.hctTransactionId ?? root['@_hctTransactionId']);
  const reportDate = str(root.reportDate ?? root['@_reportDate']);

  const subjectsContainer = root.subjects ?? null;
  const subjects = asArray<any>(subjectsContainer?.subject ?? subjectsContainer ?? []);
  const subject = subjects[0] ?? null;

  const header = subject?.subjectHeader ?? null;
  const hitCode = str(header?.hitIndicator?.code ?? header?.hitIndicator?.['@_code']);
  const isHit = hitCode === 'Y';

  // Diagnostic — fires when SPS returns 200 but our parser reads no hit. Logs
  // the PII-safe key/type tree so we can confirm normalization worked or see
  // schema drift (e.g. <Subjects> nested under a different root than expected,
  // <hitIndicator> renamed, etc.). Remove or gate behind an env flag once the
  // happy-path is verified.
  if (!isError && !isHit) {
    console.warn('[CreditPull] standardInquiry 200 with isHit=false', {
      rootKey,
      topLevelKeys:
        root && typeof root === 'object' ? Object.keys(root).slice(0, 30) : null,
      hitCodeRead: hitCode,
      headerKeys:
        header && typeof header === 'object' ? Object.keys(header).slice(0, 30) : null,
      hitIndicatorShape: header?.hitIndicator
        ? describeStructure(header.hitIndicator)
        : null,
      structure: describeStructure(parsed),
    });
  }

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

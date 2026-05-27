/**
 * Credit-pull types and request validation — ported from the Replit
 * `shared/schema.ts` Zod definitions, hand-rolled here because this codebase
 * does not depend on Zod. Field semantics, length caps, and error messages
 * mirror the source so the back-end contract stays compatible.
 *
 * Persistence lives in Cosmos DB collection `creditPulls` (see
 * `lib/cosmosdb.ts → COLLECTIONS.CREDIT_PULLS`).  The Postgres `credit_pulls`
 * table in the Replit codebase becomes one MongoDB document per pull.
 */

export type Bureau = 'TU' | 'XPN' | 'EFX';

export const BUREAU_DISPLAY_NAMES: Record<Bureau, string> = {
  TU: 'TransUnion',
  XPN: 'Experian',
  EFX: 'Equifax',
};

export const BUREAUS: Bureau[] = ['TU', 'XPN', 'EFX'];

export type PermissiblePurpose =
  | 'credit_transaction_consumer_initiated'
  | 'review_or_collection_of_account'
  | 'employment'
  | 'underwriting_insurance'
  | 'legitimate_business_need_initiated_by_consumer';

const PERMISSIBLE_PURPOSES: PermissiblePurpose[] = [
  'credit_transaction_consumer_initiated',
  'review_or_collection_of_account',
  'employment',
  'underwriting_insurance',
  'legitimate_business_need_initiated_by_consumer',
];

/** Request body POSTed to /api/credit-pull. */
export interface CreditPullRequest {
  projectId?: string;
  applicantId?: string;
  bureau: Bureau;

  firstName: string;
  middleName?: string;
  lastName: string;
  generation?: string;
  /** 9 digits, no separators (already stripped by validator). */
  ssn: string;
  /** MM/DD/YYYY. */
  dob?: string;

  address: string;
  city: string;
  /** Two-letter state code, uppercased by validator. */
  state: string;
  /** 5 or 9 digits. */
  zip: string;

  permissiblePurpose: PermissiblePurpose;
  /** ISO-8601 string from the client; server overrides with its own clock. */
  consumerAuthorizedAt: string;
  consumerAuthorizationRef?: string;
}

/** One scoring model from the bureau response (FICO, VantageScore, DTI…). */
export interface CreditPullScoreModel {
  /** Human-readable model name, e.g. "FICO CLASSIC 08". */
  model: string;
  /** Numeric score. Some models (DTI / income tier) emit non-integer or coded values; null when unparseable. */
  score: number | null;
  /** Raw score string when `score` is null — preserves things like "60 C" for income tier. */
  scoreRaw?: string | null;
  /** Reason-code descriptions for this model (factor1..factor4). */
  factors: string[];
}

/** One row of the bureau's $-by-type summary (Revolving / Installment / Totals). */
export interface CreditPullSummaryByType {
  /** "Revolving" | "Installment" | "Totals" | "Open" | "Closed" — whatever the bureau returned. */
  type: string;
  highCredit: number | null;
  creditLimit: number | null;
  balance: number | null;
  amountPastDue: number | null;
  monthlyPayment: number | null;
  /** Percentage 0–100, or null. */
  percentAvailable: number | null;
}

/**
 * Normalized result returned by the SoftPullSolutions adapter.  Sent down to
 * the front-end and also written verbatim into `parsedSummary` on the pull row.
 *
 * Fields above the divider are required and populated for every pull.
 * Fields below are optional and added by the Hart HX5 parser only — they're
 * absent from older Cosmos rows, so the UI must render defensively.
 */
export interface CreditPullResult {
  success: boolean;
  isHit: boolean;
  bureau: Bureau;
  transactionId: string | null;
  reportDate: string | null;
  ssnMatchCode: string | null;
  ssnMatchValue: string | null;
  score: number | null;
  scoreModel: string | null;
  scoreReasons: string[];
  publicRecords: number | null;
  collections: number | null;
  negativeTrades: number | null;
  totalTrades: number | null;
  inquiries: number | null;
  ofacStatus: string | null;
  errorCode: string | null;
  errorMessage: string | null;

  // ─── Optional, HX5-only ─────────────────────────────────────────────────

  /** Bureau-reported subject identity — useful for verifying we got the right person back. */
  subjectName?: string | null;          // "ICE, ROBERT R"
  subjectAddress?: string | null;       // "111 W 8TH ST, FANTASY ISLAND, IL 60750"
  subjectSsnMasked?: string | null;     // "***-**-3221"
  subjectDob?: string | null;
  /** Earliest date this consumer appears in the bureau's file (YYYY-MM-DD). */
  infileSince?: string | null;
  /** Descriptive text from the file_hit element, e.g. "Regular hit on file -- all files are returned". */
  fileHitText?: string | null;

  /** Every score model the bureau returned. `score`/`scoreModel`/`scoreReasons` mirror `allScores[0]` for back-compat. */
  allScores?: CreditPullScoreModel[];

  /** Additional summary counts not in the legacy 5-tile set. */
  mortgages?: number | null;
  openAccounts?: number | null;
  revolvingAccounts?: number | null;
  installmentAccounts?: number | null;
  histNegTrades?: number | null;
  histNegOccurrences?: number | null;

  /** Per-account-type $ summary rows. */
  summaryByType?: CreditPullSummaryByType[];

  /** MLA (Military Lending Act) database search status, e.g. "No-match to MLA database". */
  mlaStatus?: string | null;
}

/**
 * One row of credit-pull history — the Cosmos document shape returned by
 * `GET /api/credit-pull?...`. Mirrors the Replit Postgres columns; jsonb
 * `parsedSummary` becomes a nested object in MongoDB.
 */
export interface CreditPullRow {
  id: string;
  projectId: string | null;
  applicantId: string | null;
  initiatedByUserId: string;

  bureau: Bureau;
  permissiblePurpose: PermissiblePurpose;
  consumerAuthorizedAt: string;
  consumerAuthorizationRef: string | null;

  consumerIdentityHash: string;

  success: boolean;
  isHit: boolean;
  transactionId: string | null;
  reportDate: string | null;

  score: number | null;
  scoreModel: string | null;
  ssnMatchCode: string | null;
  ofacStatus: string | null;
  parsedSummary: CreditPullResult | null;

  errorCode: string | null;
  errorMessage: string | null;

  rawReportRef: string | null;
  rawReportSizeBytes: number | null;

  pulledAt: string;
}

// ─── Validation ────────────────────────────────────────────────────────────
// Hand-rolled to match the Replit Zod schema's invariants. Returns either the
// normalized payload (SSN stripped, state uppercased) or an `issues` array
// shaped like Zod's so the route can pass it back without translation.

export interface ValidationIssue {
  path: string[];
  message: string;
}

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; issues: ValidationIssue[] };

function str(value: unknown, max?: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (max != null && trimmed.length > max) return undefined;
  return trimmed;
}

export function validateCreditPullRequest(
  raw: unknown,
): ValidationResult<CreditPullRequest> {
  const issues: ValidationIssue[] = [];
  const body = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : undefined;
  const applicantId = typeof body.applicantId === 'string' ? body.applicantId.trim() : undefined;

  const bureau = body.bureau;
  if (bureau !== 'TU' && bureau !== 'XPN' && bureau !== 'EFX') {
    issues.push({ path: ['bureau'], message: 'bureau must be TU, XPN, or EFX' });
  }

  const firstName = str(body.firstName, 40);
  if (!firstName) issues.push({ path: ['firstName'], message: 'firstName is required (≤ 40 chars)' });
  const lastName = str(body.lastName, 40);
  if (!lastName) issues.push({ path: ['lastName'], message: 'lastName is required (≤ 40 chars)' });

  const middleName = str(body.middleName, 20);
  const generation = str(body.generation, 10);

  let ssn: string | undefined;
  if (typeof body.ssn === 'string') {
    const digits = body.ssn.replace(/\D/g, '');
    if (/^\d{9}$/.test(digits)) ssn = digits;
  }
  if (!ssn) issues.push({ path: ['ssn'], message: 'SSN must be 9 digits' });

  let dob: string | undefined;
  if (body.dob !== undefined && body.dob !== null && body.dob !== '') {
    if (typeof body.dob === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(body.dob)) {
      dob = body.dob;
    } else {
      issues.push({ path: ['dob'], message: 'DOB must be MM/DD/YYYY' });
    }
  }

  const address = str(body.address, 80);
  if (!address) issues.push({ path: ['address'], message: 'address is required (≤ 80 chars)' });
  const city = str(body.city, 40);
  if (!city) issues.push({ path: ['city'], message: 'city is required (≤ 40 chars)' });

  let state: string | undefined;
  if (typeof body.state === 'string' && body.state.trim().length === 2) {
    state = body.state.trim().toUpperCase();
  } else {
    issues.push({ path: ['state'], message: 'state must be a 2-letter code' });
  }

  let zip: string | undefined;
  if (typeof body.zip === 'string' && /^\d{5}(\d{4})?$/.test(body.zip.trim())) {
    zip = body.zip.trim();
  } else {
    issues.push({ path: ['zip'], message: 'ZIP must be 5 or 9 digits' });
  }

  const permissiblePurpose = body.permissiblePurpose;
  if (typeof permissiblePurpose !== 'string' || !PERMISSIBLE_PURPOSES.includes(permissiblePurpose as PermissiblePurpose)) {
    issues.push({ path: ['permissiblePurpose'], message: 'permissiblePurpose is invalid' });
  }

  let consumerAuthorizedAt: string | undefined;
  if (typeof body.consumerAuthorizedAt === 'string' && !isNaN(new Date(body.consumerAuthorizedAt).getTime())) {
    consumerAuthorizedAt = body.consumerAuthorizedAt;
  } else {
    issues.push({ path: ['consumerAuthorizedAt'], message: 'consumerAuthorizedAt must be an ISO datetime' });
  }
  const consumerAuthorizationRef = str(body.consumerAuthorizationRef);

  if (issues.length > 0) return { success: false, issues };

  return {
    success: true,
    data: {
      projectId,
      applicantId,
      bureau: bureau as Bureau,
      firstName: firstName!,
      middleName,
      lastName: lastName!,
      generation,
      ssn: ssn!,
      dob,
      address: address!,
      city: city!,
      state: state!,
      zip: zip!,
      permissiblePurpose: permissiblePurpose as PermissiblePurpose,
      consumerAuthorizedAt: consumerAuthorizedAt!,
      consumerAuthorizationRef,
    },
  };
}

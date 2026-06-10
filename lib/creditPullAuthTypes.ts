/**
 * Soft Credit Pull Authorization — stored when a borrower submits the Zoho
 * "Soft Credit Pull Authorization Form". One record per Zoho submission.
 *
 * Matching to an individual applicant is by `nameKey` only (see `lib/nameKey.ts`).
 * SSN is NEVER stored in full — only the last four digits — and `dob` is kept so
 * the match key can be strengthened later (e.g. lastName + ssnLast4) without a
 * data backfill.
 */
export interface CreditPullAuthorization {
  id: string;
  source: 'zoho';

  /** Normalized first+last name used for applicant matching. */
  nameKey: string;
  /** Normalized DOB (YYYYMMDD) — second half of the match key. '' if unparseable. */
  dobKey: string;

  /** As submitted, for display/audit. */
  fullName: string;
  firstName: string;
  lastName: string;

  /** Last 4 of SSN only — never the full number. */
  ssnLast4: string | null;
  /** ISO date (YYYY-MM-DD) when parseable, else the raw submitted value. */
  dob: string | null;
  email: string | null;
  phone: string | null;

  /** Full address composed from the Zoho components below (for display/audit). */
  address: string | null;
  /** Structured address components, kept for future address-based matching. */
  addressComponents: {
    line1: string | null;
    line2: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    country: string | null;
  };

  /**
   * Reference to the signature captured by Zoho. Zoho Forms does not expose the
   * signature image in the webhook payload, so this is typically null; the
   * signed entry lives in Zoho. Present for forward-compatibility.
   */
  signatureRef: string | null;

  /** Zoho's unique entry/submission id — the idempotency key. */
  zohoSubmissionId: string;

  /** When the borrower submitted (from Zoho, if provided). */
  submittedAt: string | null;
  /** When our webhook received and stored it (server clock). */
  receivedAt: string;
}

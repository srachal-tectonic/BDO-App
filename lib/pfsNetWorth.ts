/**
 * Net Worth for an individual applicant = total assets − total liabilities,
 * computed from their SBA Personal Financial Statement using the exact same
 * fields and formula as the PFS form (see IndividualApplicantsSection.tsx).
 *
 * Kept in one place so the on-screen PreQual (PQMemoForm) and the PreQual PDF
 * (pq-memo-template) both show the identical figure the user sees in the PFS
 * section. Net Worth is intentionally NOT imported from the financial spread —
 * it always derives from the PFS.
 */

const PFS_ASSET_FIELDS = [
  'cashOnHand', 'savingsAccounts', 'iraRetirement', 'accountsReceivable',
  'lifeInsuranceCashValue', 'stocksAndBonds', 'realEstate', 'automobiles',
  'otherPersonalProperty', 'otherAssets',
] as const;

const PFS_LIABILITY_FIELDS = [
  'accountsPayable', 'notesPayableToBanks', 'installmentAccountAuto',
  'installmentAccountOther', 'loansAgainstLifeInsurance', 'mortgagesOnRealEstate',
  'unpaidTaxes', 'otherLiabilities',
] as const;

/** Parse a currency-ish PFS cell to a number; blank/non-numeric → 0. */
function parsePfsNum(val: unknown): number {
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  if (typeof val !== 'string') return 0;
  const n = parseFloat(val.replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? 0 : n;
}

/**
 * Compute net worth from a Personal Financial Statement record. Returns null
 * when no PFS record exists for the applicant, so callers can render "-".
 * Accepts `unknown` so callers can pass their own PFS type without casting.
 */
export function computePfsNetWorth(pfs: unknown): number | null {
  if (!pfs || typeof pfs !== 'object') return null;
  const rec = pfs as Record<string, unknown>;
  const assets = PFS_ASSET_FIELDS.reduce((sum, k) => sum + parsePfsNum(rec[k]), 0);
  const liabilities = PFS_LIABILITY_FIELDS.reduce((sum, k) => sum + parsePfsNum(rec[k]), 0);
  return assets - liabilities;
}

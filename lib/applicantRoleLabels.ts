/**
 * Display labels for the kebab-case role values stored on individual
 * applicants (set via the Project Role / Role in Business Operations
 * dropdowns). Used by the PQ Memo Overview table and the exported memo so
 * raw values like "owner-guarantor" or "active-full-time" never surface.
 */

const PROJECT_ROLE_LABELS: Record<string, string> = {
  'owner-guarantor': 'Owner & Guarantor',
  'owner-non-guarantor': 'Owner Non-Guarantor',
  'non-owner-key-manager': 'Non-Owner Key Manager',
  other: 'Other',
};

const BUSINESS_ROLE_LABELS: Record<string, string> = {
  'active-full-time': 'Active Full Time',
  'active-part-time': 'Active Part Time',
  passive: 'Passive',
};

/** Fallback for values outside the known sets: "some-new-role" → "Some New Role". */
const titleCaseSlug = (value: string): string =>
  value
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

export function formatProjectRole(value: string | null | undefined): string {
  if (!value) return '';
  return PROJECT_ROLE_LABELS[value] ?? titleCaseSlug(value);
}

export function formatBusinessRole(value: string | null | undefined): string {
  if (!value) return '';
  return BUSINESS_ROLE_LABELS[value] ?? titleCaseSlug(value);
}

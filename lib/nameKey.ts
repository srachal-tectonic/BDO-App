/**
 * Shared name normalizer for Soft Credit Pull authorization matching.
 *
 * The Zoho authorization webhook (writer) and the authorization status check
 * (reader) MUST compute the key the same way, so both import from here. Do not
 * inline name normalization anywhere else — keys would drift and matches break.
 *
 * Normalization: lowercase → strip diacritics (NFKD) → drop anything that is
 * not a letter or space → collapse whitespace → keep first + last token only
 * (middle names and suffixes are ignored). Returns '' when nothing usable
 * remains, which callers MUST treat as "no match" (never authorize on '').
 */

// Generational suffixes dropped before choosing the surname token, so a name
// field like "John Public Jr." keys on "public", not "jr".
const SUFFIXES = new Set(['jr', 'jnr', 'sr', 'snr', 'ii', 'iii', 'iv', 'v']);

/** Normalize a free-form string into its alphabetic tokens (lowercase, suffixes dropped). */
function tokens(input: string | undefined | null): string[] {
  if (!input) return [];
  const toks = input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip combining diacritical marks
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ') // drop digits/punctuation (e.g. "Jr.", "O'Brien" → "obrien")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  // Only strip a suffix when it is not the sole token (do not erase a 1-word name).
  const filtered = toks.filter((t) => !SUFFIXES.has(t));
  return filtered.length ? filtered : toks;
}

/** Build a match key from discrete first/last name fields. */
export function nameKey(first: string | undefined | null, last: string | undefined | null): string {
  const f = tokens(first)[0] ?? '';
  const lastToks = tokens(last);
  const l = lastToks.length ? lastToks[lastToks.length - 1] : '';
  if (!f && !l) return '';
  return `${f} ${l}`.trim();
}

/**
 * Build a match key from a single full-name string (e.g. Zoho's combined Name
 * field). Uses the first token as first name and the last token as last name,
 * ignoring any middle names / suffixes in between.
 */
export function nameKeyFromFull(full: string | undefined | null): string {
  const toks = tokens(full);
  if (toks.length === 0) return '';
  if (toks.length === 1) return toks[0];
  return `${toks[0]} ${toks[toks.length - 1]}`;
}

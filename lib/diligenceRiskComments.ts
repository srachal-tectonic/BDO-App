// Shared helpers for the per-section "Risk to the bank" comment threads on the
// Due Diligence report. Pure TypeScript (no React / no Node deps) so it can be
// imported by both the client panel (components/diligence/DiligenceReportPanel)
// and the server-side PDF template (lib/pq-memo-template) without pulling extra
// runtime into either bundle.

/**
 * A "Risk to the bank" callout marks a section in the DD report. It is authored
 * (by the LLM / admin appendix) as a bolded marker at the start of a block —
 * most often a blockquote, e.g. `> ⚠ **Risk to the bank:** ...`, but sometimes
 * a plain paragraph `⚠ **Risk to the bank:** ...`. We match the start of a line,
 * tolerating an optional blockquote prefix (`>`), an optional warning glyph
 * (+ emoji variation selector), and singular/plural wording, case-insensitively.
 */
export const RISK_TO_BANK_MARKER = /^\s*>*\s*(?:⚠️?\s*)?\*\*\s*risks?\s+to\s+the\s+bank/i;

export interface DiligenceRiskSegment {
  /** Markdown for this run of the report, rendered as-is. */
  text: string;
  /**
   * When set, a comment thread for this section key is rendered immediately
   * after `text`. Keys are positional (`risk-1`, `risk-2`, …) and stable for a
   * given report, so the in-app panel and the PDF export agree on which
   * comments belong to which section.
   */
  sectionKey: string | null;
}

/** One persisted comment under a Risk-to-the-bank section. */
export interface DiligenceRiskComment {
  id: string;
  projectId: string;
  sectionKey: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  /** Set when the author edits their comment. */
  updatedAt?: string;
}

/**
 * Split a DD report's markdown into segments, breaking it right after each
 * "Risk to the bank" callout so a comment thread can be injected there. The
 * callout is a single markdown block (a blockquote or paragraph) that ends at
 * the first blank line; we cut at that blank line so the comment box lands
 * immediately after the callout it belongs to. Everything before the first
 * callout is folded into the first risk segment, and any trailing text after
 * the last callout becomes a final, comment-less segment. Section keys are
 * positional (`risk-1`, `risk-2`, …) and shared by the in-app panel and the PDF
 * export so comments line up in both.
 */
export function splitDiligenceByRiskSections(markdown: string): DiligenceRiskSegment[] {
  const lines = (markdown ?? '').split(/\r?\n/);
  const isMarker = (l: string) => RISK_TO_BANK_MARKER.test(l);

  const segments: DiligenceRiskSegment[] = [];
  let buf: string[] = [];
  let riskCount = 0;
  let inRisk = false;

  const flush = (sectionKey: string | null) => {
    segments.push({ text: buf.join('\n'), sectionKey });
    buf = [];
  };

  for (const line of lines) {
    // Enter a risk callout on its marker line (guard with !inRisk so a callout
    // wrapped across several blockquote lines still counts once).
    if (!inRisk && isMarker(line)) {
      riskCount += 1;
      inRisk = true;
    }
    buf.push(line);
    // The callout block ends at the first blank line — cut here.
    if (inRisk && line.trim() === '') {
      flush(`risk-${riskCount}`);
      inRisk = false;
    }
  }
  flush(inRisk ? `risk-${riskCount}` : null);

  return segments;
}

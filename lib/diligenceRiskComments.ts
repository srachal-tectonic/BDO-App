// Shared helpers for the per-section "Risk to the bank" comment threads on the
// Due Diligence report. Pure TypeScript (no React / no Node deps) so it can be
// imported by both the client panel (components/diligence/DiligenceReportPanel)
// and the server-side PDF template (lib/pq-memo-template) without pulling extra
// runtime into either bundle.

/**
 * A "Risk to the bank" callout always begins a section in the DD report and is
 * authored (by the LLM / admin appendix) as a bolded marker at the start of a
 * paragraph, e.g. `⚠ **Risk to the bank:** ...`. We match the start of a line,
 * tolerating an optional warning glyph (+ emoji variation selector) and the
 * singular/plural wording, case-insensitively.
 */
export const RISK_TO_BANK_MARKER = /^\s*(?:⚠[️]?\s*)?\*\*\s*risks?\s+to\s+the\s+bank/i;

const HEADING_RE = /^\s*#{1,6}\s+/;

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
 * Split a DD report's markdown into segments, breaking it at the end of each
 * "Risk to the bank" section so a comment thread can be injected there. A risk
 * section runs from its marker line up to (but not including) the next risk
 * marker or the next markdown heading — whichever comes first — or the end of
 * the document. Everything before the first marker is folded into the first
 * risk segment so the report reads in order with the comment box following the
 * callout it belongs to.
 */
export function splitDiligenceByRiskSections(markdown: string): DiligenceRiskSegment[] {
  const lines = (markdown ?? '').split(/\r?\n/);
  const isHeading = (l: string) => HEADING_RE.test(l);
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
    // A heading or a new marker ends the risk section currently in progress;
    // cut here so the comment thread lands after the section's content.
    if (inRisk && (isHeading(line) || isMarker(line))) {
      flush(`risk-${riskCount}`);
      inRisk = false;
    }
    if (isMarker(line)) {
      riskCount += 1;
      inRisk = true;
    }
    buf.push(line);
  }
  flush(inRisk ? `risk-${riskCount}` : null);

  return segments;
}

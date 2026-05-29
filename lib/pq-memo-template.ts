/**
 * PQ Memo HTML template — ported from the Replit `server/utils/pq-memo-template.ts`.
 *
 * Data-shape adjustments for this codebase (Azure Cosmos DB, flat loanApplication):
 *   - Replit: project.data.projectOverview / .businessApplicant / .pqMemo.*
 *   - Here:   loanApplication.projectOverview (root-level) with PQ Memo fields
 *             living directly on `projectOverview` (e.g. riskRepayment,
 *             referralSource, bdoComments).  No `pqMemo.*` sub-object.
 *   - Risk scores: projectOverview.risk{Repayment,Management,Equity,Collateral,Credit,Liquidity}
 *   - BDO summary narrative: projectOverview.bdoComments
 *   - `scoreExplanations` isn't persisted here, so the template gracefully
 *     degrades when it's missing. DSCR is read straight off
 *     `loanApplication.dscr` (period1..4 / dscr1..4) and rendered in the
 *     Cash Flow Analysis section.
 */

// Fonts are served to Chromium over a loopback HTTP server spun up by the
// PDF route, not inlined as data: URIs. Sparticuz's Chromium build refuses
// to decode data:-scheme fonts (document.fonts reports status "error" with
// no console log); http:// from the same page origin works normally.
/** Subset of QuestionnaireRule fields we need to render. Kept loose-typed so
 * this template doesn't reach into the questionnairePdf module. */
export interface PQMemoQuestionnaireRule {
  id: string;
  name?: string;
  questionText?: string;
  mainCategory?: string;
  purposeKey?: string;
  purposeKeys?: string[];
  questionOrder?: number;
}

export interface PQMemoQuestionnaireResponse {
  ruleId: string;
  content?: string;
  updatedAt?: Date | string;
}

export interface PQMemoDiligenceReport {
  /** Markdown body from the LLM. */
  reportText: string;
  /** ISO timestamp string. */
  generatedAt?: string;
  /** Model id, e.g. "claude-sonnet-4-6". */
  model?: string;
}

export interface PQMemoInput {
  projectName: string;
  loanApplication: Record<string, any>;
  financialPeriods?: any[];
  spreadFileName?: string;
  /** Optional per-category narrative — keyed by risk category (repayment, management, ...). */
  scoreExplanations?: Record<string, string>;
  /** Optional executive-summary free text. */
  executiveSummary?: string;
  /** Optional general memo notes. */
  memoNotes?: string;
  /** Applicable questionnaire rules — already filtered project-side. */
  questionnaireRules?: PQMemoQuestionnaireRule[];
  /** Stored questionnaire responses keyed off `ruleId`. */
  questionnaireResponses?: PQMemoQuestionnaireResponse[];
  /** Latest due-diligence report for the project, or null if not generated. */
  diligenceReport?: PQMemoDiligenceReport | null;
  /** Structured project purposes used to split the Business Questionnaire
   * into per-purpose subsections (primary first, then each secondary). When
   * absent the questionnaire renders as a single flat list. */
  projectPurposes?: {
    primary: string[];
    secondary?: string[];
  };
}

const normalizePurpose = (value: unknown): string =>
  String(value ?? '').replace(/\s+/g, '').toLowerCase();

const formatCurrency = (value: number | undefined | null): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatPercentage = (value: number | undefined): string => {
  if (!value) return '0%';
  return `${value.toFixed(1)}%`;
};

const esc = (s: unknown): string =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Minimal Markdown → HTML for the Due Diligence Report body. Handles:
 *   # / ## / ### headings, bullet lists (- or *), numbered lists (1.),
 *   GFM pipe tables, blank-line paragraph separation, **bold**, *italic*,
 *   `code`, > blockquotes.
 * Not a full CommonMark implementation — but the DD LLM only emits this
 * subset, and pulling in a real markdown lib would be a new runtime dep.
 *
 * Order of operations matters:
 *   1. Escape HTML on the raw input so user/LLM-supplied angle brackets
 *      don't inject tags.
 *   2. Apply block-level transforms (headings / lists / blockquotes / tables).
 *   3. Apply inline transforms (bold / italic / code) — these run on
 *      already-escaped text so they're safe to write as `<strong>` etc.
 */
function markdownToHtml(md: string): string {
  const escaped = esc(md);
  const lines = escaped.split(/\r?\n/);
  const out: string[] = [];

  type ListState = { kind: 'ul' | 'ol' } | null;
  let list: ListState = null;
  let inBlockquote = false;
  let paragraph: string[] = [];

  const closeList = () => {
    if (list) {
      out.push(`</${list.kind}>`);
      list = null;
    }
  };
  const closeQuote = () => {
    if (inBlockquote) {
      out.push('</blockquote>');
      inBlockquote = false;
    }
  };
  const flushParagraph = () => {
    if (paragraph.length > 0) {
      out.push(`<p>${inline(paragraph.join(' '))}</p>`);
      paragraph = [];
    }
  };

  const inline = (s: string): string =>
    s
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');

  // GFM pipe-table helpers. A table is a row of `| cell | cell |` followed
  // immediately by a delimiter row of `| --- | :-: |` (any mix of colons and
  // dashes per cell). Subsequent `|`-bounded rows are data until a blank or
  // non-pipe line.
  const isTableSeparator = (s: string): boolean => {
    const t = s.trim();
    if (!t.startsWith('|') || !t.endsWith('|')) return false;
    const inner = t.slice(1, -1);
    if (!inner.includes('|') && !/^\s*:?-+:?\s*$/.test(inner)) return false;
    return inner.split('|').every((c) => /^\s*:?-+:?\s*$/.test(c));
  };
  const parseTableCells = (s: string): string[] => {
    let t = s.trim();
    if (t.startsWith('|')) t = t.slice(1);
    if (t.endsWith('|')) t = t.slice(0, -1);
    return t.split('|').map((c) => c.trim());
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/\s+$/, '');

    // Blank line — terminate any open paragraph / list / blockquote.
    if (line.trim() === '') {
      flushParagraph();
      closeList();
      closeQuote();
      continue;
    }

    // GFM pipe table (header row + delimiter row + data rows).
    if (
      line.trim().startsWith('|') &&
      i + 1 < lines.length &&
      isTableSeparator(lines[i + 1])
    ) {
      flushParagraph();
      closeList();
      closeQuote();
      const headerCells = parseTableCells(line);
      i += 1; // consume delimiter row
      const dataRows: string[][] = [];
      while (i + 1 < lines.length) {
        const next = lines[i + 1];
        if (next.trim() === '' || !next.trim().startsWith('|')) break;
        i += 1;
        dataRows.push(parseTableCells(next));
      }
      const thead = `<tr>${headerCells.map((c) => `<th>${inline(c)}</th>`).join('')}</tr>`;
      const tbody = dataRows
        .map((row) => `<tr>${row.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
        .join('');
      out.push(`<table class="dd-table"><thead>${thead}</thead><tbody>${tbody}</tbody></table>`);
      continue;
    }

    // Headings (#, ##, ###). h4+ folded into h3 since the DD report rarely goes deeper.
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      closeList();
      closeQuote();
      const level = Math.min(headingMatch[1].length, 3);
      out.push(`<h${level}>${inline(headingMatch[2])}</h${level}>`);
      continue;
    }

    // Blockquote.
    const quoteMatch = line.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      flushParagraph();
      closeList();
      if (!inBlockquote) {
        out.push('<blockquote>');
        inBlockquote = true;
      }
      out.push(`<p>${inline(quoteMatch[1])}</p>`);
      continue;
    }
    closeQuote();

    // Unordered list item.
    const ulMatch = line.match(/^\s*[-*]\s+(.*)$/);
    if (ulMatch) {
      flushParagraph();
      if (!list || list.kind !== 'ul') {
        closeList();
        out.push('<ul>');
        list = { kind: 'ul' };
      }
      out.push(`<li>${inline(ulMatch[1])}</li>`);
      continue;
    }

    // Ordered list item.
    const olMatch = line.match(/^\s*\d+\.\s+(.*)$/);
    if (olMatch) {
      flushParagraph();
      if (!list || list.kind !== 'ol') {
        closeList();
        out.push('<ol>');
        list = { kind: 'ol' };
      }
      out.push(`<li>${inline(olMatch[1])}</li>`);
      continue;
    }
    closeList();

    // Plain text — accumulate into the current paragraph.
    paragraph.push(line.trim());
  }

  flushParagraph();
  closeList();
  closeQuote();
  return out.join('\n');
}

/**
 * Currency formatter for the Loan Structure block — matches the in-app PQ Memo
 * Overview (`components/PQMemoForm.tsx`): no fractional cents, and an empty
 * zero is rendered as "-" rather than "$0".
 */
const formatLoanCurrency = (value: number | string | undefined | null): string => {
  const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  if (!Number.isFinite(num) || num === 0) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

// ─── Loan Structure grouping ─────────────────────────────────────────────────
// Kept in sync with `components/PQMemoForm.tsx` so the PDF Overview matches the
// in-app Overview pixel-for-pixel: financing sources become columns under a
// "T Bank" / "Borrower" / "Other" group banner; Amount / Rate / Term / Guarantee
// are rows. The "Borrower" group sits between T Bank and Other and contains
// only Equity-typed sources.

type LoanGroupColumn = { key: string; label: string; source: any };
type LoanGroup = { key: 'tBank' | 'borrower' | 'other'; label: string; columns: LoanGroupColumn[] };

function isTBankSource(source: any): boolean {
  const ft = String(source?.financingType || source?.financingSource || source?.label || '').toLowerCase();
  if (!ft) return false;
  if (ft.includes('equity') || ft.includes('seller') || ft.includes('3rd') || ft.includes('third') || ft.includes('borrower')) {
    return false;
  }
  return true;
}

function isBorrowerSource(source: any): boolean {
  const ft = String(source?.financingType || source?.financingSource || source?.label || '').toLowerCase();
  return ft.includes('equity');
}

function buildLoanStructureGroups(sources: any[]): LoanGroup[] {
  const valid = (sources || []).filter((s) => s && (Number(s.amount) > 0 || s.financingType || s.financingSource));
  const tBank = valid.filter(isTBankSource);
  const borrower = valid.filter((s) => !isTBankSource(s) && isBorrowerSource(s));
  const other = valid.filter((s) => !isTBankSource(s) && !isBorrowerSource(s));
  const groups: LoanGroup[] = [];
  if (tBank.length > 0) {
    groups.push({
      key: 'tBank',
      label: 'T Bank',
      columns: tBank.map((s, i) => ({
        key: `tbank-${s.id || i}`,
        label: s.financingType || s.financingSource || s.label || `Source ${i + 1}`,
        source: s,
      })),
    });
  }
  if (borrower.length > 0) {
    groups.push({
      key: 'borrower',
      label: 'Borrower',
      columns: borrower.map((s, i) => ({
        key: `borrower-${s.id || i}`,
        label: s.financingType || s.financingSource || s.label || `Source ${i + 1}`,
        source: s,
      })),
    });
  }
  if (other.length > 0) {
    groups.push({
      key: 'other',
      label: 'Other',
      columns: other.map((s, i) => ({
        key: `other-${s.id || i}`,
        label: s.financingType || s.financingSource || s.label || `Source ${i + 1}`,
        source: s,
      })),
    });
  }
  return groups;
}

function sumGroupAmount(group: LoanGroup): number {
  return group.columns.reduce((s, c) => s + (Number(c.source?.amount) || 0), 0);
}

function sumGroupNetExposure(group: LoanGroup): number {
  return group.columns.reduce((s, c) => {
    const amt = Number(c.source?.amount) || 0;
    const guaranteeRaw = c.source?.guaranteePercent;
    const guaranteeNum = typeof guaranteeRaw === 'string' ? parseFloat(guaranteeRaw) : Number(guaranteeRaw) || 0;
    const guaranteePct = guaranteeNum > 1 ? guaranteeNum / 100 : guaranteeNum;
    return s + amt * (1 - guaranteePct);
  }, 0);
}

function sumAllAmounts(groups: LoanGroup[]): number {
  return groups.reduce((sum, g) => sum + sumGroupAmount(g), 0);
}

function formatLoanRate(source: any): string {
  const raw = source?.totalRate;
  if (raw == null || raw === '' || (typeof raw === 'number' && raw === 0)) return '-';
  const n = typeof raw === 'string' ? parseFloat(raw) : Number(raw);
  if (isNaN(n)) return '-';
  const pct = n < 1 ? n * 100 : n;
  return `${pct.toFixed(2)}%`;
}

function formatGuaranteePct(source: any): string {
  const raw = source?.guaranteePercent;
  const n = typeof raw === 'string' ? parseFloat(raw) : Number(raw) || 0;
  if (!Number.isFinite(n) || n <= 0) return '-';
  const pct = n > 1 ? n : n * 100;
  return `${pct.toFixed(0)}%`;
}

/**
 * Build the Business Questionnaire HTML block used by both the full PQ Memo
 * PDF and the BQ-only export. Pairs each applicable rule with its stored
 * response, buckets by mainCategory, and splits Project Purpose rules into
 * per-purpose subsections (primary first, then each secondary; rules with no
 * purposeKey collected into a "General" subsection). Numbering is continuous
 * across all subsections.
 */
function buildBusinessQuestionnaireSection(input: PQMemoInput): string {
  const questionnaireRules = (input.questionnaireRules || [])
    .slice()
    .sort((a, b) => (a.questionOrder ?? 0) - (b.questionOrder ?? 0));
  if (questionnaireRules.length === 0) return '';

  const responseByRuleId = new Map<string, string>();
  for (const r of input.questionnaireResponses || []) {
    if (r?.ruleId) responseByRuleId.set(r.ruleId, String(r.content ?? ''));
  }

  type Subsection = { title: string; rules: PQMemoQuestionnaireRule[] };
  const subsections: Subsection[] = [];

  const overviewRules = questionnaireRules.filter((r) => r.mainCategory === 'Business Overview');
  const purposeRules = questionnaireRules.filter((r) => r.mainCategory === 'Project Purpose');
  const industryRules = questionnaireRules.filter((r) => r.mainCategory === 'Industry');
  const otherRules = questionnaireRules.filter(
    (r) =>
      r.mainCategory !== 'Business Overview' &&
      r.mainCategory !== 'Project Purpose' &&
      r.mainCategory !== 'Industry',
  );

  if (overviewRules.length > 0) {
    subsections.push({ title: 'Business Overview', rules: overviewRules });
  }

  if (purposeRules.length > 0) {
    const primaryPurposes = input.projectPurposes?.primary ?? [];
    const secondaryPurposes = input.projectPurposes?.secondary ?? [];
    const orderedPurposes: string[] = [];
    const seenPurpose = new Set<string>();
    for (const p of [...primaryPurposes, ...secondaryPurposes]) {
      const key = normalizePurpose(p);
      if (!key || seenPurpose.has(key)) continue;
      seenPurpose.add(key);
      orderedPurposes.push(p);
    }

    if (orderedPurposes.length === 0) {
      subsections.push({ title: 'Project Purpose', rules: purposeRules });
    } else {
      const generalRules: PQMemoQuestionnaireRule[] = [];
      const buckets = new Map<string, PQMemoQuestionnaireRule[]>();
      for (const p of orderedPurposes) buckets.set(p, []);

      for (const rule of purposeRules) {
        const keys = rule.purposeKeys && rule.purposeKeys.length > 0
          ? rule.purposeKeys
          : (rule.purposeKey ? [rule.purposeKey] : []);
        if (keys.length === 0) {
          generalRules.push(rule);
          continue;
        }
        const match = orderedPurposes.find((p) =>
          keys.some((k) => normalizePurpose(k) === normalizePurpose(p)),
        );
        if (match) {
          buckets.get(match)!.push(rule);
        } else {
          generalRules.push(rule);
        }
      }

      if (generalRules.length > 0) {
        subsections.push({ title: 'Project Purpose - General', rules: generalRules });
      }
      for (const p of orderedPurposes) {
        const bucket = buckets.get(p) || [];
        if (bucket.length > 0) subsections.push({ title: `Project Purpose - ${p}`, rules: bucket });
      }
    }
  }

  if (industryRules.length > 0) {
    subsections.push({ title: 'Industry', rules: industryRules });
  }
  if (otherRules.length > 0) {
    subsections.push({ title: 'Other', rules: otherRules });
  }

  let n = 1;
  const subsectionHtml = subsections
    .map((sub) => {
      const rows = sub.rules
        .map((rule) => {
          const q = rule.questionText || rule.name || 'Question';
          const answer = (responseByRuleId.get(rule.id) || '').trim();
          const answerHtml = answer
            ? `<div class="qna-answer">${esc(answer)}</div>`
            : `<div class="qna-answer qna-empty">— No response provided —</div>`;
          const item = `<div class="qna-item">
            <div class="qna-question"><span class="qna-index">${n}.</span> ${esc(q)}</div>
            ${answerHtml}
          </div>`;
          n++;
          return item;
        })
        .join('');
      return `<div class="qna-subsection">
        <h3 class="qna-subsection-title">${esc(sub.title)}</h3>
        <div class="qna-list">${rows}</div>
      </div>`;
    })
    .join('');

  return `<div class="page-break"></div>
  <div class="section">
    <h2 class="section-title">Business Questionnaire</h2>
    ${subsectionHtml}
  </div>`;
}

/**
 * Standalone HTML page rendering ONLY the Business Questionnaire section,
 * using the same read-only styling as the full PQ Memo export. Consumed by
 * the BQ subtab's Export button so the output matches the PreQual PDF.
 */
export function generateBusinessQuestionnaireOnlyHTML(input: PQMemoInput): string {
  const projectName = input.projectName || 'Business Questionnaire';
  const exportedAt = new Date().toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  // Strip the leading page-break div the full PQ Memo prepends — there's
  // nothing to break from in the BQ-only document.
  const block = buildBusinessQuestionnaireSection(input).replace(
    /^\s*<div class="page-break"><\/div>\s*/,
    '',
  );

  const styleBlock = `
    @font-face {
      font-family: 'Roboto';
      font-style: normal;
      font-weight: 400;
      font-display: block;
      src: url('/fonts/roboto-400.woff2') format('woff2'),
           url('/fonts/roboto-400.woff')  format('woff');
    }
    @font-face {
      font-family: 'Roboto';
      font-style: normal;
      font-weight: 700;
      font-display: block;
      src: url('/fonts/roboto-700.woff2') format('woff2'),
           url('/fonts/roboto-700.woff')  format('woff');
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f5f7fa; padding: 20px; line-height: 1.6; color: #2c3e50; }
    .container { max-width: 1200px; margin: 0 auto; background: white; box-shadow: 0 2px 20px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden; padding: 24px 28px; }
    .doc-header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid #3498db; padding-bottom: 10px; margin-bottom: 16px; }
    .doc-title { font-size: 18px; font-weight: 700; color: #133c7f; }
    .doc-subtitle { font-size: 12px; color: #718bbc; }
    .section { margin-top: 14px; }
    .section-title { font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #2c3e50; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 2px solid #3498db; }
    .qna-list { display: flex; flex-direction: column; gap: 10px; }
    .qna-item { border: 1px solid #e1e8ed; border-radius: 6px; background: #fafbfc; padding: 8px 10px; page-break-inside: avoid; }
    .qna-question { font-weight: 600; color: #2c3e50; font-size: 13px; margin-bottom: 4px; }
    .qna-index { color: #6c757d; font-weight: 500; margin-right: 4px; }
    .qna-answer { font-size: 12.5px; color: #495057; line-height: 1.5; white-space: pre-wrap; }
    .qna-answer.qna-empty { color: #adb5bd; font-style: italic; }
    .qna-subsection { margin-top: 14px; }
    .qna-subsection:first-child { margin-top: 0; }
    .qna-subsection-title { font-size: 13px; font-weight: 700; color: #133c7f; margin: 0 0 6px; padding-bottom: 3px; border-bottom: 1px solid #c5d4e8; }
    @media print { body { background: white; padding: 0; } .container { box-shadow: none; border-radius: 0; } @page { size: letter; margin: 0.4in; } }
  `;

  const body = block
    ? block
    : `<div class="section"><h2 class="section-title">Business Questionnaire</h2>
        <div style="font-size:13px; color:#adb5bd; font-style:italic;">No questionnaire items apply to this project.</div>
       </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Business Questionnaire - ${esc(projectName)}</title>
<style>${styleBlock}</style>
</head>
<body>
<div class="container">
  <div class="doc-header">
    <div class="doc-title">${esc(projectName)}</div>
    <div class="doc-subtitle">Business Questionnaire · Exported ${esc(exportedAt)}</div>
  </div>
  ${body}
</div>
</body>
</html>`;
}

export function generatePQMemoHTML(input: PQMemoInput): string {
  const loanApp = input.loanApplication || {};
  const projectOverview = loanApp.projectOverview || {};
  const businessApplicant = loanApp.businessApplicant || {};
  const individualApplicants: any[] = loanApp.individualApplicants || [];
  const financingSources: any[] = loanApp.financingSources || [];
  // Prefer the new 7(a) Sources & Uses table (mirrors the in-app PQ Memo
  // Overview which reads `applicationData.sourcesUses7a`) and fall back to the
  // legacy `sourcesUses` shape so older projects still render something.
  const sourcesUsesData = (loanApp.sourcesUses7a || loanApp.sourcesUses || {}) as Record<
    string,
    Record<string, number> | undefined
  >;

  const borrowerName =
    businessApplicant.legalName || projectOverview.projectName || input.projectName || 'Draft';

  const bdo1 = projectOverview.bdo1 || projectOverview.bdoName || '';
  const bdo2 = projectOverview.bdo2 || '';
  const bdoNames = bdo2 ? `${bdo1}, ${bdo2}` : bdo1;

  const referralSource = projectOverview.referralSource || '';
  const referralFirm = projectOverview.referralFirm || '';
  const referralFeeRaw = projectOverview.referralFee;
  const referralFeePercentage =
    typeof referralFeeRaw === 'number'
      ? referralFeeRaw
      : typeof referralFeeRaw === 'string' && referralFeeRaw.trim() !== ''
        ? parseFloat(referralFeeRaw)
        : 0;
  const referralFee =
    Number.isFinite(referralFeePercentage) && referralFeePercentage > 0
      ? `${referralFeePercentage.toFixed(2)}%`
      : '';

  const repayment = Number(projectOverview.riskRepayment) || 0;
  const management = Number(projectOverview.riskManagement) || 0;
  const equity = Number(projectOverview.riskEquity) || 0;
  const collateral = Number(projectOverview.riskCollateral) || 0;
  const credit = Number(projectOverview.riskCredit) || 0;
  const liquidity = Number(projectOverview.riskLiquidity) || 0;
  const totalScore = repayment + management + equity + collateral + credit + liquidity;

  const scoreExplanations: Record<string, string> = input.scoreExplanations || {};
  const executiveSummary = input.executiveSummary || '';
  const memoNotes = input.memoNotes || '';
  const bdoSummaryNotes = projectOverview.bdoComments || '';

  // ── Business Questionnaire block ──────────────────────────────────────
  const questionnaireBlock = buildBusinessQuestionnaireSection(input);

  // ── Due Diligence Report block ────────────────────────────────────────
  // `reportText` is Markdown from the Claude DD prompt. We render via a
  // small inline converter (no extra deps) — handles headings, bold/italic,
  // bullet/numbered lists, paragraphs, inline code, and blockquotes.
  const dd = input.diligenceReport;
  const diligenceBlock = (() => {
    if (!dd || !dd.reportText?.trim()) return '';
    const generated = dd.generatedAt ? new Date(dd.generatedAt).toLocaleString() : '';
    const footer = generated
      ? `<div class="dd-meta">Generated ${esc(generated)}${dd.model ? ` · ${esc(dd.model)}` : ''}</div>`
      : '';
    return `<div class="page-break"></div>
    <div class="section">
      <h2 class="section-title">Due Diligence Report</h2>
      ${footer}
      <div class="dd-body">${markdownToHtml(dd.reportText)}</div>
    </div>`;
  })();

  const projectDescription = projectOverview.projectDescription || '';
  const businessDescription = businessApplicant.description || '';

  // Column derivation mirrors PQMemoForm.tsx: deduped financingType labels
  // from the loanApp's financingSources, with the legacy SBA column quartet
  // as the no-financingSources fallback.
  const suColumns: string[] = financingSources.length > 0
    ? (() => {
        const counts: Record<string, number> = {};
        return financingSources.map((fs: any) => {
          const base = String(fs?.financingType || fs?.id || '');
          counts[base] = (counts[base] || 0) + 1;
          return counts[base] > 1 ? `${base} (${counts[base]})` : base;
        });
      })()
    : ['tBankLoan', 'borrower', 'sellerNote', 'thirdParty'];

  const categoryOrder = [
    'realEstate',
    'debtRefiCRE',
    'debtRefiNonCRE',
    'equipment',
    'furnitureFixtures',
    'inventory',
    'businessAcquisition',
    'workingCapital',
    'closingCosts',
    'other',
  ] as const;

  const categoryLabels: Record<string, string> = {
    realEstate: 'Real Estate',
    debtRefiCRE: 'Debt Refi (CRE)',
    debtRefiNonCRE: 'Debt Refi (Non-CRE)',
    equipment: 'Equipment',
    furnitureFixtures: 'Furniture & Fixtures',
    inventory: 'Inventory',
    businessAcquisition: 'Business Acquisition',
    workingCapital: 'Working Capital',
    closingCosts: 'Closing Costs',
    other: 'Other',
  };

  const totals: Record<string, number> = {};
  suColumns.forEach((col) => {
    totals[col] = 0;
  });

  categoryOrder.forEach((category) => {
    const categoryData = sourcesUsesData[category];
    if (categoryData) {
      suColumns.forEach((col) => {
        totals[col] += Number(categoryData[col]) || 0;
      });
    }
  });

  const grandTotal = Object.values(totals).reduce((sum, val) => sum + val, 0);

  const percentages: Record<string, number> = {};
  suColumns.forEach((col) => {
    percentages[col] = grandTotal > 0 ? (totals[col] / grandTotal) * 100 : 0;
  });

  const keyIndividualsRows = individualApplicants
    .map((individual: any) => {
      let experienceDisplay = '-';
      if (individual.experience && individual.experience !== '') {
        const years = Number(individual.yearsOfExperience);
        if (Number.isFinite(years) && years > 0) {
          const yearLabel = years === 1 ? 'year' : 'years';
          experienceDisplay = `${esc(individual.experience)} - ${years} ${yearLabel}`;
        } else {
          experienceDisplay = esc(individual.experience);
        }
      }

      const ownershipPct =
        individual.ownershipPercentage !== undefined && individual.ownershipPercentage !== null
          ? `${Number(individual.ownershipPercentage).toFixed(2)}%`
          : '-';

      const netWorth =
        individual.netWorth !== undefined && individual.netWorth !== null
          ? formatCurrency(Number(individual.netWorth))
          : '-';
      const pcLiquidity =
        individual.pcLiquidity !== undefined && individual.pcLiquidity !== null
          ? formatCurrency(Number(individual.pcLiquidity))
          : '-';
      const reqDraw =
        individual.reqDraw !== undefined && individual.reqDraw !== null
          ? formatCurrency(Number(individual.reqDraw))
          : '-';

      return `
    <tr>
      <td>${esc(individual.firstName || '')} ${esc(individual.lastName || '')}</td>
      <td>${esc(individual.projectRole || '')}</td>
      <td>${ownershipPct}</td>
      <td>${esc(individual.businessRole || '')}</td>
      <td>${experienceDisplay}</td>
      <td>${netWorth}</td>
      <td>${pcLiquidity}</td>
      <td>${reqDraw}</td>
    </tr>
  `;
    })
    .join('');

  const styleBlock = `
        @font-face {
          font-family: 'Roboto';
          font-style: normal;
          font-weight: 400;
          font-display: block;
          src: url('/fonts/roboto-400.woff2') format('woff2'),
               url('/fonts/roboto-400.woff')  format('woff');
        }
        @font-face {
          font-family: 'Roboto';
          font-style: normal;
          font-weight: 700;
          font-display: block;
          src: url('/fonts/roboto-700.woff2') format('woff2'),
               url('/fonts/roboto-700.woff')  format('woff');
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f5f7fa; padding: 20px; line-height: 1.6; color: #2c3e50; }
        .container { max-width: 1200px; margin: 0 auto; background: white; box-shadow: 0 2px 20px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%); color: white; padding: 16px 20px; }
        .header-grid { display: grid; grid-template-columns: 1fr auto; gap: 24px; align-items: start; }
        .borrower-info h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
        .bdo-names { font-size: 14px; opacity: 0.95; margin-bottom: 2px; }
        .team-info { text-align: right; }
        .team-info-item { font-size: 12px; margin-bottom: 2px; opacity: 0.95; }
        .team-info-item strong { font-weight: 600; font-size: 12px; }
        .scores-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
        .scores-table thead tr { background: #2c3e50; color: #ffffff; }
        .scores-table thead th { padding: 9px 14px; text-align: center; font-weight: 700; font-size: 11px; letter-spacing: 0.8px; text-transform: uppercase; }
        .scores-table tbody tr { background: #ffffff; }
        .scores-table tbody td { padding: 9px 14px; border-bottom: 1px solid #e1e8ed; vertical-align: middle; }
        /* Loan Structure matrix — base rules copied from the
           user-provided reference CSS (joined .loan-structure-table /
           .project-info-table selectors). Additions for visual parity
           with the example PDF (pdfs/PQ_Memo_Little Dental Repair Shop
           LLC_2026-05-29.pdf): thin #3e5570 vertical dividers between
           header cells, and light-gray totals-row backgrounds with bold
           weight on group-total / net-exposure / total-project rows.
           The reference's .loan-col-num / .loan-col-source classes
           aren't in our HTML; the visual effect is reproduced via
           td.row-label and td:not(.row-label). */
        .loan-structure-table, .project-info-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 8px; }
        .loan-structure-table th, .project-info-table th { background: #2c3e50; color: white; padding: 6px 8px; text-align: left; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px; }
        .loan-structure-table th { border-right: 1px solid #3e5570; }
        .loan-structure-table thead th:last-child { border-right: 0; }
        .loan-structure-table thead tr.group-row th { text-align: center; }
        .loan-structure-table thead tr.col-row th:not(:first-child) { text-align: right; }
        .loan-structure-table td, .project-info-table td { padding: 5px 8px; border: 1px solid #e1e8ed; background: white; font-size: 13px; color: #2c3e50; }
        .loan-structure-table td.row-label { font-weight: 600; background: #fafbfc; }
        .loan-structure-table td:not(.row-label) { text-align: right; font-variant-numeric: tabular-nums; }
        .loan-structure-table tr.group-total-row td { background: #f3f4f6; font-weight: 700; }
        .loan-structure-table tr.net-exposure-row td { background: #f3f4f6; font-weight: 700; }
        .loan-structure-table tr.total-project-row td { background: #e5e7eb; font-weight: 700; }
        .loan-structure-empty { padding: 14px; text-align: center; color: #6b7280; font-style: italic; background: #ffffff; border: 1px solid #e5e7eb; font-size: 13px; }
        .score-cell { text-align: center; }
        .badge { display: inline-block; min-width: 34px; padding: 3px 10px; border-radius: 20px; font-weight: 700; font-size: 13px; text-align: center; }
        .badge-score { background: #e8f2fb; color: #2563a8; border: 1px solid #b8d4ef; }
        .badge-total { background: #2c3e50; color: #ffffff; font-size: 14px; }
        .content { padding: 16px 20px; }
        .section { margin-bottom: 16px; }
        .section-title { font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #2c3e50; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 2px solid #3498db; }
        .loan-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .loan-card, .project-card { border: 1px solid #e1e8ed; border-radius: 6px; padding: 10px; background: #fafbfc; }
        .loan-card h3, .project-card h3 { font-size: 15px; font-weight: 700; color: #2c3e50; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #e1e8ed; }
        .loan-details, .project-details { display: flex; flex-direction: column; gap: 4px; }
        .loan-detail, .project-detail { display: flex; justify-content: space-between; align-items: center; font-size: 13px; gap: 8px; }
        .loan-detail span, .project-detail span { color: #6c757d; }
        .loan-detail strong, .project-detail strong { color: #2c3e50; font-weight: 600; }
        .description-text { background: #f8f9fa; border: 1px solid #e1e8ed; border-radius: 6px; padding: 8px 10px; font-size: 13px; line-height: 1.5; color: #495057; }
        .key-individuals-table, .sources-uses-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
        .key-individuals-table th, .sources-uses-table th { background: #2c3e50; color: white; padding: 6px 5px; text-align: left; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px; }
        .key-individuals-table td, .sources-uses-table td { padding: 5px; border: 1px solid #e1e8ed; background: white; font-size: 13px; }
        .sources-uses-table td { text-align: right; }
        .sources-uses-table td:first-child { text-align: left; font-weight: 600; background: #fafbfc; }
        .percentage-row { background: #e3f2fd !important; font-weight: 600; }
        .percentage-row td { background: #e3f2fd !important; color: #1976d2; border-color: #90caf9; }
        .total-row { background: #f8f9fa !important; font-weight: 700; }
        .total-row td { background: #f8f9fa !important; border-top: 2px solid #2c3e50; border-bottom: 3px double #2c3e50; }
        .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .metric-card { background: #f8f9fa; border: 1px solid #e1e8ed; border-radius: 6px; padding: 8px 6px; text-align: center; }
        .metric-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px; color: #6c757d; margin-bottom: 4px; font-weight: 600; }
        .metric-value { font-size: 24px; font-weight: 700; color: #2c3e50; }
        .page-break { page-break-before: always; }
        .risk-scores-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
        .risk-score-card { border: 1px solid #e1e8ed; border-radius: 6px; padding: 12px; background: #fafbfc; }
        .risk-score-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px solid #e1e8ed; }
        .risk-score-header h4 { font-size: 15px; font-weight: 700; color: #2c3e50; text-transform: uppercase; letter-spacing: 0.3px; }
        .risk-score-badge { display: inline-flex; align-items: center; justify-content: center; background: #3498db; color: white; font-size: 16px; font-weight: 700; width: 30px; height: 30px; border-radius: 4px; }
        .risk-score-explanation { font-size: 13px; line-height: 1.5; color: #495057; }
        .risk-total-bar { margin-top: 8px; padding: 10px 12px; background: #2c3e50; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; }
        .risk-total-label { color: white; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
        .risk-total-value { color: white; font-size: 18px; font-weight: 700; }
        /* Summary cards — copied verbatim from the user-provided
           reference CSS. No HTML currently uses these classes; the rules
           are here so .summary-* renders correctly if added later. */
        .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .summary-card { border: 1px solid #e1e8ed; border-radius: 6px; padding: 10px; background: #fafbfc; }
        .summary-card h3 { font-size: 13px; font-weight: 700; color: #2c3e50; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #e1e8ed; }
        .summary-detail { display: flex; justify-content: space-between; align-items: center; font-size: 12px; gap: 8px; margin-bottom: 4px; }
        .summary-detail span { color: #6c757d; }
        .summary-detail strong { color: #2c3e50; font-weight: 600; }
        .spread-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
        .spread-table th { background: #2c3e50; color: white; padding: 6px 8px; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; }
        .spread-table th:first-child { text-align: left; }
        .spread-table th:not(:first-child) { text-align: right; }
        .spread-table td { padding: 4px 8px; border-bottom: 1px solid #e1e8ed; background: white; }
        .spread-table td:not(:first-child) { text-align: right; font-variant-numeric: tabular-nums; }
        .spread-table td:first-child { font-weight: 500; }
        .spread-section-row td { background: #f0f4ff !important; font-weight: 600; font-size: 11px; color: #2563a8; padding: 5px 8px; }
        .spread-negative { color: #dc2626; font-weight: 600; }
        .spread-subtitle { font-size: 12px; color: #6c757d; margin-top: 2px; }
        /* Business Questionnaire (read-only) */
        .qna-list { display: flex; flex-direction: column; gap: 10px; }
        .qna-item { border: 1px solid #e1e8ed; border-radius: 6px; background: #fafbfc; padding: 8px 10px; page-break-inside: avoid; }
        .qna-question { font-weight: 600; color: #2c3e50; font-size: 13px; margin-bottom: 4px; }
        .qna-index { color: #6c757d; font-weight: 500; margin-right: 4px; }
        .qna-answer { font-size: 12.5px; color: #495057; line-height: 1.5; white-space: pre-wrap; }
        .qna-answer.qna-empty { color: #adb5bd; font-style: italic; }
        .qna-subsection { margin-top: 14px; }
        .qna-subsection:first-child { margin-top: 0; }
        .qna-subsection-title { font-size: 13px; font-weight: 700; color: #133c7f; margin: 0 0 6px; padding-bottom: 3px; border-bottom: 1px solid #c5d4e8; }
        /* Due Diligence Report — copied verbatim from the user-provided
           reference CSS. The .dd-body table.dd-table sub-rules below
           aren't in the reference but are kept because the Markdown
           renderer emits <table class="dd-table"> for admin-authored
           DD tables and they'd render unstyled otherwise. */
        .dd-meta { font-size: 10px; color: #6c757d; margin-bottom: 8px; }
        .dd-body { font-size: 11px; color: #2c3e50; line-height: 1.5; }
        .dd-body h1 { font-size: 15px; font-weight: 700; color: #2c3e50; margin: 12px 0 6px; }
        .dd-body h2 { font-size: 13px; font-weight: 700; color: #2c3e50; margin: 10px 0 5px; padding-bottom: 3px; border-bottom: 1px solid #e1e8ed; }
        .dd-body h3 { font-size: 12px; font-weight: 600; color: #2563a8; margin: 8px 0 4px; }
        .dd-body h4, .dd-body h5, .dd-body h6 { font-size: 11px; font-weight: 600; color: #2563a8; margin: 6px 0 3px; }
        .dd-body p { margin: 0 0 6px; }
        .dd-body ul, .dd-body ol { margin: 0 0 6px; padding-left: 18px; }
        .dd-body li { margin-bottom: 2px; }
        .dd-body a { color: #2563a8; text-decoration: underline; }
        .dd-body strong { font-weight: 700; color: #2c3e50; }
        .dd-body em { font-style: italic; }
        .dd-body code { background: #f0f4ff; color: #2563a8; padding: 1px 4px; border-radius: 3px; font-family: monospace; font-size: 10px; }
        .dd-body blockquote { border-left: 3px solid #fbbf24; background: #fffbeb; padding: 4px 8px; margin: 6px 0; color: #7a4f00; }
        .dd-body hr { border: none; border-top: 1px solid #e1e8ed; margin: 8px 0; }
        .dd-body table.dd-table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 12px; border: 1px solid #c5d4e8; page-break-inside: auto; }
        .dd-body table.dd-table thead { display: table-header-group; }
        .dd-body table.dd-table tr { page-break-inside: avoid; }
        .dd-body table.dd-table th { background: #e7edf4; color: #133c7f; font-weight: 700; text-align: left; padding: 4px 6px; border: 1px solid #c5d4e8; vertical-align: top; }
        .dd-body table.dd-table td { padding: 4px 6px; border: 1px solid #c5d4e8; color: #2c3e50; vertical-align: top; }
        /* .qn-* — copied verbatim from the user-provided reference CSS.
           Our Business Questionnaire HTML uses .qna-* classes (defined
           above), so .qn-* rules are inert today; included here so the
           reference's selectors render correctly if any HTML is later
           switched to the .qn-* family. */
        .qn-category { font-size: 13px; font-weight: 700; color: #2c3e50; margin-top: 12px; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #e1e8ed; }
        .qn-subcategory { font-size: 12px; font-weight: 600; color: #2563a8; margin-top: 10px; margin-bottom: 6px; }
        .qn-item { margin-bottom: 10px; padding: 8px 10px; border: 1px solid #e1e8ed; border-radius: 4px; background: #fafbfc; }
        .qn-question { font-size: 11px; font-weight: 600; color: #2c3e50; margin-bottom: 4px; line-height: 1.4; }
        .qn-answer { font-size: 11px; color: #2c3e50; line-height: 1.5; white-space: pre-wrap; }
        .qn-no-response { color: #adb5bd; font-style: italic; }
        /* Mobile breakpoint — from the user-provided reference CSS. PDF
           rendering ignores viewport media queries, but kept for parity
           with the reference. */
        @media (max-width: 768px) { .content { padding: 24px; } }
        /* @media print — copied verbatim from the user-provided
           reference CSS. Puppeteer activates print media when rendering
           the PDF, so every rule in here applies to the exported PDF. */
        @media print {
          body { background: white; padding: 0; }
          .container { box-shadow: none; border-radius: 0; }
          @page { size: letter; margin: 0.4in; }
          .header { padding: 10px 12px; }
          .header-grid { display: grid !important; grid-template-columns: 1fr auto !important; gap: 20px !important; }
          .borrower-info h1 { font-size: 16px; margin-bottom: 3px; }
          .bdo-names { font-size: 11px; margin-bottom: 2px; }
          .team-info-item { font-size: 10px; margin-bottom: 2px; }
          .team-info-item strong { font-size: 10px; }
          .scores-table thead th { font-size: 9px; padding: 6px 8px; }
          .scores-table tbody td { padding: 6px 8px; }
          .badge { font-size: 11px; padding: 2px 8px; min-width: 28px; }
          .badge-total { font-size: 12px; }
          .content { padding: 10px 12px; }
          .section { margin-bottom: 10px; }
          .section-title { font-size: 11px; margin-bottom: 5px; padding-bottom: 3px; }
          .loan-structure-table th, .project-info-table th { padding: 5px 4px; font-size: 7px; }
          .loan-structure-table td, .project-info-table td { padding: 4px; font-size: 8px; }
          .loan-structure-table, .project-info-table { page-break-inside: avoid; margin-bottom: 6px; }
          .metrics-grid { display: grid !important; grid-template-columns: repeat(4, 1fr) !important; gap: 8px !important; }
          .metric-card { padding: 6px 4px; page-break-inside: avoid; }
          .metric-label { font-size: 8px; margin-bottom: 3px; }
          .metric-value { font-size: 14px; }
          .description-text { padding: 6px 8px; font-size: 9px; line-height: 1.3; }
          .sources-uses-table th, .key-individuals-table th { padding: 5px 4px; font-size: 7px; }
          .sources-uses-table td, .key-individuals-table td { padding: 4px; font-size: 8px; }
          .page-break { page-break-before: always; }
          .risk-scores-grid { display: block !important; }
          .risk-scores-grid > * { margin-bottom: 8px; }
          .risk-score-card { padding: 10px; page-break-inside: avoid; }
          .risk-score-header { margin-bottom: 4px; padding-bottom: 4px; }
          .risk-score-header h4 { font-size: 13px; }
          .risk-score-badge { font-size: 14px; width: 26px; height: 26px; }
          .risk-score-explanation { font-size: 12px; line-height: 1.5; }
          .risk-total-bar { margin-top: 6px; padding: 8px 10px; page-break-before: avoid; }
          .risk-total-label { font-size: 12px; }
          .risk-total-value { font-size: 15px; }
          .summary-grid { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 8px !important; }
          .summary-card { padding: 8px; page-break-inside: avoid; }
          .summary-card h3 { font-size: 10px; }
          .summary-detail { font-size: 9px; }
          .qn-item, .qn-category, .qn-subcategory { page-break-inside: avoid; }
        }
  `;

  const financialPeriods = input.financialPeriods || [];
  const spreadFileName = input.spreadFileName;

  const loanStructureTable = (() => {
    const groups = buildLoanStructureGroups(financingSources);
    const totalColCount = groups.reduce((sum, g) => sum + g.columns.length, 0);
    if (totalColCount === 0) {
      return `<div class="loan-structure-empty">No financing sources have been added yet.</div>`;
    }
    const grandTotal = sumAllAmounts(groups);
    const hasTBank = groups.some((g) => g.key === 'tBank');

    const groupHeaders = groups
      .map((g) => `<th colspan="${g.columns.length}">${esc(g.label)}</th>`)
      .join('');
    const colHeaders = groups
      .flatMap((g) => g.columns.map((col) => `<th>${esc(col.label)}</th>`))
      .join('');

    const rowCells = (rowLabel: 'Amount' | 'Rate' | 'Term' | 'Guarantee') =>
      groups
        .flatMap((g) =>
          g.columns.map((col) => {
            const source = col.source;
            if (rowLabel === 'Amount') return `<td>${formatLoanCurrency(source.amount)}</td>`;
            if (rowLabel === 'Rate') return `<td>${formatLoanRate(source)}</td>`;
            if (rowLabel === 'Term') return `<td>${source.termYears ? `${esc(source.termYears)} years` : '-'}</td>`;
            return `<td>${formatGuaranteePct(source)}</td>`;
          })
        )
        .join('');

    const dataRows = (['Amount', 'Rate', 'Term', 'Guarantee'] as const)
      .map((label) => `<tr><td class="row-label">${label}</td>${rowCells(label)}</tr>`)
      .join('');

    const groupTotalsRow = `<tr class="group-total-row">
      <td class="row-label">${groups[0]?.key === 'tBank' ? 'T Bank Total' : 'Group Total'}</td>
      ${groups
        .map(
          (g) =>
            `<td colspan="${g.columns.length}">${formatLoanCurrency(sumGroupAmount(g))}</td>`
        )
        .join('')}
    </tr>`;

    const netExposureRow = hasTBank
      ? `<tr class="net-exposure-row">
          <td class="row-label">T Bank Net Exposure</td>
          ${groups
            .map(
              (g) =>
                `<td colspan="${g.columns.length}">${
                  g.key === 'tBank' ? formatLoanCurrency(sumGroupNetExposure(g)) : ''
                }</td>`
            )
            .join('')}
        </tr>`
      : '';

    const totalProjectRow = `<tr class="total-project-row">
      <td class="row-label">Total Project</td>
      <td colspan="${totalColCount}">${formatLoanCurrency(grandTotal)}</td>
    </tr>`;

    return `<table class="loan-structure-table">
      <thead>
        <tr class="group-row"><th></th>${groupHeaders}</tr>
        <tr class="col-row"><th></th>${colHeaders}</tr>
      </thead>
      <tbody>
        ${dataRows}
        ${groupTotalsRow}
        ${netExposureRow}
        ${totalProjectRow}
      </tbody>
    </table>`;
  })();

  const sourcesUsesBlock =
    grandTotal > 0
      ? `<div class="section">
        <h2 class="section-title">Sources and Uses</h2>
        <table class="sources-uses-table">
          <thead>
            <tr>
              <th>Use Category</th>
              ${suColumns.map((col) => `<th>${esc(col)}</th>`).join('')}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr class="percentage-row">
              <td>%</td>
              ${suColumns.map((col) => `<td>${formatPercentage(percentages[col])}</td>`).join('')}
              <td>100%</td>
            </tr>
            ${categoryOrder
              .map((category) => {
                const categoryData = sourcesUsesData[category];
                if (!categoryData) return '';
                const rowTotal = suColumns.reduce(
                  (sum, col) => sum + (Number(categoryData[col]) || 0),
                  0,
                );
                if (rowTotal === 0) return '';
                return `<tr>
                <td>${categoryLabels[category]}</td>
                ${suColumns
                  .map(
                    (col) =>
                      `<td>${categoryData[col] ? formatCurrency(Number(categoryData[col])) : ''}</td>`,
                  )
                  .join('')}
                <td>${formatCurrency(rowTotal)}</td>
              </tr>`;
              })
              .join('')}
            <tr class="total-row">
              <td>Total</td>
              ${suColumns.map((col) => `<td>${formatCurrency(totals[col])}</td>`).join('')}
              <td>${formatCurrency(grandTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>`
      : '';

  // Cash Flow Analysis — mirrors the in-app PQMemoForm dscrItems exactly
  // (see components/PQMemoForm.tsx around line 386 + the MetricDisplay
  // component): always four cards, label is "{period} DSCR" when a period
  // is set and "Period N DSCR" otherwise, value is the ratio to 2 decimals
  // or "N/A" when null/undefined. Reads from loanApp.dscr instead of the
  // dead metricOverrides path that nothing populates.
  const dscrData = (loanApp.dscr || {}) as {
    period1?: string; period2?: string; period3?: string; period4?: string;
    dscr1?: number | null; dscr2?: number | null; dscr3?: number | null; dscr4?: number | null;
  };
  const dscrItems: Array<{ label: string; value: number | null | undefined }> = [
    { label: dscrData.period1 ? `${dscrData.period1} DSCR` : 'Period 1 DSCR', value: dscrData.dscr1 },
    { label: dscrData.period2 ? `${dscrData.period2} DSCR` : 'Period 2 DSCR', value: dscrData.dscr2 },
    { label: dscrData.period3 ? `${dscrData.period3} DSCR` : 'Period 3 DSCR', value: dscrData.dscr3 },
    { label: dscrData.period4 ? `${dscrData.period4} DSCR` : 'Period 4 DSCR', value: dscrData.dscr4 },
  ];
  const formatDscr = (v: number | null | undefined): string =>
    v == null ? 'N/A' : Number(v).toFixed(2);

  const metricsBlock = `<div class="section">
        <h2 class="section-title">Cash Flow Analysis</h2>
        <div class="metrics-grid">
          ${dscrItems
            .map(
              (item) =>
                `<div class="metric-card"><div class="metric-label">${esc(item.label)}</div><div class="metric-value">${formatDscr(item.value)}</div></div>`,
            )
            .join('')}
        </div>
      </div>`;

  const spreadBlock = (() => {
    if (!financialPeriods || financialPeriods.length === 0) return '';
    const currencyKeys = new Set([
      'totalRevenue', 'totalCogs', 'totalGrossMargin', 'totalOperatingExpenses',
      'ordinaryIncome', 'totalOtherIncomeExpenses', 'netIncomeBeforeTaxes',
      'standardAddBacks', 'otherAddBack1', 'otherAddBack2', 'otherAddBack3',
      'otherAddBack4', 'otherAddBack5', 'cashAvailable', 'existingDebtService',
      'proposed7aDebt', 'proposed504Debt', 'proposedCdcDebt', 'proposedSellerNote',
      'proposed3rdPartyFinancing', 'totalDebtService',
      'totalAffiliateCashAvailable', 'totalSubjectBusinessCashAvailable',
      'totalGlobalCashAvailable', 'totalAffiliateDebtService',
      'totalSubjectBusinessDebtService', 'totalGlobalDebtService',
    ]);
    const ratioKeys = new Set(['debtCoverageRatio', 'globalDebtCoverageRatio']);
    const fmtVal = (key: string, val: any): string => {
      if (val === undefined || val === null || val === '') return '—';
      if (ratioKeys.has(key)) {
        const n = typeof val === 'number' ? val : parseFloat(val);
        return isNaN(n) ? String(val) : `${n.toFixed(2)}x`;
      }
      if (currencyKeys.has(key)) {
        const n = typeof val === 'number' ? val : parseFloat(val);
        return isNaN(n)
          ? String(val)
          : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
      }
      return esc(val);
    };
    const isNeg = (key: string, val: any): boolean => {
      if (!currencyKeys.has(key) && !ratioKeys.has(key)) return false;
      const n = typeof val === 'number' ? val : parseFloat(val);
      return !isNaN(n) && n < 0;
    };
    const spreadSections: Array<{ title: string; fields: Array<{ key: string; label: string }> }> = [
      { title: 'Statement Details', fields: [
        { key: 'periodLabel', label: 'Period Label' }, { key: 'statementDate', label: 'Statement Date' },
        { key: 'monthsCovered', label: 'Months Covered' }, { key: 'statementType', label: 'Statement Type' },
        { key: 'revenueRecognition', label: 'Revenue Recognition' },
      ]},
      { title: 'Gross Income', fields: [
        { key: 'totalRevenue', label: 'Total Revenue' }, { key: 'totalCogs', label: 'Total COGS' },
        { key: 'totalGrossMargin', label: 'Total Gross Margin' },
      ]},
      { title: 'Net Income', fields: [
        { key: 'totalOperatingExpenses', label: 'Total Operating Expenses' }, { key: 'ordinaryIncome', label: 'Ordinary Income' },
        { key: 'totalOtherIncomeExpenses', label: 'Total Other Income/Expenses' }, { key: 'netIncomeBeforeTaxes', label: 'Net Income Before Taxes' },
      ]},
      { title: 'Add Backs & Adjustments', fields: [
        { key: 'standardAddBacks', label: 'Standard Add Backs' }, { key: 'otherAddBack1', label: 'Other Add Back 1' },
        { key: 'otherAddBack2', label: 'Other Add Back 2' }, { key: 'otherAddBack3', label: 'Other Add Back 3' },
        { key: 'otherAddBack4', label: 'Other Add Back 4' }, { key: 'otherAddBack5', label: 'Other Add Back 5' },
      ]},
      { title: 'Debt Coverage', fields: [
        { key: 'cashAvailable', label: 'Cash Available' }, { key: 'existingDebtService', label: 'Existing Debt Service' },
        { key: 'proposed7aDebt', label: 'Proposed 7(a) Debt' }, { key: 'proposed504Debt', label: 'Proposed 504 Debt' },
        { key: 'proposedCdcDebt', label: 'Proposed CDC Debt' }, { key: 'proposedSellerNote', label: 'Proposed Seller Note' },
        { key: 'proposed3rdPartyFinancing', label: 'Proposed 3rd Party Financing' },
        { key: 'totalDebtService', label: 'Total Debt Service' }, { key: 'debtCoverageRatio', label: 'Debt Coverage Ratio (DSCR)' },
      ]},
      { title: 'Global Debt Coverage', fields: [
        { key: 'totalAffiliateCashAvailable', label: 'Affiliate Cash Available' },
        { key: 'totalSubjectBusinessCashAvailable', label: 'Subject Business Cash Available' },
        { key: 'totalGlobalCashAvailable', label: 'Total Global Cash Available' },
        { key: 'totalAffiliateDebtService', label: 'Affiliate Debt Service' },
        { key: 'totalSubjectBusinessDebtService', label: 'Subject Business Debt Service' },
        { key: 'totalGlobalDebtService', label: 'Total Global Debt Service' },
        { key: 'globalDebtCoverageRatio', label: 'Global DSCR' },
      ]},
    ];
    const periodHeaders = financialPeriods
      .map((p: any, i: number) => `<th>${esc(p.periodLabel || 'Period ' + (i + 1))}</th>`)
      .join('');
    const bodyRows = spreadSections
      .map((section) => {
        const sectionRow = `<tr class="spread-section-row"><td colspan="${financialPeriods.length + 1}">${section.title}</td></tr>`;
        const fieldRows = section.fields
          .map((field) => {
            const cells = financialPeriods
              .map((period: any) => {
                const val = period[field.key];
                const neg = isNeg(field.key, val);
                return `<td${neg ? ' class="spread-negative"' : ''}>${fmtVal(field.key, val)}</td>`;
              })
              .join('');
            return `<tr><td>${field.label}</td>${cells}</tr>`;
          })
          .join('');
        return sectionRow + fieldRows;
      })
      .join('');
    return `<div class="page-break"></div>
      <div class="section">
        <h2 class="section-title">Financial Spread Comparison</h2>
        ${spreadFileName ? `<p class="spread-subtitle">${esc(spreadFileName)} — ${financialPeriods.length} period${financialPeriods.length !== 1 ? 's' : ''}</p>` : ''}
        <table class="spread-table">
          <thead><tr><th>Field</th>${periodHeaders}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div>`;
  })();

  const riskScoreCards = (() => {
    const items = [
      { key: 'repayment', label: 'Repayment', score: repayment },
      { key: 'management', label: 'Management', score: management },
      { key: 'equity', label: 'Equity', score: equity },
      { key: 'collateral', label: 'Collateral', score: collateral },
      { key: 'credit', label: 'Credit', score: credit },
      { key: 'liquidity', label: 'Liquidity', score: liquidity },
    ];
    return items
      .map((item, idx) => {
        const explanationHtml = scoreExplanations[item.key]
          ? `<div class="risk-score-explanation">${esc(scoreExplanations[item.key])}</div>`
          : '<div class="risk-score-explanation" style="color: #adb5bd; font-style: italic;">No explanation provided</div>';
        const card = `<div class="risk-score-card">
          <div class="risk-score-header">
            <h4>${item.label}</h4>
            <div class="risk-score-badge">${item.score}</div>
          </div>
          ${explanationHtml}
        </div>`;
        if (idx === items.length - 1) {
          return `<div style="page-break-inside: avoid;">${card}
            <div class="risk-total-bar">
              <span class="risk-total-label">Total Score</span>
              <span class="risk-total-value">${totalScore} / 30</span>
            </div></div>`;
        }
        return card;
      })
      .join('');
  })();

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SBA Preflight Memo - ${esc(borrowerName)}</title>
<style>${styleBlock}</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="header-grid">
      <div class="borrower-info">
        <h1>${esc(borrowerName)}</h1>
        <div class="bdo-names">${bdoNames ? `BDO: ${esc(bdoNames)}` : ''}</div>
      </div>
      <div class="team-info">
        ${referralSource ? `<div class="team-info-item"><strong>Referral Source:</strong> <span>${esc(referralSource)}</span></div>` : ''}
        ${referralFirm ? `<div class="team-info-item"><strong>Referral Firm:</strong> <span>${esc(referralFirm)}</span></div>` : ''}
        ${referralFee ? `<div class="team-info-item"><strong>Referral Fee:</strong> <span>${referralFee}</span></div>` : ''}
      </div>
    </div>
  </div>

  <div class="content">
    <div class="section">
      <h2 class="section-title">Loan Structure</h2>
      ${loanStructureTable}
    </div>

    <div class="section">
      <h2 class="section-title">Risk Scores</h2>
      <table class="scores-table">
        <thead>
          <tr>
            <th style="text-align:left">Category</th>
            <th>Repayment</th><th>Management</th><th>Equity</th>
            <th>Collateral</th><th>Credit</th><th>Liquidity</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td></td>
            <td class="score-cell"><span class="badge badge-score">${repayment}</span></td>
            <td class="score-cell"><span class="badge badge-score">${management}</span></td>
            <td class="score-cell"><span class="badge badge-score">${equity}</span></td>
            <td class="score-cell"><span class="badge badge-score">${collateral}</span></td>
            <td class="score-cell"><span class="badge badge-score">${credit}</span></td>
            <td class="score-cell"><span class="badge badge-score">${liquidity}</span></td>
            <td class="score-cell"><span class="badge badge-total">${totalScore}</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    ${projectDescription ? `<div class="section"><h2 class="section-title">Project Description</h2><div class="description-text">${esc(projectDescription)}</div></div>` : ''}
    ${businessDescription ? `<div class="section"><h2 class="section-title">Business Description</h2><div class="description-text">${esc(businessDescription)}</div></div>` : ''}

    ${individualApplicants.length > 0 ? `<div class="section">
      <h2 class="section-title">Key Individuals</h2>
      <table class="key-individuals-table">
        <thead>
          <tr>
            <th>Name</th><th>Role</th><th>Ownership %</th><th>Involvement</th>
            <th>Experience</th><th>Net Worth</th><th>Post-Close Liquidity</th><th>Required Income from Business</th>
          </tr>
        </thead>
        <tbody>${keyIndividualsRows}</tbody>
      </table>
    </div>` : ''}

    ${sourcesUsesBlock}
    ${metricsBlock}
    ${spreadBlock}

    <div class="page-break"></div>
    <div class="section">
      <h2 class="section-title">Risk Scores</h2>
      <div class="risk-scores-grid">${riskScoreCards}</div>
    </div>

    ${executiveSummary ? `<div class="section"><h2 class="section-title">Executive Summary</h2><div class="description-text">${esc(executiveSummary)}</div></div>` : ''}
    ${memoNotes ? `<div class="section"><h2 class="section-title">Memo Notes</h2><div class="description-text">${esc(memoNotes)}</div></div>` : ''}

    <div class="page-break"></div>
    <div class="section">
      <h2 class="section-title">BDO Summary</h2>
      ${bdoSummaryNotes ? `<div class="description-text">${bdoSummaryNotes}</div>` : '<div class="description-text" style="color: #adb5bd; font-style: italic;">No BDO summary notes provided</div>'}
    </div>

    ${questionnaireBlock}
    ${diligenceBlock}
  </div>
</div>
</body>
</html>`;
}

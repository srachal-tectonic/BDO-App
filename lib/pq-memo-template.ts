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
 *   - `scoreExplanations` and `metricOverrides` aren't persisted here, so the
 *     template gracefully degrades when they're missing.
 */

// Fonts are served to Chromium over a loopback HTTP server spun up by the
// PDF route, not inlined as data: URIs. Sparticuz's Chromium build refuses
// to decode data:-scheme fonts (document.fonts reports status "error" with
// no console log); http:// from the same page origin works normally.
export interface PQMemoInput {
  projectName: string;
  loanApplication: Record<string, any>;
  financialPeriods?: any[];
  spreadFileName?: string;
  /** Optional per-category narrative — keyed by risk category (repayment, management, ...). */
  scoreExplanations?: Record<string, string>;
  /** Optional metric override map (dscr2022, dscr2023, ...). */
  metricOverrides?: Record<string, number>;
  /** Optional executive-summary free text. */
  executiveSummary?: string;
  /** Optional general memo notes. */
  memoNotes?: string;
}

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

const formatDecimal = (value: number | undefined): string => {
  if (!value) return '0.00';
  return value.toFixed(2);
};

const esc = (s: unknown): string =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

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
// "T Bank" / "Other" group banner; Amount / Rate / Term / Guarantee are rows.

type LoanGroupColumn = { key: string; label: string; source: any };
type LoanGroup = { key: 'tBank' | 'other'; label: string; columns: LoanGroupColumn[] };

function isTBankSource(source: any): boolean {
  const ft = String(source?.financingType || source?.financingSource || source?.label || '').toLowerCase();
  if (!ft) return false;
  if (ft.includes('equity') || ft.includes('seller') || ft.includes('3rd') || ft.includes('third') || ft.includes('borrower')) {
    return false;
  }
  return true;
}

function buildLoanStructureGroups(sources: any[]): LoanGroup[] {
  const valid = (sources || []).filter((s) => s && (Number(s.amount) > 0 || s.financingType || s.financingSource));
  const tBank = valid.filter(isTBankSource);
  const other = valid.filter((s) => !isTBankSource(s));
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

export function generatePQMemoHTML(input: PQMemoInput): string {
  const loanApp = input.loanApplication || {};
  const projectOverview = loanApp.projectOverview || {};
  const businessApplicant = loanApp.businessApplicant || {};
  const individualApplicants: any[] = loanApp.individualApplicants || [];
  const financingSources: any[] = loanApp.financingSources || [];
  const sourcesUsesData = (loanApp.sourcesUses || {}) as Record<string, Record<string, number> | undefined>;

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

  const projectDescription = projectOverview.projectDescription || '';
  const businessDescription = businessApplicant.description || '';

  const sourceIds: string[] = financingSources.map((s) => s?.id).filter(Boolean);

  const categoryOrder = [
    'realEstate',
    'debtRefiCRE',
    'debtRefiNonCRE',
    'equipment',
    'furnitureFixtures',
    'inventory',
    'workingCapital',
    'workingCapitalPreOpening',
    'businessAcquisition',
    'franchiseFees',
    'constructionHardCosts',
    'constructionContingency',
    'interimInterestReserve',
    'otherConstructionSoftCosts',
    'closingCosts',
    'sbaGtyFee',
    'usdaGtyFee',
    'other',
  ] as const;

  const categoryLabels: Record<string, string> = {
    realEstate: 'Real Estate',
    debtRefiCRE: 'Debt Refi CRE',
    debtRefiNonCRE: 'Debt Refi Non-CRE',
    equipment: 'Equipment',
    furnitureFixtures: 'Furniture & Fixtures',
    inventory: 'Inventory',
    businessAcquisition: 'Business Acquisition',
    workingCapital: 'Working Capital',
    workingCapitalPreOpening: 'Working Capital - Pre Opening',
    franchiseFees: 'Franchise Fees',
    constructionHardCosts: 'Construction Hard Costs',
    constructionContingency: 'Construction Contingency',
    interimInterestReserve: 'Interest Reserve - 3 Mos',
    otherConstructionSoftCosts: 'Construction Soft Costs',
    closingCosts: 'Closing Costs',
    sbaGtyFee: 'SBA Gty Fee',
    usdaGtyFee: 'USDA Gty Fee',
    other: 'Other',
  };

  const totals: Record<string, number> = {};
  sourceIds.forEach((id) => {
    totals[id] = 0;
  });

  categoryOrder.forEach((category) => {
    const categoryData = sourcesUsesData[category];
    if (categoryData) {
      sourceIds.forEach((id) => {
        totals[id] += Number(categoryData[id]) || 0;
      });
    }
  });

  const grandTotal = Object.values(totals).reduce((sum, val) => sum + val, 0);

  const percentages: Record<string, number> = {};
  sourceIds.forEach((id) => {
    percentages[id] = grandTotal > 0 ? (totals[id] / grandTotal) * 100 : 0;
  });

  const metrics: Record<string, number> = input.metricOverrides || {};

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
        /* Loan Structure matrix — mirrors the in-app Overview tab. */
        .loan-structure-table { width: 100%; border-collapse: collapse; font-size: 12.5px; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
        .loan-structure-table thead th { color: #ffffff; font-weight: 600; font-size: 11px; letter-spacing: 0.6px; text-transform: uppercase; padding: 8px 10px; border-right: 1px solid #4b5563; }
        .loan-structure-table thead th:last-child { border-right: 0; }
        .loan-structure-table thead tr.group-row th { background: #374151; text-align: center; }
        .loan-structure-table thead tr.col-row th { background: #4b5563; text-align: right; padding: 7px 10px; }
        .loan-structure-table thead tr.col-row th:first-child { text-align: left; }
        .loan-structure-table tbody td { padding: 8px 10px; font-size: 12.5px; color: #374151; border-bottom: 1px solid #e5e7eb; text-align: right; font-variant-numeric: tabular-nums; }
        .loan-structure-table tbody td.row-label { background: #f9fafb; color: #374151; font-weight: 500; text-align: left; }
        .loan-structure-table tr.group-total-row td { background: #f3f4f6; border-top: 2px solid #9ca3af; font-weight: 600; color: #1f2937; }
        .loan-structure-table tr.net-exposure-row td { background: #f3f4f6; border-top: 1px solid #d1d5db; font-weight: 600; color: #1f2937; }
        .loan-structure-table tr.total-project-row td { background: #e5e7eb; border-top: 1px solid #9ca3af; font-weight: 700; color: #111827; }
        .loan-structure-empty { padding: 14px; text-align: center; color: #6b7280; font-style: italic; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 12.5px; }
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
        @media print { body { background: white; padding: 0; } .container { box-shadow: none; border-radius: 0; } @page { size: letter; margin: 0.4in; } }
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
              ${financingSources.map((s: any) => `<th>${esc(s.financingType || 'Source')}</th>`).join('')}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr class="percentage-row">
              <td>%</td>
              ${sourceIds.map((id) => `<td>${formatPercentage(percentages[id])}</td>`).join('')}
              <td>100%</td>
            </tr>
            ${categoryOrder
              .map((category) => {
                const categoryData = sourcesUsesData[category];
                if (!categoryData) return '';
                const rowTotal = sourceIds.reduce((sum, id) => sum + (Number(categoryData[id]) || 0), 0);
                if (rowTotal === 0) return '';
                return `<tr>
                <td>${categoryLabels[category]}</td>
                ${sourceIds.map((id) => `<td>${categoryData[id] ? formatCurrency(Number(categoryData[id])) : ''}</td>`).join('')}
                <td>${formatCurrency(rowTotal)}</td>
              </tr>`;
              })
              .join('')}
            <tr class="total-row">
              <td>Total</td>
              ${sourceIds.map((id) => `<td>${formatCurrency(totals[id])}</td>`).join('')}
              <td>${formatCurrency(grandTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>`
      : '';

  const metricsBlock =
    Object.keys(metrics).length > 0
      ? `<div class="section">
        <h2 class="section-title">Cash Flow Analysis</h2>
        <div class="metrics-grid">
          ${metrics.dscr2022 !== undefined ? `<div class="metric-card"><div class="metric-label">2022 DSCR</div><div class="metric-value">${formatDecimal(metrics.dscr2022)}</div></div>` : ''}
          ${metrics.dscr2023 !== undefined ? `<div class="metric-card"><div class="metric-label">2023 DSCR</div><div class="metric-value">${formatDecimal(metrics.dscr2023)}</div></div>` : ''}
          ${metrics.dscr2024 !== undefined ? `<div class="metric-card"><div class="metric-label">2024 DSCR</div><div class="metric-value">${formatDecimal(metrics.dscr2024)}</div></div>` : ''}
          ${metrics.interimDscr !== undefined ? `<div class="metric-card"><div class="metric-label">Interim DSCR</div><div class="metric-value">${formatDecimal(metrics.interimDscr)}</div></div>` : ''}
        </div>
      </div>`
      : '';

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
  </div>
</div>
</body>
</html>`;
}

// Shared logic for the admin "Internal Spreads Review" tab: load a project's
// parsed financial spread from Cosmos, serialize it into a readable markdown
// block, and compose the review prompt sent to the Azure OpenAI (Foundry)
// spreads-review deployment (app/api/internal-spreads-review).
import { getCollection, COLLECTIONS } from '@/lib/cosmosdb';
import { ObjectId } from 'mongodb';
import { extractApplicationFields, loadApplicationData } from '@/lib/diligenceShared';
import { DEFAULT_SPREADS_REVIEW_PROMPT } from '@/lib/spreadsReviewPrompt';

const ADMIN_SETTINGS_CONFIG_ID = 'config';

export { DEFAULT_SPREADS_REVIEW_PROMPT };

// The parsed-spread document stored in COLLECTIONS.FINANCIAL_SPREADS by
// POST /api/projects/[id]/financials.
export interface SpreadDoc {
  id: string;
  projectId: string;
  versionLabel: string;
  fileName: string;
  isActive: boolean;
  uploadedAt: string;
  periodData: Array<{ periodLabel: string; [key: string]: any }>;
  financingSources: Array<Record<string, any>>;
  sourcesUses: Array<{ label: string; values: Record<string, number | null>; total: number | null }>;
  sourcesUsesHeaders: string[];
  debtServiceLines: Array<{ key: string; label: string }>;
  guarantorDraws?: Array<{ name: string; reqDraw: number | null }>;
  postCloseLiquidity?: number | null;
}

// Load the spread to review: an explicit spreadId, else the active spread,
// else the most recently uploaded one. Returns null when the project has no
// spreads at all.
export async function loadSpreadForReview(
  projectId: string,
  spreadId?: string
): Promise<SpreadDoc | null> {
  const col = await getCollection(COLLECTIONS.FINANCIAL_SPREADS);

  let doc: any = null;
  if (spreadId) {
    try {
      doc = await col.findOne({ _id: new ObjectId(spreadId), projectId });
    } catch {
      return null; // malformed ObjectId
    }
  } else {
    doc =
      (await col.findOne({ projectId, isActive: true })) ||
      (await col.find({ projectId }).sort({ uploadedAt: -1 }).limit(1).next());
  }

  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { id: _id.toString(), ...rest } as SpreadDoc;
}

type FieldType = 'currency' | 'ratio' | 'percent' | 'date' | 'months' | 'string';

// Per-period field schema — mirrors SPREAD_SECTIONS in
// components/SpreadComparisonTable.tsx (kept separate because that module is
// 'use client' and this one runs in API routes).
const PERIOD_SECTIONS: Array<{ title: string; fields: Array<{ key: string; label: string; type?: FieldType }> }> = [
  {
    title: 'Statement Details',
    fields: [
      { key: 'statementDate', label: 'Statement Date', type: 'date' },
      { key: 'monthsCovered', label: 'Months Covered', type: 'months' },
      { key: 'statementType', label: 'Statement Type (Tax Returns / Internal)', type: 'string' },
      { key: 'revenueRecognition', label: 'Revenue Recognition (Cash / Accrual)', type: 'string' },
    ],
  },
  {
    title: 'Gross Income',
    fields: [
      { key: 'totalRevenue', label: 'Total Revenue' },
      { key: 'totalCogs', label: 'Total COGS' },
      { key: 'totalGrossMargin', label: 'Total Gross Margin' },
    ],
  },
  {
    title: 'Net Income',
    fields: [
      { key: 'totalOperatingExpenses', label: 'Total Operating Expenses' },
      { key: 'ordinaryIncome', label: 'Ordinary Income' },
      { key: 'totalOtherIncomeExpenses', label: 'Total Other Income/Expenses' },
      { key: 'netIncomeBeforeTaxes', label: 'Net Income Before Taxes' },
    ],
  },
  {
    title: 'Add Backs & Adjustments',
    fields: [
      { key: 'standardAddBacks', label: 'Standard Add Backs' },
      { key: 'otherAddBack1', label: 'Other Add Back 1' },
      { key: 'otherAddBack2', label: 'Other Add Back 2' },
      { key: 'estimatedPropertyTax', label: 'Estimated Property Tax' },
      { key: 'requiredOwnersDraw', label: "Required Owner's Draw" },
    ],
  },
  {
    title: 'Debt Coverage',
    fields: [
      { key: 'cashAvailable', label: 'Cash Available' },
      { key: 'existingDebtService', label: 'Existing Debt Service' },
      // Per-source proposed-debt rows are appended dynamically from the
      // spread's debtServiceLines (verbatim sheet labels), falling back to the
      // legacy fixed keys for spreads uploaded before those were captured.
      { key: 'totalDebtService', label: 'Total Debt Service' },
      { key: 'debtCoverageRatio', label: 'Debt Coverage Ratio', type: 'ratio' },
    ],
  },
  {
    title: 'Global Debt Coverage',
    fields: [
      { key: 'totalSubjectBusinessCashAvailable', label: 'Total Subject Business Cash Available' },
      { key: 'totalAffiliateCashAvailable', label: 'Total Affiliate Cash Available' },
      { key: 'totalGuarantorCashAvailable', label: 'Total Guarantor Cash Available' },
      { key: 'totalGlobalCashAvailable', label: 'Total Global Cash Available' },
      { key: 'totalSubjectBusinessDebtService', label: 'Total Subject Business Debt Service' },
      { key: 'globalDebtCoverageRatio', label: 'Global Debt Coverage Ratio', type: 'ratio' },
    ],
  },
];

const LEGACY_DEBT_SERVICE_FIELDS: Array<{ key: string; label: string }> = [
  { key: 'proposed7aDebt', label: 'Proposed 7a Debt' },
  { key: 'proposed504Debt', label: 'Proposed 504 Debt' },
  { key: 'proposedCdcDebt', label: 'Proposed CDC Debt' },
  { key: 'proposedSellerNote', label: 'Proposed Seller Note' },
  { key: 'proposed3rdPartyFinancing', label: 'Proposed 3rd Party Financing' },
];

function fmt(value: unknown, type: FieldType = 'currency'): string {
  if (value === undefined || value === null || value === '') return '—';
  if (type === 'string') return String(value);
  if (type === 'date') {
    // Excel serial dates arrive as numbers.
    if (typeof value === 'number' && value > 25569) {
      const d = new Date((value - 25569) * 86400 * 1000);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
    const d = new Date(value as any);
    return isNaN(d.getTime()) ? String(value) : d.toISOString().slice(0, 10);
  }
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num)) return String(value);
  if (type === 'months') return String(num);
  if (type === 'ratio') return `${num.toFixed(2)}x`;
  if (type === 'percent') return `${(num * 100).toFixed(2)}%`;
  return num.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

// Serialize the parsed spread into markdown tables the model can read reliably.
export function serializeSpread(spread: SpreadDoc): string {
  const out: string[] = [];

  out.push('## Financial Spread');
  out.push('');
  out.push(`- Version: ${spread.versionLabel || '—'}`);
  out.push(`- Source File: ${spread.fileName || '—'}`);
  out.push(`- Uploaded: ${spread.uploadedAt || '—'}`);
  out.push(`- Active Spread: ${spread.isActive ? 'Yes' : 'No'}`);

  // ── Financing Structure ──
  const sources = Array.isArray(spread.financingSources) ? spread.financingSources : [];
  if (sources.length) {
    out.push('');
    out.push('### Financing Structure');
    out.push('');
    out.push('| Source | Financing Source | Guarantee % | Amount | Rate Type | Term (yrs) | Amort (mo) | Base Rate | Spread | Total Rate |');
    out.push('|---|---|---|---|---|---|---|---|---|---|');
    for (const fs of sources) {
      out.push(
        `| ${fs.label ?? '—'} | ${fs.financingSource ?? '—'} | ${fs.guaranteePercent ?? '—'} | ${fmt(fs.amount)} | ${fs.rateType ?? '—'} | ${fs.termYears ?? '—'} | ${fs.amortizationMonths ?? '—'} | ${fs.baseRate ?? '—'} | ${fs.spread ?? '—'} | ${fs.totalRate ?? '—'} |`
      );
    }
  }

  // ── Sources & Uses ──
  const su = Array.isArray(spread.sourcesUses) ? spread.sourcesUses : [];
  const suHeaders = Array.isArray(spread.sourcesUsesHeaders) ? spread.sourcesUsesHeaders : [];
  if (su.length) {
    out.push('');
    out.push('### Sources & Uses of Proceeds');
    out.push('');
    out.push(`| Use | ${suHeaders.join(' | ')} | Total |`);
    out.push(`|---|${suHeaders.map(() => '---|').join('')}---|`);
    for (const row of su) {
      const cells = suHeaders.map((h) => fmt(row.values?.[h]));
      out.push(`| ${row.label ?? '—'} | ${cells.join(' | ')} | ${fmt(row.total)} |`);
    }
  }

  // ── Per-period income statement / debt coverage ──
  const periods = Array.isArray(spread.periodData) ? spread.periodData : [];
  if (periods.length) {
    const labels = periods.map((p, i) => p.periodLabel || `Period ${i + 1}`);
    const debtLines =
      Array.isArray(spread.debtServiceLines) && spread.debtServiceLines.length
        ? spread.debtServiceLines
        : LEGACY_DEBT_SERVICE_FIELDS;

    for (const section of PERIOD_SECTIONS) {
      let fields: Array<{ key: string; label: string; type?: FieldType }> = section.fields;
      if (section.title === 'Debt Coverage') {
        // Insert the per-source proposed-debt rows after Existing Debt Service.
        fields = [
          ...section.fields.slice(0, 2),
          ...debtLines,
          ...section.fields.slice(2),
        ];
      }
      // Skip sections where no period has any value.
      const hasData = fields.some((f) => periods.some((p) => p[f.key] !== undefined && p[f.key] !== null && p[f.key] !== ''));
      if (!hasData) continue;

      out.push('');
      out.push(`### ${section.title}`);
      out.push('');
      out.push(`| Line Item | ${labels.join(' | ')} |`);
      out.push(`|---|${labels.map(() => '---|').join('')}`);
      for (const f of fields) {
        const cells = periods.map((p) => fmt(p[f.key], f.type));
        out.push(`| ${f.label} | ${cells.join(' | ')} |`);
      }
    }
  }

  // ── Guarantors ──
  const draws = Array.isArray(spread.guarantorDraws) ? spread.guarantorDraws : [];
  if (draws.length || spread.postCloseLiquidity != null) {
    out.push('');
    out.push('### Guarantors');
    out.push('');
    for (const d of draws) {
      out.push(`- ${d.name}: Required Income From Business ${fmt(d.reqDraw)}`);
    }
    if (spread.postCloseLiquidity != null) {
      out.push(`- Post-Close Liquidity (project total): ${fmt(spread.postCloseLiquidity)}`);
    }
  }

  return out.join('\n');
}

// Compose the final prompt: review instructions (admin override → default) +
// a compact project-context block + the serialized spread.
export async function buildSpreadsReviewPrompt(
  projectId: string,
  spread: SpreadDoc
): Promise<string> {
  let instructions = DEFAULT_SPREADS_REVIEW_PROMPT;
  try {
    const adminCol = await getCollection(COLLECTIONS.ADMIN_SETTINGS);
    const adminDoc = (await adminCol.findOne({ id: ADMIN_SETTINGS_CONFIG_ID })) as any;
    const override = typeof adminDoc?.spreadsReviewPrompt === 'string' ? adminDoc.spreadsReviewPrompt.trim() : '';
    if (override) instructions = override;
  } catch (err) {
    console.warn('[spreads-review] Failed to load admin prompt override, using default:', err);
  }

  // Project context is best-effort — the review is still useful without a
  // saved loan application.
  const contextLines: string[] = [];
  try {
    const { loanApp, project } = await loadApplicationData(projectId);
    if (loanApp || project) {
      const f = extractApplicationFields(loanApp, project);
      const push = (label: string, v: string) => {
        if (v) contextLines.push(`- ${label}: ${v}`);
      };
      push('Legal Name', f.legalName);
      push('DBA', f.dba);
      push('Industry', f.industry);
      push('NAICS Code', f.naicsCode);
      push('Primary Project Purpose', f.primaryProjectPurpose);
      push('Secondary Project Purposes', f.secondaryProjectPurposes);
      push('Loan Amount Requested', f.loanAmount);
      push('Business Stage', f.businessStage);
      push('Years in Operation', f.yearsInOperation);
      push('Owners', f.ownerNames);
    }
  } catch (err) {
    console.warn('[spreads-review] Failed to load application context:', err);
  }

  const contextBlock = contextLines.length
    ? `\n\n---\n\n## Project Context\n\n${contextLines.join('\n')}`
    : '';

  return `${instructions}${contextBlock}\n\n---\n\n${serializeSpread(spread)}\n`;
}

'use client';

/**
 * Spread schema driven by the Ferrell Electric Spreads - Full Import.xlsm template.
 * Field `key`s are the camelCase names emitted by the uploader; field `label`s match
 * the row labels in the workbook's "Financial Spread" sheet (Income Statement Spreads
 * section onward). The Financing Structure and Sources & Uses sections in that same
 * sheet are per-source (not per-period), so they live on a separate component and
 * are intentionally excluded from the per-period comparison sections here.
 */

export type SpreadFieldType = 'currency' | 'ratio' | 'percent' | 'date' | 'months' | 'string';

export interface SpreadField {
  key: string;
  label: string;
  /** How the value should be formatted. Defaults to `currency` for backwards compat. */
  type?: SpreadFieldType;
  /** Display hint — render in bold / colored to distinguish totals from line items. */
  isTotal?: boolean;
}

export interface SpreadSection {
  title: string;
  fields: SpreadField[];
}

export const SPREAD_SECTIONS: SpreadSection[] = [
  {
    title: 'Period Metadata',
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
      { key: 'totalGrossMargin', label: 'Total Gross Margin', isTotal: true },
    ],
  },
  {
    title: 'Net Income',
    fields: [
      { key: 'totalOperatingExpenses', label: 'Total Operating Expenses' },
      { key: 'ordinaryIncome', label: 'Ordinary Income' },
      { key: 'totalOtherIncomeExpenses', label: 'Total Other Income/Expenses' },
      { key: 'netIncomeBeforeTaxes', label: 'Net Income Before Taxes', isTotal: true },
    ],
  },
  {
    title: 'Add Backs & Adjustments',
    fields: [
      { key: 'standardAddBacks', label: 'Standard Add Backs' },
      { key: 'otherAddBack1', label: 'Other Add Back 1' },
      { key: 'otherAddBack2', label: 'Other Add Back 2' },
      { key: 'otherAddBack3', label: 'Other Add Back 3' },
      { key: 'otherAddBack4', label: 'Other Add Back 4' },
      { key: 'otherAddBack5', label: 'Other Add Back 5' },
    ],
  },
  {
    title: 'Debt Coverage',
    fields: [
      { key: 'cashAvailable', label: 'Cash Available', isTotal: true },
      { key: 'existingDebtService', label: 'Existing Debt Service' },
      { key: 'proposed7aDebt', label: 'Proposed 7a Debt' },
      { key: 'proposed504Debt', label: 'Proposed 504 Debt' },
      { key: 'proposedCdcDebt', label: 'Proposed CDC Debt' },
      { key: 'proposedSellerNote', label: 'Proposed Seller Note' },
      { key: 'proposed3rdPartyFinancing', label: 'Proposed 3rd Party Financing' },
      { key: 'totalDebtService', label: 'Total Debt Service', isTotal: true },
      { key: 'debtCoverageRatio', label: 'Debt Coverage Ratio', type: 'ratio', isTotal: true },
    ],
  },
  {
    title: 'Global Debt Coverage',
    fields: [
      { key: 'totalAffiliateCashAvailable', label: 'Total Affiliate Cash Available' },
      { key: 'totalSubjectBusinessCashAvailable', label: 'Total Subject Business Cash Available' },
      { key: 'totalGlobalCashAvailable', label: 'Total Global Cash Available', isTotal: true },
      { key: 'totalAffiliateDebtService', label: 'Total Affiliate Debt Service' },
      { key: 'totalSubjectBusinessDebtService', label: 'Total Subject Business Debt Service' },
      { key: 'totalGlobalDebtService', label: 'Total Global Debt Service', isTotal: true },
      { key: 'globalDebtCoverageRatio', label: 'Global Debt Coverage Ratio', type: 'ratio', isTotal: true },
    ],
  },
];

// Flat lookup — type inferred per key so formatters don't need the SpreadField object.
const FIELD_TYPE_BY_KEY: Record<string, SpreadFieldType> = (() => {
  const out: Record<string, SpreadFieldType> = {};
  for (const section of SPREAD_SECTIONS) {
    for (const field of section.fields) {
      out[field.key] = field.type ?? 'currency';
    }
  }
  return out;
})();

export function formatSpreadValue(key: string, value: any): string {
  if (value === undefined || value === null || value === '') return '—';
  const type = FIELD_TYPE_BY_KEY[key] ?? 'currency';

  if (type === 'string') return String(value);

  if (type === 'date') {
    // Excel serial dates come through as numbers — convert to ISO date.
    if (typeof value === 'number' && value > 25569) {
      const ms = (value - 25569) * 86400 * 1000;
      const d = new Date(ms);
      if (!isNaN(d.getTime())) return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    return String(value);
  }

  const num = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(num)) return String(value);

  if (type === 'months') return `${num}`;
  if (type === 'ratio') return `${num.toFixed(2)}x`;
  if (type === 'percent') return `${(num * 100).toFixed(2)}%`;

  // currency (default)
  return num.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function isSpreadNegative(key: string, value: any): boolean {
  if (value === undefined || value === null) return false;
  const type = FIELD_TYPE_BY_KEY[key] ?? 'currency';
  if (type === 'string' || type === 'date' || type === 'months') return false;
  const num = typeof value === 'number' ? value : parseFloat(value);
  return !isNaN(num) && num < 0;
}

interface FinancialPeriod {
  periodLabel?: string;
  [key: string]: any;
}

export default function SpreadComparisonTable({ periods }: { periods: FinancialPeriod[] }) {
  if (!periods || periods.length === 0) {
    return <p className="text-[#7da1d4] text-center py-10 text-[13px]">No period data available for comparison.</p>;
  }

  return (
    <div>
      {SPREAD_SECTIONS.map(section => (
        <div key={section.title} className="mb-6">
          <h3 className="text-[13px] font-semibold text-[#2563eb] mb-2 pb-1 border-b-2 border-[#2563eb]">
            {section.title}
          </h3>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#c5d4e8]">
                <th className="text-left py-2 px-2 font-medium text-[#1a1a1a] min-w-[200px]">Item</th>
                {periods.map((p, i) => (
                  <th key={i} className="text-right py-2 px-2 font-medium text-[#1a1a1a] min-w-[120px]">
                    {p.periodLabel || `Period ${i + 1}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.fields.map(field => (
                <tr key={field.key} className="border-b border-[#e2e8f0] hover:bg-[#fafbfd]">
                  <td className="py-2 px-2 font-medium text-[#1a1a1a]">{field.label}</td>
                  {periods.map((p, i) => {
                    const val = p[field.key];
                    const neg = isSpreadNegative(field.key, val);
                    return (
                      <td key={i} className={`py-2 px-2 text-right tabular-nums ${neg ? 'text-red-600 font-medium' : 'text-[#1a1a1a]'}`}>
                        {formatSpreadValue(field.key, val)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

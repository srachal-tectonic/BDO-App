'use client';

export interface SpreadField {
  key: string;
  label: string;
}

export interface SpreadSection {
  title: string;
  fields: SpreadField[];
}

export const SPREAD_SECTIONS: SpreadSection[] = [
  {
    title: 'Income Statement',
    fields: [
      { key: 'revenue', label: 'Revenue / Sales' },
      { key: 'costOfGoodsSold', label: 'Cost of Goods Sold' },
      { key: 'grossProfit', label: 'Gross Profit' },
      { key: 'operatingExpenses', label: 'Operating Expenses' },
      { key: 'operatingIncome', label: 'Operating Income (EBIT)' },
      { key: 'interestExpense', label: 'Interest Expense' },
      { key: 'netIncome', label: 'Net Income' },
      { key: 'depreciation', label: 'Depreciation & Amortization' },
      { key: 'ebitda', label: 'EBITDA' },
    ],
  },
  {
    title: 'Balance Sheet - Assets',
    fields: [
      { key: 'cash', label: 'Cash & Equivalents' },
      { key: 'accountsReceivable', label: 'Accounts Receivable' },
      { key: 'inventory', label: 'Inventory' },
      { key: 'totalCurrentAssets', label: 'Total Current Assets' },
      { key: 'propertyPlantEquipment', label: 'Property, Plant & Equipment' },
      { key: 'totalAssets', label: 'Total Assets' },
    ],
  },
  {
    title: 'Balance Sheet - Liabilities & Equity',
    fields: [
      { key: 'accountsPayable', label: 'Accounts Payable' },
      { key: 'currentPortionLTD', label: 'Current Portion of LTD' },
      { key: 'totalCurrentLiabilities', label: 'Total Current Liabilities' },
      { key: 'longTermDebt', label: 'Long-Term Debt' },
      { key: 'totalLiabilities', label: 'Total Liabilities' },
      { key: 'totalEquity', label: 'Total Equity' },
    ],
  },
];

export function formatSpreadValue(key: string, value: any): string {
  if (value === undefined || value === null || value === '') return '—';
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(num)) return String(value);
  return num.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function isSpreadNegative(key: string, value: any): boolean {
  if (value === undefined || value === null) return false;
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

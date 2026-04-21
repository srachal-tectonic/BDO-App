'use client';

import { useApplication } from '@/lib/applicationStore';
import CollapsibleSection from '@/components/loan-sections/CollapsibleSection';
import SourcesUsesMatrix from '@/components/loan-sections/SourcesUsesMatrix';
import FinancingSourcesSection from '@/components/loan-sections/FinancingSourcesSection';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FundingStructureSectionProps {
  isReadOnly?: boolean;
  projectId?: string;
  existingWorkbooks?: any[];
  currentUser?: any;
  onWorkbookCreated?: (wb: any) => void;
  onWorkbookDeleted?: (id: string) => void;
  primarySpreadId?: string | null;
  onPrimarySpreadChanged?: (id: string | null) => void;
}

export default function FundingStructureSection({ isReadOnly = false }: FundingStructureSectionProps) {
  const { data, updateSourcesUses7a, updateDSCR } = useApplication();
  const sourcesUses = data.sourcesUses7a;
  const dscr = data.dscr ?? { period1: '', period2: '', period3: '', period4: '', dscr1: null, dscr2: null, dscr3: null, dscr4: null };

  // Stringify DSCR ratios for the <input> value; `null` → ''.
  const dscrVal = (n: number | null | undefined): string =>
    n == null || Number.isNaN(n as number) ? '' : String(n);

  const handleDscrChange = (idx: 1 | 2 | 3 | 4, raw: string) => {
    const trimmed = raw.trim();
    const parsed = trimmed === '' ? null : parseFloat(trimmed);
    const value = trimmed === '' ? null : (Number.isNaN(parsed as number) ? null : parsed);
    updateDSCR({ [`dscr${idx}`]: value } as any);
  };

  // The period dropdown's fixed list. If the imported spread has a label that
  // isn't in this list (e.g. "2021", "Dec 2023"), include it as a selectable
  // option so the Select can render it instead of silently falling back to empty.
  const BASE_PERIODS = ['2022', '2023', '2024', '2025', 'Interim'];
  const periodOptionsFor = (current: string | undefined): string[] => {
    const opts = [...BASE_PERIODS];
    if (current && !opts.includes(current)) opts.unshift(current);
    return opts;
  };

  // Build dynamic S&U columns from financing sources, deduplicating keys
  const financingSources = data.financingSources || [];
  const dynamicColumns = financingSources.length > 0
    ? (() => {
        const counts: Record<string, number> = {};
        return financingSources.map(fs => {
          const base = fs.financingType || fs.id;
          counts[base] = (counts[base] || 0) + 1;
          const key = counts[base] > 1 ? `${base} (${counts[base]})` : base;
          return { key, label: key };
        });
      })()
    : undefined; // undefined = use defaults

  const calculateTotal = () => {
    let total = 0;
    if (sourcesUses) {
      Object.values(sourcesUses).forEach((row: any) => {
        if (row && typeof row === 'object') {
          Object.values(row).forEach((value: any) => {
            if (typeof value === 'number') total += value;
          });
        }
      });
    }
    return total;
  };

  const totalProjectAmount = calculateTotal();

  return (
    <>
      <div className="p-4 pb-2">
        <h1 className="text-lg font-semibold text-[#133c7f] uppercase tracking-wider">Financials</h1>
      </div>

      <div className="px-4 pb-4">
        <div className="mb-6">
          <CollapsibleSection title="Financing Sources">
            <FinancingSourcesSection isReadOnly={isReadOnly} />
          </CollapsibleSection>
        </div>

        <CollapsibleSection title="Sources and Uses">
          <SourcesUsesMatrix isReadOnly={isReadOnly} sourcesUses={sourcesUses as any} updateSourcesUses={updateSourcesUses7a} columns={dynamicColumns} />

          <div className="mt-6 max-w-md">
            <label className="block text-sm font-semibold text-[#1a1a1a] mb-2">
              Total Project Amount
            </label>
            <input
              type="text"
              value={`$${totalProjectAmount.toLocaleString()}`}
              readOnly
              className="w-full px-3 py-1.5 border border-[#c5d4e8] rounded-lg text-lg font-semibold text-[#1a1a1a] bg-[#fafbfd]"
              data-testid="input-total-project-amount"
            />
            <p className="text-xs text-[#a1b3d2] mt-1.5">Sum of all sources and uses</p>
          </div>
        </CollapsibleSection>

        <div className="mt-6">
          <CollapsibleSection title="DSCR (Debt Service Coverage Ratio)">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
              <div>
                <label className="block text-[13px] font-medium text-[#1a1a1a] mb-2">Period 1</label>
                <Select value={dscr.period1 || ''} onValueChange={(v) => updateDSCR({ period1: v } as any)} disabled={isReadOnly}>
                  <SelectTrigger data-testid="select-dscr-period-1">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    {periodOptionsFor(dscr.period1).map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <label className="block text-[13px] font-medium text-[#1a1a1a] mb-2 mt-3">DSCR</label>
                <input
                  type="number"
                  value={dscrVal(dscr.dscr1)}
                  onChange={(e) => handleDscrChange(1, e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  disabled={isReadOnly}
                  className="w-full px-3 py-1.5 border border-[#c5d4e8] rounded-lg text-[13px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] disabled:bg-[#f3f4f6] disabled:cursor-not-allowed"
                  data-testid="input-dscr-value-1"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#1a1a1a] mb-2">Period 2</label>
                <Select value={dscr.period2 || ''} onValueChange={(v) => updateDSCR({ period2: v } as any)} disabled={isReadOnly}>
                  <SelectTrigger data-testid="select-dscr-period-2">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    {periodOptionsFor(dscr.period2).map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <label className="block text-[13px] font-medium text-[#1a1a1a] mb-2 mt-3">DSCR</label>
                <input
                  type="number"
                  value={dscrVal(dscr.dscr2)}
                  onChange={(e) => handleDscrChange(2, e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  disabled={isReadOnly}
                  className="w-full px-3 py-1.5 border border-[#c5d4e8] rounded-lg text-[13px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] disabled:bg-[#f3f4f6] disabled:cursor-not-allowed"
                  data-testid="input-dscr-value-2"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#1a1a1a] mb-2">Period 3</label>
                <Select value={dscr.period3 || ''} onValueChange={(v) => updateDSCR({ period3: v } as any)} disabled={isReadOnly}>
                  <SelectTrigger data-testid="select-dscr-period-3">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    {periodOptionsFor(dscr.period3).map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <label className="block text-[13px] font-medium text-[#1a1a1a] mb-2 mt-3">DSCR</label>
                <input
                  type="number"
                  value={dscrVal(dscr.dscr3)}
                  onChange={(e) => handleDscrChange(3, e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  disabled={isReadOnly}
                  className="w-full px-3 py-1.5 border border-[#c5d4e8] rounded-lg text-[13px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] disabled:bg-[#f3f4f6] disabled:cursor-not-allowed"
                  data-testid="input-dscr-value-3"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#1a1a1a] mb-2">Period 4</label>
                <Select value={dscr.period4 || ''} onValueChange={(v) => updateDSCR({ period4: v } as any)} disabled={isReadOnly}>
                  <SelectTrigger data-testid="select-dscr-period-4">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    {periodOptionsFor(dscr.period4).map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <label className="block text-[13px] font-medium text-[#1a1a1a] mb-2 mt-3">DSCR</label>
                <input
                  type="number"
                  value={dscrVal(dscr.dscr4)}
                  onChange={(e) => handleDscrChange(4, e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  disabled={isReadOnly}
                  className="w-full px-3 py-1.5 border border-[#c5d4e8] rounded-lg text-[13px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] disabled:bg-[#f3f4f6] disabled:cursor-not-allowed"
                  data-testid="input-dscr-value-4"
                />
              </div>
            </div>
          </CollapsibleSection>
        </div>
      </div>
    </>
  );
}

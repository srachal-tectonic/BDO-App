'use client';

import { useApplication } from '@/lib/applicationStore';
import CollapsibleSection from '@/components/loan-sections/CollapsibleSection';
import SourcesUsesMatrix from '@/components/loan-sections/SourcesUsesMatrix';
import FinancingSourcesSection from '@/components/loan-sections/FinancingSourcesSection';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';

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
  const { data, updateSourcesUses7a } = useApplication();
  const sourcesUses = data.sourcesUses7a;

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

  const [dscrPeriod1, setDscrPeriod1] = useState('2022');
  const [dscrPeriod2, setDscrPeriod2] = useState('2023');
  const [dscrPeriod3, setDscrPeriod3] = useState('2024');
  const [dscrPeriod4, setDscrPeriod4] = useState('Interim');
  const [dscrValue1, setDscrValue1] = useState('');
  const [dscrValue2, setDscrValue2] = useState('');
  const [dscrValue3, setDscrValue3] = useState('');
  const [dscrValue4, setDscrValue4] = useState('');

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
                <Select value={dscrPeriod1} onValueChange={setDscrPeriod1} disabled={isReadOnly}>
                  <SelectTrigger data-testid="select-dscr-period-1">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2022">2022</SelectItem>
                    <SelectItem value="2023">2023</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="Interim">Interim</SelectItem>
                  </SelectContent>
                </Select>
                <label className="block text-[13px] font-medium text-[#1a1a1a] mb-2 mt-3">DSCR</label>
                <input
                  type="number"
                  value={dscrValue1}
                  onChange={(e) => setDscrValue1(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  disabled={isReadOnly}
                  className="w-full px-3 py-1.5 border border-[#c5d4e8] rounded-lg text-[13px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] disabled:bg-[#f3f4f6] disabled:cursor-not-allowed"
                  data-testid="input-dscr-value-1"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#1a1a1a] mb-2">Period 2</label>
                <Select value={dscrPeriod2} onValueChange={setDscrPeriod2} disabled={isReadOnly}>
                  <SelectTrigger data-testid="select-dscr-period-2">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2022">2022</SelectItem>
                    <SelectItem value="2023">2023</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="Interim">Interim</SelectItem>
                  </SelectContent>
                </Select>
                <label className="block text-[13px] font-medium text-[#1a1a1a] mb-2 mt-3">DSCR</label>
                <input
                  type="number"
                  value={dscrValue2}
                  onChange={(e) => setDscrValue2(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  disabled={isReadOnly}
                  className="w-full px-3 py-1.5 border border-[#c5d4e8] rounded-lg text-[13px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] disabled:bg-[#f3f4f6] disabled:cursor-not-allowed"
                  data-testid="input-dscr-value-2"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#1a1a1a] mb-2">Period 3</label>
                <Select value={dscrPeriod3} onValueChange={setDscrPeriod3} disabled={isReadOnly}>
                  <SelectTrigger data-testid="select-dscr-period-3">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2022">2022</SelectItem>
                    <SelectItem value="2023">2023</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="Interim">Interim</SelectItem>
                  </SelectContent>
                </Select>
                <label className="block text-[13px] font-medium text-[#1a1a1a] mb-2 mt-3">DSCR</label>
                <input
                  type="number"
                  value={dscrValue3}
                  onChange={(e) => setDscrValue3(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  disabled={isReadOnly}
                  className="w-full px-3 py-1.5 border border-[#c5d4e8] rounded-lg text-[13px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] disabled:bg-[#f3f4f6] disabled:cursor-not-allowed"
                  data-testid="input-dscr-value-3"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#1a1a1a] mb-2">Period 4</label>
                <Select value={dscrPeriod4} onValueChange={setDscrPeriod4} disabled={isReadOnly}>
                  <SelectTrigger data-testid="select-dscr-period-4">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2022">2022</SelectItem>
                    <SelectItem value="2023">2023</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="Interim">Interim</SelectItem>
                  </SelectContent>
                </Select>
                <label className="block text-[13px] font-medium text-[#1a1a1a] mb-2 mt-3">DSCR</label>
                <input
                  type="number"
                  value={dscrValue4}
                  onChange={(e) => setDscrValue4(e.target.value)}
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

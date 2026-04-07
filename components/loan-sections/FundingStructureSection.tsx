'use client';

import CollapsibleSection from '@/components/loan-sections/CollapsibleSection';
import LoanDetailsSection from '@/components/loan-sections/LoanDetailsSection';
import { SourcesUsesCards } from '@/components/loan-sections/SourcesUsesCards';
import { useApplication } from '@/lib/applicationStore';
import { DSCRPeriod, SourcesUses } from '@/lib/schema';
import type { SpreadsWorkbook } from '@/types';
import { useEffect, useRef } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const DSCR_PERIOD_OPTIONS: DSCRPeriod[] = ['2022', '2023', '2024', '2025', 'Interim'];

interface FundingStructureSectionProps {
  isReadOnly?: boolean;
  projectId?: string;
  existingWorkbooks?: SpreadsWorkbook[];
  currentUser?: {
    uid: string;
    displayName: string | null;
  };
  onWorkbookCreated?: (workbook: SpreadsWorkbook) => void;
  onWorkbookDeleted?: (workbookId: string) => void;
  primarySpreadId?: string;
  onPrimarySpreadChanged?: (workbookId: string) => void;
}

export default function FundingStructureSection({
  isReadOnly = false,
  projectId,
  existingWorkbooks = [],
  currentUser,
  onWorkbookCreated,
  onWorkbookDeleted,
  primarySpreadId,
  onPrimarySpreadChanged,
}: FundingStructureSectionProps) {
  const {
    data,
    updateLoan1,
    updateLoan2,
    updateDSCR,
    updateSourcesUses7a,
    updateSourcesUses504,
    updateSourcesUsesExpress,
    updateAllSourcesUses,
  } = useApplication();
  const { sourcesUses7a, sourcesUses504, sourcesUsesExpress, loan1, loan2, dscr } = data;

  // Track previous amounts to detect actual changes
  const previousAmountsRef = useRef({ loan1: 0, loan2: 0 });

  // Calculate totals (use 7(a) table as the primary for total calculation)
  const calculateTotal = () => {
    if (!sourcesUses7a) return 0;
    return (sourcesUses7a.totalSources || 0);
  };

  // Calculate loan amounts from matrix and auto-select loan types
  useEffect(() => {
    if (!sourcesUses7a) return;

    let loan1Total = 0;
    let loan2Total = 0;

    // Loan 1: SBA 7(a) — use tBankLoan column total from 7(a) table
    loan1Total = sourcesUses7a.loanAmount || 0;
    // Loan 2: SBA 504 — use CDC 504 column total (stored as otherSources after cdc504→thirdParty mapping)
    loan2Total = sourcesUses504?.otherSources || 0;

    // Only update if amounts actually changed
    const prevAmounts = previousAmountsRef.current;
    if (prevAmounts.loan1 === loan1Total && prevAmounts.loan2 === loan2Total) {
      return;
    }

    previousAmountsRef.current = { loan1: loan1Total, loan2: loan2Total };

    // Update amounts
    const loan1Updates: any = { amount: loan1Total };
    const loan2Updates: any = { amount: loan2Total };

    // Auto-select loan type when amount is non-zero, clear when zero
    if (loan1Total > 0 && loan1 && !loan1.type) {
      loan1Updates.type = 'sba-7a-standard';
    } else if (loan1Total === 0) {
      loan1Updates.type = '';
    }

    if (loan2Total > 0 && loan2 && !loan2.type) {
      loan2Updates.type = 'sba-504';
    } else if (loan2Total === 0) {
      loan2Updates.type = '';
    }

    updateLoan1(loan1Updates);
    updateLoan2(loan2Updates);
  }, [sourcesUses7a, sourcesUses504]);

  const totalProjectAmount = calculateTotal();

  return (
    <div>
      <div className="p-4 sm:p-6 pb-3 sm:pb-4">
        <h1 className="text-[28px] font-bold text-[#1a1a1a]">Financials</h1>
      </div>

      <div className="px-4 sm:px-6">
        <CollapsibleSection title="Sources and Uses">
          <SourcesUsesCards
            projectId={projectId}
            existingWorkbooks={existingWorkbooks}
            currentUser={currentUser}
            onWorkbookCreated={onWorkbookCreated}
            onWorkbookDeleted={onWorkbookDeleted}
            isReadOnly={isReadOnly}
            sourcesUses7a={sourcesUses7a}
            sourcesUses504={sourcesUses504}
            sourcesUsesExpress={sourcesUsesExpress}
            updateSourcesUses7a={updateSourcesUses7a}
            updateSourcesUses504={updateSourcesUses504}
            updateSourcesUsesExpress={updateSourcesUsesExpress}
            updateAllSourcesUses={updateAllSourcesUses}
            primarySpreadId={primarySpreadId}
            onPrimarySpreadChanged={onPrimarySpreadChanged}
          />

          {/* Total Project Amount */}
          {totalProjectAmount > 0 && (
            <div className="mt-6 max-w-md">
              <label className="block text-sm font-semibold text-[#374151] mb-2">
                Total Project Amount
              </label>
              <input
                type="text"
                value={`$${totalProjectAmount.toLocaleString()}`}
                readOnly
                className="w-full px-4 py-3 border border-[#d1d5db] rounded-lg text-lg font-semibold text-[#1a1a1a] bg-[#f9fafb]"
                data-testid="input-total-project-amount"
              />
              <p className="text-xs text-[#9ca3af] mt-1.5">Sum of all sources and uses</p>
            </div>
          )}
        </CollapsibleSection>

        <div className="mt-6">
          <CollapsibleSection title="Loan Details" defaultExpanded>
            <LoanDetailsSection
              loan1={(loan1 || {}) as any}
              loan2={(loan2 || {}) as any}
              onUpdateLoan1={updateLoan1}
              onUpdateLoan2={updateLoan2}
              isReadOnly={isReadOnly}
            />
          </CollapsibleSection>
        </div>

        <div className="mt-6">
          <CollapsibleSection title="DSCR (Debt Service Coverage Ratio)">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Period 1 */}
              <div>
                <label htmlFor="period-1" className="block text-sm font-medium text-[#374151] mb-1.5">
                  Period 1
                </label>
                <Select
                  value={dscr?.period1 || ''}
                  onValueChange={(value) => updateDSCR({ period1: value as DSCRPeriod })}
                  disabled={isReadOnly}
                >
                  <SelectTrigger id="period-1" data-testid="select-period-1">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    {DSCR_PERIOD_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Period 2 */}
              <div>
                <label htmlFor="period-2" className="block text-sm font-medium text-[#374151] mb-1.5">
                  Period 2
                </label>
                <Select
                  value={dscr?.period2 || ''}
                  onValueChange={(value) => updateDSCR({ period2: value as DSCRPeriod })}
                  disabled={isReadOnly}
                >
                  <SelectTrigger id="period-2" data-testid="select-period-2">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    {DSCR_PERIOD_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Period 3 */}
              <div>
                <label htmlFor="period-3" className="block text-sm font-medium text-[#374151] mb-1.5">
                  Period 3
                </label>
                <Select
                  value={dscr?.period3 || ''}
                  onValueChange={(value) => updateDSCR({ period3: value as DSCRPeriod })}
                  disabled={isReadOnly}
                >
                  <SelectTrigger id="period-3" data-testid="select-period-3">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    {DSCR_PERIOD_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Period 4 */}
              <div>
                <label htmlFor="period-4" className="block text-sm font-medium text-[#374151] mb-1.5">
                  Period 4
                </label>
                <Select
                  value={dscr?.period4 || ''}
                  onValueChange={(value) => updateDSCR({ period4: value as DSCRPeriod })}
                  disabled={isReadOnly}
                >
                  <SelectTrigger id="period-4" data-testid="select-period-4">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    {DSCR_PERIOD_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* DSCR 1 */}
              <div>
                <label htmlFor="dscr-1" className="block text-sm font-medium text-[#374151] mb-1.5">
                  DSCR
                </label>
                <input
                  type="number"
                  id="dscr-1"
                  step="0.01"
                  placeholder="0.00"
                  value={dscr?.dscr1 ?? ''}
                  onChange={(e) => updateDSCR({ dscr1: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-full px-3 py-2 border border-[#d1d5db] rounded-lg text-[15px] text-[#1a1a1a] transition-all bg-white shadow-none outline-none focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] placeholder:text-[#9ca3af] disabled:bg-[#f3f4f6] disabled:cursor-not-allowed"
                  disabled={isReadOnly}
                  data-testid="input-dscr-1"
                />
              </div>

              {/* DSCR 2 */}
              <div>
                <label htmlFor="dscr-2" className="block text-sm font-medium text-[#374151] mb-1.5">
                  DSCR
                </label>
                <input
                  type="number"
                  id="dscr-2"
                  step="0.01"
                  placeholder="0.00"
                  value={dscr?.dscr2 ?? ''}
                  onChange={(e) => updateDSCR({ dscr2: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-full px-3 py-2 border border-[#d1d5db] rounded-lg text-[15px] text-[#1a1a1a] transition-all bg-white shadow-none outline-none focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] placeholder:text-[#9ca3af] disabled:bg-[#f3f4f6] disabled:cursor-not-allowed"
                  disabled={isReadOnly}
                  data-testid="input-dscr-2"
                />
              </div>

              {/* DSCR 3 */}
              <div>
                <label htmlFor="dscr-3" className="block text-sm font-medium text-[#374151] mb-1.5">
                  DSCR
                </label>
                <input
                  type="number"
                  id="dscr-3"
                  step="0.01"
                  placeholder="0.00"
                  value={dscr?.dscr3 ?? ''}
                  onChange={(e) => updateDSCR({ dscr3: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-full px-3 py-2 border border-[#d1d5db] rounded-lg text-[15px] text-[#1a1a1a] transition-all bg-white shadow-none outline-none focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] placeholder:text-[#9ca3af] disabled:bg-[#f3f4f6] disabled:cursor-not-allowed"
                  disabled={isReadOnly}
                  data-testid="input-dscr-3"
                />
              </div>

              {/* DSCR 4 */}
              <div>
                <label htmlFor="dscr-4" className="block text-sm font-medium text-[#374151] mb-1.5">
                  DSCR
                </label>
                <input
                  type="number"
                  id="dscr-4"
                  step="0.01"
                  placeholder="0.00"
                  value={dscr?.dscr4 ?? ''}
                  onChange={(e) => updateDSCR({ dscr4: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-full px-3 py-2 border border-[#d1d5db] rounded-lg text-[15px] text-[#1a1a1a] transition-all bg-white shadow-none outline-none focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] placeholder:text-[#9ca3af] disabled:bg-[#f3f4f6] disabled:cursor-not-allowed"
                  disabled={isReadOnly}
                  data-testid="input-dscr-4"
                />
              </div>
            </div>
          </CollapsibleSection>
        </div>
      </div>
    </div>
  );
}

'use client';

import { X, ChevronDown } from 'lucide-react';

interface LearnMorePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function LearnMorePanel({ isOpen, onClose, title, children }: LearnMorePanelProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-[100]"
        onClick={onClose}
        data-testid="learn-more-backdrop"
      />

      {/* Panel */}
      <div
        className={`
          fixed top-0 right-0 h-full w-full sm:w-[480px] bg-white shadow-2xl z-[101]
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          flex flex-col
        `}
        data-testid="learn-more-panel"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--t-color-border)] bg-white">
          <h2 className="text-xl font-semibold text-[color:var(--t-color-text-body)]">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-all flex-shrink-0"
            data-testid="button-close-learn-more"
            aria-label="Close"
          >
            <X className="w-6 h-6 text-[color:var(--t-color-text-secondary)]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </>
  );
}

export function IndirectOwnershipExplainer() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[color:var(--t-color-text-secondary)] text-[15px] mb-6">
          SBA requires disclosure of all natural persons who own 20% or more — including those who own through other entities.
        </p>
      </div>

      {/* Example Diagram */}
      <div className="bg-white border border-[var(--t-color-border)] rounded-lg p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--t-color-text-secondary)] mb-4">
          Example: ABC Restaurant LLC
        </div>

        <div className="flex flex-col items-center gap-0 w-full">
          {/* Top: Applicant Business */}
          <div className="flex justify-center w-full mb-3">
            <div className="px-4 py-3 rounded-lg text-center bg-gradient-to-br from-[#1e40af] to-[#2563eb] text-white">
              <div className="font-semibold text-sm">ABC Restaurant LLC</div>
              <div className="text-xs opacity-90 mt-0.5">Applicant Business</div>
            </div>
          </div>

          {/* Connector lines */}
          <div className="h-8 relative w-full max-w-[280px] flex justify-center mb-3">
            <div className="relative w-full h-full">
              <div className="absolute top-0 left-1/2 w-0.5 h-1/2 bg-[var(--t-color-disabled)] -translate-x-1/2"></div>
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[var(--t-color-disabled)]"></div>
              <div className="absolute bottom-0 left-0 w-0.5 h-1/2 bg-[var(--t-color-disabled)]"></div>
              <div className="absolute bottom-0 right-0 w-0.5 h-1/2 bg-[var(--t-color-disabled)]"></div>
            </div>
          </div>

          {/* Direct Owners */}
          <div className="grid grid-cols-2 gap-3 w-full mb-4">
            <div className="px-3 py-3 rounded-lg text-center bg-[#dcfce7] border-2 border-[#22c55e] text-[#166534]">
              <div className="font-semibold text-sm">Maria Garcia</div>
              <div className="text-xs opacity-85 mt-0.5">Natural Person</div>
              <div className="text-xs font-semibold mt-1.5 px-2 py-0.5 bg-black/10 rounded inline-block">60% Direct</div>
            </div>
            <div className="px-3 py-3 rounded-lg text-center bg-[#fef3c7] border-2 border-[#f59e0b] text-[#92400e]">
              <div className="font-semibold text-sm">Smith Holdings</div>
              <div className="text-xs opacity-85 mt-0.5">Entity Owner</div>
              <div className="text-xs font-semibold mt-1.5 px-2 py-0.5 bg-black/10 rounded inline-block">40% Direct</div>
            </div>
          </div>

          {/* Drill down notice */}
          <div className="flex items-start gap-2 mb-3 px-3 py-2.5 bg-[#eff6ff] border-l-[3px] border-[var(--t-color-accent)] rounded-r-lg text-xs text-[color:var(--t-color-primary)] w-full">
            <ChevronDown className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Drill down required:</strong> Who are the natural persons behind Smith Holdings LLC?
            </span>
          </div>

          {/* Second level connector */}
          <div className="h-8 relative w-full max-w-[200px] ml-auto mr-2 mb-3">
            <div className="relative w-full h-full">
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[var(--t-color-disabled)]"></div>
              <div className="absolute bottom-0 left-0 w-0.5 h-1/2 bg-[var(--t-color-disabled)]"></div>
              <div className="absolute bottom-0 right-0 w-0.5 h-1/2 bg-[var(--t-color-disabled)]"></div>
            </div>
          </div>

          {/* Entity Owners */}
          <div className="grid grid-cols-2 gap-3 w-full pl-2">
            <div className="px-3 py-3 rounded-lg text-center bg-[#dcfce7] border-2 border-[#22c55e] text-[#166534]">
              <div className="font-semibold text-sm">John Smith</div>
              <div className="text-xs opacity-85 mt-0.5">Natural Person</div>
              <div className="text-xs font-semibold mt-1.5 px-2 py-0.5 bg-black/10 rounded inline-block">75% of Entity</div>
            </div>
            <div className="px-3 py-3 rounded-lg text-center bg-[#dcfce7] border-2 border-[#22c55e] text-[#166534]">
              <div className="font-semibold text-sm">Jane Smith</div>
              <div className="text-xs opacity-85 mt-0.5">Natural Person</div>
              <div className="text-xs font-semibold mt-1.5 px-2 py-0.5 bg-black/10 rounded inline-block">25% of Entity</div>
            </div>
          </div>
        </div>

        {/* Calculation Box */}
        <div className="bg-[#f8fafc] rounded-lg p-4 mt-6 text-sm">
          <div className="font-semibold mb-3 text-[color:var(--t-color-text-body)]">Calculating Indirect Ownership</div>
          <div className="flex justify-between py-2 border-b border-dashed border-[#e2e8f0]">
            <span className="text-[color:var(--t-color-text-secondary)]">John Smith&apos;s indirect ownership:</span>
            <span className="font-mono text-[color:var(--t-color-primary)]">40% × 75% = <strong>30%</strong></span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-[color:var(--t-color-text-secondary)]">Jane Smith&apos;s indirect ownership:</span>
            <span className="font-mono text-[color:var(--t-color-primary)]">40% × 25% = <strong>10%</strong></span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-6 mt-6 pt-6 border-t border-[#e2e8f0] flex-wrap text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[var(--t-color-accent)]"></div>
            <span className="text-[color:var(--t-color-text-body)]">Applicant Business</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[#fef3c7] border-2 border-[#f59e0b]"></div>
            <span className="text-[color:var(--t-color-text-body)]">Entity (requires drill-down)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[#dcfce7] border-2 border-[#22c55e]"></div>
            <span className="text-[color:var(--t-color-text-body)]">Natural Person (individual)</span>
          </div>
        </div>
      </div>

      {/* Explanation */}
      <div className="bg-white border border-[var(--t-color-border)] rounded-lg p-6">
        <h3 className="text-base font-semibold text-[color:var(--t-color-text-body)] mb-4">Who Must Be Disclosed?</h3>

        <div className="space-y-4 text-[15px] text-[#475569]">
          <p>
            SBA requires information on all{' '}
            <span className="bg-[#fef3c7] px-1 py-0.5 rounded font-medium">natural persons</span>{' '}
            (real human beings) who own 20% or more of the applicant business. This includes both{' '}
            <strong>direct ownership</strong> (owning shares in the business directly) and{' '}
            <strong>indirect ownership</strong> (owning shares through another entity like an LLC, corporation, or trust).
          </p>

          <p>
            In the example above, Smith Holdings LLC owns 40% of ABC Restaurant. But an LLC isn&apos;t a person — so we must identify the individuals behind it. John Smith owns 75% of the LLC, giving him an indirect 30% stake in the restaurant (40% × 75%). Jane Smith&apos;s 25% stake in the LLC gives her a 10% indirect interest.
          </p>

          <p>
            Because John&apos;s indirect ownership exceeds 20%, he must complete SBA ownership disclosure forms — even though he doesn&apos;t directly own any part of ABC Restaurant.
          </p>

          <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-lg p-4 mt-4">
            <div className="flex items-center gap-2 font-semibold text-sm text-[#166534] mb-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 16v-4M12 8h.01"></path>
              </svg>
              The Key Principle
            </div>
            <p className="text-[#166534] text-sm m-0">
              We always trace ownership back to natural persons. If an entity owns part of your business, you must identify the people behind that entity — and continue drilling down through any additional entity layers until you reach real individuals.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

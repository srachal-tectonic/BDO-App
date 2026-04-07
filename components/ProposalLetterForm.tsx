'use client';

import { useState } from 'react';
import { ChevronRight, FileText } from 'lucide-react';
import Simple7aLOI from './proposal-letter-form/Simple7aLOI';

export interface Loan504Data {
  structure: 'interim' | 'permanent-first' | 'cdc-second' | 'all-three';
  projectDescription: string;
  interimLoan: {
    loanAmount: number | null;
    interestRate: string;
    termMonths: string;
    paymentType: 'interest-only' | 'principal-interest';
    collateral: string;
    maturityDate: string;
    purpose: string;
    repaymentSource: string;
  };
  permanentFirstLoan: {
    loanAmount: number | null;
    interestRate: string;
    termMonths: string;
    amortizationMonths: string;
    collateral: string;
    guarantee: string;
    purpose: string;
    takeoutDate: string;
  };
  cdcLoan: {
    loanAmount: number | null;
    interestRate: string;
    termYears: string;
    collateral: string;
    sbaGuarantee: string;
    cdcName: string;
    purpose: string;
    debentureRate: string;
  };
}

export interface LoanUsdaData {
  loanAmount: number | null;
  interestRate: string;
  guaranteePercentage: number;
  termYears: string;
  amortizationYears: string;
  purpose: string;
  collateral: string;
  personalGuarantee: string;
  lienPosition: string;
  tangibleBalanceSheetEquity: string;
  projectLocation: string;
  jobsCreatedRetained: string;
  eligibilityCriteria: string;
  communityBenefit: string;
  guaranteeFee: string;
  annualRenewalFee: string;
  equityInjectionRequired: string;
  equitySource: string;
  environmentalReview: string;
  feasibilityStudy: string;
  workingCapitalRequirements: string;
  debtServiceCoverage: string;
  disbursementTerms: string;
  specialConditions: string;
}

export default function ProposalLetterForm() {
  const [activeView, setActiveView] = useState<'menu' | '7a' | '504' | 'usda'>('menu');

  if (activeView === '7a') {
    return <Simple7aLOI onBack={() => setActiveView('menu')} />;
  }

  if (activeView === '504') {
    return (
      <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] min-h-[calc(100vh-160px)]">
        <div className="border-b border-[#e5e7eb] p-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveView('menu')}
              className="p-2 rounded-lg hover-elevate active-elevate-2"
              data-testid="button-back-from-504"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            <div>
              <h2 className="text-[20px] font-semibold text-[#1a1a1a]">504 Letter of Interest</h2>
              <p className="text-[#6b7280] text-[14px] mt-1">SBA 504 loan proposal letter</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-24 px-6">
          <div className="w-16 h-16 rounded-full bg-[#f59e0b]/10 flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-[#f59e0b]" />
          </div>
          <h3 className="text-[18px] font-semibold text-[#1a1a1a] mb-2">Coming Soon</h3>
          <p className="text-[#6b7280] text-[14px] text-center max-w-md">
            The 504 LOI generator is currently under development. Check back soon for updates.
          </p>
          <button
            onClick={() => setActiveView('menu')}
            className="mt-6 px-4 py-2 border border-[#d1d5db] text-[#374151] text-[14px] font-medium rounded-lg hover-elevate active-elevate-2"
            data-testid="button-back-from-504-bottom"
          >
            Back to Proposal Letters
          </button>
        </div>
      </div>
    );
  }

  if (activeView === 'usda') {
    return (
      <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] min-h-[calc(100vh-160px)]">
        <div className="border-b border-[#e5e7eb] p-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveView('menu')}
              className="p-2 rounded-lg hover-elevate active-elevate-2"
              data-testid="button-back-from-usda"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            <div>
              <h2 className="text-[20px] font-semibold text-[#1a1a1a]">USDA B&I Letter of Interest</h2>
              <p className="text-[#6b7280] text-[14px] mt-1">USDA Business &amp; Industry loan proposal letter</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-24 px-6">
          <div className="w-16 h-16 rounded-full bg-[#8b5cf6]/10 flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-[#8b5cf6]" />
          </div>
          <h3 className="text-[18px] font-semibold text-[#1a1a1a] mb-2">Coming Soon</h3>
          <p className="text-[#6b7280] text-[14px] text-center max-w-md">
            The USDA B&I LOI generator is currently under development. Check back soon for updates.
          </p>
          <button
            onClick={() => setActiveView('menu')}
            className="mt-6 px-4 py-2 border border-[#d1d5db] text-[#374151] text-[14px] font-medium rounded-lg hover-elevate active-elevate-2"
            data-testid="button-back-from-usda-bottom"
          >
            Back to Proposal Letters
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] min-h-[calc(100vh-160px)]">
      <div className="border-b border-[#e5e7eb] p-6">
        <h2 className="text-[20px] font-semibold text-[#1a1a1a]">Proposal Letter Generator</h2>
        <p className="text-[#6b7280] text-[14px] mt-1">Create professional SBA/USDA loan proposal letters</p>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setActiveView('7a')}
            className="text-left border border-[#e5e7eb] rounded-lg p-5 hover-elevate active-elevate-2 transition-colors"
            data-testid="card-7a-loi"
          >
            <div className="w-10 h-10 rounded-full bg-[#2563eb]/10 flex items-center justify-center mb-3">
              <FileText className="w-5 h-5 text-[#2563eb]" />
            </div>
            <h3 className="text-[16px] font-semibold text-[#1a1a1a] mb-1">7(a) LOI</h3>
            <p className="text-[#6b7280] text-[13px]">Generate a 7(a) Letter of Interest in T Bank format</p>
          </button>
          <button
            onClick={() => setActiveView('504')}
            className="text-left border border-[#e5e7eb] rounded-lg p-5 hover-elevate active-elevate-2 transition-colors"
            data-testid="card-504-loi"
          >
            <div className="w-10 h-10 rounded-full bg-[#f59e0b]/10 flex items-center justify-center mb-3">
              <FileText className="w-5 h-5 text-[#f59e0b]" />
            </div>
            <h3 className="text-[16px] font-semibold text-[#1a1a1a] mb-1">504 LOI</h3>
            <p className="text-[#6b7280] text-[13px]">SBA 504 loan proposal letter</p>
            <span className="inline-block mt-2 text-[11px] font-medium text-[#f59e0b] bg-[#f59e0b]/10 px-2 py-0.5 rounded-full">Coming Soon</span>
          </button>
          <button
            onClick={() => setActiveView('usda')}
            className="text-left border border-[#e5e7eb] rounded-lg p-5 hover-elevate active-elevate-2 transition-colors"
            data-testid="card-usda-loi"
          >
            <div className="w-10 h-10 rounded-full bg-[#8b5cf6]/10 flex items-center justify-center mb-3">
              <FileText className="w-5 h-5 text-[#8b5cf6]" />
            </div>
            <h3 className="text-[16px] font-semibold text-[#1a1a1a] mb-1">USDA B&I LOI</h3>
            <p className="text-[#6b7280] text-[13px]">USDA Business &amp; Industry loan proposal letter</p>
            <span className="inline-block mt-2 text-[11px] font-medium text-[#8b5cf6] bg-[#8b5cf6]/10 px-2 py-0.5 rounded-full">Coming Soon</span>
          </button>
        </div>
      </div>
    </div>
  );
}

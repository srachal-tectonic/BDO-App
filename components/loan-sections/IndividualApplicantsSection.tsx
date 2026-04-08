'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useApplication } from '@/lib/applicationStore';
import type { PersonalFinancialStatement } from '@/lib/applicationStore';
import { Plus, Trash2, ChevronDown, HelpCircle } from 'lucide-react';
import AddressInput from '@/components/loan-sections/AddressInput';
import PasswordToggle from '@/components/loan-sections/PasswordToggle';
import CollapsibleSection from '@/components/loan-sections/CollapsibleSection';
import LearnMorePanel from '@/components/LearnMorePanel';
import type { IndividualApplicant } from '@/lib/schema';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPhone(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return '(' + digits.slice(0, 3) + ') ' + digits.slice(3);
  return '(' + digits.slice(0, 3) + ') ' + digits.slice(3, 6) + '-' + digits.slice(6);
}

function currency(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function parseNum(val: string): number {
  const n = parseFloat(val.replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? 0 : n;
}

const defaultPFS: PersonalFinancialStatement = {
  name: '',
  asOfDate: '',
  cashOnHand: '',
  savingsAccounts: '',
  iraRetirement: '',
  accountsReceivable: '',
  lifeInsuranceCashValue: '',
  stocksAndBonds: '',
  realEstate: '',
  automobiles: '',
  otherPersonalProperty: '',
  otherAssets: '',
  accountsPayable: '',
  notesPayableToBanks: '',
  installmentAccountAuto: '',
  installmentAccountAutoPayments: '',
  installmentAccountOther: '',
  installmentAccountOtherPayments: '',
  loansAgainstLifeInsurance: '',
  mortgagesOnRealEstate: '',
  unpaidTaxes: '',
  otherLiabilities: '',
  salary: '',
  netInvestmentIncome: '',
  realEstateIncome: '',
  otherIncome: '',
  otherIncomeDescription: '',
  asEndorserOrCoMaker: '',
  legalClaimsJudgments: '',
  provisionFederalIncomeTax: '',
  otherSpecialDebt: '',
  notesPayable: [],
  securities: [],
  realEstateOwned: [],
  otherPersonalPropertyDescription: '',
  unpaidTaxesDescription: '',
  otherLiabilitiesDescription: '',
  lifeInsuranceDescription: '',
};

const defaultIndividualApplicant: IndividualApplicant = {
  id: '',
  firstName: '',
  middleName: '',
  lastName: '',
  suffix: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  ssn: '',
  ownershipPercentage: 0,
  address: { street1: '', city: '', state: '', zipCode: '' },
  homeAddress: { street1: '', city: '', state: '', zipCode: '' },
  projectRole: '',
  ownershipType: '',
  indirectOwnershipDescription: '',
  businessRole: '',
  businessRoleDescription: '',
  experience: '',
  yearsOfExperience: '',
  estimatedCreditScore: '',
  travelTime: '',
  planToBeOnSite: '',
};

// Shared input class
const inputCls =
  'w-full px-4 py-3 border border-[var(--t-color-border)] rounded-lg text-[15px] transition-all focus:border-[var(--t-color-accent)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] outline-none';

// ---------------------------------------------------------------------------
// PFS sub-component
// ---------------------------------------------------------------------------

interface PFSFormProps {
  applicantId: string;
  applicantName: string;
}

function PFSForm({ applicantId, applicantName }: PFSFormProps) {
  const { data, updatePersonalFinancialStatement } = useApplication();
  const pfs: PersonalFinancialStatement = data.personalFinancialStatements?.[applicantId] || { ...defaultPFS };

  const update = useCallback(
    (field: keyof PersonalFinancialStatement, value: any) => {
      updatePersonalFinancialStatement(applicantId, { ...pfs, [field]: value } as PersonalFinancialStatement);
    },
    [applicantId, pfs, updatePersonalFinancialStatement],
  );

  // ---------- Assets ----------
  const assetFields: { key: keyof PersonalFinancialStatement; label: string }[] = [
    { key: 'cashOnHand', label: 'Cash on Hand & in Banks' },
    { key: 'savingsAccounts', label: 'Savings Accounts' },
    { key: 'iraRetirement', label: 'IRA or Other Retirement Account' },
    { key: 'accountsReceivable', label: 'Accounts & Notes Receivable' },
    { key: 'lifeInsuranceCashValue', label: 'Life Insurance (Cash Surrender Value)' },
    { key: 'stocksAndBonds', label: 'Stocks and Bonds' },
    { key: 'realEstate', label: 'Real Estate' },
    { key: 'automobiles', label: 'Automobiles' },
    { key: 'otherPersonalProperty', label: 'Other Personal Property' },
    { key: 'otherAssets', label: 'Other Assets' },
  ];

  const liabilityFields: { key: keyof PersonalFinancialStatement; label: string }[] = [
    { key: 'accountsPayable', label: 'Accounts Payable' },
    { key: 'notesPayableToBanks', label: 'Notes Payable to Banks' },
    { key: 'installmentAccountAuto', label: 'Installment Account (Auto)' },
    { key: 'installmentAccountOther', label: 'Installment Account (Other)' },
    { key: 'loansAgainstLifeInsurance', label: 'Loans on Life Insurance' },
    { key: 'mortgagesOnRealEstate', label: 'Mortgages on Real Estate' },
    { key: 'unpaidTaxes', label: 'Unpaid Taxes' },
    { key: 'otherLiabilities', label: 'Other Liabilities' },
  ];

  const totalAssets = useMemo(
    () => assetFields.reduce((sum, f) => sum + parseNum(pfs[f.key] as string || ''), 0),
    [pfs, assetFields],
  );

  const totalLiabilities = useMemo(
    () => liabilityFields.reduce((sum, f) => sum + parseNum(pfs[f.key] as string || ''), 0),
    [pfs, liabilityFields],
  );

  const netWorth = totalAssets - totalLiabilities;
  const balanced = Math.abs(totalAssets - (totalLiabilities + netWorth)) < 0.01;

  // --- Schedule helpers ---
  const updateScheduleRow = useCallback(
    (field: 'notesPayable' | 'securities' | 'realEstateOwned', idx: number, key: string, value: string) => {
      const arr = [...(pfs[field] as any[])];
      arr[idx] = { ...arr[idx], [key]: value };
      updatePersonalFinancialStatement(applicantId, { ...pfs, [field]: arr } as PersonalFinancialStatement);
    },
    [applicantId, pfs, updatePersonalFinancialStatement],
  );

  const addScheduleRow = useCallback(
    (field: 'notesPayable' | 'securities' | 'realEstateOwned') => {
      const templates: Record<string, any> = {
        notesPayable: { noteholder: '', originalBalance: '', currentBalance: '', paymentAmount: '', frequency: '', collateral: '' },
        securities: { numberOfShares: '', nameOfSecurities: '', cost: '', marketValue: '', dateOfQuotation: '', totalValue: '' },
        realEstateOwned: { type: '', address: '', datePurchased: '', originalCost: '', presentMarketValue: '', mortgageHolder: '', mortgageAccountNumber: '', mortgageBalance: '', monthlyPayment: '', status: '' },
      };
      const arr = [...(pfs[field] as any[]), templates[field]];
      updatePersonalFinancialStatement(applicantId, { ...pfs, [field]: arr } as PersonalFinancialStatement);
    },
    [applicantId, pfs, updatePersonalFinancialStatement],
  );

  const removeScheduleRow = useCallback(
    (field: 'notesPayable' | 'securities' | 'realEstateOwned', idx: number) => {
      const arr = (pfs[field] as any[]).filter((_: any, i: number) => i !== idx);
      updatePersonalFinancialStatement(applicantId, { ...pfs, [field]: arr } as PersonalFinancialStatement);
    },
    [applicantId, pfs, updatePersonalFinancialStatement],
  );

  return (
    <div className="mt-6">
      <h4
        className="text-base font-semibold text-[color:var(--t-color-text-body)] mb-4 pb-2 border-b-2 border-[var(--t-color-accent)]"
      >
        SBA Personal Financial Statement
      </h4>

      {/* Name & As-Of Date */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        <div>
          <label className="block text-sm font-medium text-[color:var(--t-color-text-body)] mb-2">Name (as shown on statement)</label>
          <input
            type="text"
            value={pfs.name || applicantName}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Full Name"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[color:var(--t-color-text-body)] mb-2">As of Date</label>
          <input
            type="date"
            value={pfs.asOfDate}
            onChange={(e) => update('asOfDate', e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      {/* ---------- Section 1: Assets & Liabilities ---------- */}
      <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-4 mb-6">
        <h5 className="text-sm font-bold text-[#133c7f] mb-4 uppercase tracking-wide">Section 1 &mdash; Assets & Liabilities</h5>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Assets Column */}
          <div>
            <div className="text-sm font-semibold text-[#133c7f] mb-3 px-2 py-1 bg-[#c5d4e8] rounded">Assets</div>
            {assetFields.map((f) => (
              <div key={f.key} className="flex items-center justify-between gap-2 mb-2">
                <label className="text-sm text-[color:var(--t-color-text-body)] flex-1 min-w-0 truncate">{f.label}</label>
                <input
                  type="text"
                  value={pfs[f.key] as string || ''}
                  onChange={(e) => update(f.key, e.target.value)}
                  placeholder="$0"
                  className="w-32 px-3 py-2 border border-[var(--t-color-border)] rounded text-sm text-right"
                />
              </div>
            ))}
            <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-[#c5d4e8]">
              <span className="text-sm font-bold text-[#133c7f]">Total Assets</span>
              <span className="text-sm font-bold text-[#133c7f] w-32 text-right">{currency(totalAssets)}</span>
            </div>
          </div>

          {/* Liabilities Column */}
          <div>
            <div className="text-sm font-semibold text-[#133c7f] mb-3 px-2 py-1 bg-[#c5d4e8] rounded">Liabilities</div>
            {liabilityFields.map((f) => (
              <div key={f.key} className="flex items-center justify-between gap-2 mb-2">
                <label className="text-sm text-[color:var(--t-color-text-body)] flex-1 min-w-0 truncate">{f.label}</label>
                <input
                  type="text"
                  value={pfs[f.key] as string || ''}
                  onChange={(e) => update(f.key, e.target.value)}
                  placeholder="$0"
                  className="w-32 px-3 py-2 border border-[var(--t-color-border)] rounded text-sm text-right"
                />
              </div>
            ))}
            <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-[#c5d4e8]">
              <span className="text-sm font-bold text-[#133c7f]">Total Liabilities</span>
              <span className="text-sm font-bold text-[#133c7f] w-32 text-right">{currency(totalLiabilities)}</span>
            </div>
          </div>
        </div>

        {/* Net Worth & Balance */}
        <div className="mt-4 pt-4 border-t-2 border-[#133c7f] flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[#133c7f]">Net Worth:</span>
            <span className={`text-sm font-bold ${netWorth >= 0 ? 'text-green-700' : 'text-red-600'}`}>
              {currency(netWorth)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: balanced ? '#dcfce7' : '#fef2f2', color: balanced ? '#166534' : '#991b1b' }}>
              {balanced ? 'Balanced' : 'Not Balanced'}
            </span>
          </div>
        </div>
      </div>

      {/* ---------- Source of Income & Contingent Liabilities ---------- */}
      <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-4 mb-6">
        <h5 className="text-sm font-bold text-[#133c7f] mb-4 uppercase tracking-wide">Source of Income & Contingent Liabilities</h5>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Income */}
          <div>
            <div className="text-sm font-semibold text-[#133c7f] mb-3 px-2 py-1 bg-[#c5d4e8] rounded">Source of Income</div>
            {([
              { key: 'salary' as const, label: 'Salary' },
              { key: 'netInvestmentIncome' as const, label: 'Net Investment Income' },
              { key: 'realEstateIncome' as const, label: 'Real Estate Income' },
              { key: 'otherIncome' as const, label: 'Other Income' },
            ]).map((f) => (
              <div key={f.key} className="flex items-center justify-between gap-2 mb-2">
                <label className="text-sm text-[color:var(--t-color-text-body)] flex-1">{f.label}</label>
                <input
                  type="text"
                  value={pfs[f.key] as string || ''}
                  onChange={(e) => update(f.key, e.target.value)}
                  placeholder="$0"
                  className="w-32 px-3 py-2 border border-[var(--t-color-border)] rounded text-sm text-right"
                />
              </div>
            ))}
            <div className="mt-2">
              <label className="block text-sm text-[color:var(--t-color-text-body)] mb-1">Description of Other Income</label>
              <input
                type="text"
                value={pfs.otherIncomeDescription || ''}
                onChange={(e) => update('otherIncomeDescription', e.target.value)}
                placeholder="Describe other income sources"
                className={inputCls}
              />
            </div>
          </div>

          {/* Contingent */}
          <div>
            <div className="text-sm font-semibold text-[#133c7f] mb-3 px-2 py-1 bg-[#c5d4e8] rounded">Contingent Liabilities</div>
            {([
              { key: 'asEndorserOrCoMaker' as const, label: 'As Endorser or Co-Maker' },
              { key: 'legalClaimsJudgments' as const, label: 'Legal Claims & Judgments' },
              { key: 'provisionFederalIncomeTax' as const, label: 'Provision for Federal Income Tax' },
              { key: 'otherSpecialDebt' as const, label: 'Other Special Debt' },
            ]).map((f) => (
              <div key={f.key} className="flex items-center justify-between gap-2 mb-2">
                <label className="text-sm text-[color:var(--t-color-text-body)] flex-1">{f.label}</label>
                <input
                  type="text"
                  value={pfs[f.key] as string || ''}
                  onChange={(e) => update(f.key, e.target.value)}
                  placeholder="$0"
                  className="w-32 px-3 py-2 border border-[var(--t-color-border)] rounded text-sm text-right"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---------- Schedule 2: Notes Payable ---------- */}
      <CollapsibleSection title="Schedule 2 - Notes Payable to Banks and Others" defaultExpanded={false}>
        <p className="text-sm text-[color:var(--t-color-text-secondary)] mb-4">
          Use this section to itemize all notes payable, including the noteholder name, original and current balance, payment amount, frequency, and collateral securing the note.
        </p>
        {(pfs.notesPayable || []).map((row, idx) => (
          <div key={idx} className="border border-[var(--t-color-border)] rounded-lg p-4 mb-3 bg-white relative">
            <button
              type="button"
              onClick={() => removeScheduleRow('notesPayable', idx)}
              className="absolute top-2 right-2 text-red-500 hover:text-red-700 p-1"
              aria-label="Remove row"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Noteholder Name</label>
                <input type="text" value={row.noteholder} onChange={(e) => updateScheduleRow('notesPayable', idx, 'noteholder', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Original Balance</label>
                <input type="text" value={row.originalBalance} onChange={(e) => updateScheduleRow('notesPayable', idx, 'originalBalance', e.target.value)} placeholder="$0" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Current Balance</label>
                <input type="text" value={row.currentBalance} onChange={(e) => updateScheduleRow('notesPayable', idx, 'currentBalance', e.target.value)} placeholder="$0" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Payment Amount</label>
                <input type="text" value={row.paymentAmount} onChange={(e) => updateScheduleRow('notesPayable', idx, 'paymentAmount', e.target.value)} placeholder="$0" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Frequency</label>
                <select value={row.frequency} onChange={(e) => updateScheduleRow('notesPayable', idx, 'frequency', e.target.value)} className={inputCls}>
                  <option value="">Select</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annually">Annually</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Collateral</label>
                <input type="text" value={row.collateral} onChange={(e) => updateScheduleRow('notesPayable', idx, 'collateral', e.target.value)} className={inputCls} />
              </div>
            </div>
          </div>
        ))}
        <button type="button" onClick={() => addScheduleRow('notesPayable')} className="text-sm text-[color:var(--t-color-accent)] hover:underline flex items-center gap-1">
          <Plus className="w-4 h-4" /> Add Note
        </button>
      </CollapsibleSection>

      {/* ---------- Schedule 3: Stocks and Bonds ---------- */}
      <CollapsibleSection title="Schedule 3 - Stocks and Bonds" defaultExpanded={false}>
        <p className="text-sm text-[color:var(--t-color-text-secondary)] mb-4">
          List all stocks, bonds, and other securities owned. Include the number of shares, name, cost, market value, and date of quotation.
        </p>
        {(pfs.securities || []).map((row, idx) => (
          <div key={idx} className="border border-[var(--t-color-border)] rounded-lg p-4 mb-3 bg-white relative">
            <button
              type="button"
              onClick={() => removeScheduleRow('securities', idx)}
              className="absolute top-2 right-2 text-red-500 hover:text-red-700 p-1"
              aria-label="Remove row"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Number of Shares</label>
                <input type="text" value={row.numberOfShares} onChange={(e) => updateScheduleRow('securities', idx, 'numberOfShares', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Name of Securities</label>
                <input type="text" value={row.nameOfSecurities} onChange={(e) => updateScheduleRow('securities', idx, 'nameOfSecurities', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Cost</label>
                <input type="text" value={row.cost} onChange={(e) => updateScheduleRow('securities', idx, 'cost', e.target.value)} placeholder="$0" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Market Value</label>
                <input type="text" value={row.marketValue} onChange={(e) => updateScheduleRow('securities', idx, 'marketValue', e.target.value)} placeholder="$0" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Date of Quotation</label>
                <input type="date" value={row.dateOfQuotation} onChange={(e) => updateScheduleRow('securities', idx, 'dateOfQuotation', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Total Value</label>
                <input type="text" value={row.totalValue} onChange={(e) => updateScheduleRow('securities', idx, 'totalValue', e.target.value)} placeholder="$0" className={inputCls} />
              </div>
            </div>
          </div>
        ))}
        <button type="button" onClick={() => addScheduleRow('securities')} className="text-sm text-[color:var(--t-color-accent)] hover:underline flex items-center gap-1">
          <Plus className="w-4 h-4" /> Add Security
        </button>
      </CollapsibleSection>

      {/* ---------- Schedule 4: Real Estate Owned ---------- */}
      <CollapsibleSection title="Schedule 4 - Real Estate Owned" defaultExpanded={false}>
        <p className="text-sm text-[color:var(--t-color-text-secondary)] mb-4">
          List all real estate owned. Provide property type, address, purchase date, original cost, current market value, mortgage details, and status.
        </p>
        {(pfs.realEstateOwned || []).map((row, idx) => (
          <div key={idx} className="border border-[var(--t-color-border)] rounded-lg p-4 mb-3 bg-white relative">
            <button
              type="button"
              onClick={() => removeScheduleRow('realEstateOwned', idx)}
              className="absolute top-2 right-2 text-red-500 hover:text-red-700 p-1"
              aria-label="Remove row"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Property Type</label>
                <select value={row.type} onChange={(e) => updateScheduleRow('realEstateOwned', idx, 'type', e.target.value)} className={inputCls}>
                  <option value="">Select</option>
                  <option value="primary-residence">Primary Residence</option>
                  <option value="investment">Investment Property</option>
                  <option value="commercial">Commercial</option>
                  <option value="land">Land</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1">Address</label>
                <input type="text" value={row.address} onChange={(e) => updateScheduleRow('realEstateOwned', idx, 'address', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Date Purchased</label>
                <input type="date" value={row.datePurchased} onChange={(e) => updateScheduleRow('realEstateOwned', idx, 'datePurchased', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Original Cost</label>
                <input type="text" value={row.originalCost} onChange={(e) => updateScheduleRow('realEstateOwned', idx, 'originalCost', e.target.value)} placeholder="$0" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Present Market Value</label>
                <input type="text" value={row.presentMarketValue} onChange={(e) => updateScheduleRow('realEstateOwned', idx, 'presentMarketValue', e.target.value)} placeholder="$0" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Mortgage Holder</label>
                <input type="text" value={row.mortgageHolder} onChange={(e) => updateScheduleRow('realEstateOwned', idx, 'mortgageHolder', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Mortgage Account #</label>
                <input type="text" value={row.mortgageAccountNumber} onChange={(e) => updateScheduleRow('realEstateOwned', idx, 'mortgageAccountNumber', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Mortgage Balance</label>
                <input type="text" value={row.mortgageBalance} onChange={(e) => updateScheduleRow('realEstateOwned', idx, 'mortgageBalance', e.target.value)} placeholder="$0" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Monthly Payment</label>
                <input type="text" value={row.monthlyPayment} onChange={(e) => updateScheduleRow('realEstateOwned', idx, 'monthlyPayment', e.target.value)} placeholder="$0" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Status</label>
                <select value={row.status} onChange={(e) => updateScheduleRow('realEstateOwned', idx, 'status', e.target.value)} className={inputCls}>
                  <option value="">Select</option>
                  <option value="current">Current</option>
                  <option value="delinquent">Delinquent</option>
                  <option value="foreclosure">In Foreclosure</option>
                </select>
              </div>
            </div>
          </div>
        ))}
        <button type="button" onClick={() => addScheduleRow('realEstateOwned')} className="text-sm text-[color:var(--t-color-accent)] hover:underline flex items-center gap-1">
          <Plus className="w-4 h-4" /> Add Property
        </button>
      </CollapsibleSection>

      {/* ---------- Schedule 5: Other Personal Property ---------- */}
      <CollapsibleSection title="Schedule 5 - Other Personal Property" defaultExpanded={false}>
        <p className="text-sm text-[color:var(--t-color-text-secondary)] mb-4">
          Describe other personal property of significant value (art, jewelry, collections, etc.) that is not listed elsewhere.
        </p>
        <textarea
          value={pfs.otherPersonalPropertyDescription || ''}
          onChange={(e) => update('otherPersonalPropertyDescription', e.target.value)}
          placeholder="Describe other personal property..."
          rows={4}
          className={`${inputCls} resize-none`}
        />
      </CollapsibleSection>

      {/* ---------- Schedule 6: Unpaid Taxes ---------- */}
      <CollapsibleSection title="Schedule 6 - Unpaid Taxes" defaultExpanded={false}>
        <p className="text-sm text-[color:var(--t-color-text-secondary)] mb-4">
          Describe any unpaid taxes including the type of tax, the taxing authority, the amount owed, and any payment arrangements.
        </p>
        <textarea
          value={pfs.unpaidTaxesDescription || ''}
          onChange={(e) => update('unpaidTaxesDescription', e.target.value)}
          placeholder="Describe unpaid taxes..."
          rows={4}
          className={`${inputCls} resize-none`}
        />
      </CollapsibleSection>

      {/* ---------- Schedule 7: Other Liabilities ---------- */}
      <CollapsibleSection title="Schedule 7 - Other Liabilities" defaultExpanded={false}>
        <p className="text-sm text-[color:var(--t-color-text-secondary)] mb-4">
          Describe any other liabilities not covered above, including judgments, garnishments, or other obligations.
        </p>
        <textarea
          value={pfs.otherLiabilitiesDescription || ''}
          onChange={(e) => update('otherLiabilitiesDescription', e.target.value)}
          placeholder="Describe other liabilities..."
          rows={4}
          className={`${inputCls} resize-none`}
        />
      </CollapsibleSection>

      {/* ---------- Schedule 8: Life Insurance ---------- */}
      <CollapsibleSection title="Schedule 8 - Life Insurance Held" defaultExpanded={false}>
        <p className="text-sm text-[color:var(--t-color-text-secondary)] mb-4">
          Provide details about life insurance policies including the insurance company, beneficiary, face amount, and cash surrender value.
        </p>
        <textarea
          value={pfs.lifeInsuranceDescription || ''}
          onChange={(e) => update('lifeInsuranceDescription', e.target.value)}
          placeholder="Describe life insurance policies held..."
          rows={4}
          className={`${inputCls} resize-none`}
        />
      </CollapsibleSection>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function IndividualApplicantsSection() {
  const {
    data,
    addIndividualApplicant,
    updateIndividualApplicant,
    removeIndividualApplicant,
  } = useApplication();

  const individualApplicants = data.individualApplicants || [];
  const projectName = data.projectOverview?.projectName || '';

  const [expandedApplicants, setExpandedApplicants] = useState<string[]>([]);
  const [isLearnMoreOpen, setIsLearnMoreOpen] = useState(false);
  const hasInitialized = useRef(false);

  // Auto-expand first applicant on initial load
  useEffect(() => {
    if (!hasInitialized.current && individualApplicants.length > 0) {
      setExpandedApplicants([individualApplicants[0].id]);
      hasInitialized.current = true;
    }
  }, [individualApplicants]);

  const toggleExpanded = (id: string) => {
    setExpandedApplicants((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const updateApplicant = (id: string, field: keyof IndividualApplicant, value: any) => {
    updateIndividualApplicant(id, { [field]: value } as Partial<IndividualApplicant>);
  };

  const handleAddApplicant = () => {
    if (individualApplicants.length >= 5) return;
    const newId = addIndividualApplicant({ ...defaultIndividualApplicant, id: undefined as any });
    setExpandedApplicants((prev) => [...prev, newId]);
  };

  return (
    <div>
      {/* Title */}
      <div className="p-4 pb-2">
        <h1 className="text-lg font-semibold text-[color:var(--t-color-primary)] uppercase tracking-wider">
          Individual Applicant Information
        </h1>
      </div>

      <div className="px-4 pb-6 space-y-4">
        {individualApplicants.map((applicant, index) => {
          const isExpanded = expandedApplicants.includes(applicant.id);
          const displayName =
            applicant.firstName && applicant.lastName
              ? `${applicant.firstName} ${applicant.lastName}`
              : `Applicant ${index + 1}`;

          return (
            <div
              key={applicant.id}
              className="bg-white border border-[#c5d4e8] rounded-lg overflow-hidden"
            >
              {/* Accordion Header */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer bg-[#fafbfd] border-b border-[#c5d4e8]"
                onClick={() => toggleExpanded(applicant.id)}
                data-testid={`toggle-applicant-${index + 1}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#133c7f] text-white flex items-center justify-center text-sm font-semibold">
                    {index + 1}
                  </div>
                  <h3 className="text-base font-semibold text-[#1a1a1a]">{displayName}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <ChevronDown className={`w-5 h-5 text-[#7da1d4] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-4 pt-3 pb-4 space-y-3">
                  <div className="border border-[#c5d4e8] rounded-md bg-white">
                    <div className="px-3 py-2 bg-[#fafbfd] border-b border-[#c5d4e8] rounded-t-md">
                      <h4 className="text-sm font-semibold text-[#133c7f]">Applicant Details</h4>
                    </div>
                    <div className="p-3">
                  {/* ======= Personal Information ======= */}
                  <div className="mb-2">
                    <h4 className="text-[13px] font-semibold text-[#4263a5] mb-1.5 pb-1 border-b border-[#e7edf4]">
                      Personal Information
                    </h4>

                    {/* First / Middle / Last / Suffix */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-[color:var(--t-color-text-body)] mb-2">First Name</label>
                        <input
                          type="text"
                          value={applicant.firstName}
                          onChange={(e) => updateApplicant(applicant.id, 'firstName', e.target.value)}
                          placeholder="First Name"
                          className={inputCls}
                          data-testid={`input-applicant-${applicant.id}-firstname`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[color:var(--t-color-text-body)] mb-2">Middle Name</label>
                        <input
                          type="text"
                          value={applicant.middleName || ''}
                          onChange={(e) => updateApplicant(applicant.id, 'middleName', e.target.value)}
                          placeholder="Middle Name"
                          className={inputCls}
                          data-testid={`input-applicant-${applicant.id}-middlename`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[color:var(--t-color-text-body)] mb-2">Last Name</label>
                        <input
                          type="text"
                          value={applicant.lastName}
                          onChange={(e) => updateApplicant(applicant.id, 'lastName', e.target.value)}
                          placeholder="Last Name"
                          className={inputCls}
                          data-testid={`input-applicant-${applicant.id}-lastname`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[color:var(--t-color-text-body)] mb-2">Suffix</label>
                        <input
                          type="text"
                          value={applicant.suffix || ''}
                          onChange={(e) => updateApplicant(applicant.id, 'suffix', e.target.value)}
                          placeholder="Jr., Sr., III, etc."
                          className={inputCls}
                          data-testid={`input-applicant-${applicant.id}-suffix`}
                        />
                      </div>
                    </div>

                    {/* SSN / DOB / Phone / Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-[color:var(--t-color-text-body)] mb-2">Social Security Number</label>
                        <PasswordToggle
                          id={`ssn-${applicant.id}`}
                          value={applicant.ssn}
                          onChange={(value) => updateApplicant(applicant.id, 'ssn', value)}
                          placeholder="XXX-XX-XXXX"
                          testId={`input-applicant-${applicant.id}-ssn`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[color:var(--t-color-text-body)] mb-2">Date of Birth</label>
                        <input
                          type="date"
                          value={applicant.dateOfBirth || ''}
                          onChange={(e) => updateApplicant(applicant.id, 'dateOfBirth', e.target.value)}
                          className={inputCls}
                          data-testid={`input-applicant-${applicant.id}-dob`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[color:var(--t-color-text-body)] mb-2">Phone</label>
                        <input
                          type="tel"
                          value={applicant.phone}
                          onChange={(e) => updateApplicant(applicant.id, 'phone', formatPhone(e.target.value))}
                          placeholder="(555) 555-5555"
                          className={inputCls}
                          data-testid={`input-applicant-${applicant.id}-phone`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[color:var(--t-color-text-body)] mb-2">Email</label>
                        <input
                          type="email"
                          value={applicant.email}
                          onChange={(e) => updateApplicant(applicant.id, 'email', e.target.value)}
                          placeholder="email@example.com"
                          className={inputCls}
                          data-testid={`input-applicant-${applicant.id}-email`}
                        />
                      </div>
                    </div>

                    {/* Home Address / Credit Score */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                      <div className="md:col-span-3">
                        <label className="block text-sm font-medium text-[color:var(--t-color-text-body)] mb-2">Home Address</label>
                        <AddressInput
                          value={applicant.homeAddress || applicant.address}
                          onChange={(addr) => updateApplicant(applicant.id, 'homeAddress', addr)}
                          idPrefix={`applicant-${applicant.id}-home`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[color:var(--t-color-text-body)] mb-2 flex items-center gap-2">
                          Estimated Credit Score
                          <HelpCircle className="w-4 h-4 text-[color:var(--t-color-accent)]" />
                        </label>
                        <select
                          value={applicant.estimatedCreditScore || ''}
                          onChange={(e) => updateApplicant(applicant.id, 'estimatedCreditScore', e.target.value)}
                          className={inputCls}
                          data-testid={`select-applicant-${applicant.id}-credit-score`}
                        >
                          <option value="">Select Range</option>
                          <option value="750+">750+</option>
                          <option value="700-749">700-749</option>
                          <option value="650-699">650-699</option>
                          <option value="600-649">600-649</option>
                          <option value="below-600">Below 600</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* ======= Project & Business Involvement ======= */}
                  <div className="mt-2">
                    <h4 className="text-[13px] font-semibold text-[#4263a5] mb-1.5 pb-1 border-b border-[#e7edf4]">
                      Project &amp; Business Involvement
                    </h4>

                    {/* Project Role / Ownership % / Ownership Type */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-[color:var(--t-color-text-body)] mb-2 flex items-center gap-2">
                          Project Role
                          <HelpCircle className="w-4 h-4 text-[color:var(--t-color-accent)]" />
                        </label>
                        <select
                          value={applicant.projectRole || ''}
                          onChange={(e) => updateApplicant(applicant.id, 'projectRole', e.target.value)}
                          className={inputCls}
                          data-testid={`select-project-role-${applicant.id}`}
                        >
                          <option value="">Select Project Role</option>
                          <option value="owner-guarantor">Owner & Guarantor</option>
                          <option value="owner-non-guarantor">Owner Non-Guarantor</option>
                          <option value="non-owner-key-manager">Non-Owner Key Manager</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[color:var(--t-color-text-body)] mb-2 flex items-center gap-2">
                          Ownership %
                          <HelpCircle className="w-4 h-4 text-[color:var(--t-color-accent)]" />
                        </label>
                        <input
                          type="number"
                          value={applicant.ownershipPercentage || ''}
                          onChange={(e) => updateApplicant(applicant.id, 'ownershipPercentage', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          min="0"
                          max="100"
                          step="0.01"
                          className={inputCls}
                          data-testid={`input-applicant-${applicant.id}-ownership`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[color:var(--t-color-text-body)] mb-2 flex items-center gap-2">
                          Ownership Type
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setIsLearnMoreOpen(true);
                            }}
                            className="text-[color:var(--t-color-accent)] hover:text-[color:var(--t-color-primary)] transition-colors"
                          >
                            <HelpCircle className="w-4 h-4" />
                          </button>
                        </label>
                        <select
                          value={applicant.ownershipType || ''}
                          onChange={(e) => updateApplicant(applicant.id, 'ownershipType', e.target.value)}
                          className={inputCls}
                          data-testid={`select-ownership-type-${applicant.id}`}
                        >
                          <option value="">Select Ownership Type</option>
                          <option value="direct">Direct Ownership</option>
                          <option value="indirect">Through an Entity</option>
                        </select>
                      </div>
                    </div>

                    {/* Indirect Ownership Description (conditional) */}
                    {applicant.ownershipType === 'indirect' && (
                      <div className="mb-4 p-4 bg-[#eff6ff] border border-[#bfdbfe] rounded-lg">
                        <p className="text-sm text-[color:var(--t-color-text-secondary)] mb-2">
                          <strong>Indirect ownership</strong> means you own a share of the applicant business through another entity (e.g., a holding company, LLC, or trust).
                          SBA requires disclosure of all natural persons who own 20% or more, including those who own through other entities.
                          Please describe the ownership chain below.
                        </p>
                        <label className="block text-sm font-medium text-[color:var(--t-color-text-body)] mb-2">Indirect Ownership Description</label>
                        <textarea
                          value={applicant.indirectOwnershipDescription || ''}
                          onChange={(e) => updateApplicant(applicant.id, 'indirectOwnershipDescription', e.target.value)}
                          placeholder="e.g., I own 75% of Smith Holdings LLC, which owns 40% of the applicant business..."
                          rows={3}
                          className={`${inputCls} resize-none`}
                          data-testid={`textarea-applicant-${applicant.id}-indirect-ownership`}
                        />
                      </div>
                    )}

                    {/* Title */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-[color:var(--t-color-text-body)] mb-2">Title</label>
                        <input
                          type="text"
                          value={applicant.title || ''}
                          onChange={(e) => updateApplicant(applicant.id, 'title', e.target.value)}
                          placeholder="e.g., CEO, President, Partner"
                          className={inputCls}
                          data-testid={`input-applicant-${applicant.id}-title`}
                        />
                      </div>
                    </div>

                    {/* Business Role / Travel Time */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-[color:var(--t-color-text-body)] mb-2 flex items-center gap-2">
                          Role in Business Operations
                          <HelpCircle className="w-4 h-4 text-[color:var(--t-color-accent)]" />
                        </label>
                        <select
                          value={applicant.businessRole || ''}
                          onChange={(e) => updateApplicant(applicant.id, 'businessRole', e.target.value)}
                          className={inputCls}
                          data-testid={`select-business-role-${applicant.id}`}
                        >
                          <option value="">Select Role</option>
                          <option value="active-full-time">Active - Full Time</option>
                          <option value="active-part-time">Active - Part Time</option>
                          <option value="passive">Passive</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[color:var(--t-color-text-body)] mb-2 flex items-center gap-2">
                          Travel Time to Business
                          <HelpCircle className="w-4 h-4 text-[color:var(--t-color-accent)]" />
                        </label>
                        <select
                          value={applicant.travelTime || ''}
                          onChange={(e) => updateApplicant(applicant.id, 'travelTime', e.target.value)}
                          className={inputCls}
                          data-testid={`select-applicant-${applicant.id}-travel-time`}
                        >
                          <option value="">Select Travel Time</option>
                          <option value="less than 30 minutes">Less than 30 minutes</option>
                          <option value="30 to 60 minutes">30 to 60 minutes</option>
                          <option value="60 to 120 minutes">60 to 120 minutes</option>
                          <option value="more than 120 minutes">More than 120 minutes</option>
                        </select>
                      </div>
                    </div>

                    {/* Experience / Years */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-[color:var(--t-color-text-body)] mb-2 flex items-center gap-2">
                          Relevant Experience
                          <HelpCircle className="w-4 h-4 text-[color:var(--t-color-accent)]" />
                        </label>
                        <select
                          value={applicant.experience || ''}
                          onChange={(e) => updateApplicant(applicant.id, 'experience', e.target.value)}
                          className={inputCls}
                          data-testid={`select-applicant-${applicant.id}-experience`}
                        >
                          <option value="">Select Experience Type</option>
                          <option value="Direct">Direct</option>
                          <option value="Transferrable">Transferrable</option>
                          <option value="None">None</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[color:var(--t-color-text-body)] mb-2 flex items-center gap-2">
                          Years of Experience
                          <HelpCircle className="w-4 h-4 text-[color:var(--t-color-accent)]" />
                        </label>
                        <select
                          value={applicant.yearsOfExperience || ''}
                          onChange={(e) => updateApplicant(applicant.id, 'yearsOfExperience', e.target.value)}
                          className={inputCls}
                          data-testid={`select-applicant-${applicant.id}-years-experience`}
                        >
                          <option value="">Select Years</option>
                          {Array.from({ length: 10 }, (_, i) => (
                            <option key={i + 1} value={String(i + 1)}>{i + 1}</option>
                          ))}
                          <option value="11">More than 10</option>
                        </select>
                      </div>
                    </div>

                    {/* Role Description */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-[color:var(--t-color-text-body)] mb-2">
                        Describe your role in the business and how your experience qualifies you for it.
                      </label>
                      <textarea
                        value={applicant.businessRoleDescription || ''}
                        onChange={(e) => updateApplicant(applicant.id, 'businessRoleDescription', e.target.value)}
                        placeholder="Describe your responsibilities and relevant qualifications..."
                        rows={4}
                        className={`${inputCls} resize-none`}
                        data-testid={`textarea-applicant-${applicant.id}-role-description`}
                      />
                    </div>

                    {/* Plan to be On-Site */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-[color:var(--t-color-text-body)] mb-2 flex items-center gap-2">
                        Plan to be On-Site
                        <HelpCircle className="w-4 h-4 text-[color:var(--t-color-accent)]" />
                      </label>
                      <textarea
                        value={applicant.planToBeOnSite || ''}
                        onChange={(e) => updateApplicant(applicant.id, 'planToBeOnSite', e.target.value)}
                        placeholder="Please explain how you plan to manage the distance"
                        rows={3}
                        className={`${inputCls} resize-none`}
                        data-testid={`textarea-applicant-${applicant.id}-onsite`}
                      />
                    </div>
                  </div>

                    </div>
                  </div>

                  {/* ======= Personal Financial Statement ======= */}
                  <div className="border border-[#c5d4e8] rounded-md bg-white">
                    <div className="px-3 py-2 bg-[#fafbfd] border-b border-[#c5d4e8] rounded-t-md">
                      <h4 className="text-sm font-semibold text-[#133c7f]">Personal Financial Statement</h4>
                    </div>
                    <div className="p-3">
                      <PFSForm
                        applicantId={applicant.id}
                        applicantName={displayName}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Add applicant button (max 5) */}
        {individualApplicants.length < 5 && (
          <button
            onClick={handleAddApplicant}
            className="w-full py-4 bg-white border-2 border-dashed border-[var(--t-color-accent)] text-[color:var(--t-color-accent)] font-medium rounded-lg cursor-pointer transition-all hover:bg-blue-50 mb-8"
            data-testid="button-add-individual"
          >
            <Plus className="w-5 h-5 inline mr-2" />
            Add Individual {individualApplicants.length > 0 ? `(${individualApplicants.length}/5)` : ''}
          </button>
        )}
      </div>

      {/* Learn More Panel - Indirect Ownership explanation */}
      <LearnMorePanel
        isOpen={isLearnMoreOpen}
        onClose={() => setIsLearnMoreOpen(false)}
        title="Understanding Indirect Ownership"
      >
        <div className="space-y-4 text-[15px] text-[color:var(--t-color-text-secondary)]">
          <p>
            SBA requires disclosure of all <strong>natural persons</strong> (real human beings)
            who own 20% or more of the applicant business. This includes both direct ownership
            and indirect ownership (owning through another entity like an LLC, corporation, or trust).
          </p>
          <div className="bg-[#eff6ff] border-l-[3px] border-[var(--t-color-accent)] rounded-r-lg p-4">
            <p className="font-semibold text-[color:var(--t-color-primary)] mb-2">Example</p>
            <p>
              If Smith Holdings LLC owns 40% of your restaurant, and John Smith owns 75% of
              Smith Holdings, then John&apos;s indirect ownership is 40% x 75% = 30%.
              Because that exceeds 20%, John must be disclosed as an individual applicant.
            </p>
          </div>
          <p>
            Always trace ownership back to natural persons. If an entity owns part of your
            business, identify the people behind that entity and continue drilling down through
            any additional entity layers until you reach real individuals.
          </p>
        </div>
      </LearnMorePanel>
    </div>
  );
}

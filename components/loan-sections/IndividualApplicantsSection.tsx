'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useApplication } from '@/lib/applicationStore';
import type { PersonalFinancialStatement } from '@/lib/applicationStore';
import { Plus, Trash2, ChevronDown, HelpCircle, Upload, Loader2 } from 'lucide-react';
import AddressInput from '@/components/loan-sections/AddressInput';
import PasswordToggle from '@/components/loan-sections/PasswordToggle';
import CollapsibleSection from '@/components/loan-sections/CollapsibleSection';
import LearnMorePanel from '@/components/LearnMorePanel';
import type { IndividualApplicant } from '@/lib/schema';
import { useToast } from '@/hooks/use-toast';

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

// ---------------------------------------------------------------------------
// Schedule primitives
// ---------------------------------------------------------------------------

function ScheduleSubtext({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] text-[color:var(--t-color-text-muted)] mb-2 leading-relaxed">{children}</p>;
}

function ScheduleAddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 text-[12px] text-[color:var(--t-color-primary-light)] border border-[color:var(--t-color-border)] rounded-md px-2.5 py-1 hover:bg-[color:var(--t-color-primary-palest)] transition-colors mt-2"
      data-testid={`button-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <Plus className="w-3 h-3" />
      {label}
    </button>
  );
}

function ScheduleDeleteButton({ onClick, testId }: { onClick: () => void; testId: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[color:var(--t-color-primary-pale)] hover:text-[color:var(--t-color-danger-text)] transition-colors p-0.5"
      data-testid={testId}
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}

function ScheduleTableHeader({ columns }: { columns: string[] }) {
  return (
    <div className="hidden md:grid gap-1 px-1 py-1.5 bg-[color:var(--t-color-primary-palest)] rounded-t-md" style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr) 28px` }}>
      {columns.map((col, i) => (
        <span key={i} className="text-[11px] uppercase tracking-wider font-semibold text-[color:var(--t-color-primary-light)] px-1">{col}</span>
      ))}
      <span />
    </div>
  );
}

function ScheduleInput({ value, onChange, placeholder, type, testId }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; testId?: string;
}) {
  return (
    <input
      type={type || 'text'}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || ''}
      className="w-full px-2 py-1 border border-[color:var(--t-color-border)] rounded-md text-[13px]"
      data-testid={testId}
    />
  );
}

function ScheduleSelect({ value, onChange, options, testId }: {
  value: string; onChange: (v: string) => void; options: string[]; testId?: string;
}) {
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-2 py-1 border border-[color:var(--t-color-border)] rounded-md text-[13px] bg-[color:var(--t-color-card-bg)]"
      data-testid={testId}
    >
      <option value="">Select...</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function PfsScheduleTextarea({ title, subtext, field, pfs, updatePfs, idx }: {
  title: string; subtext: string; field: string;
  pfs: PersonalFinancialStatement; updatePfs: (u: Partial<PersonalFinancialStatement>) => void; idx: string;
}) {
  return (
    <CollapsibleSection title={title} defaultExpanded={false}>
      <ScheduleSubtext>{subtext}</ScheduleSubtext>
      <textarea
        value={(pfs as any)[field] || ''}
        onChange={(e) => updatePfs({ [field]: e.target.value } as any)}
        rows={3}
        className="w-full px-3 py-2 border border-[color:var(--t-color-border)] rounded-md text-[13px] min-h-[80px] resize-y"
        data-testid={`pfs-${field}-${idx}`}
      />
    </CollapsibleSection>
  );
}

const emptyNote = { noteholder: '', originalBalance: '', currentBalance: '', paymentAmount: '', frequency: '', collateral: '' };
const emptySecurity = { numberOfShares: '', nameOfSecurities: '', cost: '', marketValue: '', dateOfQuotation: '', totalValue: '' };
interface RealEstateItem {
  type: string;
  address: string;
  datePurchased: string;
  originalCost: string;
  presentMarketValue: string;
  mortgageHolder: string;
  mortgageAccountNumber: string;
  mortgageBalance: string;
  monthlyPayment: string;
  status: string;
}
const emptyRealEstate: RealEstateItem = { type: '', address: '', datePurchased: '', originalCost: '', presentMarketValue: '', mortgageHolder: '', mortgageAccountNumber: '', mortgageBalance: '', monthlyPayment: '', status: '' };

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
  notesPayable: [{ ...emptyNote }],
  securities: [{ ...emptySecurity }],
  realEstateOwned: [{ ...emptyRealEstate }],
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

// Shared input class — matches Business Applicant field height/padding.
const inputCls =
  'w-full px-3 py-1.5 border border-[var(--t-color-border)] rounded-lg text-[length:var(--t-font-size-base)] transition-all focus:border-[var(--t-color-accent)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] outline-none';

// Compact label class used by the new Section-style blocks
const labelCls = 'block text-[11px] font-medium text-[color:var(--t-color-text-muted)] mb-0.5';

// Real Estate options + property metadata
const realEstateTypeOptions = ['Primary Residence', 'Other Residence', 'Rental Property', 'Land', 'Commercial', 'Other'];
const mortgageStatusOptions = ['Current', 'Delinquent', 'In Forbearance', 'Paid Off'];
const PROPERTY_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const MAX_PROPERTIES = 10;

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

  const updatePfs = useCallback(
    (u: Partial<PersonalFinancialStatement>) => {
      updatePersonalFinancialStatement(applicantId, { ...pfs, ...u } as PersonalFinancialStatement);
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

  // Section 4 — Real Estate Owned: tab state
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="mt-6">
      <h4
        className="text-base font-semibold text-[color:var(--t-color-text-body)] mb-4 pb-2 border-b-2 border-[var(--t-color-accent)]"
      >
        SBA Personal Financial Statement
      </h4>

      {/* Name & As-Of Date — temporarily hidden
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
      */}

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

      {/* ---------- Section 2: Notes Payable ---------- */}
      {(() => {
        const idx = applicantId;
        const cols = ['Noteholder Name/Address', 'Original Bal.', 'Current Bal.', 'Payment', 'Frequency', 'How Secured'];
        const rows = pfs.notesPayable || [];
        const updateRow = (i: number, field: string, v: string) => updateScheduleRow('notesPayable', i, field, v);
        const removeRow = (i: number) => removeScheduleRow('notesPayable', i);
        const addRow = () => addScheduleRow('notesPayable');
        return (
          <CollapsibleSection title="Section 2. Notes Payable to Banks and Others" defaultExpanded={false}>
            <ScheduleSubtext>Use attachments if necessary. Each attachment must be identified as part of this statement and signed.</ScheduleSubtext>
            <div className="hidden md:block">
              <ScheduleTableHeader columns={cols} />
              <div className="space-y-1">
                {rows.map((row, i) => (
                  <div key={i} className="grid gap-1 px-1 py-1 border-b border-[color:var(--t-color-primary-palest)]" style={{ gridTemplateColumns: `repeat(${cols.length}, 1fr) 28px` }}>
                    <div><ScheduleInput value={row.noteholder} onChange={v => updateRow(i, 'noteholder', v)} testId={`pfs-note-noteholder-${idx}-${i}`} /></div>
                    <div><ScheduleInput value={row.originalBalance} onChange={v => updateRow(i, 'originalBalance', v)} type="number" placeholder="0" testId={`pfs-note-origBal-${idx}-${i}`} /></div>
                    <div><ScheduleInput value={row.currentBalance} onChange={v => updateRow(i, 'currentBalance', v)} type="number" placeholder="0" testId={`pfs-note-curBal-${idx}-${i}`} /></div>
                    <div><ScheduleInput value={row.paymentAmount} onChange={v => updateRow(i, 'paymentAmount', v)} type="number" placeholder="0" testId={`pfs-note-payment-${idx}-${i}`} /></div>
                    <div><ScheduleSelect value={row.frequency} onChange={v => updateRow(i, 'frequency', v)} options={['Monthly', 'Quarterly', 'Annually', 'Other']} testId={`pfs-note-freq-${idx}-${i}`} /></div>
                    <div><ScheduleInput value={row.collateral} onChange={v => updateRow(i, 'collateral', v)} testId={`pfs-note-collateral-${idx}-${i}`} /></div>
                    <div className="flex items-center justify-center"><ScheduleDeleteButton onClick={() => removeRow(i)} testId={`pfs-note-delete-${idx}-${i}`} /></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="md:hidden space-y-2">
              {rows.map((row, i) => (
                <div key={i} className="border border-[color:var(--t-color-border)] rounded-md p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] font-semibold text-[color:var(--t-color-primary)]">Note {i + 1}</span>
                    <ScheduleDeleteButton onClick={() => removeRow(i)} testId={`pfs-note-delete-m-${idx}-${i}`} />
                  </div>
                  <div className="space-y-1.5">
                    <div><label className="text-[11px] text-[color:var(--t-color-text-muted)]">Noteholder Name/Address</label><ScheduleInput value={row.noteholder} onChange={v => updateRow(i, 'noteholder', v)} testId={`pfs-note-noteholder-m-${idx}-${i}`} /></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="text-[11px] text-[color:var(--t-color-text-muted)]">Original Balance</label><ScheduleInput value={row.originalBalance} onChange={v => updateRow(i, 'originalBalance', v)} type="number" placeholder="0" /></div>
                      <div><label className="text-[11px] text-[color:var(--t-color-text-muted)]">Current Balance</label><ScheduleInput value={row.currentBalance} onChange={v => updateRow(i, 'currentBalance', v)} type="number" placeholder="0" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="text-[11px] text-[color:var(--t-color-text-muted)]">Payment Amount</label><ScheduleInput value={row.paymentAmount} onChange={v => updateRow(i, 'paymentAmount', v)} type="number" placeholder="0" /></div>
                      <div><label className="text-[11px] text-[color:var(--t-color-text-muted)]">Frequency</label><ScheduleSelect value={row.frequency} onChange={v => updateRow(i, 'frequency', v)} options={['Monthly', 'Quarterly', 'Annually', 'Other']} /></div>
                    </div>
                    <div><label className="text-[11px] text-[color:var(--t-color-text-muted)]">How Secured / Collateral</label><ScheduleInput value={row.collateral} onChange={v => updateRow(i, 'collateral', v)} /></div>
                  </div>
                </div>
              ))}
            </div>
            <ScheduleAddButton onClick={addRow} label="Add Note Row" />
          </CollapsibleSection>
        );
      })()}

      {/* ---------- Section 3: Stocks and Bonds ---------- */}
      {(() => {
        const idx = applicantId;
        const cols = ['# Shares', 'Name of Securities', 'Cost', 'Market Value', 'Date of Quotation', 'Total Value'];
        const rows = pfs.securities || [];
        const updateRow = (i: number, field: string, v: string) => updateScheduleRow('securities', i, field, v);
        const removeRow = (i: number) => removeScheduleRow('securities', i);
        const addRow = () => addScheduleRow('securities');
        return (
          <CollapsibleSection title="Section 3. Stocks and Bonds" defaultExpanded={false}>
            <ScheduleSubtext>Use attachments if necessary. Each attachment must be identified as part of this statement and signed.</ScheduleSubtext>
            <div className="hidden md:block">
              <ScheduleTableHeader columns={cols} />
              <div className="space-y-1">
                {rows.map((row, i) => (
                  <div key={i} className="grid gap-1 px-1 py-1 border-b border-[color:var(--t-color-primary-palest)]" style={{ gridTemplateColumns: `repeat(${cols.length}, 1fr) 28px` }}>
                    <div><ScheduleInput value={row.numberOfShares} onChange={v => updateRow(i, 'numberOfShares', v)} type="number" testId={`pfs-sec-shares-${idx}-${i}`} /></div>
                    <div><ScheduleInput value={row.nameOfSecurities} onChange={v => updateRow(i, 'nameOfSecurities', v)} testId={`pfs-sec-name-${idx}-${i}`} /></div>
                    <div><ScheduleInput value={row.cost} onChange={v => updateRow(i, 'cost', v)} type="number" placeholder="0" testId={`pfs-sec-cost-${idx}-${i}`} /></div>
                    <div><ScheduleInput value={row.marketValue} onChange={v => updateRow(i, 'marketValue', v)} type="number" placeholder="0" testId={`pfs-sec-marketVal-${idx}-${i}`} /></div>
                    <div><ScheduleInput value={row.dateOfQuotation} onChange={v => updateRow(i, 'dateOfQuotation', v)} type="date" testId={`pfs-sec-date-${idx}-${i}`} /></div>
                    <div><ScheduleInput value={row.totalValue} onChange={v => updateRow(i, 'totalValue', v)} type="number" placeholder="0" testId={`pfs-sec-totalVal-${idx}-${i}`} /></div>
                    <div className="flex items-center justify-center"><ScheduleDeleteButton onClick={() => removeRow(i)} testId={`pfs-sec-delete-${idx}-${i}`} /></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="md:hidden space-y-2">
              {rows.map((row, i) => (
                <div key={i} className="border border-[color:var(--t-color-border)] rounded-md p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] font-semibold text-[color:var(--t-color-primary)]">Security {i + 1}</span>
                    <ScheduleDeleteButton onClick={() => removeRow(i)} testId={`pfs-sec-delete-m-${idx}-${i}`} />
                  </div>
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="text-[11px] text-[color:var(--t-color-text-muted)]"># of Shares</label><ScheduleInput value={row.numberOfShares} onChange={v => updateRow(i, 'numberOfShares', v)} type="number" /></div>
                      <div><label className="text-[11px] text-[color:var(--t-color-text-muted)]">Name of Securities</label><ScheduleInput value={row.nameOfSecurities} onChange={v => updateRow(i, 'nameOfSecurities', v)} /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div><label className="text-[11px] text-[color:var(--t-color-text-muted)]">Cost</label><ScheduleInput value={row.cost} onChange={v => updateRow(i, 'cost', v)} type="number" placeholder="0" /></div>
                      <div><label className="text-[11px] text-[color:var(--t-color-text-muted)]">Market Value</label><ScheduleInput value={row.marketValue} onChange={v => updateRow(i, 'marketValue', v)} type="number" placeholder="0" /></div>
                      <div><label className="text-[11px] text-[color:var(--t-color-text-muted)]">Total Value</label><ScheduleInput value={row.totalValue} onChange={v => updateRow(i, 'totalValue', v)} type="number" placeholder="0" /></div>
                    </div>
                    <div><label className="text-[11px] text-[color:var(--t-color-text-muted)]">Date of Quotation</label><ScheduleInput value={row.dateOfQuotation} onChange={v => updateRow(i, 'dateOfQuotation', v)} type="date" /></div>
                  </div>
                </div>
              ))}
            </div>
            <ScheduleAddButton onClick={addRow} label="Add Security Row" />
          </CollapsibleSection>
        );
      })()}

      {/* ---------- Section 4: Real Estate Owned ---------- */}
      {(() => {
        const idx = applicantId;
        const properties = pfs.realEstateOwned || [];
        const safeTab = Math.min(activeTab, Math.max(0, properties.length - 1));
        const prop = properties[safeTab] || emptyRealEstate;
        const updateProp = (field: string, value: string) => updateScheduleRow('realEstateOwned', safeTab, field, value);
        const addProperty = () => {
          if (properties.length >= MAX_PROPERTIES) return;
          addScheduleRow('realEstateOwned');
          setActiveTab(properties.length);
        };
        const removeProperty = () => {
          removeScheduleRow('realEstateOwned', safeTab);
          setActiveTab(Math.max(0, safeTab - 1));
        };
        return (
          <CollapsibleSection title="Section 4. Real Estate Owned" defaultExpanded={false}>
            <ScheduleSubtext>List each parcel separately. Use attachment if necessary. Each attachment must be identified as a part of this statement and signed.</ScheduleSubtext>

            <div className="flex flex-wrap items-center gap-1 border-b border-[color:var(--t-color-border)] mb-3 pb-0">
              {properties.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveTab(i)}
                  className={`px-3 py-1.5 text-[13px] font-medium rounded-t-md transition-colors -mb-px ${
                    i === safeTab
                      ? 'bg-[color:var(--t-color-primary)] text-white border border-[color:var(--t-color-primary)] border-b-transparent'
                      : 'bg-[color:var(--t-color-primary-palest)] text-[color:var(--t-color-primary-light)] border border-transparent hover:bg-[color:var(--t-color-primary-pale)]'
                  }`}
                  data-testid={`pfs-re-tab-${idx}-${i}`}
                >
                  Property {PROPERTY_LABELS[i]}
                </button>
              ))}
              {properties.length < MAX_PROPERTIES && (
                <button
                  type="button"
                  onClick={addProperty}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] text-[color:var(--t-color-primary-light)] hover:bg-[color:var(--t-color-primary-palest)] rounded-t-md transition-colors"
                  data-testid={`pfs-re-add-property-${idx}`}
                >
                  + Add Property
                </button>
              )}
            </div>

            {properties.length === 0 ? (
              <div className="text-center py-8 text-[13px] text-[color:var(--t-color-text-muted)]" data-testid={`pfs-re-empty-${idx}`}>
                No properties added. Click &lsquo;+ Add Property&rsquo; to begin.
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-2 gap-y-1.5 mb-1.5">
                  <div>
                    <label className={labelCls}>Type of Real Estate</label>
                    <select
                      value={prop.type || ''}
                      onChange={(e) => updateProp('type', e.target.value)}
                      className={inputCls}
                      data-testid={`pfs-re-type-${idx}-${safeTab}`}
                    >
                      <option value="">Select...</option>
                      {realEstateTypeOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>

                <div className="mb-1.5">
                  <label className={labelCls}>Address</label>
                  <input
                    type="text"
                    value={prop.address || ''}
                    onChange={(e) => updateProp('address', e.target.value)}
                    className={inputCls}
                    data-testid={`pfs-re-address-${idx}-${safeTab}`}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-2 gap-y-1.5 mb-1.5">
                  <div>
                    <label className={labelCls}>Date Purchased</label>
                    <input
                      type="date"
                      value={prop.datePurchased || ''}
                      onChange={(e) => updateProp('datePurchased', e.target.value)}
                      className={inputCls}
                      data-testid={`pfs-re-datePurchased-${idx}-${safeTab}`}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Original Cost</label>
                    <input
                      type="number"
                      value={prop.originalCost || ''}
                      onChange={(e) => updateProp('originalCost', e.target.value)}
                      placeholder="0"
                      className={inputCls}
                      data-testid={`pfs-re-originalCost-${idx}-${safeTab}`}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Present Market Value</label>
                    <input
                      type="number"
                      value={prop.presentMarketValue || ''}
                      onChange={(e) => updateProp('presentMarketValue', e.target.value)}
                      placeholder="0"
                      className={inputCls}
                      data-testid={`pfs-re-presentMarketValue-${idx}-${safeTab}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-2 gap-y-1.5 mb-1.5">
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Mortgage Holder Name/Address</label>
                    <input
                      type="text"
                      value={prop.mortgageHolder || ''}
                      onChange={(e) => updateProp('mortgageHolder', e.target.value)}
                      className={inputCls}
                      data-testid={`pfs-re-mortgageHolder-${idx}-${safeTab}`}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Mortgage Account Number</label>
                    <input
                      type="text"
                      value={prop.mortgageAccountNumber || ''}
                      onChange={(e) => updateProp('mortgageAccountNumber', e.target.value)}
                      className={inputCls}
                      data-testid={`pfs-re-mortgageAccountNumber-${idx}-${safeTab}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-2 gap-y-1.5 mb-1.5">
                  <div>
                    <label className={labelCls}>Mortgage Balance</label>
                    <input
                      type="number"
                      value={prop.mortgageBalance || ''}
                      onChange={(e) => updateProp('mortgageBalance', e.target.value)}
                      placeholder="0"
                      className={inputCls}
                      data-testid={`pfs-re-mortgageBalance-${idx}-${safeTab}`}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Payment per Month</label>
                    <input
                      type="number"
                      value={prop.monthlyPayment || ''}
                      onChange={(e) => updateProp('monthlyPayment', e.target.value)}
                      placeholder="0"
                      className={inputCls}
                      data-testid={`pfs-re-monthlyPayment-${idx}-${safeTab}`}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Status of Mortgage</label>
                    <select
                      value={prop.status || ''}
                      onChange={(e) => updateProp('status', e.target.value)}
                      className={inputCls}
                      data-testid={`pfs-re-status-${idx}-${safeTab}`}
                    >
                      <option value="">Select...</option>
                      {mortgageStatusOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-[color:var(--t-color-primary-palest)]">
                  <button
                    type="button"
                    onClick={removeProperty}
                    className="text-[12px] text-[color:var(--t-color-danger-text)] hover:text-[color:var(--t-color-danger)] transition-colors flex items-center gap-1"
                    data-testid={`pfs-re-remove-${idx}-${safeTab}`}
                  >
                    <Trash2 className="w-3 h-3" />
                    Remove this property
                  </button>
                </div>
              </div>
            )}
          </CollapsibleSection>
        );
      })()}

      {/* ---------- Section 5: Other Personal Property and Other Assets ---------- */}
      {(() => {
        const idx = applicantId;
        return (
          <PfsScheduleTextarea
            title="Section 5. Other Personal Property and Other Assets"
            subtext="Describe, and if any is pledged as security, state name and address of lien holder, amount of lien, terms of payment and, if delinquent, describe delinquency."
            field="otherPersonalPropertyDescription"
            pfs={pfs} updatePfs={updatePfs} idx={idx}
          />
        );
      })()}

      {/* ---------- Sections 6–8: PFS Schedule Textareas ---------- */}
      {(() => {
        const idx = applicantId;
        return (
          <>
            <PfsScheduleTextarea
              title="Section 6. Unpaid Taxes"
              subtext="Describe in detail as to type, to whom payable, when due, amount, and to what property, if any, a tax lien attaches."
              field="unpaidTaxesDescription"
              pfs={pfs} updatePfs={updatePfs} idx={idx}
            />
            <PfsScheduleTextarea
              title="Section 7. Other Liabilities"
              subtext="Describe in detail."
              field="otherLiabilitiesDescription"
              pfs={pfs} updatePfs={updatePfs} idx={idx}
            />
            <PfsScheduleTextarea
              title="Section 8. Life Insurance Held"
              subtext="Give face amount and cash surrender value of policies — name of insurance company and beneficiaries."
              field="lifeInsuranceDescription"
              pfs={pfs} updatePfs={updatePfs} idx={idx}
            />
          </>
        );
      })()}
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
    loadFromFirestore,
  } = useApplication();
  const { toast } = useToast();

  const individualApplicants = data.individualApplicants || [];
  const projectName = data.projectOverview?.projectName || '';
  const projectId = data.projectId || '';

  const [expandedApplicants, setExpandedApplicants] = useState<string[]>([]);
  const [isLearnMoreOpen, setIsLearnMoreOpen] = useState(false);
  const hasInitialized = useRef(false);

  // Per-applicant PFI Excel import. The hidden file input is shared, and we
  // track which applicant's button was clicked via a ref so the async file
  // picker callback knows where to route the parsed PFS.
  const importExcelInputRef = useRef<HTMLInputElement>(null);
  const pendingImportApplicantIdRef = useRef<string | null>(null);
  const [importingApplicantId, setImportingApplicantId] = useState<string | null>(null);

  // Per-applicant Individual Applicant PDF import (Blanks_Individual_Applicant.pdf).
  // Uses its own hidden input + pending-applicant ref so the Excel picker and
  // PDF picker don't clobber each other if the user opens them back-to-back.
  const importPdfInputRef = useRef<HTMLInputElement>(null);
  const pendingPdfImportApplicantIdRef = useRef<string | null>(null);
  const [importingPdfApplicantId, setImportingPdfApplicantId] = useState<string | null>(null);

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const applicantId = pendingImportApplicantIdRef.current;
    if (!file || !applicantId || !projectId) {
      if (importExcelInputRef.current) importExcelInputRef.current.value = '';
      return;
    }

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      toast({ title: 'Invalid file', description: 'Please select an .xlsx file.', variant: 'destructive' });
      if (importExcelInputRef.current) importExcelInputRef.current.value = '';
      return;
    }

    const applicant = individualApplicants.find((a) => a.id === applicantId);
    const applicantName = applicant
      ? [applicant.firstName, applicant.lastName].filter(Boolean).join(' ') || 'the selected individual'
      : 'the selected individual';

    setImportingApplicantId(applicantId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('individualApplicantId', applicantId);

      const response = await fetch(`/api/projects/${projectId}/pfi-excel/apply`, {
        method: 'POST',
        body: formData,
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast({
          title: 'Import failed',
          description: result?.error || 'Make sure it is a filled Individual Applicant PFI Excel workbook.',
          variant: 'destructive',
        });
        return;
      }

      if (result.loanApplication) {
        loadFromFirestore(result.loanApplication);
      }
      toast({
        title: 'Import successful',
        description: `Imported PFS data from Excel for ${applicantName} (${result.populatedFieldCount ?? 0} fields).`,
      });
    } catch {
      toast({
        title: 'Import failed',
        description: 'Make sure it is a filled Individual Applicant PFI Excel workbook.',
        variant: 'destructive',
      });
    } finally {
      setImportingApplicantId(null);
      pendingImportApplicantIdRef.current = null;
      if (importExcelInputRef.current) importExcelInputRef.current.value = '';
    }
  };

  const handleImportPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const applicantId = pendingPdfImportApplicantIdRef.current;
    if (!file || !applicantId || !projectId) {
      if (importPdfInputRef.current) importPdfInputRef.current.value = '';
      return;
    }

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast({ title: 'Invalid file', description: 'Please select a PDF file.', variant: 'destructive' });
      if (importPdfInputRef.current) importPdfInputRef.current.value = '';
      return;
    }

    const applicant = individualApplicants.find((a) => a.id === applicantId);
    const applicantName = applicant
      ? [applicant.firstName, applicant.lastName].filter(Boolean).join(' ') || 'the selected individual'
      : 'the selected individual';

    setImportingPdfApplicantId(applicantId);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1] ?? '');
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      const response = await fetch(`/api/projects/${projectId}/envelope-pdf/apply-individual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          pdfData: base64,
          individualApplicantId: applicantId,
        }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast({
          title: 'Import failed',
          description: result?.error || 'Make sure it is a filled Individual Applicant PDF from this system.',
          variant: 'destructive',
        });
        return;
      }

      if (result.loanApplication) {
        loadFromFirestore(result.loanApplication);
      }
      toast({
        title: 'Import successful',
        description: `Imported ${result.fieldsImported ?? 0} field(s) for ${applicantName}.`,
      });
    } catch {
      toast({
        title: 'Import failed',
        description: 'Make sure it is a filled Individual Applicant PDF from this system.',
        variant: 'destructive',
      });
    } finally {
      setImportingPdfApplicantId(null);
      pendingPdfImportApplicantIdRef.current = null;
      if (importPdfInputRef.current) importPdfInputRef.current.value = '';
    }
  };

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

      {/* Shared hidden file inputs for Import PDF / Import Excel buttons in each accordion header. */}
      <input
        ref={importPdfInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleImportPdf}
        className="hidden"
        data-testid="input-import-pdf-individual-applicant"
      />
      <input
        ref={importExcelInputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={handleImportExcel}
        className="hidden"
        data-testid="input-import-excel-individual-applicant"
      />

      <div className="px-4 pb-6 space-y-4">
        {individualApplicants.map((applicant, index) => {
          const isExpanded = expandedApplicants.includes(applicant.id);
          const displayName =
            applicant.firstName && applicant.lastName
              ? `${applicant.firstName} ${applicant.lastName}`
              : `Applicant ${index + 1}`;
          const isImportingThis = importingApplicantId === applicant.id;
          const isImportingThisPdf = importingPdfApplicantId === applicant.id;

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
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      pendingPdfImportApplicantIdRef.current = applicant.id;
                      importPdfInputRef.current?.click();
                    }}
                    disabled={isImportingThisPdf || !projectId}
                    className="px-3 py-1.5 bg-white border border-[#2563eb] text-[#2563eb] font-medium rounded-md text-xs flex items-center gap-1.5 hover:bg-[#eff6ff] disabled:opacity-50"
                    data-testid={`button-import-pdf-${index + 1}`}
                  >
                    {isImportingThisPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    {isImportingThisPdf ? 'Importing...' : 'Import PDF'}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      pendingImportApplicantIdRef.current = applicant.id;
                      importExcelInputRef.current?.click();
                    }}
                    disabled={isImportingThis || !projectId}
                    className="px-3 py-1.5 bg-white border border-[#10b981] text-[#10b981] font-medium rounded-md text-xs flex items-center gap-1.5 hover:bg-[#ecfdf5] disabled:opacity-50"
                    data-testid={`button-import-excel-${index + 1}`}
                  >
                    {isImportingThis ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    {isImportingThis ? 'Importing...' : 'Import Excel'}
                  </button>
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

                    {/* First / Last / SSN / DOB */}
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
                    </div>

                    {/* Phone / Email / Estimated Credit Score */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
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

                    {/* Home Address */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-[color:var(--t-color-text-body)] mb-2">Home Address</label>
                      <AddressInput
                        value={applicant.homeAddress || applicant.address}
                        onChange={(addr) => updateApplicant(applicant.id, 'homeAddress', addr)}
                        idPrefix={`applicant-${applicant.id}-home`}
                      />
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
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-[color:var(--t-color-text-body)] mb-2">
                          Indirect Ownership Description{' '}
                          <span className="text-[color:var(--t-color-accent)] font-normal">(if applicable)</span>
                        </label>
                        <textarea
                          value={applicant.indirectOwnershipDescription || ''}
                          onChange={(e) => updateApplicant(applicant.id, 'indirectOwnershipDescription', e.target.value)}
                          placeholder="e.g., I own 75% of Smith Holdings LLC, which owns 40% of the applicant business..."
                          rows={1}
                          className={`${inputCls} resize-none`}
                          data-testid={`textarea-applicant-${applicant.id}-indirect-ownership`}
                        />
                      </div>
                    )}

                    {/* Title — temporarily hidden
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
                    */}

                    {/* Business Role / Experience / Years of Experience */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
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
                        Describe individual&apos;s role in the business and how their experience qualifies them for it.
                      </label>
                      <textarea
                        value={applicant.businessRoleDescription || ''}
                        onChange={(e) => updateApplicant(applicant.id, 'businessRoleDescription', e.target.value)}
                        placeholder="Describe their responsibilities and relevant qualifications..."
                        rows={4}
                        className={`${inputCls} resize-none`}
                        data-testid={`textarea-applicant-${applicant.id}-role-description`}
                      />
                    </div>

                    {/* Travel Time / Plan to be On-Site */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 items-start">
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
                      <div>
                        <label className="block text-sm font-medium text-[color:var(--t-color-text-body)] mb-2 flex items-center gap-2">
                          Plan to be On-Site{' '}
                          <span className="text-[color:var(--t-color-accent)] font-normal">(if travel &gt; 120 min)</span>
                          <HelpCircle className="w-4 h-4 text-[color:var(--t-color-accent)]" />
                        </label>
                        <textarea
                          value={applicant.planToBeOnSite || ''}
                          onChange={(e) => updateApplicant(applicant.id, 'planToBeOnSite', e.target.value)}
                          placeholder="Please explain how they plan to manage the distance"
                          rows={1}
                          className={`${inputCls} resize-none`}
                          data-testid={`textarea-applicant-${applicant.id}-onsite`}
                        />
                      </div>
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

'use client';

import { useState } from 'react';
import { useApplication, PersonalFinancialStatement } from '@/lib/applicationStore';
import { ChevronDown, Plus, X } from 'lucide-react';

interface NotePayable {
  noteholder: string;
  originalBalance: string;
  currentBalance: string;
  paymentAmount: string;
  frequency: string;
  collateral: string;
}

interface Security {
  numberOfShares: string;
  nameOfSecurities: string;
  cost: string;
  marketValue: string;
  dateOfQuotation: string;
  totalValue: string;
}

interface RealEstateProperty {
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

interface PFSData {
  name: string;
  asOfDate: string;
  cashOnHand: string;
  savingsAccounts: string;
  iraRetirement: string;
  accountsReceivable: string;
  lifeInsuranceCashValue: string;
  stocksAndBonds: string;
  realEstate: string;
  automobiles: string;
  otherPersonalProperty: string;
  otherAssets: string;
  accountsPayable: string;
  notesPayableToBanks: string;
  installmentAccountAuto: string;
  installmentAccountAutoPayments: string;
  installmentAccountOther: string;
  installmentAccountOtherPayments: string;
  loansAgainstLifeInsurance: string;
  mortgagesOnRealEstate: string;
  unpaidTaxes: string;
  otherLiabilities: string;
  salary: string;
  netInvestmentIncome: string;
  realEstateIncome: string;
  otherIncome: string;
  otherIncomeDescription: string;
  asEndorserOrCoMaker: string;
  legalClaimsJudgments: string;
  provisionFederalIncomeTax: string;
  otherSpecialDebt: string;
  notesPayable: NotePayable[];
  securities: Security[];
  realEstateOwned: RealEstateProperty[];
  otherPersonalPropertyDescription: string;
  unpaidTaxesDescription: string;
  otherLiabilitiesDescription: string;
  lifeInsuranceDescription: string;
}

const defaultPFSData: PFSData = {
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
  notesPayable: [{ noteholder: '', originalBalance: '', currentBalance: '', paymentAmount: '', frequency: '', collateral: '' }],
  securities: [{ numberOfShares: '', nameOfSecurities: '', cost: '', marketValue: '', dateOfQuotation: '', totalValue: '' }],
  realEstateOwned: [
    { type: '', address: '', datePurchased: '', originalCost: '', presentMarketValue: '', mortgageHolder: '', mortgageAccountNumber: '', mortgageBalance: '', monthlyPayment: '', status: '' },
    { type: '', address: '', datePurchased: '', originalCost: '', presentMarketValue: '', mortgageHolder: '', mortgageAccountNumber: '', mortgageBalance: '', monthlyPayment: '', status: '' },
    { type: '', address: '', datePurchased: '', originalCost: '', presentMarketValue: '', mortgageHolder: '', mortgageAccountNumber: '', mortgageBalance: '', monthlyPayment: '', status: '' }
  ],
  otherPersonalPropertyDescription: '',
  unpaidTaxesDescription: '',
  otherLiabilitiesDescription: '',
  lifeInsuranceDescription: ''
};

function ApplicantPFS({ applicantId, applicantName, index, isExpanded, onToggle }: {
  applicantId: string;
  applicantName: string;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { data, updatePersonalFinancialStatement } = useApplication();

  const pfsData: PFSData = data.personalFinancialStatements?.[applicantId] || { ...defaultPFSData, name: applicantName };

  const updatePFS = (field: keyof PFSData, value: PFSData[keyof PFSData]) => {
    updatePersonalFinancialStatement(applicantId, { ...pfsData, [field]: value } as PersonalFinancialStatement);
  };

  const handleArrayChange = (section: 'notesPayable' | 'securities' | 'realEstateOwned', idx: number, field: string, value: string) => {
    const newArray = [...(pfsData[section] as Array<NotePayable | Security | RealEstateProperty>)];
    newArray[idx] = { ...newArray[idx], [field]: value };
    updatePFS(section, newArray as PFSData[typeof section]);
  };

  const addArrayItem = (section: 'notesPayable' | 'securities', template: NotePayable | Security) => {
    updatePFS(section, [...(pfsData[section] as Array<NotePayable | Security>), template] as PFSData[typeof section]);
  };

  const removeArrayItem = (section: 'notesPayable' | 'securities', idx: number) => {
    const newArray = (pfsData[section] as Array<NotePayable | Security>).filter((_, i) => i !== idx);
    updatePFS(section, (newArray.length > 0 ? newArray : [section === 'notesPayable'
      ? { noteholder: '', originalBalance: '', currentBalance: '', paymentAmount: '', frequency: '', collateral: '' }
      : { numberOfShares: '', nameOfSecurities: '', cost: '', marketValue: '', dateOfQuotation: '', totalValue: '' }]) as PFSData[typeof section]);
  };

  const assetFields = ['cashOnHand', 'savingsAccounts', 'iraRetirement', 'accountsReceivable', 'lifeInsuranceCashValue', 'stocksAndBonds', 'realEstate', 'automobiles', 'otherPersonalProperty', 'otherAssets'] as const;
  const liabilityFields = ['accountsPayable', 'notesPayableToBanks', 'installmentAccountAuto', 'installmentAccountOther', 'loansAgainstLifeInsurance', 'mortgagesOnRealEstate', 'unpaidTaxes', 'otherLiabilities'] as const;

  const totalAssets = assetFields.reduce((sum, field) => sum + (parseFloat(pfsData[field]) || 0), 0);
  const totalLiabilities = liabilityFields.reduce((sum, field) => sum + (parseFloat(pfsData[field]) || 0), 0);
  const netWorth = totalAssets - totalLiabilities;

  return (
    <div className="bg-white border border-[#e5e7eb] rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between p-3 cursor-pointer bg-[#f8fafc] border-b border-[#e5e7eb]"
        onClick={onToggle}
        data-testid={`toggle-pfs-${index + 1}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center text-xs font-semibold">
            {index + 1}
          </div>
          <h3 className="text-sm font-semibold text-[#1f2937]">{applicantName || `Applicant ${index + 1}`}</h3>
        </div>
        <ChevronDown className={`w-4 h-4 text-[#6b7280] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </div>

      {isExpanded && (
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Name</label>
              <input type="text" value={pfsData.name} onChange={(e) => updatePFS('name', e.target.value)} className="w-full px-2 py-1.5 border border-[#d1d5db] rounded text-sm" data-testid={`input-pfs-name-${index}`} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">As of Date</label>
              <input type="date" value={pfsData.asOfDate} onChange={(e) => updatePFS('asOfDate', e.target.value)} className="w-full px-2 py-1.5 border border-[#d1d5db] rounded text-sm" data-testid={`input-pfs-date-${index}`} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-[#f9fafb] rounded-lg p-3 border border-[#e5e7eb]">
              <h4 className="text-xs font-bold text-[#1e3a5f] mb-2 pb-1 border-b border-[#1e3a5f]">ASSETS</h4>
              {[
                { field: 'cashOnHand', label: 'Cash on Hand & in Banks', helper: '' },
                { field: 'savingsAccounts', label: 'Savings Accounts', helper: '' },
                { field: 'iraRetirement', label: 'IRA or Other Retirement Account', helper: '(Describe in Section 5)' },
                { field: 'accountsReceivable', label: 'Accounts & Notes Receivable', helper: '(Describe in Section 5)' },
                { field: 'lifeInsuranceCashValue', label: 'Life Insurance – Cash Surrender Value Only', helper: '(Describe in Section 8)' },
                { field: 'stocksAndBonds', label: 'Stocks and Bonds', helper: '(Describe in Section 3)' },
                { field: 'realEstate', label: 'Real Estate', helper: '(Describe in Section 4)' },
                { field: 'automobiles', label: 'Automobiles', helper: '(Describe in Section 5, include Year/Make/Model)' },
                { field: 'otherPersonalProperty', label: 'Other Personal Property', helper: '(Describe in Section 5)' },
                { field: 'otherAssets', label: 'Other Assets', helper: '(Describe in Section 5)' },
              ].map(({ field, label, helper }) => (
                <div key={field} className="flex items-center justify-between py-1.5 border-b border-[#f3f4f6]">
                  <div className="flex-1 min-w-0 pr-2">
                    <span className="text-xs text-[#374151] block">{label}</span>
                    {helper && <span className="text-[10px] text-[#6b7280] italic block">{helper}</span>}
                  </div>
                  <input type="number" value={pfsData[field as keyof PFSData] as string} onChange={(e) => updatePFS(field as keyof PFSData, e.target.value)} className="w-24 px-2 py-1 border border-[#d1d5db] rounded text-xs text-right flex-shrink-0" placeholder="$" data-testid={`input-${field}-${index}`} />
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 mt-1 border-t-2 border-[#1e3a5f]">
                <span className="text-xs font-bold text-[#1e3a5f]">Total Assets</span>
                <span className="text-sm font-bold text-[#1e3a5f] bg-[#e0f2fe] px-2 py-1 rounded">${totalAssets.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-[#f9fafb] rounded-lg p-3 border border-[#e5e7eb]">
              <h4 className="text-xs font-bold text-[#1e3a5f] mb-2 pb-1 border-b border-[#1e3a5f]">LIABILITIES</h4>
              {[
                { field: 'accountsPayable', label: 'Accounts Payable', helper: '' },
                { field: 'notesPayableToBanks', label: 'Notes Payable to Banks and Others', helper: '(Describe in Section 2)' },
                { field: 'installmentAccountAuto', label: 'Installment Account (Auto)', helper: '' },
                { field: 'installmentAccountOther', label: 'Installment Account (Other)', helper: '' },
                { field: 'loansAgainstLifeInsurance', label: 'Loan(s) Against Life Insurance', helper: '' },
                { field: 'mortgagesOnRealEstate', label: 'Mortgages on Real Estate', helper: '(Describe in Section 4)' },
                { field: 'unpaidTaxes', label: 'Unpaid Taxes', helper: '(Describe in Section 6)' },
                { field: 'otherLiabilities', label: 'Other Liabilities', helper: '(Describe in Section 7)' },
              ].map(({ field, label, helper }) => (
                <div key={field} className="flex items-center justify-between py-1.5 border-b border-[#f3f4f6]">
                  <div className="flex-1 min-w-0 pr-2">
                    <span className="text-xs text-[#374151] block">{label}</span>
                    {helper && <span className="text-[10px] text-[#6b7280] italic block">{helper}</span>}
                  </div>
                  <input type="number" value={pfsData[field as keyof PFSData] as string} onChange={(e) => updatePFS(field as keyof PFSData, e.target.value)} className="w-24 px-2 py-1 border border-[#d1d5db] rounded text-xs text-right flex-shrink-0" placeholder="$" data-testid={`input-${field}-${index}`} />
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 mt-1 border-t-2 border-[#1e3a5f]">
                <span className="text-xs font-bold text-[#1e3a5f]">Total Liabilities</span>
                <span className="text-sm font-bold text-[#1e3a5f] bg-[#e0f2fe] px-2 py-1 rounded">${totalLiabilities.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between pt-2 mt-2">
                <span className="text-xs font-bold text-[#374151]">Net Worth</span>
                <span className={`text-sm font-bold px-2 py-1 rounded ${netWorth >= 0 ? 'text-[#059669] bg-[#f0fdf4]' : 'text-[#dc2626] bg-[#fef2f2]'}`}>${netWorth.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-white rounded-lg p-3 border border-[#e5e7eb]">
              <h4 className="text-xs font-bold text-[#1e3a5f] mb-2 pb-1 border-b border-[#e5e7eb]">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#1e3a5f] text-white text-[10px] mr-1.5">1</span>
                Source of Income
              </h4>
              {[
                { field: 'salary', label: 'Salary' },
                { field: 'netInvestmentIncome', label: 'Net Investment Income' },
                { field: 'realEstateIncome', label: 'Real Estate Income' },
                { field: 'otherIncome', label: 'Other Income' },
              ].map(({ field, label }) => (
                <div key={field} className="flex items-center justify-between py-1 border-b border-[#f3f4f6]">
                  <span className="text-xs text-[#374151]">{label}</span>
                  <input type="number" value={pfsData[field as keyof PFSData] as string} onChange={(e) => updatePFS(field as keyof PFSData, e.target.value)} className="w-24 px-2 py-1 border border-[#d1d5db] rounded text-xs text-right" placeholder="$" data-testid={`input-${field}-${index}`} />
                </div>
              ))}
            </div>
            <div className="bg-white rounded-lg p-3 border border-[#e5e7eb]">
              <h4 className="text-xs font-bold text-[#1e3a5f] mb-2 pb-1 border-b border-[#e5e7eb]">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#1e3a5f] text-white text-[10px] mr-1.5">1</span>
                Contingent Liabilities
              </h4>
              {[
                { field: 'asEndorserOrCoMaker', label: 'As Endorser/Co-Maker' },
                { field: 'legalClaimsJudgments', label: 'Legal Claims & Judgments' },
                { field: 'provisionFederalIncomeTax', label: 'Federal Income Tax' },
                { field: 'otherSpecialDebt', label: 'Other Special Debt' },
              ].map(({ field, label }) => (
                <div key={field} className="flex items-center justify-between py-1 border-b border-[#f3f4f6]">
                  <span className="text-xs text-[#374151]">{label}</span>
                  <input type="number" value={pfsData[field as keyof PFSData] as string} onChange={(e) => updatePFS(field as keyof PFSData, e.target.value)} className="w-24 px-2 py-1 border border-[#d1d5db] rounded text-xs text-right" placeholder="$" data-testid={`input-${field}-${index}`} />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg p-3 border border-[#e5e7eb] mb-4">
            <h4 className="text-xs font-bold text-[#1e3a5f] mb-2 pb-1 border-b border-[#e5e7eb]">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#1e3a5f] text-white text-[10px] mr-1.5">2</span>
              Notes Payable to Banks and Others
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#f3f4f6]">
                    <th className="px-2 py-1 text-left font-semibold">Noteholder</th>
                    <th className="px-2 py-1 text-left font-semibold">Original Bal</th>
                    <th className="px-2 py-1 text-left font-semibold">Current Bal</th>
                    <th className="px-2 py-1 text-left font-semibold">Payment</th>
                    <th className="px-2 py-1 text-left font-semibold">Frequency</th>
                    <th className="px-2 py-1 text-left font-semibold">Collateral</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {pfsData.notesPayable.map((note, idx) => (
                    <tr key={idx} className="border-b border-[#e5e7eb]">
                      <td className="p-1"><input type="text" value={note.noteholder} onChange={(e) => handleArrayChange('notesPayable', idx, 'noteholder', e.target.value)} className="w-full px-1 py-0.5 border border-[#d1d5db] rounded text-xs" /></td>
                      <td className="p-1"><input type="number" value={note.originalBalance} onChange={(e) => handleArrayChange('notesPayable', idx, 'originalBalance', e.target.value)} className="w-full px-1 py-0.5 border border-[#d1d5db] rounded text-xs text-right" placeholder="$" /></td>
                      <td className="p-1"><input type="number" value={note.currentBalance} onChange={(e) => handleArrayChange('notesPayable', idx, 'currentBalance', e.target.value)} className="w-full px-1 py-0.5 border border-[#d1d5db] rounded text-xs text-right" placeholder="$" /></td>
                      <td className="p-1"><input type="number" value={note.paymentAmount} onChange={(e) => handleArrayChange('notesPayable', idx, 'paymentAmount', e.target.value)} className="w-full px-1 py-0.5 border border-[#d1d5db] rounded text-xs text-right" placeholder="$" /></td>
                      <td className="p-1">
                        <select value={note.frequency} onChange={(e) => handleArrayChange('notesPayable', idx, 'frequency', e.target.value)} className="w-full px-1 py-0.5 border border-[#d1d5db] rounded text-xs">
                          <option value="">Select</option>
                          <option value="weekly">Weekly</option>
                          <option value="bi-weekly">Bi-Weekly</option>
                          <option value="monthly">Monthly</option>
                          <option value="quarterly">Quarterly</option>
                          <option value="annually">Annually</option>
                        </select>
                      </td>
                      <td className="p-1"><input type="text" value={note.collateral} onChange={(e) => handleArrayChange('notesPayable', idx, 'collateral', e.target.value)} className="w-full px-1 py-0.5 border border-[#d1d5db] rounded text-xs" /></td>
                      <td className="p-1 text-center">
                        {pfsData.notesPayable.length > 1 && (
                          <button type="button" onClick={() => removeArrayItem('notesPayable', idx)} className="text-[#dc2626] hover:bg-[#fee2e2] rounded p-0.5"><X className="w-3 h-3" /></button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={() => addArrayItem('notesPayable', { noteholder: '', originalBalance: '', currentBalance: '', paymentAmount: '', frequency: '', collateral: '' })} className="mt-2 text-xs text-[#0369a1] bg-[#f0f9ff] border border-[#bae6fd] px-2 py-1 rounded flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add Note
            </button>
          </div>

          <div className="bg-white rounded-lg p-3 border border-[#e5e7eb] mb-4">
            <h4 className="text-xs font-bold text-[#1e3a5f] mb-2 pb-1 border-b border-[#e5e7eb]">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#1e3a5f] text-white text-[10px] mr-1.5">3</span>
              Stocks and Bonds
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#f3f4f6]">
                    <th className="px-2 py-1 text-left font-semibold"># Shares</th>
                    <th className="px-2 py-1 text-left font-semibold">Name of Securities</th>
                    <th className="px-2 py-1 text-left font-semibold">Cost</th>
                    <th className="px-2 py-1 text-left font-semibold">Market Value</th>
                    <th className="px-2 py-1 text-left font-semibold">Date</th>
                    <th className="px-2 py-1 text-left font-semibold">Total Value</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {pfsData.securities.map((sec, idx) => (
                    <tr key={idx} className="border-b border-[#e5e7eb]">
                      <td className="p-1"><input type="number" value={sec.numberOfShares} onChange={(e) => handleArrayChange('securities', idx, 'numberOfShares', e.target.value)} className="w-full px-1 py-0.5 border border-[#d1d5db] rounded text-xs text-right" /></td>
                      <td className="p-1"><input type="text" value={sec.nameOfSecurities} onChange={(e) => handleArrayChange('securities', idx, 'nameOfSecurities', e.target.value)} className="w-full px-1 py-0.5 border border-[#d1d5db] rounded text-xs" /></td>
                      <td className="p-1"><input type="number" value={sec.cost} onChange={(e) => handleArrayChange('securities', idx, 'cost', e.target.value)} className="w-full px-1 py-0.5 border border-[#d1d5db] rounded text-xs text-right" placeholder="$" /></td>
                      <td className="p-1"><input type="text" value={sec.marketValue} onChange={(e) => handleArrayChange('securities', idx, 'marketValue', e.target.value)} className="w-full px-1 py-0.5 border border-[#d1d5db] rounded text-xs" /></td>
                      <td className="p-1"><input type="date" value={sec.dateOfQuotation} onChange={(e) => handleArrayChange('securities', idx, 'dateOfQuotation', e.target.value)} className="w-full px-1 py-0.5 border border-[#d1d5db] rounded text-xs" /></td>
                      <td className="p-1"><input type="number" value={sec.totalValue} onChange={(e) => handleArrayChange('securities', idx, 'totalValue', e.target.value)} className="w-full px-1 py-0.5 border border-[#d1d5db] rounded text-xs text-right" placeholder="$" /></td>
                      <td className="p-1 text-center">
                        {pfsData.securities.length > 1 && (
                          <button type="button" onClick={() => removeArrayItem('securities', idx)} className="text-[#dc2626] hover:bg-[#fee2e2] rounded p-0.5"><X className="w-3 h-3" /></button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={() => addArrayItem('securities', { numberOfShares: '', nameOfSecurities: '', cost: '', marketValue: '', dateOfQuotation: '', totalValue: '' })} className="mt-2 text-xs text-[#0369a1] bg-[#f0f9ff] border border-[#bae6fd] px-2 py-1 rounded flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add Security
            </button>
          </div>

          <div className="bg-white rounded-lg p-3 border border-[#e5e7eb] mb-4">
            <h4 className="text-xs font-bold text-[#1e3a5f] mb-2 pb-1 border-b border-[#e5e7eb]">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#1e3a5f] text-white text-[10px] mr-1.5">4</span>
              Real Estate Owned
            </h4>
            <div className="grid grid-cols-3 gap-3">
              {['Property A', 'Property B', 'Property C'].map((label, idx) => (
                <div key={idx} className="bg-[#f9fafb] rounded p-2 border border-[#e5e7eb]">
                  <h5 className="text-xs font-semibold text-[#1e3a5f] mb-2 pb-1 border-b border-[#d1d5db]">{label}</h5>
                  <div className="space-y-1.5">
                    <div>
                      <label className="block text-[10px] text-[#6b7280]">Type</label>
                      <select value={pfsData.realEstateOwned[idx]?.type || ''} onChange={(e) => handleArrayChange('realEstateOwned', idx, 'type', e.target.value)} className="w-full px-1 py-0.5 border border-[#d1d5db] rounded text-xs">
                        <option value="">Select</option>
                        <option value="primary_residence">Primary Residence</option>
                        <option value="other_residence">Other Residence</option>
                        <option value="rental_property">Rental Property</option>
                        <option value="land">Land</option>
                        <option value="commercial">Commercial</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-[#6b7280]">Address</label>
                      <input type="text" value={pfsData.realEstateOwned[idx]?.address || ''} onChange={(e) => handleArrayChange('realEstateOwned', idx, 'address', e.target.value)} className="w-full px-1 py-0.5 border border-[#d1d5db] rounded text-xs" />
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <div>
                        <label className="block text-[10px] text-[#6b7280]">Original Cost</label>
                        <input type="number" value={pfsData.realEstateOwned[idx]?.originalCost || ''} onChange={(e) => handleArrayChange('realEstateOwned', idx, 'originalCost', e.target.value)} className="w-full px-1 py-0.5 border border-[#d1d5db] rounded text-xs text-right" placeholder="$" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-[#6b7280]">Market Value</label>
                        <input type="number" value={pfsData.realEstateOwned[idx]?.presentMarketValue || ''} onChange={(e) => handleArrayChange('realEstateOwned', idx, 'presentMarketValue', e.target.value)} className="w-full px-1 py-0.5 border border-[#d1d5db] rounded text-xs text-right" placeholder="$" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <div>
                        <label className="block text-[10px] text-[#6b7280]">Mortgage Bal</label>
                        <input type="number" value={pfsData.realEstateOwned[idx]?.mortgageBalance || ''} onChange={(e) => handleArrayChange('realEstateOwned', idx, 'mortgageBalance', e.target.value)} className="w-full px-1 py-0.5 border border-[#d1d5db] rounded text-xs text-right" placeholder="$" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-[#6b7280]">Mo. Payment</label>
                        <input type="number" value={pfsData.realEstateOwned[idx]?.monthlyPayment || ''} onChange={(e) => handleArrayChange('realEstateOwned', idx, 'monthlyPayment', e.target.value)} className="w-full px-1 py-0.5 border border-[#d1d5db] rounded text-xs text-right" placeholder="$" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] text-[#6b7280]">Status</label>
                      <select value={pfsData.realEstateOwned[idx]?.status || ''} onChange={(e) => handleArrayChange('realEstateOwned', idx, 'status', e.target.value)} className="w-full px-1 py-0.5 border border-[#d1d5db] rounded text-xs">
                        <option value="">Select</option>
                        <option value="current">Current</option>
                        <option value="delinquent">Delinquent</option>
                        <option value="paid_off">Paid Off</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-lg p-3 border border-[#e5e7eb]">
              <label className="flex items-center text-xs font-bold text-[#1e3a5f] mb-2 pb-1 border-b border-[#e5e7eb]">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#1e3a5f] text-white text-[10px] mr-1.5">5</span>
                Other Personal Property & Other Assets
              </label>
              <textarea value={pfsData.otherPersonalPropertyDescription} onChange={(e) => updatePFS('otherPersonalPropertyDescription', e.target.value)} rows={3} className="w-full px-2 py-1.5 border border-[#d1d5db] rounded text-xs resize-none" placeholder="Describe automobiles (Year/Make/Model), retirement accounts, and other assets..." data-testid={`input-otherPropertyDesc-${index}`} />
            </div>
            <div className="bg-white rounded-lg p-3 border border-[#e5e7eb]">
              <label className="flex items-center text-xs font-bold text-[#1e3a5f] mb-2 pb-1 border-b border-[#e5e7eb]">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#1e3a5f] text-white text-[10px] mr-1.5">6</span>
                Unpaid Taxes
              </label>
              <textarea value={pfsData.unpaidTaxesDescription} onChange={(e) => updatePFS('unpaidTaxesDescription', e.target.value)} rows={3} className="w-full px-2 py-1.5 border border-[#d1d5db] rounded text-xs resize-none" placeholder="Type of tax, to whom payable, when due, amount, property to which lien attaches..." data-testid={`input-unpaidTaxesDesc-${index}`} />
            </div>
            <div className="bg-white rounded-lg p-3 border border-[#e5e7eb]">
              <label className="flex items-center text-xs font-bold text-[#1e3a5f] mb-2 pb-1 border-b border-[#e5e7eb]">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#1e3a5f] text-white text-[10px] mr-1.5">7</span>
                Other Liabilities
              </label>
              <textarea value={pfsData.otherLiabilitiesDescription} onChange={(e) => updatePFS('otherLiabilitiesDescription', e.target.value)} rows={3} className="w-full px-2 py-1.5 border border-[#d1d5db] rounded text-xs resize-none" placeholder="Student loans, personal loans, credit card debt, other obligations..." data-testid={`input-otherLiabilitiesDesc-${index}`} />
            </div>
            <div className="bg-white rounded-lg p-3 border border-[#e5e7eb]">
              <label className="flex items-center text-xs font-bold text-[#1e3a5f] mb-2 pb-1 border-b border-[#e5e7eb]">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#1e3a5f] text-white text-[10px] mr-1.5">8</span>
                Life Insurance Held
              </label>
              <textarea value={pfsData.lifeInsuranceDescription} onChange={(e) => updatePFS('lifeInsuranceDescription', e.target.value)} rows={3} className="w-full px-2 py-1.5 border border-[#d1d5db] rounded text-xs resize-none" placeholder="Insurance company, face amount, cash surrender value, beneficiaries..." data-testid={`input-lifeInsuranceDesc-${index}`} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PersonalFinancialStatementsSection() {
  const { data } = useApplication();
  const [expandedApplicants, setExpandedApplicants] = useState<Set<number>>(new Set([0]));
  const [descriptionExpanded, setDescriptionExpanded] = useState(true);

  const applicants = data.individualApplicants.filter(a => a.firstName || a.lastName);

  const toggleApplicant = (index: number) => {
    setExpandedApplicants(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const getApplicantName = (applicant: { firstName?: string; middleName?: string; lastName?: string }) => {
    const parts = [applicant.firstName, applicant.middleName, applicant.lastName].filter(Boolean);
    return parts.join(' ') || 'Unnamed Applicant';
  };

  return (
    <div>
      <div className="p-4 sm:p-6 pb-3">
        <h1 className="text-[28px] font-bold text-[#1a1a1a]">Personal Financial Statements</h1>
        <p className="text-sm text-[#6b7280] mt-1">SBA Form 413</p>
      </div>

      <div className="px-4 sm:px-6 mb-4">
        <div className="bg-[#f8fafc] border border-[#e5e7eb] rounded-lg p-3">
          <div className="flex items-start gap-2 cursor-pointer" onClick={() => setDescriptionExpanded(!descriptionExpanded)}>
            <ChevronDown className={`w-4 h-4 text-[#6b7280] transition-transform flex-shrink-0 mt-0.5 ${descriptionExpanded ? 'rotate-180' : ''}`} />
            <div className="flex-1">
              <h3 className="text-xs font-semibold text-[#374151]">About This Section</h3>
              {descriptionExpanded && (
                <p className="text-xs text-[#4b5563] mt-1 leading-relaxed">
                  Complete a Personal Financial Statement for each individual applicant who owns 20% or more of the business. This form provides a snapshot of your personal assets, liabilities, and net worth as required by the SBA.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 pb-6 space-y-3">
        {applicants.length > 0 ? (
          applicants.map((applicant, index) => (
            <ApplicantPFS
              key={applicant.id}
              applicantId={applicant.id}
              applicantName={getApplicantName(applicant)}
              index={index}
              isExpanded={expandedApplicants.has(index)}
              onToggle={() => toggleApplicant(index)}
            />
          ))
        ) : (
          <div className="bg-[#f8f9fb] rounded-lg border border-[#e5e7eb] p-6 text-center">
            <p className="text-sm text-[#6b7280]">
              Please add individual applicants in the previous step to complete their Personal Financial Statements.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

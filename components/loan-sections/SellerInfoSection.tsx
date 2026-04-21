'use client';

import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import AddressInput from '@/components/loan-sections/AddressInput';
import LearnMorePanel from '@/components/LearnMorePanel';
import { useApplication } from '@/lib/applicationStore';

export default function SellerInfoSection() {
  const { data, updateSellerInfo } = useApplication();
  const sellerInfo = data.sellerInfo;

  const [showAcquisitionTypeInfo, setShowAcquisitionTypeInfo] = useState(false);
  const [showSellerCarryNoteInfo, setShowSellerCarryNoteInfo] = useState(false);

  // Determine which project purposes are selected
  const primary = data.projectOverview?.primaryProjectPurpose ?? '';
  const secondary = data.projectOverview?.secondaryProjectPurposes ?? [];
  const allPurposes: string[] = [
    ...(Array.isArray(primary) ? primary : primary ? [primary] : []),
    ...secondary,
  ];

  // Any selected purpose (primary or secondary) drives section visibility
  const isAcquisition = allPurposes.includes('Business Acquisition');
  const isCREConstruction = allPurposes.includes('CRE: Construction');
  const isCREPurchase = allPurposes.includes('CRE: Purchase');
  const isDebtRefinance = allPurposes.includes('Debt Refinance');
  const isEquipmentPurchase = allPurposes.includes('Equipment Purchase');

  const hasAnyPurpose = allPurposes.length > 0;

  // Safe access helpers
  const val = (field: string): string => {
    if (!sellerInfo) return '';
    const v = (sellerInfo as any)[field];
    return v != null ? String(v) : '';
  };

  const numVal = (field: string): number => {
    if (!sellerInfo) return 0;
    const v = (sellerInfo as any)[field];
    return typeof v === 'number' ? v : 0;
  };

  const handleChange = (field: string, value: any) => {
    updateSellerInfo({ [field]: value } as any);
  };

  // Debt refinance items (array of 10 rows)
  const debtRefinanceItems: any[] = (sellerInfo as any)?.debtRefinanceItems ?? Array.from({ length: 10 }, () => ({
    creditor: '',
    originalAmount: '',
    currentBalance: '',
    monthlyPayment: '',
    interestRate: '',
    maturityDate: '',
    purpose: '',
    collateral: '',
  }));

  // Equipment purchase items (array of 10 rows)
  const equipmentPurchaseItems: any[] = (sellerInfo as any)?.equipmentPurchaseItems ?? Array.from({ length: 10 }, () => ({
    description: '',
    newOrUsed: '',
    vendor: '',
    price: '',
    year: '',
    make: '',
    model: '',
    usefulLife: '',
  }));

  const updateDebtRefinanceRow = (index: number, field: string, value: string) => {
    const updated = [...debtRefinanceItems];
    updated[index] = { ...updated[index], [field]: value };
    updateSellerInfo({ debtRefinanceItems: updated } as any);
  };

  const updateEquipmentRow = (index: number, field: string, value: string) => {
    const updated = [...equipmentPurchaseItems];
    updated[index] = { ...updated[index], [field]: value };
    updateSellerInfo({ equipmentPurchaseItems: updated } as any);
  };

  // Reusable class strings
  const inputClass = "w-full px-3 py-1.5 border border-[#c5d4e8] rounded-lg text-[13px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]";
  const currencyInputClass = "w-full pl-7 pr-3 py-1.5 border border-[#c5d4e8] rounded-lg text-[13px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]";
  const selectClass = "w-full px-3 py-1.5 border border-[#c5d4e8] rounded-lg text-[13px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] bg-white cursor-pointer";
  const labelClass = "block text-[13px] font-medium text-[#1a1a1a] mb-2";
  const tableCellInputClass = "w-full px-2 py-1 border border-[#c5d4e8] rounded text-[12px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]";
  const tableCellSelectClass = "w-full px-2 py-1 border border-[#c5d4e8] rounded text-[12px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] bg-white cursor-pointer";

  if (!hasAnyPurpose) {
    return (
      <div>
        <div className="p-4 pb-2">
          <h1 className="text-lg font-semibold text-[#133c7f] uppercase tracking-wider">Project Information</h1>
        </div>
        <div className="px-4 py-4">
          <div className="bg-white border border-[#c5d4e8] rounded-md p-6 text-center text-[13px] text-[#7da1d4]">
            Select a Primary or Secondary Project Purpose in the Project Overview section to see relevant fields here.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="p-4 pb-2">
        <h1 className="text-lg font-semibold text-[#133c7f] uppercase tracking-wider">Project Information</h1>
      </div>

      <div className="px-4 py-4 space-y-4">

        {/* ===== BUSINESS ACQUISITION ===== */}
        {isAcquisition && (
          <div className="bg-white border border-[#c5d4e8] rounded-md overflow-hidden">
            <div className="bg-[#e7edf4] px-4 py-1.5">
              <h4 className="text-[13px] font-semibold text-[#1a1a1a]">Business Acquisition</h4>
            </div>
            <div className="px-4 py-3 space-y-3">
              <p className="text-sm text-[#7da1d4]">
                This section collects key details about the business you are acquiring, not information about you or your existing company.
              </p>

              {/* Row: Legal Name, DBA Name, Year Established */}
              <div className="grid grid-cols-5 gap-3">
                <div className="col-span-2">
                  <label className={labelClass}>Legal Name</label>
                  <input
                    className={inputClass}
                    value={val('sellerName') || val('businessName')}
                    onChange={(e) => {
                      handleChange('sellerName', e.target.value);
                      handleChange('businessName', e.target.value);
                    }}
                    placeholder="Legal name of seller or business"
                  />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>DBA Name</label>
                  <input
                    className={inputClass}
                    value={val('dbaName')}
                    onChange={(e) => handleChange('dbaName', e.target.value)}
                    placeholder="Doing business as"
                  />
                </div>
                <div>
                  <label className={labelClass}>Year Established</label>
                  <input
                    className={inputClass}
                    value={val('yearEstablished')}
                    onChange={(e) => handleChange('yearEstablished', e.target.value)}
                    placeholder="YYYY"
                  />
                </div>
              </div>

              {/* Row: Contact Name, Phone, Email */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Contact Name</label>
                  <input
                    className={inputClass}
                    value={val('contactName')}
                    onChange={(e) => handleChange('contactName', e.target.value)}
                    placeholder="Primary contact"
                  />
                </div>
                <div>
                  <label className={labelClass}>Seller Phone Number</label>
                  <input
                    className={inputClass}
                    value={val('sellerPhone') || val('phone')}
                    onChange={(e) => {
                      handleChange('sellerPhone', e.target.value);
                      handleChange('phone', e.target.value);
                    }}
                    placeholder="(xxx) xxx-xxxx"
                  />
                </div>
                <div>
                  <label className={labelClass}>Seller Email</label>
                  <input
                    className={inputClass}
                    type="email"
                    value={val('sellerEmail') || val('email')}
                    onChange={(e) => {
                      handleChange('sellerEmail', e.target.value);
                      handleChange('email', e.target.value);
                    }}
                    placeholder="seller@example.com"
                  />
                </div>
              </div>

              {/* Row: Website, FT Employees, PT Employees */}
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-2">
                  <label className={labelClass}>Business Website Address</label>
                  <input
                    className={inputClass}
                    value={val('website')}
                    onChange={(e) => handleChange('website', e.target.value)}
                    placeholder="https://"
                  />
                </div>
                <div>
                  <label className={labelClass}># of Full Time Employees</label>
                  <input
                    className={inputClass}
                    type="number"
                    value={val('fullTimeEmployees')}
                    onChange={(e) => handleChange('fullTimeEmployees', e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className={labelClass}># of Part Time Employees</label>
                  <input
                    className={inputClass}
                    type="number"
                    value={val('partTimeEmployees')}
                    onChange={(e) => handleChange('partTimeEmployees', e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Business Address */}
              <div>
                <label className={labelClass}>Business Address</label>
                <AddressInput
                  value={sellerInfo?.sellerAddress ?? { street1: '', city: '', state: '', zipCode: '' }}
                  onChange={(addr) => handleChange('sellerAddress', addr)}
                  idPrefix="seller"
                />
              </div>

              {/* Row: Purchase Price, Type of Acquisition, Purchasing 100%, Purchase Contract Status */}
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className={labelClass}>Purchase Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-[#6b7280]">$</span>
                    <input
                      className={currencyInputClass}
                      type="number"
                      value={numVal('purchasePrice') || ''}
                      onChange={(e) => handleChange('purchasePrice', e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>
                    <span className="flex items-center gap-1">
                      Type of Acquisition
                      <button
                        type="button"
                        className="text-[#2563eb] hover:text-[#1d4ed8] transition-colors flex-shrink-0"
                        onClick={() => setShowAcquisitionTypeInfo(true)}
                      >
                        <HelpCircle className="w-4 h-4" />
                      </button>
                    </span>
                  </label>
                  <div className="flex gap-4 mt-1">
                    <label className="flex items-center gap-1.5 text-[13px] text-[#1a1a1a] cursor-pointer">
                      <input
                        type="radio"
                        name="typeOfAcquisition"
                        value="stock"
                        checked={val('typeOfAcquisition') === 'stock'}
                        onChange={(e) => handleChange('typeOfAcquisition', e.target.value)}
                        className="accent-[#2563eb]"
                      />
                      Stock
                    </label>
                    <label className="flex items-center gap-1.5 text-[13px] text-[#1a1a1a] cursor-pointer">
                      <input
                        type="radio"
                        name="typeOfAcquisition"
                        value="asset"
                        checked={val('typeOfAcquisition') === 'asset'}
                        onChange={(e) => handleChange('typeOfAcquisition', e.target.value)}
                        className="accent-[#2563eb]"
                      />
                      Asset
                    </label>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Purchasing 100%?</label>
                  <div className="flex gap-4 mt-1">
                    <label className="flex items-center gap-1.5 text-[13px] text-[#1a1a1a] cursor-pointer">
                      <input
                        type="radio"
                        name="purchasing100Percent"
                        value="yes"
                        checked={val('purchasing100Percent') === 'yes'}
                        onChange={(e) => handleChange('purchasing100Percent', e.target.value)}
                        className="accent-[#2563eb]"
                      />
                      Yes
                    </label>
                    <label className="flex items-center gap-1.5 text-[13px] text-[#1a1a1a] cursor-pointer">
                      <input
                        type="radio"
                        name="purchasing100Percent"
                        value="no"
                        checked={val('purchasing100Percent') === 'no'}
                        onChange={(e) => handleChange('purchasing100Percent', e.target.value)}
                        className="accent-[#2563eb]"
                      />
                      No
                    </label>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Purchase Contract Status</label>
                  <select
                    className={selectClass}
                    value={val('purchaseContractStatus')}
                    onChange={(e) => handleChange('purchaseContractStatus', e.target.value)}
                  >
                    <option value="">-- Select --</option>
                    <option value="no_contract">No Contract Yet</option>
                    <option value="loi_signed">LOI Signed</option>
                    <option value="contract_drafted">Contract Drafted</option>
                    <option value="fully_executed">Fully Executed</option>
                  </select>
                </div>
              </div>

              {/* Other Owners (conditional) */}
              {val('purchasing100Percent') === 'no' && (
                <div>
                  <label className={labelClass}>Other Owners / Description</label>
                  <textarea
                    className={`${inputClass} min-h-[80px] resize-y`}
                    value={val('otherOwners') || val('otherOwnersDescription')}
                    onChange={(e) => {
                      handleChange('otherOwners', e.target.value);
                      handleChange('otherOwnersDescription', e.target.value);
                    }}
                    placeholder="Describe the other owners and their ownership percentages..."
                  />
                </div>
              )}

              {/* Seller Carry Note */}
              <div>
                <label className={labelClass}>
                  Is the seller financing a portion of the acquisition through a seller carry note?
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 text-[13px] text-[#1a1a1a] cursor-pointer">
                    <input
                      type="radio"
                      name="hasSellerCarryNote"
                      value="yes"
                      checked={val('hasSellerCarryNote') === 'yes'}
                      onChange={(e) => handleChange('hasSellerCarryNote', e.target.value)}
                      className="accent-[#2563eb]"
                    />
                    Yes
                  </label>
                  <label className="flex items-center gap-1.5 text-[13px] text-[#1a1a1a] cursor-pointer">
                    <input
                      type="radio"
                      name="hasSellerCarryNote"
                      value="no"
                      checked={val('hasSellerCarryNote') === 'no'}
                      onChange={(e) => handleChange('hasSellerCarryNote', e.target.value)}
                      className="accent-[#2563eb]"
                    />
                    No
                  </label>
                </div>
              </div>

              {/* Seller Carry Note Terms (conditional) */}
              {val('hasSellerCarryNote') === 'yes' && (
                <div>
                  <label className={labelClass}>Terms of Seller Carry Note</label>
                  <textarea
                    className={`${inputClass} min-h-[80px] resize-y`}
                    value={val('sellerCarryNoteTerms')}
                    onChange={(e) => handleChange('sellerCarryNoteTerms', e.target.value)}
                    placeholder="Please describe the seller carry note, including: note amount, interest rate, repayment terms, and how long the note will be on standby."
                  />
                </div>
              )}

              {/* Business Description */}
              <div>
                <label className={labelClass}>Business Description</label>
                <textarea
                  className={`${inputClass} min-h-[80px] resize-y`}
                  value={val('businessDescription')}
                  onChange={(e) => handleChange('businessDescription', e.target.value)}
                  placeholder="Describe the business being acquired, including its operations, history, and key services..."
                />
              </div>

            </div>
          </div>
        )}

        {/* ===== CRE: CONSTRUCTION ===== */}
        {isCREConstruction && (
          <div className="bg-white border border-[#c5d4e8] rounded-md overflow-hidden">
            <div className="bg-[#e7edf4] px-4 py-1.5">
              <h4 className="text-[13px] font-semibold text-[#1a1a1a]">CRE: Construction Details</h4>
            </div>
            <div className="px-4 py-3 space-y-3">

              {/* Property Address */}
              <div>
                <label className={labelClass}>Property Address</label>
                <AddressInput
                  value={(sellerInfo as any)?.constructionAddress ?? { street1: '', city: '', state: '', zipCode: '' }}
                  onChange={(addr) => handleChange('constructionAddress', addr)}
                  idPrefix="construction"
                />
              </div>

              {/* Land Already Owned? */}
              <div>
                <label className={labelClass}>Land Already Owned?</label>
                <div className="flex gap-4 mt-1">
                  <label className="flex items-center gap-1.5 text-[13px] text-[#1a1a1a] cursor-pointer">
                    <input
                      type="radio"
                      name="landOwned"
                      value="yes"
                      checked={val('landOwned') === 'yes'}
                      onChange={(e) => handleChange('landOwned', e.target.value)}
                      className="accent-[#2563eb]"
                    />
                    Yes
                  </label>
                  <label className="flex items-center gap-1.5 text-[13px] text-[#1a1a1a] cursor-pointer">
                    <input
                      type="radio"
                      name="landOwned"
                      value="no"
                      checked={val('landOwned') === 'no'}
                      onChange={(e) => handleChange('landOwned', e.target.value)}
                      className="accent-[#2563eb]"
                    />
                    No
                  </label>
                </div>
              </div>

              {/* Total Construction Cost, Contractor, Timeline */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Total Construction Cost</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-[#6b7280]">$</span>
                    <input
                      className={currencyInputClass}
                      type="number"
                      value={numVal('constructionCost') || ''}
                      onChange={(e) => handleChange('constructionCost', e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>General Contractor Name</label>
                  <input
                    className={inputClass}
                    value={val('contractorName')}
                    onChange={(e) => handleChange('contractorName', e.target.value)}
                    placeholder="General contractor"
                  />
                </div>
                <div>
                  <label className={labelClass}>Construction Timeline (months)</label>
                  <input
                    className={inputClass}
                    value={val('constructionTimeline')}
                    onChange={(e) => handleChange('constructionTimeline', e.target.value)}
                    placeholder="e.g. 12"
                  />
                </div>
              </div>

              {/* Sqft, Occupancy %, After-Construction Value */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Proposed Square Footage</label>
                  <input
                    className={inputClass}
                    type="number"
                    value={val('constructionSqft')}
                    onChange={(e) => handleChange('constructionSqft', e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className={labelClass}>Owner-Occupancy % (post-construction)</label>
                  <input
                    className={inputClass}
                    type="number"
                    value={val('constructionOccupancy')}
                    onChange={(e) => handleChange('constructionOccupancy', e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className={labelClass}>Projected After-Construction Value</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-[#6b7280]">$</span>
                    <input
                      className={currencyInputClass}
                      type="number"
                      value={numVal('afterConstructionValue') || ''}
                      onChange={(e) => handleChange('afterConstructionValue', e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ===== CRE: PURCHASE ===== */}
        {isCREPurchase && (
          <div className="bg-white border border-[#c5d4e8] rounded-md overflow-hidden">
            <div className="bg-[#e7edf4] px-4 py-1.5">
              <h4 className="text-[13px] font-semibold text-[#1a1a1a]">CRE: Purchase Details</h4>
            </div>
            <div className="px-4 py-3 space-y-3">

              {/* Property Address */}
              <div>
                <label className={labelClass}>Property Address</label>
                <AddressInput
                  value={(sellerInfo as any)?.purchasePropertyAddress ?? { street1: '', city: '', state: '', zipCode: '' }}
                  onChange={(addr) => handleChange('purchasePropertyAddress', addr)}
                  idPrefix="cre-purchase"
                />
              </div>

              {/* Purchase Price, Property Type, Sqft, Occupancy */}
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className={labelClass}>Purchase Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-[#6b7280]">$</span>
                    <input
                      className={currencyInputClass}
                      type="number"
                      value={numVal('crePurchasePrice') || ''}
                      onChange={(e) => handleChange('crePurchasePrice', e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Property Type</label>
                  <select
                    className={inputClass}
                    value={val('crePropertyType')}
                    onChange={(e) => handleChange('crePropertyType', e.target.value)}
                  >
                    <option value="">Select...</option>
                    <option value="Office">Office</option>
                    <option value="Retail">Retail</option>
                    <option value="Industrial">Industrial</option>
                    <option value="Mixed-Use">Mixed-Use</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Square Footage</label>
                  <input
                    className={inputClass}
                    type="number"
                    value={val('crePurchaseSqft')}
                    onChange={(e) => handleChange('crePurchaseSqft', e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className={labelClass}>Occupancy %</label>
                  <input
                    className={inputClass}
                    type="number"
                    value={val('crePurchaseOccupancy')}
                    onChange={(e) => handleChange('crePurchaseOccupancy', e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ===== DEBT REFINANCE ===== */}
        {isDebtRefinance && (
          <div className="bg-white border border-[#c5d4e8] rounded-md overflow-hidden">
            <div className="bg-[#e7edf4] px-4 py-1.5">
              <h4 className="text-[13px] font-semibold text-[#1a1a1a]">Debt Refinance Details</h4>
            </div>
            <div className="px-4 py-3">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr>
                      <th className="bg-[#133c7f] text-white px-2 py-1.5 text-left font-semibold text-[12px] w-[30px]">#</th>
                      <th className="bg-[#133c7f] text-white px-2 py-1.5 text-left font-semibold text-[12px]">Lender</th>
                      <th className="bg-[#133c7f] text-white px-2 py-1.5 text-left font-semibold text-[12px]">Original Amt</th>
                      <th className="bg-[#133c7f] text-white px-2 py-1.5 text-left font-semibold text-[12px]">Balance</th>
                      <th className="bg-[#133c7f] text-white px-2 py-1.5 text-left font-semibold text-[12px]">Rate</th>
                      <th className="bg-[#133c7f] text-white px-2 py-1.5 text-left font-semibold text-[12px]">Mo. Payment</th>
                      <th className="bg-[#133c7f] text-white px-2 py-1.5 text-left font-semibold text-[12px]">Maturity Date</th>
                      <th className="bg-[#133c7f] text-white px-2 py-1.5 text-left font-semibold text-[12px]">Purpose</th>
                      <th className="bg-[#133c7f] text-white px-2 py-1.5 text-left font-semibold text-[12px]">Collateral Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {debtRefinanceItems.map((item: any, i: number) => (
                      <tr key={i} className="border-b border-[#c5d4e8]">
                        <td className="px-2 py-1 text-center text-[11px] text-[#999]">{i + 1}</td>
                        <td className="px-1 py-1">
                          <input
                            className={tableCellInputClass}
                            value={item.creditor || ''}
                            onChange={(e) => updateDebtRefinanceRow(i, 'creditor', e.target.value)}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            className={tableCellInputClass}
                            value={item.originalAmount || ''}
                            onChange={(e) => updateDebtRefinanceRow(i, 'originalAmount', e.target.value)}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            className={tableCellInputClass}
                            value={item.currentBalance || ''}
                            onChange={(e) => updateDebtRefinanceRow(i, 'currentBalance', e.target.value)}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            className={tableCellInputClass}
                            value={item.interestRate || ''}
                            onChange={(e) => updateDebtRefinanceRow(i, 'interestRate', e.target.value)}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            className={tableCellInputClass}
                            value={item.monthlyPayment || ''}
                            onChange={(e) => updateDebtRefinanceRow(i, 'monthlyPayment', e.target.value)}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="date"
                            className={tableCellInputClass}
                            value={item.maturityDate || ''}
                            onChange={(e) => updateDebtRefinanceRow(i, 'maturityDate', e.target.value)}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            className={tableCellInputClass}
                            value={item.purpose || ''}
                            onChange={(e) => updateDebtRefinanceRow(i, 'purpose', e.target.value)}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <select
                            className={tableCellInputClass}
                            value={item.collateral || ''}
                            onChange={(e) => updateDebtRefinanceRow(i, 'collateral', e.target.value)}
                          >
                            <option value="">Select...</option>
                            <option value="Real Estate">Real Estate</option>
                            <option value="Equipment">Equipment</option>
                            <option value="Business Assets">Business Assets</option>
                            <option value="Unsecured">Unsecured</option>
                            <option value="Other">Other</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===== EQUIPMENT PURCHASE ===== */}
        {isEquipmentPurchase && (
          <div className="bg-white border border-[#c5d4e8] rounded-md overflow-hidden">
            <div className="bg-[#e7edf4] px-4 py-1.5">
              <h4 className="text-[13px] font-semibold text-[#1a1a1a]">Equipment Purchase Details</h4>
            </div>
            <div className="px-4 py-3">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr>
                      <th className="bg-[#133c7f] text-white px-2 py-1.5 text-left font-semibold text-[12px] w-[30px]">#</th>
                      <th className="bg-[#133c7f] text-white px-2 py-1.5 text-left font-semibold text-[12px]">Description</th>
                      <th className="bg-[#133c7f] text-white px-2 py-1.5 text-left font-semibold text-[12px]">New/Used</th>
                      <th className="bg-[#133c7f] text-white px-2 py-1.5 text-left font-semibold text-[12px]">Vendor</th>
                      <th className="bg-[#133c7f] text-white px-2 py-1.5 text-left font-semibold text-[12px]">Price</th>
                      <th className="bg-[#133c7f] text-white px-2 py-1.5 text-left font-semibold text-[12px]">Year</th>
                      <th className="bg-[#133c7f] text-white px-2 py-1.5 text-left font-semibold text-[12px]">Make</th>
                      <th className="bg-[#133c7f] text-white px-2 py-1.5 text-left font-semibold text-[12px]">Model</th>
                      <th className="bg-[#133c7f] text-white px-2 py-1.5 text-left font-semibold text-[12px]">Useful Life</th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipmentPurchaseItems.map((item: any, i: number) => (
                      <tr key={i} className="border-b border-[#c5d4e8]">
                        <td className="px-2 py-1 text-center text-[11px] text-[#999]">{i + 1}</td>
                        <td className="px-1 py-1">
                          <input
                            className={tableCellInputClass}
                            value={item.description || ''}
                            onChange={(e) => updateEquipmentRow(i, 'description', e.target.value)}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <select
                            className={tableCellSelectClass}
                            value={item.newOrUsed || ''}
                            onChange={(e) => updateEquipmentRow(i, 'newOrUsed', e.target.value)}
                          >
                            <option value="">--</option>
                            <option value="new">New</option>
                            <option value="used">Used</option>
                          </select>
                        </td>
                        <td className="px-1 py-1">
                          <input
                            className={tableCellInputClass}
                            value={item.vendor || ''}
                            onChange={(e) => updateEquipmentRow(i, 'vendor', e.target.value)}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            className={tableCellInputClass}
                            value={item.price || ''}
                            onChange={(e) => updateEquipmentRow(i, 'price', e.target.value)}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            className={tableCellInputClass}
                            value={item.year || ''}
                            onChange={(e) => updateEquipmentRow(i, 'year', e.target.value)}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            className={tableCellInputClass}
                            value={item.make || ''}
                            onChange={(e) => updateEquipmentRow(i, 'make', e.target.value)}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            className={tableCellInputClass}
                            value={item.model || ''}
                            onChange={(e) => updateEquipmentRow(i, 'model', e.target.value)}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            className={tableCellInputClass}
                            value={item.usefulLife || ''}
                            onChange={(e) => updateEquipmentRow(i, 'usefulLife', e.target.value)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ===== LEARN MORE PANELS ===== */}
      <LearnMorePanel
        isOpen={showAcquisitionTypeInfo}
        onClose={() => setShowAcquisitionTypeInfo(false)}
        title="Type of Acquisition"
      >
        <p className="mb-3 text-[14px] leading-relaxed font-semibold">What information is being requested?</p>
        <p className="mb-3 text-[14px] leading-relaxed">
          We&apos;re asking whether you are buying the stock of the existing company or buying the assets of the business.
          This determines how the transaction is structured, which affects what you are acquiring, what liabilities you
          may take on, and how the SBA will evaluate the loan.
        </p>
        <p className="mb-2 text-[14px] leading-relaxed">You will choose one of the following:</p>
        <ul className="mb-4 text-[14px] leading-relaxed list-disc pl-5 space-y-1">
          <li><strong>Stock Acquisition</strong> &ndash; You purchase the ownership interests of the company.</li>
          <li><strong>Asset Acquisition</strong> &ndash; You purchase the business&apos;s assets (e.g., equipment, inventory, customer contracts, goodwill) but not the company&apos;s legal entity.</li>
        </ul>
        <p className="mb-3 text-[14px] leading-relaxed font-semibold">Why we need this information</p>
        <p className="mb-3 text-[14px] leading-relaxed">
          The SBA requires us to understand the exact structure of the transaction because it affects how we analyze
          the business, assess risk, and structure the loan.
        </p>
        <p className="mb-2 text-[14px] leading-relaxed font-semibold">Loan Eligibility &amp; Collateral</p>
        <ul className="text-[14px] leading-relaxed list-disc pl-5 space-y-1">
          <li>Asset deals allow us to identify and secure specific assets being purchased.</li>
          <li>Stock deals have different collateral and eligibility considerations because you acquire the company as-is, including its liabilities.</li>
        </ul>
      </LearnMorePanel>

      <LearnMorePanel
        isOpen={showSellerCarryNoteInfo}
        onClose={() => setShowSellerCarryNoteInfo(false)}
        title="Seller Carry Note"
      >
        <p className="mb-3 text-[14px] leading-relaxed">
          A <strong>Seller Carry Note</strong> (also called seller financing or a seller note) is when the seller
          agrees to finance a portion of the purchase price. Instead of receiving the full purchase price at closing,
          the seller accepts a promissory note from the buyer for part of the amount.
        </p>
        <p className="text-[14px] leading-relaxed">
          SBA guidelines require that any seller note must be on full standby for a minimum of 24 months,
          meaning no payments of principal or interest are made during that period. The seller note must also
          be subordinate to the SBA loan.
        </p>
      </LearnMorePanel>
    </div>
  );
}

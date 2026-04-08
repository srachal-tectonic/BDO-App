'use client';

import { useState, useRef } from 'react';
import { useApplication, OtherOwnedBusiness } from '@/lib/applicationStore';
import { Check, ChevronDown, Plus, Trash2 } from 'lucide-react';

interface OtherOwnedBusinessesSectionProps {
  isBDO?: boolean;
}

export default function OtherOwnedBusinessesSection({ isBDO = true }: OtherOwnedBusinessesSectionProps) {
  const { data, updateOtherOwnedBusinesses } = useApplication();
  const { otherOwnedBusinesses, individualApplicants } = data;

  const [descriptionExpanded, setDescriptionExpanded] = useState<boolean>(true);

  const ownerOptions = individualApplicants
    .filter(a => a.firstName || a.lastName)
    .map(a => ({
      value: `${a.firstName} ${a.lastName}`.trim(),
      label: `${a.firstName} ${a.lastName}`.trim(),
    }));

  const extraRowIdRef = useRef(`extra-${Date.now()}`);

  const createEmptyRow = (id?: string): OtherOwnedBusiness => ({
    id: id || extraRowIdRef.current,
    businessName: '',
    ownershipPercentages: [{ ownerName: '', percentage: 0, roleInBusiness: '' }],
    industry: '',
    corporateGuarantor: false,
  });

  const isRowFilled = (business: OtherOwnedBusiness): boolean => {
    return !!(business.businessName || business.industry ||
      business.ownershipPercentages.some(o => o.ownerName || o.percentage > 0 || o.roleInBusiness));
  };

  const MIN_ROWS = 10;

  const businessesWithExtra = (() => {
    const businesses = [...otherOwnedBusinesses.businesses];
    while (businesses.length < MIN_ROWS) {
      businesses.push(createEmptyRow(`pad-${businesses.length + 1}-${Date.now()}`));
    }
    const lastRow = businesses[businesses.length - 1];
    if (lastRow && isRowFilled(lastRow)) {
      if (businesses.some(b => b.id === extraRowIdRef.current)) {
        extraRowIdRef.current = `extra-${Date.now()}`;
      }
      businesses.push(createEmptyRow());
    }
    return businesses;
  })();

  const handleHasOtherBusinessesChange = (value: 'yes' | 'no') => {
    updateOtherOwnedBusinesses({
      hasOtherBusinesses: value,
      businesses: value.toLowerCase() === 'yes' && otherOwnedBusinesses.businesses.length === 0
        ? Array.from({ length: 10 }, (_, i) => createEmptyRow(`row-${i + 1}`))
        : value.toLowerCase() === 'no'
          ? []
          : otherOwnedBusinesses.businesses,
    });
  };

  const getBusinessList = (id: string): OtherOwnedBusiness[] => {
    const inState = otherOwnedBusinesses.businesses.some(b => b.id === id);
    if (inState) return otherOwnedBusinesses.businesses;
    const extra = businessesWithExtra.find(b => b.id === id);
    return extra ? [...otherOwnedBusinesses.businesses, extra] : otherOwnedBusinesses.businesses;
  };

  const updateBusiness = (id: string, updates: Partial<OtherOwnedBusiness>) => {
    const businesses = getBusinessList(id);
    updateOtherOwnedBusinesses({
      businesses: businesses.map(b => b.id === id ? { ...b, ...updates } : b),
    });
  };

  const addOwnershipRow = (businessId: string) => {
    const businesses = getBusinessList(businessId);
    const business = businesses.find(b => b.id === businessId);
    if (business) {
      updateOtherOwnedBusinesses({
        businesses: businesses.map(b =>
          b.id === businessId
            ? { ...b, ownershipPercentages: [...b.ownershipPercentages, { ownerName: '', percentage: 0, roleInBusiness: '' }] }
            : b
        ),
      });
    }
  };

  const updateOwnershipRow = (businessId: string, index: number, field: 'ownerName' | 'percentage' | 'roleInBusiness', value: string | number) => {
    const businesses = getBusinessList(businessId);
    const business = businesses.find(b => b.id === businessId);
    if (business) {
      const newOwnershipPercentages = [...business.ownershipPercentages];
      newOwnershipPercentages[index] = { ...newOwnershipPercentages[index], [field]: value };
      updateOtherOwnedBusinesses({
        businesses: businesses.map(b => b.id === businessId ? { ...b, ownershipPercentages: newOwnershipPercentages } : b),
      });
    }
  };

  const removeOwnershipRow = (businessId: string, index: number) => {
    const business = otherOwnedBusinesses.businesses.find(b => b.id === businessId);
    if (business && business.ownershipPercentages.length > 1) {
      updateBusiness(businessId, {
        ownershipPercentages: business.ownershipPercentages.filter((_, i) => i !== index),
      });
    }
  };

  return (
    <div>
      <div className="p-4 pb-2">
        <h1 className="text-lg font-semibold text-[color:var(--t-color-primary)] uppercase tracking-wider">Other Owned Businesses</h1>
      </div>

      {!isBDO && (
        <div className="px-4 mb-3">
          <div className="bg-[var(--t-color-page-bg)] border border-[var(--t-color-border)] rounded-lg p-4 sm:p-5">
            <div className="flex items-start gap-3 cursor-pointer" onClick={() => setDescriptionExpanded(!descriptionExpanded)}>
              <ChevronDown className={`w-5 h-5 text-[color:var(--t-color-text-muted)] transition-transform flex-shrink-0 mt-0.5 ${descriptionExpanded ? 'rotate-180' : ''}`} />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-[color:var(--t-color-text-body)] mb-1">About This Section</h3>
                {descriptionExpanded && (
                  <div className="text-[length:var(--t-font-size-base)] text-[color:var(--t-color-text-secondary)] leading-relaxed mt-2">
                    <p>Please list <strong>any business</strong> in which <strong>any owner of the applicant</strong> has ownership, management control, or a financial interest.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="px-4">
        <div className="mb-8">
          <label className="block text-[length:var(--t-font-size-base)] font-medium text-[color:var(--t-color-text-body)] mb-2">
            Any other businesses owned or controlled by the Applicant Business Owners? (Any affiliates)
          </label>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="hasOtherBusinesses"
                value="Yes"
                checked={otherOwnedBusinesses.hasOtherBusinesses?.toLowerCase() === 'yes'}
                onChange={() => handleHasOtherBusinessesChange('yes')}
                className="w-5 h-5 accent-[var(--t-color-accent)] cursor-pointer"
                data-testid="radio-other-businesses-yes"
              />
              <span className="text-[length:var(--t-font-size-base)] text-[color:var(--t-color-text-body)]">Yes</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="hasOtherBusinesses"
                value="No"
                checked={otherOwnedBusinesses.hasOtherBusinesses?.toLowerCase() === 'no'}
                onChange={() => handleHasOtherBusinessesChange('no')}
                className="w-5 h-5 accent-[var(--t-color-accent)] cursor-pointer"
                data-testid="radio-other-businesses-no"
              />
              <span className="text-[length:var(--t-font-size-base)] text-[color:var(--t-color-text-body)]">No</span>
            </label>
          </div>
        </div>

        <div className="mt-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm" data-testid="other-businesses-table">
              <thead>
                <tr className="bg-[var(--t-color-primary)] text-white">
                  <th className="border border-[var(--t-color-border)] px-3 py-2 text-left font-medium w-12">#</th>
                  <th className="border border-[var(--t-color-border)] px-3 py-2 text-left font-medium min-w-[200px]">Business Name</th>
                  <th className="border border-[var(--t-color-border)] px-3 py-2 text-left font-medium min-w-[350px]">Owners &amp; Ownership %&apos;s</th>
                  <th className="border border-[var(--t-color-border)] px-3 py-2 text-left font-medium min-w-[150px]">Industry</th>
                  <th className="border border-[var(--t-color-border)] px-3 py-2 text-center font-medium min-w-[160px]">Corporate Guarantor / Affiliate?</th>
                </tr>
              </thead>
              <tbody>
                {businessesWithExtra.map((business, index) => (
                  <tr key={business.id} className="bg-white align-top" data-testid={`other-business-row-${business.id}`}>
                    <td className="border border-[var(--t-color-border)] px-3 py-2 text-center font-medium text-[color:var(--t-color-primary)]">
                      {index + 1}
                    </td>
                    <td className="border border-[var(--t-color-border)] px-3 py-2">
                      <input
                        type="text"
                        value={business.businessName}
                        onChange={(e) => updateBusiness(business.id, { businessName: e.target.value })}
                        className="w-full bg-transparent border-none outline-none text-[color:var(--t-color-text-body)]"
                        placeholder="Legal Business Name"
                        data-testid={`input-business-name-${business.id}`}
                      />
                    </td>
                    <td className="border border-[var(--t-color-border)] px-3 py-2">
                      <div className="space-y-2">
                        {business.ownershipPercentages.map((ownership, ownerIndex) => (
                          <div key={ownerIndex} className="flex items-center gap-2 flex-wrap">
                            <select
                              value={ownership.ownerName}
                              onChange={(e) => updateOwnershipRow(business.id, ownerIndex, 'ownerName', e.target.value)}
                              className="flex-1 min-w-[120px] bg-transparent border border-[var(--t-color-border)] rounded px-2 py-1 outline-none text-[color:var(--t-color-text-body)] text-sm cursor-pointer"
                              data-testid={`select-owner-name-${business.id}-${ownerIndex}`}
                            >
                              <option value="">Select Owner</option>
                              {ownerOptions.map((option, i) => (
                                <option key={i} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                            <div className="flex items-center">
                              <input
                                type="number"
                                value={ownership.percentage || ''}
                                onChange={(e) => updateOwnershipRow(business.id, ownerIndex, 'percentage', parseFloat(e.target.value) || 0)}
                                className="w-14 bg-transparent border border-[var(--t-color-border)] rounded px-2 py-1 outline-none text-[color:var(--t-color-text-body)] text-right text-sm"
                                placeholder="0"
                                min="0"
                                max="100"
                                data-testid={`input-ownership-pct-${business.id}-${ownerIndex}`}
                              />
                              <span className="text-[color:var(--t-color-text-body)] ml-1">%</span>
                            </div>
                            <select
                              value={ownership.roleInBusiness || ''}
                              onChange={(e) => updateOwnershipRow(business.id, ownerIndex, 'roleInBusiness', e.target.value)}
                              className="min-w-[130px] bg-transparent border border-[var(--t-color-border)] rounded px-2 py-1 outline-none text-[color:var(--t-color-text-body)] text-sm cursor-pointer"
                              data-testid={`select-role-${business.id}-${ownerIndex}`}
                            >
                              <option value="">Role in Business</option>
                              <option value="active-full-time">Active - Full Time</option>
                              <option value="active-part-time">Active - Part Time</option>
                              <option value="passive">Passive</option>
                            </select>
                            {business.ownershipPercentages.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeOwnershipRow(business.id, ownerIndex)}
                                className="text-[color:var(--t-color-primary-pale)] hover:text-red-500 transition-colors"
                                data-testid={`button-remove-owner-${business.id}-${ownerIndex}`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addOwnershipRow(business.id)}
                          className="text-xs text-[color:var(--t-color-accent)] flex items-center gap-1"
                          data-testid={`button-add-owner-${business.id}`}
                        >
                          <Plus className="w-3 h-3" />
                          Add owner
                        </button>
                      </div>
                    </td>
                    <td className="border border-[var(--t-color-border)] px-3 py-2">
                      <input
                        type="text"
                        value={business.industry}
                        onChange={(e) => updateBusiness(business.id, { industry: e.target.value })}
                        className="w-full bg-transparent border-none outline-none text-[color:var(--t-color-text-body)]"
                        placeholder="NAICS / Industry"
                        data-testid={`input-industry-${business.id}`}
                      />
                    </td>
                    <td className="border border-[var(--t-color-border)] px-3 py-2 text-center">
                      <label className="inline-flex items-center justify-center cursor-pointer" data-testid={`toggle-guarantor-${business.id}`}>
                        <input
                          type="checkbox"
                          checked={business.corporateGuarantor || false}
                          onChange={(e) => updateBusiness(business.id, { corporateGuarantor: e.target.checked })}
                          className="sr-only"
                        />
                        <span className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          business.corporateGuarantor
                            ? 'bg-[var(--t-color-accent)] border-[var(--t-color-accent)]'
                            : 'bg-white border-[var(--t-color-border)]'
                        }`}>
                          {business.corporateGuarantor && <Check className="w-3.5 h-3.5 text-white" />}
                        </span>
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

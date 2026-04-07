'use client';

import { useState } from 'react';
import { useApplication, OtherOwnedBusiness } from '@/lib/applicationStore';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';

export default function OtherOwnedBusinessesSection() {
  const { data, updateOtherOwnedBusinesses } = useApplication();
  const { individualApplicants } = data;

  // Provide default value for otherOwnedBusinesses if undefined
  const otherOwnedBusinesses = data.otherOwnedBusinesses || {
    hasOtherBusinesses: null,
    businesses: [],
  };

  const [descriptionExpanded, setDescriptionExpanded] = useState<boolean>(true);

  const ownerOptions = individualApplicants
    .filter(a => a.firstName || a.lastName)
    .map(a => ({
      value: `${a.firstName} ${a.lastName}`.trim(),
      label: `${a.firstName} ${a.lastName}`.trim(),
    }));

  const createEmptyRows = (): OtherOwnedBusiness[] => {
    return Array.from({ length: 10 }, (_, i) => ({
      id: `row-${i + 1}`,
      businessName: '',
      ownershipPercentages: [{ ownerName: '', percentage: 0, roleInBusiness: '' as const }],
      industry: '',
    }));
  };

  const handleHasOtherBusinessesChange = (value: "yes" | "no") => {
    updateOtherOwnedBusinesses({
      hasOtherBusinesses: value,
      businesses: value === "yes" && otherOwnedBusinesses.businesses.length === 0
        ? createEmptyRows()
        : value === "no"
          ? []
          : otherOwnedBusinesses.businesses.length < 10
            ? [...otherOwnedBusinesses.businesses, ...createEmptyRows().slice(otherOwnedBusinesses.businesses.length)]
            : otherOwnedBusinesses.businesses
    });
  };

  const updateBusiness = (id: string, updates: Partial<OtherOwnedBusiness>) => {
    updateOtherOwnedBusinesses({
      businesses: otherOwnedBusinesses.businesses.map(b =>
        b.id === id ? { ...b, ...updates } : b
      ),
    });
  };

  const addOwnershipRow = (businessId: string) => {
    const business = otherOwnedBusinesses.businesses.find(b => b.id === businessId);
    if (business) {
      updateBusiness(businessId, {
        ownershipPercentages: [...business.ownershipPercentages, { ownerName: '', percentage: 0, roleInBusiness: '' }],
      });
    }
  };

  const updateOwnershipRow = (businessId: string, index: number, field: 'ownerName' | 'percentage' | 'roleInBusiness', value: string | number) => {
    const business = otherOwnedBusinesses.businesses.find(b => b.id === businessId);
    if (business) {
      const newOwnershipPercentages = [...business.ownershipPercentages];
      newOwnershipPercentages[index] = {
        ...newOwnershipPercentages[index],
        [field]: value,
      };
      updateBusiness(businessId, { ownershipPercentages: newOwnershipPercentages });
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
      <div className="p-4 sm:p-6 pb-3 sm:pb-4">
        <h1 className="text-[28px] font-bold text-[#1a1a1a]">Other Owned Businesses</h1>
      </div>

      <div className="px-4 sm:px-6">
        <div className="mb-8">
          <label className="block text-[15px] font-medium text-[#374151] mb-4">
            Do you or any owner of the applicant business have ownership, control, or financial involvement in any other businesses?
          </label>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="hasOtherBusinesses"
                value="yes"
                checked={otherOwnedBusinesses.hasOtherBusinesses === 'yes'}
                onChange={() => handleHasOtherBusinessesChange('yes')}
                className="w-5 h-5 accent-[#2563eb] cursor-pointer"
                data-testid="radio-other-businesses-yes"
              />
              <span className="text-[15px] text-[#374151]">Yes</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="hasOtherBusinesses"
                value="no"
                checked={otherOwnedBusinesses.hasOtherBusinesses === 'no'}
                onChange={() => handleHasOtherBusinessesChange('no')}
                className="w-5 h-5 accent-[#2563eb] cursor-pointer"
                data-testid="radio-other-businesses-no"
              />
              <span className="text-[15px] text-[#374151]">No</span>
            </label>
          </div>
        </div>

        {otherOwnedBusinesses.hasOtherBusinesses === 'yes' && (
          <div className="mt-6">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm" data-testid="other-businesses-table">
                <thead>
                  <tr className="bg-[#1e3a5f] text-white">
                    <th className="border border-[#d1d5db] px-3 py-2 text-left font-medium w-12">#</th>
                    <th className="border border-[#d1d5db] px-3 py-2 text-left font-medium min-w-[200px]">Business Name</th>
                    <th className="border border-[#d1d5db] px-3 py-2 text-left font-medium min-w-[350px]">Owners & Ownership %&apos;s</th>
                    <th className="border border-[#d1d5db] px-3 py-2 text-left font-medium min-w-[150px]">Industry</th>
                  </tr>
                </thead>
                <tbody>
                  {otherOwnedBusinesses.businesses.map((business, index) => (
                    <tr key={business.id} className="bg-white align-top" data-testid={`other-business-row-${business.id}`}>
                      <td className="border border-[#d1d5db] px-3 py-2 text-center font-medium text-[#1e3a5f]">
                        {index + 1}
                      </td>
                      <td className="border border-[#d1d5db] px-3 py-2">
                        <input
                          type="text"
                          value={business.businessName}
                          onChange={(e) => updateBusiness(business.id, { businessName: e.target.value })}
                          className="w-full bg-transparent border-none outline-none text-[#374151]"
                          placeholder="Legal Business Name"
                          data-testid={`input-business-name-${business.id}`}
                        />
                      </td>
                      <td className="border border-[#d1d5db] px-3 py-2">
                        <div className="space-y-2">
                          {business.ownershipPercentages.map((ownership, ownerIndex) => (
                            <div key={ownerIndex} className="flex items-center gap-2 flex-wrap">
                              <select
                                value={ownership.ownerName}
                                onChange={(e) => updateOwnershipRow(business.id, ownerIndex, 'ownerName', e.target.value)}
                                className="flex-1 min-w-[120px] bg-transparent border border-[#e5e7eb] rounded px-2 py-1 outline-none text-[#374151] text-sm cursor-pointer"
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
                                  className="w-14 bg-transparent border border-[#e5e7eb] rounded px-2 py-1 outline-none text-[#374151] text-right text-sm"
                                  placeholder="0"
                                  min="0"
                                  max="100"
                                  data-testid={`input-ownership-pct-${business.id}-${ownerIndex}`}
                                />
                                <span className="text-[#374151] ml-1">%</span>
                              </div>
                              <select
                                value={ownership.roleInBusiness || ''}
                                onChange={(e) => updateOwnershipRow(business.id, ownerIndex, 'roleInBusiness', e.target.value)}
                                className="min-w-[130px] bg-transparent border border-[#e5e7eb] rounded px-2 py-1 outline-none text-[#374151] text-sm cursor-pointer"
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
                                  className="text-[#9ca3af] hover:text-[#ef4444] transition-colors"
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
                            className="text-xs text-[#2563eb] hover:text-[#1d4ed8] flex items-center gap-1"
                            data-testid={`button-add-owner-${business.id}`}
                          >
                            <Plus className="w-3 h-3" />
                            Add owner
                          </button>
                        </div>
                      </td>
                      <td className="border border-[#d1d5db] px-3 py-2">
                        <input
                          type="text"
                          value={business.industry}
                          onChange={(e) => updateBusiness(business.id, { industry: e.target.value })}
                          className="w-full bg-transparent border-none outline-none text-[#374151]"
                          placeholder="NAICS / Industry"
                          data-testid={`input-industry-${business.id}`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

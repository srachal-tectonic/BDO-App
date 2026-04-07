'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApplication } from '@/lib/applicationStore';
import AddressInput from '@/components/loan-sections/AddressInput';
import PasswordToggle from '@/components/loan-sections/PasswordToggle';
import { HelpCircle, ChevronDown } from 'lucide-react';
import type { IndividualApplicant } from '@/lib/schema';

interface BusinessApplicantSectionProps {
  onLearnMore?: (title: string, content: string) => void;
  projectId?: string;
}

// Generate year options from current year back to 1900
const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: currentYear - 1899 }, (_, i) => currentYear - i);

export default function BusinessApplicantSection({ onLearnMore, projectId }: BusinessApplicantSectionProps) {
  const { data, updateBusinessApplicant, updateIndividualApplicant, addIndividualApplicant } = useApplication();
  const { businessApplicant: rawBusinessApplicant, individualApplicants } = data;
  const router = useRouter();

  const [descriptionExpanded, setDescriptionExpanded] = useState<boolean>(true);

  // Provide safe defaults for businessApplicant
  const defaultAddress = { street1: '', city: '', state: '', zipCode: '' };
  const businessApplicant = {
    entityToBeFormed: false,
    legalName: '',
    dba: '',
    entityType: '',
    ein: '',
    yearEstablished: '',
    website: '',
    ...rawBusinessApplicant,
    businessAddress: rawBusinessApplicant?.businessAddress || defaultAddress,
    projectAddress: rawBusinessApplicant?.projectAddress || defaultAddress,
  };

  const updateApplicant = (id: string, field: keyof IndividualApplicant, value: string | number) => {
    updateIndividualApplicant(id, { [field]: value } as Partial<IndividualApplicant>);
  };

  const handleAddAndNavigate = () => {
    const newId = addIndividualApplicant();
    if (projectId) {
      router.push(`/bdo/projects/${projectId}/individual/${newId}`);
    }
  };

  // Calculate total ownership percentage
  const totalOwnership = individualApplicants.reduce(
    (sum, applicant) => sum + (applicant.ownershipPercentage || 0),
    0
  );

  return (
    <div>
      <div className="p-4 sm:p-6 pb-3 sm:pb-4 flex justify-between items-start">
        <div>
          <h1 className="text-[28px] font-bold text-[#1a1a1a]">Business Applicant</h1>
          <p className="text-sm text-[#6b7280] mt-1">
            Enter information about the business applying for this SBA loan
          </p>
        </div>
        {!businessApplicant.entityToBeFormed && (
          <div className="text-right">
            <div className="text-2xl font-semibold leading-tight" style={{ color: 'rgb(74, 144, 226)' }}>
              {totalOwnership.toFixed(1)}%
            </div>
            <div className="text-sm font-medium text-[#6b7280]">
              Total Ownership Identified
            </div>
          </div>
        )}
      </div>

      <div className="px-4 sm:px-6">
        {/* Entity to be Formed Checkbox */}
        <div className="mb-8 p-5 bg-[#fef3c7] border-2 border-[#f59e0b] rounded-lg">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={businessApplicant.entityToBeFormed}
              onChange={(e) => updateBusinessApplicant({ entityToBeFormed: e.target.checked })}
              className="w-5 h-5 cursor-pointer accent-[#2563eb]"
              data-testid="checkbox-entity-to-be-formed"
            />
            <span className="text-[15px] font-medium text-[#374151]">
              Entity to be Formed
            </span>
          </label>
        </div>

        {/* Conditionally render fields only if entity is NOT to be formed */}
        {!businessApplicant.entityToBeFormed && (
          <>
            {/* Legal Business Name and DBA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-2 flex items-center gap-2">
                  Legal Business Name
                  {onLearnMore && (
                    <button
                      type="button"
                      onClick={() => onLearnMore(
                        'Legal Business Name',
                        'The legal business name is the official name of your business as registered with your state or federal government. This is the name that appears on your business formation documents, tax returns, and legal contracts. It may differ from your trade name or "doing business as" (DBA) name.\n\nFor example:\n• LLC: "ABC Company, LLC"\n• Corporation: "XYZ Corporation"\n• Sole Proprietorship: Often the owner\'s personal name\n\nMake sure this matches exactly with your official business registration documents.'
                      )}
                      className="text-[#2563eb] hover:text-[#1d4ed8] transition-colors"
                      data-testid="button-learn-more-legal-name"
                    >
                      <HelpCircle className="w-4 h-4" />
                    </button>
                  )}
                </label>
                <input
                  type="text"
                  value={businessApplicant.legalName}
                  onChange={(e) => updateBusinessApplicant({ legalName: e.target.value })}
                  placeholder="Enter legal business name"
                  className="w-full px-4 py-3 border border-[#d1d5db] rounded-lg text-[15px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]"
                  data-testid="input-legal-business-name"
                />
                <p className="mt-1 text-xs text-[#6b7280]">Name must match the entity name in formation documents</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-2 flex items-center gap-2">
                  DBA or Trade Name
                  {onLearnMore && (
                    <button
                      type="button"
                      onClick={() => onLearnMore(
                        'DBA or Trade Name',
                        'What information is being requested:\n\nAny "Doing Business As" (DBA) or trade name your business uses publicly, if different from the legal name. For example: "Johnson Printing Co." (legal name) operating as "Johnson Print & Design."\n\nWhy we need it:\n\nIf your business operates under a trade name, we must include it in certain loan documents, searches, and filings to ensure all names associated with the business are properly recorded and legally recognized.'
                      )}
                      className="text-[#2563eb] hover:text-[#1d4ed8] transition-colors"
                      data-testid="button-learn-more-dba"
                    >
                      <HelpCircle className="w-4 h-4" />
                    </button>
                  )}
                </label>
                <input
                  type="text"
                  value={businessApplicant.dba || ''}
                  onChange={(e) => updateBusinessApplicant({ dba: e.target.value })}
                  placeholder="Enter DBA or trade name (if applicable)"
                  className="w-full px-4 py-3 border border-[#d1d5db] rounded-lg text-[15px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]"
                  data-testid="input-dba-name"
                />
              </div>
            </div>

            {/* Entity Type, TIN, and Year Established */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-2 flex items-center gap-2">
                  Entity Type
                  {onLearnMore && (
                    <button
                      type="button"
                      onClick={() => onLearnMore(
                        'Entity Type',
                        'What information is being requested:\n\nThe legal structure of your business—such as LLC, Corporation, S-Corporation, Partnership, or Sole Proprietorship.\n\nWhy we need it:\n\nYour entity type determines:\n\n• Who must guarantee the loan\n• What documents we must collect\n• How the business is taxed\n• How ownership is structured\n\nThe SBA requires lenders to document the legal form of every applicant to ensure the loan is structured correctly.'
                      )}
                      className="text-[#2563eb] hover:text-[#1d4ed8] transition-colors"
                      data-testid="button-learn-more-entity-type"
                    >
                      <HelpCircle className="w-4 h-4" />
                    </button>
                  )}
                </label>
                <select
                  value={businessApplicant.entityType}
                  onChange={(e) => updateBusinessApplicant({ entityType: e.target.value })}
                  className="w-full px-4 py-3 pr-11 border border-[#d1d5db] rounded-lg text-[15px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg%20width=%2712%27%20height=%278%27%20viewBox=%270%200%2012%208%27%20fill=%27none%27%20xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cpath%20d=%27M1%201.5L6%206.5L11%201.5%27%20stroke=%27%236b7280%27%20stroke-width=%272%27%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_16px_center]"
                  data-testid="select-entity-type"
                >
                  <option value="">Choose an item.</option>
                  <option value="cooperative">Cooperative</option>
                  <option value="corporation">Corporation</option>
                  <option value="llc">Limited Liability Company (LLC)</option>
                  <option value="llp">Limited Liability Partnership</option>
                  <option value="partnership">Partnership</option>
                  <option value="sole-proprietor">Sole Proprietorship</option>
                  <option value="s-corp">Subchapter S Corporation</option>
                  <option value="trust">Trust</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-2 flex items-center gap-2">
                  Business TIN (EIN/SSN)
                  {onLearnMore && (
                    <button
                      type="button"
                      onClick={() => onLearnMore(
                        'Business TIN (EIN/SSN)',
                        'What information is being requested:\n\nYour business\'s tax identification number—usually an EIN issued by the IRS. Sole proprietorships without an EIN may use the owner\'s SSN.\n\nWhy we need it:\n\nWe use the TIN to verify your business with the IRS, match tax returns, run required background checks, and correctly identify your business in federal systems. The TIN must match your tax filings and state registrations for SBA compliance.'
                      )}
                      className="text-[#2563eb] hover:text-[#1d4ed8] transition-colors"
                      data-testid="button-learn-more-tin"
                    >
                      <HelpCircle className="w-4 h-4" />
                    </button>
                  )}
                </label>
                <PasswordToggle
                  id="business-tin"
                  value={businessApplicant.ein}
                  onChange={(value) => updateBusinessApplicant({ ein: value })}
                  placeholder="XX-XXXXXXX"
                  testId="input-business-ein"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-2 flex items-center gap-2">
                  Year Established
                  {onLearnMore && (
                    <button
                      type="button"
                      onClick={() => onLearnMore(
                        'Year Established',
                        'What information is being requested:\n\nThe year the business was legally formed or first began operating, based on your state filings or IRS records.\n\nWhy we need it:\n\nThe number of years in operation affects eligibility, underwriting strength, and how lenders evaluate historical financial performance. SBA forms and lender reports require us to document the business\'s operating history.'
                      )}
                      className="text-[#2563eb] hover:text-[#1d4ed8] transition-colors"
                      data-testid="button-learn-more-year-established"
                    >
                      <HelpCircle className="w-4 h-4" />
                    </button>
                  )}
                </label>
                <select
                  value={businessApplicant.yearEstablished || ''}
                  onChange={(e) => updateBusinessApplicant({ yearEstablished: e.target.value })}
                  className="w-full px-4 py-3 pr-11 border border-[#d1d5db] rounded-lg text-[15px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg%20width=%2712%27%20height=%278%27%20viewBox=%270%200%2012%208%27%20fill=%27none%27%20xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cpath%20d=%27M1%201.5L6%206.5L11%201.5%27%20stroke=%27%236b7280%27%20stroke-width=%272%27%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_16px_center]"
                  data-testid="select-year-established"
                >
                  <option value="">Select Year</option>
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Website */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#374151] mb-2 flex items-center gap-2">
                Business Website Address
                {onLearnMore && (
                  <button
                    type="button"
                    onClick={() => onLearnMore(
                      'Business Website Address',
                      'What information is being requested:\n\nThe URL of your company\'s website, if you have one.\n\nWhy we need it:\n\nA website helps us verify your business\'s operations, products or services, and public presence. This can support industry analysis and confirm that the business is active and legitimate. Although optional, it speeds up the review process.'
                    )}
                    className="text-[#2563eb] hover:text-[#1d4ed8] transition-colors"
                    data-testid="button-learn-more-website"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                )}
              </label>
              <input
                type="url"
                value={businessApplicant.website || ''}
                onChange={(e) => updateBusinessApplicant({ website: e.target.value })}
                placeholder="https://www.example.com"
                className="w-full px-4 py-3 border border-[#d1d5db] rounded-lg text-[15px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]"
                data-testid="input-business-website"
              />
            </div>

            {/* Business Address */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#374151] mb-2 flex items-center gap-2">
                Business Address
                {onLearnMore && (
                  <button
                    type="button"
                    onClick={() => onLearnMore(
                      'Business Address',
                      'What information is being requested:\n\nThe physical street address where your business operates. This should be your main operating location—not a P.O. Box.\n\nWhy we need it:\n\nThe business address is used to verify your location, determine SBA geographic eligibility, confirm zoning and operational use, and run required searches for public records. It also appears on loan documents and disclosures.'
                    )}
                    className="text-[#2563eb] hover:text-[#1d4ed8] transition-colors"
                    data-testid="button-learn-more-business-address"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                )}
              </label>
              <AddressInput
                value={businessApplicant.businessAddress}
                onChange={(addr) => updateBusinessApplicant({ businessAddress: addr })}
                idPrefix="business-address"
              />
            </div>

            {/* Project Address */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#374151] mb-2 flex items-center gap-2">
                Project Address, If Different from Business Address
                {onLearnMore && (
                  <button
                    type="button"
                    onClick={() => onLearnMore(
                      'Project Address, If Different from Business Address',
                      'What information is being requested:\n\nThe physical address of the project being financed—such as a new location, renovation site, construction project, or the property being purchased—if it is different from your main business address.\n\nWhy we need it:\n\nFor SBA loans, the project address determines eligibility, geographic requirements, collateral considerations, and which SBA rules apply. It also allows us to verify zoning, occupancy, and use of proceeds, and ensures all loan documents reference the correct property or project site.'
                    )}
                    className="text-[#2563eb] hover:text-[#1d4ed8] transition-colors"
                    data-testid="button-learn-more-project-address"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                )}
              </label>
              <AddressInput
                value={businessApplicant.projectAddress}
                onChange={(addr) => updateBusinessApplicant({ projectAddress: addr })}
                idPrefix="project-address"
              />
            </div>
          </>
        )}

        {/* Ownership of Applicant Table */}
        <div className="mt-8 pt-8 border-t border-[#e5e7eb]">
          <h2 className="text-xl font-semibold text-[#1a365d] mb-3 border-b-2 border-[#2563eb] pb-1">Ownership of Applicant</h2>
          <div className="bg-[#f0f7ff] border border-[#bfdbfe] rounded-lg p-4 mb-4">
            <p className="text-[14px] text-[#1e40af]">
              <span className="font-semibold">NOTE:</span> Identify all owners of the Applicant Business, including officers, directors, and minority owners. The combined ownership percentages <span className="font-bold">must equal 100%</span>.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm" data-testid="ownership-table">
              <thead>
                <tr className="bg-[#1e3a5f] text-white">
                  <th className="border border-[#d1d5db] px-3 py-2 text-left font-medium">Owner&apos;s Legal Name (First Name and Last Name)</th>
                  <th className="border border-[#d1d5db] px-3 py-2 text-left font-medium">Ownership</th>
                  <th className="border border-[#d1d5db] px-3 py-2 text-left font-medium">Project Role</th>
                  <th className="border border-[#d1d5db] px-3 py-2 text-left font-medium">Role in Business Operations</th>
                </tr>
              </thead>
              <tbody>
                {individualApplicants.map((applicant) => (
                  <tr key={applicant.id} className="bg-white" data-testid={`ownership-row-${applicant.id}`}>
                    <td className="border border-[#d1d5db] px-3 py-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={applicant.firstName || ''}
                          onChange={(e) => updateApplicant(applicant.id, 'firstName', e.target.value)}
                          className="flex-1 bg-transparent border-none outline-none text-[#374151] min-w-0"
                          placeholder="First Name"
                          data-testid={`ownership-firstname-${applicant.id}`}
                        />
                        <input
                          type="text"
                          value={applicant.lastName || ''}
                          onChange={(e) => updateApplicant(applicant.id, 'lastName', e.target.value)}
                          className="flex-1 bg-transparent border-none outline-none text-[#374151] min-w-0"
                          placeholder="Last Name"
                          data-testid={`ownership-lastname-${applicant.id}`}
                        />
                      </div>
                    </td>
                    <td className="border border-[#d1d5db] px-3 py-2">
                      <div className="flex items-center">
                        <input
                          type="number"
                          value={applicant.ownershipPercentage || ''}
                          onChange={(e) => updateApplicant(applicant.id, 'ownershipPercentage', parseFloat(e.target.value) || 0)}
                          className="w-16 bg-transparent border-none outline-none text-[#374151] text-right"
                          placeholder="0"
                          min="0"
                          max="100"
                          step="0.01"
                          data-testid={`ownership-percentage-${applicant.id}`}
                        />
                        <span className="text-[#374151]">%</span>
                      </div>
                    </td>
                    <td className="border border-[#d1d5db] px-3 py-2">
                      <select
                        value={applicant.projectRole || ''}
                        onChange={(e) => updateApplicant(applicant.id, 'projectRole', e.target.value)}
                        className="w-full bg-transparent border-none outline-none text-[#374151] cursor-pointer"
                        data-testid={`ownership-project-role-${applicant.id}`}
                      >
                        <option value="">Select Project Role</option>
                        <option value="owner-guarantor">Owner & Guarantor</option>
                        <option value="owner-non-guarantor">Owner Non-Guarantor</option>
                        <option value="non-owner-key-manager">Non-Owner Key Manager</option>
                        <option value="other">Other</option>
                      </select>
                    </td>
                    <td className="border border-[#d1d5db] px-3 py-2">
                      <select
                        value={applicant.businessRole || ''}
                        onChange={(e) => updateApplicant(applicant.id, 'businessRole', e.target.value)}
                        className="w-full bg-transparent border-none outline-none text-[#374151] cursor-pointer"
                        data-testid={`ownership-business-role-${applicant.id}`}
                      >
                        <option value="">Select Role in Business Operations</option>
                        <option value="active-full-time">Active - Full Time</option>
                        <option value="active-part-time">Active - Part Time</option>
                        <option value="passive">Passive</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {/* Empty rows - click to add new applicant */}
                {Array.from({ length: Math.max(0, 5 - individualApplicants.length) }).map((_, index) => (
                  <tr
                    key={`empty-${index}`}
                    className="bg-white hover:bg-[#f0f7ff] cursor-pointer transition-colors"
                    onClick={() => handleAddAndNavigate()}
                    data-testid={`add-applicant-row-${index}`}
                  >
                    <td className="border border-[#d1d5db] px-3 py-2 text-[#9ca3af] italic">Click to add owner...</td>
                    <td className="border border-[#d1d5db] px-3 py-2"></td>
                    <td className="border border-[#d1d5db] px-3 py-2"></td>
                    <td className="border border-[#d1d5db] px-3 py-2"></td>
                  </tr>
                ))}
                {/* Totals row */}
                <tr className="bg-[#f3f4f6] font-medium">
                  <td className="border border-[#d1d5db] px-3 py-2 text-right">Total:</td>
                  <td className="border border-[#d1d5db] px-3 py-2 font-medium text-[#374151]">
                    {totalOwnership.toFixed(2)}%
                  </td>
                  <td className="border border-[#d1d5db] px-3 py-2" colSpan={2}></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

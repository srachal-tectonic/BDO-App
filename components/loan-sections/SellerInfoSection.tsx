'use client';

import AddressInput from '@/components/loan-sections/AddressInput';
import FileUploadWithYearTags, { FileWithYear } from '@/components/loan-sections/FileUploadWithYearTags';
import LearnMorePanel from '@/components/LearnMorePanel';
import { useApplication } from '@/lib/applicationStore';
import { Sparkles, HelpCircle } from 'lucide-react';
import { useState } from 'react';

const CONTRACT_STATUS_OPTIONS = [
  { value: '', label: 'Select status...' },
  { value: 'no_loi', label: 'No LOI or contract yet' },
  { value: 'loi_signed', label: 'LOI signed' },
  { value: 'contract_negotiation', label: 'Contract under negotiation' },
  { value: 'contract_signed', label: 'Contract signed' },
  { value: 'due_diligence', label: 'In due diligence' },
];

export default function SellerInfoSection() {
  const { data, updateSellerInfo } = useApplication();
  const { sellerInfo: rawSellerInfo } = data;

  // Provide safe defaults for sellerInfo
  const sellerInfo = rawSellerInfo || {
    legalName: '',
    dbaName: '',
    website: '',
    address: { street1: '', city: '', state: '', zipCode: '' },
    businessDescription: '',
    acquisitionType: undefined,
    isPurchasing100Percent: undefined,
    otherOwnersDescription: '',
    contractStatus: '',
    hasSellerCarryNote: undefined,
    sellerCarryNoteTerms: '',
    realEstatePurchaseDescription: '',
  };

  const [taxReturns, setTaxReturns] = useState<FileWithYear[]>([]);
  const [loiContractFiles, setLoiContractFiles] = useState<FileWithYear[]>([]);
  const [otherFiles, setOtherFiles] = useState<FileWithYear[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [learnMoreOpen, setLearnMoreOpen] = useState<string | null>(null);

  const handleGenerateSummary = async () => {
    setIsGenerating(true);

    try {
      const response = await fetch('/api/generate-seller-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          legalName: sellerInfo.legalName,
          website: sellerInfo.website,
          address: sellerInfo.address,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate business description');
      }

      const data = await response.json();
      updateSellerInfo({ businessDescription: data.description });
    } catch (error) {
      console.error('Error generating business description:', error);
      const fallbackSummary = `Based on the available information for ${sellerInfo.legalName || 'this business'}, this is a description generated for the seller. Additional details about the business operations, history, and key services can be provided here.`;
      updateSellerInfo({ businessDescription: fallbackSummary });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div>
      <div className="p-4 sm:p-6 pb-3 sm:pb-4">
        <h1 className="text-[28px] font-bold text-[#1a1a1a]">Project Information</h1>
      </div>

      <div className="px-4 sm:px-6">
        {/* Business Acquisition Details Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-[#1f2937] mb-2">Business Acquisition Details</h2>
          <p className="text-sm text-[#6b7280] mb-6">
            This section captures details about the business being acquired, including legal information and transaction structure.
          </p>

          {/* Row 1: Legal Name and DBA Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-7">
            {/* Legal Name of Business Being Acquired */}
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-2">
                Legal Name of Business Being Acquired
              </label>
              <input
                type="text"
                value={sellerInfo.legalName || ''}
                onChange={(e) => updateSellerInfo({ legalName: e.target.value })}
                placeholder="Enter legal business name"
                className="w-full px-4 py-3 border border-[#d1d5db] rounded-lg text-[15px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] focus:outline-none"
                data-testid="input-seller-legal-name"
              />
            </div>

            {/* DBA Name of Business Being Acquired */}
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-2">
                DBA Name of Business Being Acquired
              </label>
              <input
                type="text"
                value={sellerInfo.dbaName || ''}
                onChange={(e) => updateSellerInfo({ dbaName: e.target.value })}
                placeholder="Doing Business As name (if different)"
                className="w-full px-4 py-3 border border-[#d1d5db] rounded-lg text-[15px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] focus:outline-none"
                data-testid="input-seller-dba-name"
              />
            </div>
          </div>

          {/* Row 2: Business Address and Business Website */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-7">
            {/* Business Address */}
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-2">Business Address</label>
              <AddressInput
                value={sellerInfo.address || { street1: '', city: '', state: '', zipCode: '' }}
                onChange={(addr) => updateSellerInfo({ address: addr })}
                idPrefix="seller-address"
              />
            </div>

            {/* Business Website */}
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-2">
                Business Website
              </label>
              <input
                type="url"
                value={sellerInfo.website || ''}
                onChange={(e) => updateSellerInfo({ website: e.target.value })}
                placeholder="https://www.example.com"
                className="w-full px-4 py-3 border border-[#d1d5db] rounded-lg text-[15px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] focus:outline-none"
                data-testid="input-seller-website"
              />
            </div>
          </div>

          {/* Row 3: Type of Acquisition and Purchasing 100% */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-7">
            {/* Type of Acquisition */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-sm font-medium text-[#374151]">
                  Type of Acquisition
                </label>
                <button
                  type="button"
                  onClick={() => setLearnMoreOpen('acquisitionType')}
                  className="text-[#6b7280] hover:text-[#2563eb] transition-colors"
                  aria-label="Learn more about acquisition types"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="acquisitionType"
                    value="stock"
                    checked={sellerInfo.acquisitionType === 'stock'}
                    onChange={(e) => updateSellerInfo({ acquisitionType: e.target.value as 'stock' | 'asset' })}
                    className="w-4 h-4 text-[#2563eb] focus:ring-[#2563eb]"
                  />
                  <span className="text-[15px] text-[#374151]">Stock Purchase</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="acquisitionType"
                    value="asset"
                    checked={sellerInfo.acquisitionType === 'asset'}
                    onChange={(e) => updateSellerInfo({ acquisitionType: e.target.value as 'stock' | 'asset' })}
                    className="w-4 h-4 text-[#2563eb] focus:ring-[#2563eb]"
                  />
                  <span className="text-[15px] text-[#374151]">Asset Purchase</span>
                </label>
              </div>
            </div>

            {/* Purchasing 100%? */}
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-2">
                Are you purchasing 100% of the business?
              </label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="isPurchasing100Percent"
                    value="yes"
                    checked={sellerInfo.isPurchasing100Percent === 'yes'}
                    onChange={(e) => updateSellerInfo({ isPurchasing100Percent: e.target.value as 'yes' | 'no' })}
                    className="w-4 h-4 text-[#2563eb] focus:ring-[#2563eb]"
                  />
                  <span className="text-[15px] text-[#374151]">Yes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="isPurchasing100Percent"
                    value="no"
                    checked={sellerInfo.isPurchasing100Percent === 'no'}
                    onChange={(e) => updateSellerInfo({ isPurchasing100Percent: e.target.value as 'yes' | 'no' })}
                    className="w-4 h-4 text-[#2563eb] focus:ring-[#2563eb]"
                  />
                  <span className="text-[15px] text-[#374151]">No</span>
                </label>
              </div>
            </div>
          </div>

          {/* Conditional: Other Owners Description - Full Width */}
          {sellerInfo.isPurchasing100Percent === 'no' && (
            <div className="mb-7">
              <label className="block text-sm font-medium text-[#374151] mb-2">
                List the other owners of the business post-acquisition, including their ownership percentages.
              </label>
              <textarea
                value={sellerInfo.otherOwnersDescription || ''}
                onChange={(e) => updateSellerInfo({ otherOwnersDescription: e.target.value })}
                placeholder="List the other owners and their ownership percentages..."
                className="w-full px-4 py-3 border border-[#d1d5db] rounded-lg text-[15px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] focus:outline-none min-h-[100px] resize-vertical"
                data-testid="textarea-other-owners"
              />
            </div>
          )}

          {/* Purchase Contract Status */}
          <div className="mb-7">
            <label className="block text-sm font-medium text-[#374151] mb-2">
              Purchase Contract Status
            </label>
            <select
              value={sellerInfo.contractStatus || ''}
              onChange={(e) => updateSellerInfo({ contractStatus: e.target.value })}
              className="w-full px-4 py-3 border border-[#d1d5db] rounded-lg text-[15px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] focus:outline-none bg-white"
              data-testid="select-contract-status"
            >
              {CONTRACT_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Seller Carry Note */}
          <div className="mb-7">
            <label className="block text-sm font-medium text-[#374151] mb-2">
              Will the seller carry a note?
            </label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="hasSellerCarryNote"
                  value="yes"
                  checked={sellerInfo.hasSellerCarryNote === 'yes'}
                  onChange={(e) => updateSellerInfo({ hasSellerCarryNote: e.target.value as 'yes' | 'no' })}
                  className="w-4 h-4 text-[#2563eb] focus:ring-[#2563eb]"
                />
                <span className="text-[15px] text-[#374151]">Yes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="hasSellerCarryNote"
                  value="no"
                  checked={sellerInfo.hasSellerCarryNote === 'no'}
                  onChange={(e) => updateSellerInfo({ hasSellerCarryNote: e.target.value as 'yes' | 'no' })}
                  className="w-4 h-4 text-[#2563eb] focus:ring-[#2563eb]"
                />
                <span className="text-[15px] text-[#374151]">No</span>
              </label>
            </div>

            {/* Conditional: Seller Carry Note Terms */}
            {sellerInfo.hasSellerCarryNote === 'yes' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-[#374151] mb-2">
                  Describe the seller carry note terms
                </label>
                <textarea
                  value={sellerInfo.sellerCarryNoteTerms || ''}
                  onChange={(e) => updateSellerInfo({ sellerCarryNoteTerms: e.target.value })}
                  placeholder="Describe the amount, interest rate, term, and any other relevant terms..."
                  className="w-full px-4 py-3 border border-[#d1d5db] rounded-lg text-[15px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] focus:outline-none min-h-[100px] resize-vertical"
                  data-testid="textarea-seller-note-terms"
                />
              </div>
            )}
          </div>
        </div>

        {/* Business Description with AI Generation */}
        <div className="mb-7 mt-8 pt-8 border-t-2 border-[#e5e7eb]">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-[#374151]">
              Business Description
            </label>
            <button
              type="button"
              onClick={handleGenerateSummary}
              disabled={isGenerating}
              className="px-4 py-2 bg-[#2563eb] text-white text-sm font-medium rounded-md cursor-pointer transition-all hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-generate-summary"
            >
              {isGenerating ? (
                <>
                  <span className="inline-block animate-spin mr-2">⟳</span>
                  Generating summary...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 inline mr-2" />
                  Generate Summary
                </>
              )}
            </button>
          </div>
          <textarea
            value={sellerInfo.businessDescription || ''}
            onChange={(e) => updateSellerInfo({ businessDescription: e.target.value })}
            placeholder="Click 'Generate Summary' to automatically generate a business description based on the seller's information, or enter manually..."
            className="w-full px-4 py-3 border border-[#d1d5db] rounded-lg text-[15px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] focus:outline-none min-h-[150px] resize-vertical"
            data-testid="textarea-seller-business-description"
          />
          <p className="text-xs text-[#9ca3af] mt-2">
            The AI will analyze the business name, address, and website to generate a comprehensive business summary.
          </p>
        </div>

        {/* Document Uploads */}
        <div className="mt-8 pt-8 border-t-2 border-[#e5e7eb]">
          <h3 className="text-lg font-semibold text-[#1f2937] mb-5">Document Uploads</h3>

          <FileUploadWithYearTags
            label="LOI / Purchase Contract"
            description="Upload your Letter of Intent or Purchase Contract"
            files={loiContractFiles}
            onChange={setLoiContractFiles}
            accept=".pdf,.doc,.docx"
            showYearTags={false}
            showDescription={true}
            testId="seller-loi-contract"
          />

          <FileUploadWithYearTags
            label="Business Federal Tax Returns (3 most recent years)"
            files={taxReturns}
            onChange={setTaxReturns}
            accept=".pdf,.xlsx,.xls,.doc,.docx,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.webp"
            showYearTags={true}
            testId="seller-tax-returns"
          />

          <FileUploadWithYearTags
            label="Other Files"
            description="Upload any additional supporting documents"
            files={otherFiles}
            onChange={setOtherFiles}
            showYearTags={false}
            showDescription={true}
            testId="seller-other-files"
          />
        </div>

        {/* Real Estate Purchase Section */}
        <div className="mt-8 pt-8 border-t-2 border-[#e5e7eb]">
          <h3 className="text-lg font-semibold text-[#1f2937] mb-2">Real Estate Purchase</h3>
          <p className="text-sm text-[#6b7280] mb-4">
            If this transaction includes the purchase of real estate, please describe the details below.
          </p>
          <textarea
            value={sellerInfo.realEstatePurchaseDescription || ''}
            onChange={(e) => updateSellerInfo({ realEstatePurchaseDescription: e.target.value })}
            placeholder="Describe any real estate being purchased as part of this transaction, including property address, purchase price, and other relevant details..."
            className="w-full px-4 py-3 border border-[#d1d5db] rounded-lg text-[15px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] focus:outline-none min-h-[120px] resize-vertical"
            data-testid="textarea-real-estate-purchase"
          />
        </div>
      </div>

      {/* Learn More Panel for Acquisition Type */}
      <LearnMorePanel
        isOpen={learnMoreOpen === 'acquisitionType'}
        onClose={() => setLearnMoreOpen(null)}
        title="Stock vs. Asset Purchase"
      >
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-semibold text-[#1f2937] mb-3">Stock Purchase</h3>
            <p className="text-[15px] text-[#6b7280] mb-4">
              In a stock purchase, the buyer acquires the seller&apos;s ownership shares (stock) in the company.
              The business entity itself continues to exist with all its assets, liabilities, contracts, and obligations.
            </p>
            <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-lg p-4 mb-4">
              <div className="font-semibold text-sm text-[#166534] mb-2">Advantages:</div>
              <ul className="text-sm text-[#166534] list-disc list-inside space-y-1">
                <li>Simpler transfer of contracts and licenses</li>
                <li>Business continuity maintained</li>
                <li>May be better for businesses with valuable contracts</li>
              </ul>
            </div>
            <div className="bg-[#fef3c7] border border-[#fcd34d] rounded-lg p-4">
              <div className="font-semibold text-sm text-[#92400e] mb-2">Considerations:</div>
              <ul className="text-sm text-[#92400e] list-disc list-inside space-y-1">
                <li>Buyer assumes all liabilities</li>
                <li>Due diligence is critical</li>
                <li>May inherit unknown obligations</li>
              </ul>
            </div>
          </div>

          <div>
            <h3 className="text-base font-semibold text-[#1f2937] mb-3">Asset Purchase</h3>
            <p className="text-[15px] text-[#6b7280] mb-4">
              In an asset purchase, the buyer acquires specific assets of the business (equipment, inventory,
              customer lists, intellectual property, etc.) rather than buying the company itself.
            </p>
            <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-lg p-4 mb-4">
              <div className="font-semibold text-sm text-[#166534] mb-2">Advantages:</div>
              <ul className="text-sm text-[#166534] list-disc list-inside space-y-1">
                <li>Choose which assets and liabilities to acquire</li>
                <li>Step-up in basis for tax purposes</li>
                <li>Generally lower risk of inheriting liabilities</li>
              </ul>
            </div>
            <div className="bg-[#fef3c7] border border-[#fcd34d] rounded-lg p-4">
              <div className="font-semibold text-sm text-[#92400e] mb-2">Considerations:</div>
              <ul className="text-sm text-[#92400e] list-disc list-inside space-y-1">
                <li>May need to renegotiate contracts</li>
                <li>Licenses may need to be reapplied for</li>
                <li>More complex transaction structure</li>
              </ul>
            </div>
          </div>

          <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-lg p-4">
            <div className="font-semibold text-sm text-[#1e40af] mb-2">SBA Consideration</div>
            <p className="text-sm text-[#1e40af]">
              Both stock and asset purchases can be financed through SBA loans. The structure may affect
              how collateral is secured and how the loan is documented. Your lender will help determine
              the best approach for your specific situation.
            </p>
          </div>
        </div>
      </LearnMorePanel>
    </div>
  );
}

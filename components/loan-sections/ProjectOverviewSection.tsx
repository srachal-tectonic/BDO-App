'use client';

import { useState } from 'react';
import { useApplication } from '@/lib/applicationStore';
import { Sparkles } from 'lucide-react';
import { authenticatedPost } from '@/lib/authenticatedFetch';

interface ProjectOverviewSectionProps {
  isReadOnly?: boolean;
}

export default function ProjectOverviewSection({ isReadOnly = false }: ProjectOverviewSectionProps) {
  const { data, updateProjectOverview, updateSellerInfo } = useApplication();
  const { projectOverview: rawProjectOverview, sellerInfo } = data;

  const projectOverview = rawProjectOverview || {
    projectName: '',
    bdo1: '',
    bdo2: '',
    bda: '',
    referralSource: '',
    referralFirm: '',
    referralFee: 0,
    industry: '',
    naicsCode: '',
    primaryProjectPurpose: '',
    secondaryProjectPurposes: [],
    projectDescription: '',
  };

  const [isGeneratingNAICS, setIsGeneratingNAICS] = useState(false);
  const [naicsSuggestions, setNaicsSuggestions] = useState<Array<{
    code: string;
    description: string;
    explanation: string;
  }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleSuggestNAICS = async () => {
    if (!projectOverview.industry || projectOverview.industry.trim() === '') {
      alert('Please enter an Industry before generating NAICS suggestions.');
      document.getElementById('industry')?.focus();
      return;
    }

    setIsGeneratingNAICS(true);
    setShowSuggestions(false);

    try {
      const response = await authenticatedPost('/api/generate-naics', {
        industry: projectOverview.industry,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API request failed with status ${response.status}`);
      }

      const data = await response.json();

      if (data.suggestions && data.suggestions.length > 0) {
        setNaicsSuggestions(data.suggestions);
        setShowSuggestions(true);
        setTimeout(() => {
          document.getElementById('naics-suggestion-container')?.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
          });
        }, 100);
      } else {
        alert('No NAICS code suggestions could be generated. Please try again or enter the code manually.');
      }
    } catch (error: any) {
      console.error('Error generating NAICS suggestions:', error);
      alert('Error generating NAICS suggestions: ' + error.message);
    } finally {
      setIsGeneratingNAICS(false);
    }
  };

  const handleSelectNAICS = (code: string) => {
    updateProjectOverview({ naicsCode: code });
    const naicsInput = document.getElementById('naics-code') as HTMLInputElement;
    if (naicsInput) {
      naicsInput.style.backgroundColor = '#ecfdf5';
      naicsInput.style.borderColor = '#10b981';
      naicsInput.style.transition = 'all 0.3s';
      setTimeout(() => {
        naicsInput.style.backgroundColor = '';
        naicsInput.style.borderColor = '';
      }, 1500);
    }
    setTimeout(() => setShowSuggestions(false), 1500);
  };

  const selectClass = "w-full px-3 py-1.5 laptop:py-1 pr-10 border border-[var(--t-color-border)] rounded-lg text-[length:var(--t-font-size-base)] text-[color:var(--t-color-text-body)] transition-all bg-[var(--t-color-card-bg)] shadow-none outline-none focus:border-[var(--t-color-primary)] focus:shadow-[0_0_0_3px_rgba(19,60,127,0.1)] cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg%20width=%2712%27%20height=%278%27%20viewBox=%270%200%2012%208%27%20fill=%27none%27%20xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cpath%20d=%27M1%201.5L6%206.5L11%201.5%27%20stroke=%27%236b7280%27%20stroke-width=%272%27%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_12px_center] disabled:bg-[var(--t-color-input-bg)] disabled:cursor-not-allowed";
  const inputClass = "w-full px-3 py-1.5 laptop:py-1 border border-[var(--t-color-border)] rounded-lg text-[length:var(--t-font-size-base)] text-[color:var(--t-color-text-body)] transition-all bg-[var(--t-color-card-bg)] shadow-none outline-none focus:border-[var(--t-color-primary)] focus:shadow-[0_0_0_3px_rgba(19,60,127,0.1)] placeholder:text-[color:var(--t-color-text-muted)] disabled:bg-[var(--t-color-input-bg)] disabled:cursor-not-allowed";
  const sectionHeaderClass = "bg-[var(--t-color-primary-palest)] px-4 py-1.5 laptop:py-1";
  const sectionTitleClass = "text-[length:var(--t-font-size-base)] font-semibold text-[color:var(--t-color-primary)]";
  const labelClass = "block text-[length:var(--t-font-size-base)] font-medium text-[color:var(--t-color-text-body)] mb-0.5";

  const PURPOSE_OPTIONS = [
    'Business Acquisition',
    'CRE: Construction',
    'CRE: Purchase',
    'Debt Refinance',
    'Equipment Purchase',
    'Expansion',
    'Inventory Acquisition',
    'Partner Buyout',
    'Startup',
    'Working Capital',
  ];

  const currentPrimary = typeof projectOverview.primaryProjectPurpose === 'string'
    ? projectOverview.primaryProjectPurpose
    : '';
  const currentSecondary = Array.isArray(projectOverview.secondaryProjectPurposes)
    ? projectOverview.secondaryProjectPurposes
    : [];

  const isAcquisition = currentPrimary === 'Business Acquisition' || currentPrimary === 'Business Acquisition / Change of Ownership';

  const formatUSD = (value: number | undefined): string => {
    if (!value) return '';
    return value.toLocaleString('en-US');
  };

  const parseUSD = (value: string): number => {
    const cleaned = value.replace(/[^0-9]/g, '');
    return cleaned ? parseInt(cleaned, 10) : 0;
  };

  return (
    <div>
      <div className="px-4 py-4 laptop:py-2 space-y-3 laptop:space-y-2">
        {/* Project Team */}
        <div className="bg-[var(--t-color-card-bg)] border border-[var(--t-color-border)] rounded-md overflow-hidden">
          <div className={sectionHeaderClass}>
            <h2 className={sectionTitleClass} data-testid="text-section-project-team">Project Team</h2>
          </div>
          <div className="px-4 py-2 laptop:py-1">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
              <div>
                <label htmlFor="bdo1" className={labelClass}>BDO (1)</label>
                <select
                  id="bdo1"
                  value={projectOverview.bdo1 || ''}
                  onChange={(e) => updateProjectOverview({ bdo1: e.target.value })}
                  className={selectClass}
                  disabled={isReadOnly}
                  data-testid="select-bdo1"
                >
                  <option value="">Select BDO</option>
                  <option value="john-smith">John Smith</option>
                  <option value="sarah-johnson">Sarah Johnson</option>
                  <option value="michael-davis">Michael Davis</option>
                  <option value="emily-brown">Emily Brown</option>
                  <option value="robert-wilson">Robert Wilson</option>
                </select>
              </div>
              <div>
                <label htmlFor="bdo2" className={labelClass}>BDO (2)</label>
                <select
                  id="bdo2"
                  value={projectOverview.bdo2 || ''}
                  onChange={(e) => updateProjectOverview({ bdo2: e.target.value })}
                  className={selectClass}
                  disabled={isReadOnly}
                  data-testid="select-bdo2"
                >
                  <option value="">Select BDO</option>
                  <option value="john-smith">John Smith</option>
                  <option value="sarah-johnson">Sarah Johnson</option>
                  <option value="michael-davis">Michael Davis</option>
                  <option value="emily-brown">Emily Brown</option>
                  <option value="robert-wilson">Robert Wilson</option>
                </select>
              </div>
              <div>
                <label htmlFor="bda" className={labelClass}>BDA</label>
                <select
                  id="bda"
                  value={projectOverview.bda || ''}
                  onChange={(e) => updateProjectOverview({ bda: e.target.value })}
                  className={selectClass}
                  disabled={isReadOnly}
                  data-testid="select-bda"
                >
                  <option value="">Select BDA</option>
                  <option value="jennifer-lee">Jennifer Lee</option>
                  <option value="david-martinez">David Martinez</option>
                  <option value="amanda-taylor">Amanda Taylor</option>
                  <option value="chris-anderson">Chris Anderson</option>
                </select>
              </div>
              <div>
                <label htmlFor="referral-source" className={labelClass}>Referral Source</label>
                <select
                  id="referral-source"
                  value={projectOverview.referralSource || ''}
                  onChange={(e) => updateProjectOverview({ referralSource: e.target.value })}
                  className={selectClass}
                  disabled={isReadOnly}
                  data-testid="select-referral-source"
                >
                  <option value="">Select referral source</option>
                  <option value="None">None</option>
                  <option value="Business Broker">Business Broker</option>
                  <option value="CRE Broker">CRE Broker</option>
                  <option value="Other Bank">Other Bank</option>
                  <option value="COI (CPA, Attorney, etc.)">COI (CPA, Attorney, etc.)</option>
                  <option value="Client">Client</option>
                  <option value="Buyer Advisor">Buyer Advisor</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {projectOverview.referralSource && projectOverview.referralSource !== 'None' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <label htmlFor="referral-individual" className={labelClass}>Referral Individual</label>
                  <input
                    type="text"
                    id="referral-individual"
                    value={projectOverview.referralIndividual || ''}
                    onChange={(e) => updateProjectOverview({ referralIndividual: e.target.value })}
                    placeholder="Enter individual name"
                    className={inputClass}
                    disabled={isReadOnly}
                    data-testid="input-referral-individual"
                  />
                </div>
                <div>
                  <label htmlFor="referral-firm" className={labelClass}>Referral Firm</label>
                  <input
                    type="text"
                    id="referral-firm"
                    value={projectOverview.referralFirm || ''}
                    onChange={(e) => updateProjectOverview({ referralFirm: e.target.value })}
                    placeholder="Enter referral firm"
                    className={inputClass}
                    disabled={isReadOnly}
                    data-testid="input-referral-firm"
                  />
                </div>
                <div>
                  <label htmlFor="referral-fee" className={labelClass}>Referral Fee</label>
                  <div className="relative">
                    <input
                      type="number"
                      id="referral-fee"
                      value={projectOverview.referralFee || 0}
                      onChange={(e) => updateProjectOverview({ referralFee: parseFloat(e.target.value) || 0 })}
                      placeholder="0.0"
                      step="0.1"
                      min="0"
                      max="100"
                      className={`${inputClass} pr-8`}
                      disabled={isReadOnly}
                      data-testid="input-referral-fee"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--t-color-text-muted)] text-[length:var(--t-font-size-base)] pointer-events-none">
                      %
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Project Details */}
        <div className="bg-[var(--t-color-card-bg)] border border-[var(--t-color-border)] rounded-md overflow-hidden">
          <div className={sectionHeaderClass}>
            <h2 className={sectionTitleClass} data-testid="text-section-project-details">Project Details</h2>
          </div>
          <div className="px-4 py-2 laptop:py-1">
            <div className="grid grid-cols-1 sm:grid-cols-[2.5fr_1.5fr_1.25fr_1.25fr] gap-2 mb-2">
              <div>
                <label htmlFor="project-name" className={labelClass}>Project Name</label>
                <input
                  type="text"
                  id="project-name"
                  value={projectOverview.projectName}
                  onChange={(e) => updateProjectOverview({ projectName: e.target.value })}
                  placeholder="Enter project name"
                  className={inputClass}
                  disabled={isReadOnly}
                  data-testid="input-project-name"
                />
              </div>
              <div>
                <label htmlFor="industry" className={labelClass}>Industry</label>
                <input
                  type="text"
                  id="industry"
                  value={projectOverview.industry}
                  onChange={(e) => updateProjectOverview({ industry: e.target.value })}
                  placeholder="e.g., Restaurant, Manufacturing"
                  className={inputClass}
                  disabled={isReadOnly}
                  data-testid="input-industry"
                />
              </div>
              <div>
                <label htmlFor="loanstar-loan-id" className={labelClass}>LoanStar Loan ID</label>
                <input
                  type="number"
                  id="loanstar-loan-id"
                  value={projectOverview.loanStarLoanId ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    updateProjectOverview({ loanStarLoanId: v === '' ? undefined : Number(v) });
                  }}
                  placeholder="e.g., 123456"
                  className={inputClass}
                  disabled={isReadOnly}
                  data-testid="input-loanstar-loan-id"
                />
              </div>
              <div>
                <label htmlFor="naics-code" className="flex items-center gap-2 text-[length:var(--t-font-size-base)] font-medium text-[color:var(--t-color-text-body)] mb-0.5">
                  NAICS Code
                  <button
                    type="button"
                    onClick={handleSuggestNAICS}
                    disabled={isGeneratingNAICS || isReadOnly}
                    className="inline-flex items-center gap-1 text-[length:var(--t-font-size-sm)] text-[color:var(--t-color-accent)] font-medium cursor-pointer hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="button-suggest-naics"
                  >
                    {isGeneratingNAICS ? (
                      <><span className="inline-block animate-spin">&#x27F3;</span>Suggesting...</>
                    ) : (
                      <><Sparkles className="w-3 h-3" />Suggest</>
                    )}
                  </button>
                </label>
                <input
                  type="text"
                  id="naics-code"
                  value={projectOverview.naicsCode}
                  onChange={(e) => updateProjectOverview({ naicsCode: e.target.value })}
                  placeholder="e.g., 722511"
                  maxLength={6}
                  className={inputClass}
                  disabled={isReadOnly}
                  data-testid="input-naics-code"
                />
              </div>
            </div>

            {showSuggestions && naicsSuggestions.length > 0 && (
              <div className="mb-2" id="naics-suggestion-container">
                <label className={labelClass}>NAICS Suggestions</label>
                <div className="flex flex-col gap-1">
                  {naicsSuggestions.map((suggestion, index) => (
                    <div key={index} className="bg-[var(--t-color-card-bg)] border border-[var(--t-color-border)] rounded-lg p-3 transition-all hover-elevate">
                      <button
                        type="button"
                        onClick={() => handleSelectNAICS(suggestion.code)}
                        disabled={isReadOnly}
                        className="inline-block bg-[var(--t-color-primary)] text-white px-3 py-1.5 rounded-md text-[length:var(--t-font-size-base)] font-medium font-mono cursor-pointer transition-all hover-elevate active-elevate-2 mb-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        data-testid={`button-naics-${suggestion.code}`}
                      >
                        {suggestion.code}
                      </button>
                      <div className="text-base font-medium text-[color:var(--t-color-text-body)] mb-1">{suggestion.description}</div>
                      <div className="text-[length:var(--t-font-size-sm)] text-[color:var(--t-color-text-muted)]">{suggestion.explanation}</div>
                    </div>
                  ))}
                </div>
                <p className="text-[length:var(--t-font-size-base)] text-[color:var(--t-color-text-muted)] mt-2">
                  Click on a NAICS code button above to copy it to the NAICS Code field.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Project Purpose */}
        <div className="bg-[var(--t-color-card-bg)] border border-[var(--t-color-border)] rounded-md overflow-hidden">
          <div className={sectionHeaderClass}>
            <h2 className={sectionTitleClass} data-testid="text-section-project-purpose">Project Purpose</h2>
          </div>
          <div className="px-4 py-2 laptop:py-1">
            <div className="space-y-2">
              <div>
                <label htmlFor="primary-purpose" className="block text-[length:var(--t-font-size-base)] font-medium text-[color:var(--t-color-text-body)] mb-1">Primary Purpose</label>
                <select
                  id="primary-purpose"
                  value={currentPrimary}
                  onChange={(e) => updateProjectOverview({ primaryProjectPurpose: e.target.value })}
                  className={selectClass}
                  disabled={isReadOnly}
                  data-testid="select-primary-purpose"
                >
                  <option value="">Select primary purpose</option>
                  {PURPOSE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[length:var(--t-font-size-base)] font-medium text-[color:var(--t-color-text-body)] mb-1">Secondary Purposes</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-1">
                  {PURPOSE_OPTIONS.filter((option) => option !== 'Franchise').map((option) => {
                    const isChecked = currentSecondary.includes(option);
                    return (
                      <label key={option} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          value={option}
                          checked={isChecked}
                          onChange={() => {
                            const updated = isChecked
                              ? currentSecondary.filter((p: string) => p !== option)
                              : [...currentSecondary, option];
                            updateProjectOverview({ secondaryProjectPurposes: updated });
                          }}
                          disabled={isReadOnly}
                          className="w-5 h-5 text-[var(--t-color-accent)] border-[var(--t-color-border)] rounded focus:ring-2 focus:ring-[var(--t-color-accent)] focus:ring-offset-0 flex-shrink-0 disabled:cursor-not-allowed"
                          data-testid={`checkbox-secondary-purpose-${option.toLowerCase().replace(/[\s/:]+/g, '-')}`}
                        />
                        <span className="text-[length:var(--t-font-size-base)] text-[color:var(--t-color-text-body)]">{option}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="franchise-toggle" className="text-[length:var(--t-font-size-base)] font-medium text-[color:var(--t-color-text-body)]">
                  Franchise
                </label>
                <button
                  id="franchise-toggle"
                  type="button"
                  role="switch"
                  aria-checked={currentSecondary.includes('Franchise')}
                  onClick={() => {
                    const hasFranchise = currentSecondary.includes('Franchise');
                    const updated = hasFranchise
                      ? currentSecondary.filter((p: string) => p !== 'Franchise')
                      : [...currentSecondary, 'Franchise'];
                    updateProjectOverview({ secondaryProjectPurposes: updated });
                  }}
                  disabled={isReadOnly}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--t-color-accent)] focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${
                    currentSecondary.includes('Franchise') ? 'bg-[var(--t-color-accent)]' : 'bg-[var(--t-color-border)]'
                  }`}
                  data-testid="toggle-franchise"
                >
                  <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                    currentSecondary.includes('Franchise') ? 'translate-x-[18px]' : 'translate-x-[3px]'
                  }`} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Project Description */}
        <div className="bg-[var(--t-color-card-bg)] border border-[var(--t-color-border)] rounded-md overflow-hidden">
          <div className={sectionHeaderClass}>
            <h2 className={sectionTitleClass} data-testid="text-section-project-description">Project Description</h2>
          </div>
          <div className="px-4 py-2 laptop:py-1">
            <textarea
              value={projectOverview.projectDescription || ''}
              onChange={(e) => updateProjectOverview({ projectDescription: e.target.value })}
              placeholder="Describe the project, its purpose, and key details..."
              rows={4}
              className={`${inputClass} resize-vertical`}
              disabled={isReadOnly}
              data-testid="textarea-project-description"
            />
          </div>
        </div>

        {/* Business Acquisition Details (conditional) */}
        {isAcquisition && (
          <div className="bg-[var(--t-color-card-bg)] border border-[var(--t-color-border)] rounded-md overflow-hidden">
            <div className={sectionHeaderClass}>
              <h2 className={sectionTitleClass} data-testid="text-section-acquisition-details">Business Acquisition Details</h2>
            </div>
            <div className="px-4 py-2 laptop:py-1 space-y-2 laptop:space-y-1">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                <div className="md:col-span-2">
                  <label className={labelClass}>Legal Name of Business Being Acquired</label>
                  <input type="text" value={sellerInfo?.legalName || ''} onChange={(e) => updateSellerInfo({ legalName: e.target.value })} className={inputClass} disabled={isReadOnly} data-testid="input-seller-legal-name" />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>DBA Name</label>
                  <input type="text" value={sellerInfo?.dbaName || ''} onChange={(e) => updateSellerInfo({ dbaName: e.target.value })} className={inputClass} disabled={isReadOnly} data-testid="input-seller-dba-name" />
                </div>
                <div>
                  <label className={labelClass}>Year Established</label>
                  <input type="text" value={sellerInfo?.yearEstablished || ''} onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 4); updateSellerInfo({ yearEstablished: v }); }} placeholder="e.g., 2005" maxLength={4} className={inputClass} disabled={isReadOnly} data-testid="input-seller-year-established" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <label className={labelClass}>Seller Primary Contact Name</label>
                  <input type="text" value={sellerInfo?.contactName || ''} onChange={(e) => updateSellerInfo({ contactName: e.target.value })} className={inputClass} disabled={isReadOnly} data-testid="input-seller-contact-name" />
                </div>
                <div>
                  <label className={labelClass}>Seller Phone Number</label>
                  <input type="tel" value={sellerInfo?.contactPhone || ''} onChange={(e) => updateSellerInfo({ contactPhone: e.target.value })} className={inputClass} disabled={isReadOnly} data-testid="input-seller-phone-number" />
                </div>
                <div>
                  <label className={labelClass}>Seller Email</label>
                  <input type="email" value={sellerInfo?.contactEmail || ''} onChange={(e) => updateSellerInfo({ contactEmail: e.target.value })} className={inputClass} disabled={isReadOnly} data-testid="input-seller-email" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <div>
                  <label className={labelClass}>Purchase Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[length:var(--t-font-size-base)] text-[color:var(--t-color-text-muted)]">$</span>
                    <input type="text" value={formatUSD(sellerInfo?.purchasePrice)} onChange={(e) => updateSellerInfo({ purchasePrice: parseUSD(e.target.value) })} placeholder="0" className={`${inputClass} pl-7`} disabled={isReadOnly} data-testid="input-seller-purchase-price" />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Type of Acquisition</label>
                  <select value={sellerInfo?.typeOfAcquisition || ''} onChange={(e) => updateSellerInfo({ typeOfAcquisition: e.target.value as any })} className={selectClass} disabled={isReadOnly} data-testid="select-acquisition-type">
                    <option value="">Select type</option>
                    <option value="stock">Stock</option>
                    <option value="asset">Asset</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Purchasing 100%?</label>
                  <select value={sellerInfo?.purchasing100Percent || ''} onChange={(e) => updateSellerInfo({ purchasing100Percent: e.target.value as any })} className={selectClass} disabled={isReadOnly} data-testid="select-purchasing-100">
                    <option value="">Select</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Purchase Contract Status</label>
                  <select value={sellerInfo?.purchaseContractStatus || ''} onChange={(e) => updateSellerInfo({ purchaseContractStatus: e.target.value as any })} className={selectClass} disabled={isReadOnly} data-testid="select-contract-status">
                    <option value="">Select status</option>
                    <option value="no_contract">No Contract</option>
                    <option value="loi_signed">LOI Signed</option>
                    <option value="contract_drafted">Contract Drafted</option>
                    <option value="fully_executed">Fully Executed</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

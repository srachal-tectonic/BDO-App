'use client';

import { useState } from 'react';
import { useApplication } from '@/lib/applicationStore';
import { Sparkles } from 'lucide-react';
import CollapsibleSection from '@/components/loan-sections/CollapsibleSection';
import RiskAssessmentSection from '@/components/loan-sections/RiskAssessmentSection';
import { authenticatedPost } from '@/lib/authenticatedFetch';

interface ProjectOverviewSectionProps {
  isReadOnly?: boolean;
}

export default function ProjectOverviewSection({ isReadOnly = false }: ProjectOverviewSectionProps) {
  const { data, updateProjectOverview } = useApplication();
  const { projectOverview: rawProjectOverview } = data;

  // Provide safe defaults for projectOverview
  const projectOverview = rawProjectOverview || {
    projectName: '',
    bdoName: '',
    bdaName: '',
    industry: '',
    naicsCode: '',
    primaryProjectPurpose: [],
    riskRepayment: 0,
    riskManagement: 0,
    riskEquity: 0,
    riskCollateral: 0,
    riskCredit: 0,
    riskLiquidity: 0,
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
      console.log('NAICS suggestions received:', data.suggestions);

      if (data.suggestions && data.suggestions.length > 0) {
        setNaicsSuggestions(data.suggestions);
        setShowSuggestions(true);

        // Scroll to suggestions
        setTimeout(() => {
          document.getElementById('naics-suggestion-container')?.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
          });
        }, 100);
      } else {
        alert('No NAICS code suggestions could be generated. Please try again or enter the code manually.');
      }
    } catch (error: any) {
      console.error('Error generating NAICS suggestions:', error);
      alert('Error generating NAICS suggestions: ' + error.message + '\n\nPlease try again or enter the NAICS code manually.');
    } finally {
      setIsGeneratingNAICS(false);
    }
  };

  const handleSelectNAICS = (code: string) => {
    updateProjectOverview({ naicsCode: code });

    // Visual feedback
    const naicsInput = document.getElementById('naics-code') as HTMLInputElement;
    if (naicsInput) {
      naicsInput.style.backgroundColor = '#f0fdf4';
      naicsInput.style.borderColor = '#10b981';
      naicsInput.style.transition = 'all 0.3s';

      setTimeout(() => {
        naicsInput.style.backgroundColor = '';
        naicsInput.style.borderColor = '';
      }, 1500);
    }

    // Hide suggestions after selection
    setTimeout(() => {
      setShowSuggestions(false);
    }, 1500);
  };

  return (
    <div>
      <div className="p-4 sm:p-6 pb-3 sm:pb-4">
        <h1 className="text-[28px] font-bold text-[#1a1a1a]">Project Overview</h1>
      </div>

      <div className="px-4 sm:px-6">
        <CollapsibleSection title="Project Summary">
          <div className="mb-4">
            <label htmlFor="project-name" className="block text-sm font-medium text-[#374151] mb-1.5">
              Project Name
            </label>
            <input
              type="text"
              id="project-name"
              value={projectOverview.projectName}
              onChange={(e) => updateProjectOverview({ projectName: e.target.value })}
              placeholder="Enter a name for this project (e.g., 'ABC Restaurant Acquisition')"
              className="w-full px-3 py-2 border border-[#d1d5db] rounded-lg text-[15px] text-[#1a1a1a] transition-all bg-white shadow-none outline-none focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] placeholder:text-[#9ca3af] disabled:bg-[#f3f4f6] disabled:cursor-not-allowed"
              disabled={isReadOnly}
              data-testid="input-project-name"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
            <div>
              <label htmlFor="bdo1" className="block text-sm font-medium text-[#374151] mb-1.5">
                Business Development Officer (1)
              </label>
              <select
                id="bdo1"
                value={projectOverview.bdo1}
                onChange={(e) => updateProjectOverview({ bdo1: e.target.value })}
                className="w-full px-3 py-2 pr-10 border border-[#d1d5db] rounded-lg text-[15px] text-[#1a1a1a] transition-all bg-white shadow-none outline-none focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg%20width=%2712%27%20height=%278%27%20viewBox=%270%200%2012%208%27%20fill=%27none%27%20xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cpath%20d=%27M1%201.5L6%206.5L11%201.5%27%20stroke=%27%236b7280%27%20stroke-width=%272%27%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_12px_center] disabled:bg-[#f3f4f6] disabled:cursor-not-allowed"
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
              <label htmlFor="bdo2" className="block text-sm font-medium text-[#374151] mb-1.5">
                Business Development Officer (2)
              </label>
              <select
                id="bdo2"
                value={projectOverview.bdo2}
                onChange={(e) => updateProjectOverview({ bdo2: e.target.value })}
                className="w-full px-3 py-2 pr-10 border border-[#d1d5db] rounded-lg text-[15px] text-[#1a1a1a] transition-all bg-white shadow-none outline-none focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg%20width=%2712%27%20height=%278%27%20viewBox=%270%200%2012%208%27%20fill=%27none%27%20xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cpath%20d=%27M1%201.5L6%206.5L11%201.5%27%20stroke=%27%236b7280%27%20stroke-width=%272%27%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_12px_center] disabled:bg-[#f3f4f6] disabled:cursor-not-allowed"
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
              <label htmlFor="bda" className="block text-sm font-medium text-[#374151] mb-1.5">
                Business Development Assistant
              </label>
              <select
                id="bda"
                value={projectOverview.bda}
                onChange={(e) => updateProjectOverview({ bda: e.target.value })}
                className="w-full px-3 py-2 pr-10 border border-[#d1d5db] rounded-lg text-[15px] text-[#1a1a1a] transition-all bg-white shadow-none outline-none focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg%20width=%2712%27%20height=%278%27%20viewBox=%270%200%2012%208%27%20fill=%27none%27%20xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cpath%20d=%27M1%201.5L6%206.5L11%201.5%27%20stroke=%27%236b7280%27%20stroke-width=%272%27%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_12px_center] disabled:bg-[#f3f4f6] disabled:cursor-not-allowed"
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
            <div>
              <label htmlFor="referral-source" className="block text-sm font-medium text-[#374151] mb-1.5">
                Referral Source
              </label>
              <input
                type="text"
                id="referral-source"
                value={projectOverview.referralSource || ''}
                onChange={(e) => updateProjectOverview({ referralSource: e.target.value })}
                placeholder="e.g., John Doe"
                className="w-full px-3 py-2 border border-[#d1d5db] rounded-lg text-[15px] text-[#1a1a1a] transition-all bg-white shadow-none outline-none focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] placeholder:text-[#9ca3af] disabled:bg-[#f3f4f6] disabled:cursor-not-allowed"
                disabled={isReadOnly}
                data-testid="input-referral-source"
              />
            </div>

            <div>
              <label htmlFor="referral-firm" className="block text-sm font-medium text-[#374151] mb-1.5">
                Referral Firm
              </label>
              <input
                type="text"
                id="referral-firm"
                value={projectOverview.referralFirm || ''}
                onChange={(e) => updateProjectOverview({ referralFirm: e.target.value })}
                placeholder="e.g., ABC Advisory"
                className="w-full px-3 py-2 border border-[#d1d5db] rounded-lg text-[15px] text-[#1a1a1a] transition-all bg-white shadow-none outline-none focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] placeholder:text-[#9ca3af] disabled:bg-[#f3f4f6] disabled:cursor-not-allowed"
                disabled={isReadOnly}
                data-testid="input-referral-firm"
              />
            </div>

            <div>
              <label htmlFor="referral-fee" className="block text-sm font-medium text-[#374151] mb-1.5">
                Referral Fee
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]">$</span>
                <input
                  type="number"
                  id="referral-fee"
                  value={projectOverview.referralFee || ''}
                  onChange={(e) => updateProjectOverview({ referralFee: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2 border border-[#d1d5db] rounded-lg text-[15px] text-[#1a1a1a] transition-all bg-white shadow-none outline-none focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] placeholder:text-[#9ca3af] disabled:bg-[#f3f4f6] disabled:cursor-not-allowed"
                  disabled={isReadOnly}
                  data-testid="input-referral-fee"
                />
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="industry" className="block text-sm font-medium text-[#374151] mb-1.5">
              Industry
            </label>
            <input
              type="text"
              id="industry"
              value={projectOverview.industry}
              onChange={(e) => updateProjectOverview({ industry: e.target.value })}
              placeholder="e.g., Restaurant, Manufacturing, Retail"
              className="w-full px-3 py-2 border border-[#d1d5db] rounded-lg text-[15px] text-[#1a1a1a] transition-all bg-white shadow-none outline-none focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] placeholder:text-[#9ca3af] disabled:bg-[#f3f4f6] disabled:cursor-not-allowed"
              disabled={isReadOnly}
              data-testid="input-industry"
            />
          </div>

          <div className="grid grid-cols-[1fr_1.5fr] gap-2 mb-4">
            <div>
              <label htmlFor="naics-code" className="block text-sm font-medium text-[#374151] mb-1.5">
                NAICS Code (6 digits)
              </label>
              <input
                type="text"
                id="naics-code"
                value={projectOverview.naicsCode}
                onChange={(e) => updateProjectOverview({ naicsCode: e.target.value })}
                placeholder="e.g., 722511"
                maxLength={6}
                className="w-full px-3 py-2 border border-[#d1d5db] rounded-lg text-[15px] text-[#1a1a1a] transition-all bg-white shadow-none outline-none focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] placeholder:text-[#9ca3af] disabled:bg-[#f3f4f6] disabled:cursor-not-allowed"
                disabled={isReadOnly}
                data-testid="input-naics-code"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleSuggestNAICS}
                disabled={isGeneratingNAICS || isReadOnly}
                className="w-full px-3 py-2 bg-white border-2 border-[#2563eb] text-[#2563eb] font-medium rounded-md cursor-pointer transition-all hover-elevate active-elevate-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                data-testid="button-suggest-naics"
              >
                {isGeneratingNAICS ? (
                  <>
                    <span className="inline-block animate-spin mr-2">⟳</span>
                    Suggesting...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 inline mr-2" />
                    Suggest NAICS
                  </>
                )}
              </button>
            </div>
          </div>

          {showSuggestions && naicsSuggestions.length > 0 && (
            <div className="mb-4" id="naics-suggestion-container">
              <label className="block text-sm font-medium text-[#374151] mb-1.5">
                NAICS Suggestions
              </label>
              <div className="flex flex-col gap-2">
                {naicsSuggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="bg-white border border-[#e5e7eb] rounded-lg p-3 transition-all hover-elevate"
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectNAICS(suggestion.code)}
                      disabled={isReadOnly}
                      className="inline-block bg-[#2563eb] text-white px-3 py-1.5 rounded-md text-sm font-medium font-mono cursor-pointer transition-all hover-elevate active-elevate-2 mb-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                      data-testid={`button-naics-${suggestion.code}`}
                    >
                      {suggestion.code}
                    </button>
                    <div className="text-base font-medium text-[#1f2937] mb-1">
                      {suggestion.description}
                    </div>
                    <div className="text-sm text-[#6b7280]">
                      {suggestion.explanation}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[13px] text-[#6b7280] mt-2">
                Click on a NAICS code button above to copy it to the NAICS Code field.
              </p>
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="project-description" className="block text-sm font-medium text-[#374151] mb-1.5">
              Project Description
            </label>
            <textarea
              id="project-description"
              value={projectOverview.projectDescription}
              onChange={(e) => updateProjectOverview({ projectDescription: e.target.value })}
              placeholder="Provide a brief description of the project, including the purpose of the loan and how the funds will be used"
              className="w-full px-3 py-2 border border-[#d1d5db] rounded-lg text-[15px] text-[#1a1a1a] transition-all bg-white shadow-none outline-none focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] min-h-[100px] resize-vertical font-sans placeholder:text-[#9ca3af] disabled:bg-[#f3f4f6] disabled:cursor-not-allowed"
              disabled={isReadOnly}
              data-testid="textarea-project-description"
            />
          </div>
        </CollapsibleSection>
      </div>

      {/* Risk Assessment Section - below Project Summary */}
      <RiskAssessmentSection isReadOnly={isReadOnly} />
    </div>
  );
}

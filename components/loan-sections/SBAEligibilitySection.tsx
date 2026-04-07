'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useApplication } from '@/lib/applicationStore';

type QuestionKey = 'convicted' | 'arrested' | 'pendingLawsuits' | 'childSupport' | 'taxLiens' | 'bankruptcy' | 'federalDebt';
type ExplanationKey = `${QuestionKey}Explanation`;

export default function SBAEligibilitySection() {
  const [isAboutExpanded, setIsAboutExpanded] = useState(true);
  const { data, updateSBAEligibility } = useApplication();
  const { sbaEligibility: rawSbaEligibility } = data;

  // Provide safe defaults for sbaEligibility
  const sbaEligibility = rawSbaEligibility || {
    convicted: undefined,
    arrested: undefined,
    pendingLawsuits: undefined,
    childSupport: undefined,
    taxLiens: undefined,
    bankruptcy: undefined,
    federalDebt: undefined,
    convictedExplanation: undefined,
    arrestedExplanation: undefined,
    pendingLawsuitsExplanation: undefined,
    childSupportExplanation: undefined,
    taxLiensExplanation: undefined,
    bankruptcyExplanation: undefined,
    federalDebtExplanation: undefined,
  };

  const questions: { key: QuestionKey; explanationKey: ExplanationKey; text: string }[] = [
    { key: 'convicted', explanationKey: 'convictedExplanation', text: 'Have any of the applicants ever been convicted of a criminal offense?' },
    { key: 'arrested', explanationKey: 'arrestedExplanation', text: 'Are any of the applicants currently subject to an indictment, criminal information, arraignment, or other means of formal criminal charge?' },
    { key: 'pendingLawsuits', explanationKey: 'pendingLawsuitsExplanation', text: 'Are any of the applicants parties to any pending lawsuits?' },
    { key: 'childSupport', explanationKey: 'childSupportExplanation', text: 'Are any of the applicants currently delinquent on any child support obligations?' },
    { key: 'taxLiens', explanationKey: 'taxLiensExplanation', text: 'Are any of the applicants subject to any tax liens?' },
    { key: 'bankruptcy', explanationKey: 'bankruptcyExplanation', text: 'Have any of the applicants ever been involved in a bankruptcy proceeding?' },
    { key: 'federalDebt', explanationKey: 'federalDebtExplanation', text: 'Are any of the applicants delinquent on any federal debt?' },
  ];

  const handleAnswerChange = (questionKey: QuestionKey, value: 'yes' | 'no') => {
    if (value === 'no') {
      // Clear the explanation when answering "No"
      const explanationKey = `${questionKey}Explanation` as ExplanationKey;
      updateSBAEligibility({ [questionKey]: value, [explanationKey]: '' });
    } else {
      updateSBAEligibility({ [questionKey]: value });
    }
  };

  return (
    <div>
      <div className="p-4 sm:p-6 pb-3 sm:pb-4">
        <h1 className="text-[28px] font-bold text-[#1a1a1a]">SBA Eligibility Questions</h1>
      </div>

      <div className="px-4 sm:px-6">
        {questions.map((question) => (
          <div
            key={question.key}
            className="bg-[#f8f9fb] border-2 border-[#e5e7eb] rounded-lg p-5 mb-4"
          >
            <p className="text-[15px] text-[#1f2937] mb-3 leading-relaxed">{question.text}</p>
            <div className="flex gap-3 flex-wrap">
              <label className="flex items-center gap-2.5 px-4 py-3 bg-white border border-[#d1d5db] rounded-lg cursor-pointer transition-all hover-elevate has-[:checked]:border-[#2563eb] has-[:checked]:bg-[#eff6ff]">
                <input
                  type="radio"
                  name={question.key}
                  value="yes"
                  checked={(sbaEligibility as any)[question.key] === 'yes'}
                  onChange={() => handleAnswerChange(question.key, 'yes')}
                  className="w-5 h-5 cursor-pointer accent-[#2563eb]"
                  data-testid={`radio-${question.key}-yes`}
                />
                <span className="text-sm text-[#374151]">Yes</span>
              </label>
              <label className="flex items-center gap-2.5 px-4 py-3 bg-white border border-[#d1d5db] rounded-lg cursor-pointer transition-all hover-elevate has-[:checked]:border-[#2563eb] has-[:checked]:bg-[#eff6ff]">
                <input
                  type="radio"
                  name={question.key}
                  value="no"
                  checked={(sbaEligibility as any)[question.key] === 'no'}
                  onChange={() => handleAnswerChange(question.key, 'no')}
                  className="w-5 h-5 cursor-pointer accent-[#2563eb]"
                  data-testid={`radio-${question.key}-no`}
                />
                <span className="text-sm text-[#374151]">No</span>
              </label>
            </div>

            {/* Conditional explanation text area - appears when "Yes" is selected */}
            {(sbaEligibility as any)[question.key] === 'yes' && (
              <div className="mt-4">
                <label
                  htmlFor={`${question.key}-explanation`}
                  className="block text-sm font-medium text-[#374151] mb-2"
                >
                  Please explain
                </label>
                <textarea
                  id={`${question.key}-explanation`}
                  name={`${question.key}-explanation`}
                  rows={3}
                  value={(sbaEligibility as any)[question.explanationKey] || ''}
                  onChange={(e) => updateSBAEligibility({ [question.explanationKey]: e.target.value })}
                  placeholder="Please provide details about the circumstances..."
                  className="w-full px-4 py-3 bg-white border border-[#d1d5db] rounded-lg text-[15px] text-[#1f2937] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent resize-vertical"
                  data-testid={`textarea-${question.key}-explanation`}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

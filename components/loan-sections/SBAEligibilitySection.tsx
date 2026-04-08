'use client';

import { useState } from 'react';
import { HelpCircle, ChevronDown } from 'lucide-react';
import { useApplication } from '@/lib/applicationStore';
import LearnMorePanel from '@/components/LearnMorePanel';

interface LearnMoreContent {
  title: string;
  whatWeAsk: string;
  whySbaRequires: string;
}

const learnMoreContent: Record<string, LearnMoreContent> = {
  convicted: {
    title: 'Criminal Conviction History',
    whatWeAsk: 'Whether any owner or individual applicant has been found guilty of a misdemeanor or felony in a court of law. Minor traffic violations (speeding, parking) do not count.',
    whySbaRequires: 'The SBA evaluates past criminal history to determine eligibility for federal financing and to comply with federal background-screening requirements. A conviction does not automatically disqualify an applicant.',
  },
  arrested: {
    title: 'Current Criminal Charges',
    whatWeAsk: 'Whether any applicant is presently facing formal criminal charges, awaiting trial, or has an unresolved indictment or legal accusation.',
    whySbaRequires: 'Federal rules prohibit the SBA from approving a loan when an applicant is currently charged with a crime.',
  },
  pendingLawsuits: {
    title: 'Pending Lawsuits',
    whatWeAsk: 'Whether any applicant is involved in an active civil lawsuit\u2014either as a plaintiff or as a defendant.',
    whySbaRequires: 'Pending litigation can affect the financial stability of the borrower. The SBA and the lender must assess whether the lawsuit could impact repayment ability.',
  },
  childSupport: {
    title: 'Child Support Obligations',
    whatWeAsk: 'Whether any applicant is behind on court-ordered child support payments by more than 60 days.',
    whySbaRequires: 'Federal law requires the SBA to verify that applicants with more than 60 days of unpaid child support are not eligible for SBA assistance.',
  },
  taxLiens: {
    title: 'Tax Liens',
    whatWeAsk: 'Whether any applicant currently has federal, state, or local tax authorities placing a lien on their assets due to unpaid taxes.',
    whySbaRequires: 'Outstanding tax liens may affect borrower eligibility and repayment ability. The SBA requires full disclosure so lenders can evaluate financial risk.',
  },
  bankruptcy: {
    title: 'Bankruptcy History',
    whatWeAsk: 'Whether any applicant has filed for or been involved in personal or business bankruptcy, including Chapter 7, 11, or 13.',
    whySbaRequires: 'Past bankruptcy helps the SBA understand the applicant\'s financial history. It does not automatically disqualify an applicant, but it must be reviewed.',
  },
  federalDebt: {
    title: 'Federal Debt Delinquency',
    whatWeAsk: 'Whether any applicant is behind on payments owed to a federal agency, including SBA loans, FHA/VA loans, student loans, or federal tax debt.',
    whySbaRequires: 'Federal law prohibits approving SBA loans when an applicant is delinquent on federal debt.',
  },
};

interface SBAEligibilitySectionProps {
  isBDO?: boolean;
  isReadOnly?: boolean;
}

export default function SBAEligibilitySection({ isBDO = true, isReadOnly }: SBAEligibilitySectionProps) {
  const { data, updateSBAEligibility } = useApplication();
  const { sbaEligibility: rawSbaEligibility } = data;
  const sbaEligibility = rawSbaEligibility || {} as any;
  const [learnMoreOpen, setLearnMoreOpen] = useState(false);
  const [activeLearnMore, setActiveLearnMore] = useState<string | null>(null);
  const [descriptionExpanded, setDescriptionExpanded] = useState(true);

  const questions = [
    { key: 'convicted' as const, text: 'Have any of the applicants ever been convicted of a criminal offense?' },
    { key: 'arrested' as const, text: 'Are any of the applicants currently subject to an indictment, criminal information, arraignment, or other means of formal criminal charge?' },
    { key: 'pendingLawsuits' as const, text: 'Are any of the applicants parties to any pending lawsuits?' },
    { key: 'childSupport' as const, text: 'Are any of the applicants currently delinquent on any child support obligations?' },
    { key: 'taxLiens' as const, text: 'Are any of the applicants subject to any tax liens?' },
    { key: 'bankruptcy' as const, text: 'Have any of the applicants ever been involved in a bankruptcy proceeding?' },
    { key: 'federalDebt' as const, text: 'Are any of the applicants delinquent on any federal debt?' },
    { key: 'nonCitizenOwner' as const, text: 'Do any direct or indirect owners of the applicant business lack U.S. Citizenship or U.S. National status, or maintain their principal residence outside the United States, its territories, or possessions?' },
  ];

  const handleLearnMore = (key: string) => {
    setActiveLearnMore(key);
    setLearnMoreOpen(true);
  };

  const currentContent = activeLearnMore ? learnMoreContent[activeLearnMore] : null;

  return (
    <div>
      <div className="p-4 pb-2">
        <h1 className="text-lg font-semibold text-[color:var(--t-color-primary)] uppercase tracking-wider">Applicant Eligibility</h1>
      </div>

      {!isBDO && (
        <div className="px-4 mb-3">
          <div className="bg-[var(--t-color-page-bg)] border border-[var(--t-color-border)] rounded-lg p-4">
            <div
              className="flex items-start gap-3 cursor-pointer"
              onClick={() => setDescriptionExpanded(!descriptionExpanded)}
            >
              <ChevronDown
                className={`w-5 h-5 text-[color:var(--t-color-text-muted)] flex-shrink-0 mt-0.5 transition-transform duration-200 ${
                  descriptionExpanded ? 'rotate-0' : '-rotate-90'
                }`}
              />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-[color:var(--t-color-text-body)] mb-1">About This Section</h3>
                {descriptionExpanded && (
                  <div className="mt-2 space-y-3">
                    <p className="text-[length:var(--t-font-size-base)] text-[color:var(--t-color-text-secondary)] leading-relaxed">
                      This section asks questions required by the SBA to determine whether each <strong>individual applicant</strong> is eligible for an SBA-guaranteed loan.
                    </p>
                    <p className="text-[length:var(--t-font-size-base)] text-[color:var(--t-color-text-secondary)] leading-relaxed">
                      Please answer each question truthfully. Your responses will <strong>not</strong> automatically disqualify you.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="px-4">
        <div className="bg-[var(--t-color-card-bg)] border border-[var(--t-color-border)] rounded-md overflow-hidden">
          <div className="bg-[var(--t-color-primary-palest)] px-4 py-1.5">
            <h4 className="text-[length:var(--t-font-size-base)] font-semibold text-[color:var(--t-color-primary)]">Eligibility Questions</h4>
          </div>
          <div className="px-4 py-3 space-y-3">
            {questions.map((question, index) => (
              <div key={question.key} className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-start gap-2 mb-2">
                    <p className="text-[length:var(--t-font-size-base)] text-[color:var(--t-color-text-body)] leading-relaxed flex-1">{index + 1}. {question.text}</p>
                    {learnMoreContent[question.key] && (
                      <button
                        type="button"
                        onClick={() => handleLearnMore(question.key)}
                        className="text-[color:var(--t-color-accent)] transition-colors flex-shrink-0 mt-0.5"
                        data-testid={`button-learn-more-${question.key}`}
                      >
                        <HelpCircle className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    <label className="flex items-center gap-2.5 px-3 py-1.5 bg-[var(--t-color-card-bg)] border border-[var(--t-color-border)] rounded-lg cursor-pointer transition-all hover-elevate has-[:checked]:border-[var(--t-color-accent)] has-[:checked]:bg-[var(--t-color-info-bg)]">
                      <input
                        type="radio"
                        name={question.key}
                        value="Yes"
                        checked={sbaEligibility[question.key]?.toLowerCase() === 'yes'}
                        onChange={(e) => updateSBAEligibility({ [question.key]: e.target.value })}
                        className="w-5 h-5 cursor-pointer accent-[var(--t-color-accent)]"
                        disabled={isReadOnly}
                        data-testid={`radio-${question.key}-yes`}
                      />
                      <span className="text-sm text-[color:var(--t-color-text-body)]">Yes</span>
                    </label>
                    <label className="flex items-center gap-2.5 px-3 py-1.5 bg-[var(--t-color-card-bg)] border border-[var(--t-color-border)] rounded-lg cursor-pointer transition-all hover-elevate has-[:checked]:border-[var(--t-color-accent)] has-[:checked]:bg-[var(--t-color-info-bg)]">
                      <input
                        type="radio"
                        name={question.key}
                        value="No"
                        checked={sbaEligibility[question.key]?.toLowerCase() === 'no'}
                        onChange={(e) => updateSBAEligibility({ [question.key]: e.target.value })}
                        className="w-5 h-5 cursor-pointer accent-[var(--t-color-accent)]"
                        disabled={isReadOnly}
                        data-testid={`radio-${question.key}-no`}
                      />
                      <span className="text-sm text-[color:var(--t-color-text-body)]">No</span>
                    </label>
                  </div>
                </div>
              </div>
            ))}

            <div className="pt-2 border-t border-[var(--t-color-border)]">
              <label className="block text-[length:var(--t-font-size-base)] font-medium text-[color:var(--t-color-text-body)] mb-2">
                If you answered yes to any of these questions, please explain here.
              </label>
              <textarea
                value={sbaEligibility.eligibilityExplanation ?? ''}
                onChange={(e) => updateSBAEligibility({ eligibilityExplanation: e.target.value })}
                placeholder="Please provide details..."
                rows={4}
                className="w-full px-3 py-2 border border-[var(--t-color-border)] rounded-lg text-[length:var(--t-font-size-base)] transition-all focus:border-[var(--t-color-primary)] focus:shadow-[0_0_0_3px_rgba(19,60,127,0.1)] resize-none bg-[var(--t-color-card-bg)]"
                disabled={isReadOnly}
                data-testid="textarea-eligibility-explanation"
              />
            </div>
          </div>
        </div>
      </div>

      <LearnMorePanel
        isOpen={learnMoreOpen}
        onClose={() => setLearnMoreOpen(false)}
        title={currentContent?.title || 'Learn More'}
      >
        {currentContent && (
          <div className="space-y-3">
            <div>
              <h3 className="text-base font-semibold text-[color:var(--t-color-text-body)] mb-3">What we&apos;re asking</h3>
              <p className="text-[color:var(--t-color-text-body)] leading-relaxed whitespace-pre-line">{currentContent.whatWeAsk}</p>
            </div>
            <div>
              <h3 className="text-base font-semibold text-[color:var(--t-color-text-body)] mb-3">Why SBA requires this</h3>
              <p className="text-[color:var(--t-color-text-body)] leading-relaxed whitespace-pre-line">{currentContent.whySbaRequires}</p>
            </div>
          </div>
        )}
      </LearnMorePanel>
    </div>
  );
}

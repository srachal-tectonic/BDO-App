'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface CreditScoringMatrix {
  repayment: number;
  management: number;
  equity: number;
  collateral: number;
  credit: number;
  liquidity: number;
}

interface ScoreExplanations {
  repayment: string;
  management: string;
  equity: string;
  collateral: string;
  credit: string;
  liquidity: string;
}

interface CreditMatrixScoringProps {
  scores: CreditScoringMatrix;
  onScoreChange: (category: keyof CreditScoringMatrix, score: number) => void;
  explanations?: ScoreExplanations;
  onExplanationChange?: (category: keyof ScoreExplanations, explanation: string) => void;
  disabled?: boolean;
}

interface CategoryDefinition {
  label: string;
  key: keyof CreditScoringMatrix;
  scores: {
    [key: number]: string;
  };
}

const matrixCategories: CategoryDefinition[] = [
  {
    label: 'Repayment',
    key: 'repayment',
    scores: {
      5: 'Pro forma DSC of 1.40x in most recent year and 1.25x or better for prior 2 years plus stable/positive trends. Stable is considered ± 0.05 change in DSC.',
      4: 'Pro forma DSC of 1.40x or better for most recent year plus 1.25x for 1 prior year plus stable/positive trends. Stable is considered ± 0.05 change in DSC.',
      3: 'Pro forma DSC of 1.25x or better in most recent FYE and interim plus stable/positive trends. Stable is considered ± 0.05 change in DSC. Note: Regardless of DSC, declining revenue or profitability trends in most recent year and/or interim.',
      2: 'Pro forma DSC of 1.15x or better in most recent FYE and interim plus positive trends. Note: Regardless of DSC, declining revenue or profitability trends in all periods. Projection Based or Start Up with Approved Franchise.',
      1: 'Projection based or start-up.',
      0: 'N/A'
    }
  },
  {
    label: 'Management',
    key: 'management',
    scores: {
      5: '3+ years ownership in SBC, OR 3 years as primary responsible employee in SBC, OR 5 years recent experience in near identical business as Principal Manager with P&L and HR responsibility.',
      4: '2+ years ownership in SBC or 3 years experience in near identical business. For startups: experience within last 5 years AND guarantor devotes 100% time to SBC.',
      3: '2 years ownership in any industry, OR 3 years transferable management experience in any industry, OR approved franchise. For startups: experience within last 5 years AND guarantor devotes 100% time to SBC.',
      2: '2 years transferable management experience not specific to this industry or non-approved franchise. For startups: experience within last 3 years AND guarantor devotes 100% time to SBC.',
      1: 'Less than 2 years transferable management experience OR reliant on prior owner/franchisor for training. For startups: experience was over 3 years ago.',
      0: 'Remote management or long distance management with no prior experience of remote management.'
    }
  },
  {
    label: 'Credit',
    key: 'credit',
    scores: {
      5: 'N/A',
      4: 'FICO Score greater than 750.',
      3: 'FICO Score 700-749. Note: Regardless of higher FICO, BK between 3-5 years OR expected continuing income of $5,500-$6,000 for every $1,000 of CC debt.',
      2: 'FICO Score 650-699. Note: Regardless of higher FICO, expected continuing income of $5,000-$5,499 for every $1,000 of CC debt.',
      1: 'FICO Score less than 650. Note: Regardless of higher FICO, expected continuing income of $4,500-$4,999 for every $1,000 of CC debt.',
      0: 'BK in the last 3 years. Note: Regardless of higher FICO, expected continuing income of less than $4,500 for every $1,000 of CC debt.'
    }
  },
  {
    label: 'Equity',
    key: 'equity',
    scores: {
      5: '25% cash equity from personal sources. Expansions: pro forma tangible D/W of 4:1 or less.',
      4: '25% cash equity from any source OR 20% from personal sources. Expansions: pro forma tangible D/W of 5:1 or less.',
      3: '20% cash equity from any source OR 15% from personal sources. Expansions: pro forma tangible D/W of 6:1 or less.',
      2: '10% cash equity from any source. Expansions: pro forma tangible D/W of 8:1 or less.',
      1: 'Less than 10% injection AND/OR 50% or more equity from Seller note on full standby.',
      0: 'Any other allowable SBA SOP structure that does not require injection.'
    }
  },
  {
    label: 'Collateral',
    key: 'collateral',
    scores: {
      5: 'Secured 120% of loan on discounted basis with any collateral OR 100% secured with 1st lien on RE. 504 1st lien No construction.',
      4: 'Secured 100% of loan on discounted basis with any collateral OR 75% with 1st lien on RE. 504 1st Lien Construction.',
      3: 'Secured 75% of loan on discounted basis with any collateral OR 50% with 1st lien on RE.',
      2: 'Secured 50% of loan on discounted basis with any collateral OR 25% with 1st lien on RE.',
      1: 'Less than 50% secured with any collateral OR less than 25% 1st lien on RE.',
      0: 'No CRE included in collateral OR only junior liens on residential.'
    }
  },
  {
    label: 'Working Capital/Liquidity',
    key: 'liquidity',
    scores: {
      5: 'N/A',
      4: 'N/A',
      3: 'No or minimal working capital requirement OR Borrower has 1.5X working capital from own liquid resources. Minimal is lesser of 5% of loan amount or $50K. None is included in loan.',
      2: 'Borrower has sufficient documented working capital to inject from own resources (WC as calculated by U/W). In loan is OK as long as borrower has 1x or greater residual liquidity.',
      1: 'All, or substantially all of W/C is included in loan or companion loan and borrower has little or no residual liquidity.',
      0: 'Working capital included in loan proceeds exceeds 50% of borrower cash injection.'
    }
  }
];

const defaultExplanations: ScoreExplanations = {
  repayment: '',
  management: '',
  equity: '',
  collateral: '',
  credit: '',
  liquidity: '',
};

export default function CreditMatrixScoring({
  scores,
  onScoreChange,
  explanations = defaultExplanations,
  onExplanationChange,
  disabled = false
}: CreditMatrixScoringProps) {
  const [expandedCategory, setExpandedCategory] = useState<keyof CreditScoringMatrix | null>(null);

  const toggleExpand = (category: keyof CreditScoringMatrix) => {
    setExpandedCategory(expandedCategory === category ? null : category);
  };

  const totalScore = scores.repayment + scores.management + scores.credit + scores.equity + scores.collateral + scores.liquidity;

  return (
    <div>
      {/* Total Score at the top */}
      <div className="bg-white border border-[#d1d5db] rounded-lg px-6 py-4 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[#6b7280] text-sm font-medium">Total Score:</span>
            <span className="text-2xl font-bold text-[#1a1a1a]" data-testid="text-total-risk-score">{totalScore}</span>
            <span className="text-[#9ca3af] text-lg">/27</span>
          </div>
          <div className="flex items-center gap-4 text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[#6b7280]">Repayment:</span>
              <span className="font-medium text-[#1a1a1a]">{scores.repayment}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#6b7280]">Management:</span>
              <span className="font-medium text-[#1a1a1a]">{scores.management}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#6b7280]">Credit:</span>
              <span className="font-medium text-[#1a1a1a]">{scores.credit}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#6b7280]">Equity:</span>
              <span className="font-medium text-[#1a1a1a]">{scores.equity}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#6b7280]">Collateral:</span>
              <span className="font-medium text-[#1a1a1a]">{scores.collateral}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#6b7280]">Liquidity:</span>
              <span className="font-medium text-[#1a1a1a]">{scores.liquidity}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Cards */}
      <div className="space-y-3">
        {matrixCategories.map((category) => {
          const currentScore = scores[category.key];
          const isExpanded = expandedCategory === category.key;
          const selectedCriteria = category.scores[currentScore];
          const isNA = selectedCriteria === 'N/A';

          return (
            <div
              key={category.key}
              className="bg-white border border-[#d1d5db] rounded-lg overflow-hidden"
              data-testid={`category-${category.key}`}
            >
              <div className="p-4">
                {/* Header row with label and score buttons */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
                  <h3 className="text-base font-semibold text-[#1a1a1a]">{category.label}</h3>

                  {/* Score Buttons */}
                  <div className="flex items-center gap-2">
                    {[0, 1, 2, 3, 4, 5].map((score) => {
                      const isSelected = currentScore === score;
                      const criteriaText = category.scores[score];
                      const isScoreNA = criteriaText === 'N/A';
                      const isButtonDisabled = disabled || isScoreNA;

                      return (
                        <button
                          key={score}
                          type="button"
                          onClick={() => !isButtonDisabled && onScoreChange(category.key, score)}
                          disabled={isButtonDisabled}
                          className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                            isScoreNA
                              ? 'bg-[#f3f4f6] text-[#d1d5db] cursor-not-allowed'
                              : isSelected
                              ? 'bg-[#2563eb] text-white shadow-md scale-105'
                              : disabled
                              ? 'bg-[#f3f4f6] text-[#9ca3af] cursor-not-allowed'
                              : 'bg-white border border-[#d1d5db] text-[#374151] hover:border-[#2563eb] hover:bg-[#eff6ff]'
                          }`}
                          title={isScoreNA ? 'Not Applicable' : criteriaText}
                          data-testid={`score-button-${category.key}-${score}`}
                        >
                          {isScoreNA ? '—' : score}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Expand/Collapse button */}
                <button
                  type="button"
                  onClick={() => toggleExpand(category.key)}
                  className="flex items-center gap-1 text-xs text-[#2563eb] hover:text-[#1d4ed8] font-medium mb-3"
                  data-testid={`expand-${category.key}`}
                >
                  {isExpanded ? 'Hide all criteria' : 'View all criteria'}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                {/* Expanded criteria list */}
                {isExpanded && (
                  <div className="space-y-2 mb-3 border-t border-[#e5e7eb] pt-3">
                    {[0, 1, 2, 3, 4, 5]
                      .filter((score) => category.scores[score] !== 'N/A')
                      .map((score) => {
                        const criteriaText = category.scores[score];
                        const isSelected = currentScore === score;

                        return (
                          <div
                            key={score}
                            className={`p-3 rounded-lg border ${
                              isSelected
                                ? 'bg-[#eff6ff] border-[#2563eb]'
                                : 'bg-white border-[#e5e7eb]'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <span
                                className={`w-6 h-6 rounded flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                                  isSelected
                                    ? 'bg-[#2563eb] text-white'
                                    : 'bg-[#f3f4f6] text-[#374151]'
                                }`}
                              >
                                {score}
                              </span>
                              <p className="text-sm text-[#374151]">{criteriaText}</p>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}

                {/* Explanation textarea */}
                <div>
                  <label className="block text-xs font-medium text-[#6b7280] mb-1.5">
                    Explanation
                  </label>
                  <textarea
                    value={explanations[category.key] || ''}
                    onChange={(e) => onExplanationChange?.(category.key, e.target.value)}
                    placeholder={`Enter explanation for ${category.label.toLowerCase()} score...`}
                    disabled={disabled}
                    className={`w-full px-3 py-2 border border-[#d1d5db] rounded-lg text-sm resize-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] outline-none ${
                      disabled ? 'bg-[#f9fafb] cursor-not-allowed' : 'bg-white'
                    }`}
                    rows={2}
                    data-testid={`explanation-${category.key}`}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

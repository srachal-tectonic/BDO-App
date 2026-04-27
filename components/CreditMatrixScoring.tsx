'use client';

import { useState } from 'react';
import { ChevronDown, Info } from 'lucide-react';

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
      <div className="bg-white border border-[var(--t-color-border)] rounded-lg px-6 py-4 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[color:var(--t-color-text-secondary)] text-sm font-medium">Total Score:</span>
            <span className="text-2xl font-bold text-[color:var(--t-color-text-body)]" data-testid="text-total-risk-score">{totalScore}</span>
            <span className="text-[color:var(--t-color-text-muted)] text-lg">/27</span>
          </div>
          <div className="flex items-center gap-4 text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[color:var(--t-color-text-secondary)]">Repayment:</span>
              <span className="font-medium text-[color:var(--t-color-text-body)]">{scores.repayment}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[color:var(--t-color-text-secondary)]">Management:</span>
              <span className="font-medium text-[color:var(--t-color-text-body)]">{scores.management}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[color:var(--t-color-text-secondary)]">Credit:</span>
              <span className="font-medium text-[color:var(--t-color-text-body)]">{scores.credit}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[color:var(--t-color-text-secondary)]">Equity:</span>
              <span className="font-medium text-[color:var(--t-color-text-body)]">{scores.equity}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[color:var(--t-color-text-secondary)]">Collateral:</span>
              <span className="font-medium text-[color:var(--t-color-text-body)]">{scores.collateral}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[color:var(--t-color-text-secondary)]">Liquidity:</span>
              <span className="font-medium text-[color:var(--t-color-text-body)]">{scores.liquidity}</span>
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
              className="bg-white border border-[var(--t-color-border)] rounded-lg overflow-hidden"
              data-testid={`category-${category.key}`}
            >
              <div className="p-4">
                {/* Header row with label and score buttons */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
                  <h3 className="text-base font-semibold text-[color:var(--t-color-text-body)]">{category.label}</h3>

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
                              ? 'bg-[var(--t-color-input-bg)] text-[color:var(--t-color-border)] cursor-not-allowed'
                              : isSelected
                              ? 'bg-[var(--t-color-accent)] text-white shadow-md scale-105'
                              : disabled
                              ? 'bg-[var(--t-color-input-bg)] text-[color:var(--t-color-text-muted)] cursor-not-allowed'
                              : 'bg-white border border-[var(--t-color-border)] text-[color:var(--t-color-text-body)] hover:border-[var(--t-color-accent)] hover:bg-[#eff6ff]'
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
                  className="flex items-center gap-1 text-xs text-[color:var(--t-color-accent)] hover:text-[color:var(--t-color-primary)] font-medium mb-3"
                  data-testid={`expand-${category.key}`}
                >
                  {isExpanded ? 'Hide all criteria' : 'View all criteria'}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                {/* Expanded criteria list */}
                {isExpanded && (
                  <div className="space-y-2 mb-3 border-t border-[var(--t-color-border)] pt-3">
                    {[0, 1, 2, 3, 4, 5]
                      .filter((score) => category.scores[score] !== 'N/A')
                      .map((score) => {
                        const criteriaText = category.scores[score];
                        const isSelected = currentScore === score;

                        return (
                          <button
                            key={score}
                            type="button"
                            onClick={() => !disabled && onScoreChange(category.key, score)}
                            disabled={disabled}
                            aria-pressed={isSelected}
                            className={`w-full text-left p-3 rounded-lg border transition-colors ${
                              disabled
                                ? 'bg-[#f9fafb] border-[var(--t-color-border)] opacity-60 cursor-not-allowed'
                                : isSelected
                                ? 'bg-[#eff6ff] border-[var(--t-color-accent)]'
                                : 'bg-white border-[var(--t-color-border)] hover:border-[var(--t-color-accent)] hover:bg-[#eff6ff] cursor-pointer'
                            }`}
                            data-testid={`criteria-${category.key}-${score}`}
                          >
                            <div className="flex items-start gap-3">
                              <span
                                className={`w-6 h-6 rounded flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                                  isSelected
                                    ? 'bg-[var(--t-color-accent)] text-white'
                                    : 'bg-[var(--t-color-input-bg)] text-[color:var(--t-color-text-body)]'
                                }`}
                              >
                                {score}
                              </span>
                              <p className="text-sm text-[color:var(--t-color-text-body)]">{criteriaText}</p>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                )}

                {/* Per-category help text: shown when score > 1, regardless of expansion */}
                {category.key === 'repayment' && currentScore > 1 && (
                  <div
                    className="flex items-start gap-2 rounded-md bg-[#f0f5ff] border border-[#d4e2f4] px-3 py-2 mb-3"
                    data-testid={`help-text-${category.key}`}
                  >
                    <Info className="w-4 h-4 text-[#5b8ec9] flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-[#4a6fa5] leading-relaxed">
                      Please provide explanation of any trends or addbacks.
                    </p>
                  </div>
                )}
                {category.key === 'management' && (
                  <div
                    className="flex items-start gap-2 rounded-md bg-[#f0f5ff] border border-[#d4e2f4] px-3 py-2 mb-3"
                    data-testid={`help-text-${category.key}`}
                  >
                    <Info className="w-4 h-4 text-[#5b8ec9] flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-[#4a6fa5] leading-relaxed">
                      Please explain your score. If the Borrower has no direct industry experience, please explain their transferrable skills and the transition plan with the Seller.
                    </p>
                  </div>
                )}
                {category.key === 'credit' && currentScore <= 2 && (
                  <div
                    className="flex items-start gap-2 rounded-md bg-[#f0f5ff] border border-[#d4e2f4] px-3 py-2 mb-3"
                    data-testid={`help-text-${category.key}`}
                  >
                    <Info className="w-4 h-4 text-[#5b8ec9] flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-[#4a6fa5] leading-relaxed">
                      Please explain any derogatory accounts or bankruptcies.
                    </p>
                  </div>
                )}
                {category.key === 'equity' && (
                  <div
                    className="flex items-start gap-2 rounded-md bg-[#f0f5ff] border border-[#d4e2f4] px-3 py-2 mb-3"
                    data-testid={`help-text-${category.key}`}
                  >
                    <Info className="w-4 h-4 text-[#5b8ec9] flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-[#4a6fa5] leading-relaxed">
                      Please provide details on the source of equity.
                    </p>
                  </div>
                )}
                {category.key === 'equity' && currentScore <= 1 && (
                  <div
                    className="flex items-start gap-2 rounded-md bg-[#f0f5ff] border border-[#d4e2f4] px-3 py-2 mb-3"
                    data-testid={`help-text-${category.key}-low-injection`}
                  >
                    <Info className="w-4 h-4 text-[#5b8ec9] flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-[#4a6fa5] leading-relaxed">
                      Please explain why the planned equity injection is less than 10%?
                    </p>
                  </div>
                )}
                {category.key === 'collateral' && (
                  <div
                    className="flex items-start gap-2 rounded-md bg-[#f0f5ff] border border-[#d4e2f4] px-3 py-2 mb-3"
                    data-testid={`help-text-${category.key}`}
                  >
                    <Info className="w-4 h-4 text-[#5b8ec9] flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-[#4a6fa5] leading-relaxed">
                      Please explain if there&apos;s additional collateral available that is not included into this transaction.
                    </p>
                  </div>
                )}
                {category.key === 'collateral' && (
                  <div
                    className="flex items-start gap-2 rounded-md bg-[#f0f5ff] border border-[#d4e2f4] px-3 py-2 mb-3"
                    data-testid={`help-text-${category.key}-primary-residence`}
                  >
                    <Info className="w-4 h-4 text-[#5b8ec9] flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-[#4a6fa5] leading-relaxed">
                      Is collateral taken on the primary residence?
                    </p>
                  </div>
                )}
                {category.key === 'liquidity' && (
                  <div
                    className="flex items-start gap-2 rounded-md bg-[#f0f5ff] border border-[#d4e2f4] px-3 py-2 mb-3"
                    data-testid={`help-text-${category.key}`}
                  >
                    <Info className="w-4 h-4 text-[#5b8ec9] flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-[#4a6fa5] leading-relaxed">
                      How much working capital is planned to be left in the business?
                    </p>
                  </div>
                )}
                {category.key === 'liquidity' && (
                  <div
                    className="flex items-start gap-2 rounded-md bg-[#f0f5ff] border border-[#d4e2f4] px-3 py-2 mb-3"
                    data-testid={`help-text-${category.key}-post-close`}
                  >
                    <Info className="w-4 h-4 text-[#5b8ec9] flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-[#4a6fa5] leading-relaxed">
                      Please explain expected personal post-close liquidity of the Borrower.
                    </p>
                  </div>
                )}

                {/* Explanation textarea */}
                <div>
                  <label className="block text-xs font-medium text-[color:var(--t-color-text-secondary)] mb-1.5">
                    Explanation
                  </label>
                  <textarea
                    value={explanations[category.key] || ''}
                    onChange={(e) => onExplanationChange?.(category.key, e.target.value)}
                    placeholder={`Enter explanation for ${category.label.toLowerCase()} score...`}
                    disabled={disabled}
                    className={`w-full px-3 py-2 border border-[var(--t-color-border)] rounded-lg text-sm resize-none focus:border-[var(--t-color-accent)] focus:ring-1 focus:ring-[var(--t-color-accent)] outline-none ${
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

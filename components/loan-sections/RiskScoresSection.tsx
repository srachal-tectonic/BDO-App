'use client';

import { useState } from 'react';
import { ChevronDown, Info } from 'lucide-react';
import { useApplication } from '@/lib/applicationStore';

interface ScoreCriteria {
  score: number;
  description: string;
  disabled?: boolean;
  showDash?: boolean;
}

interface RiskCategory {
  key: string;
  label: string;
  criteria: ScoreCriteria[];
}

const riskCategories: RiskCategory[] = [
  {
    key: 'repayment',
    label: 'Repayment',
    criteria: [
      { score: 0, description: 'Not Applicable', disabled: true, showDash: true },
      { score: 1, description: 'Projection based or start-up.' },
      { score: 2, description: 'Pro forma DSC of 1.15x or better in most recent FYE and interim plus positive trends. Note: Regardless of DSC, declining revenue or profitability trends in all periods. Projection Based or Start Up with Approved Franchise.' },
      { score: 3, description: 'Pro forma DSC of 1.25x or better in most recent FYE and interim plus stable/positive trends. Stable is considered ± 0.05 change in DSC. Note: Regardless of DSC, declining revenue or profitability trends in most recent year and/or interim.' },
      { score: 4, description: 'Historical DSC of 1.25x or better in most recent FYE and interim plus stable/positive trends. Stable is considered ± 0.05 change in DSC.' },
      { score: 5, description: 'Historical DSC of 1.5x or better in most recent FYE and interim plus positive trends.' },
    ],
  },
  {
    key: 'management',
    label: 'Management',
    criteria: [
      { score: 0, description: 'Remote management or long distance management with no prior experience of remote management.' },
      { score: 1, description: 'Less than 2 years transferable management experience OR reliant on prior owner/franchisor for training. For startups: experience was over 3 years ago.' },
      { score: 2, description: '2 years transferable management experience not specific to this industry or non-approved franchise. For startups: experience within last 3 years AND guarantor devotes 100% time to SBC.' },
      { score: 3, description: '2 years ownership in any industry, OR 3 years transferable management experience in any industry, OR approved franchise. For startups: experience within last 5 years AND guarantor devotes 100% time to SBC.' },
      { score: 4, description: '2+ years ownership in SBC or 3 years experience in near identical business. For startups: experience within last 5 years AND guarantor devotes 100% time to SBC.' },
      { score: 5, description: '3+ years ownership in SBC, OR 3 years as primary responsible employee in SBC, OR 5 years recent experience in near identical business as Principal Manager with P&L and HR responsibility.' },
    ],
  },
  {
    key: 'credit',
    label: 'Credit',
    criteria: [
      { score: 0, description: 'BK in the last 3 years. Note: Regardless of higher FICO, expected continuing income of less than $4,500 for every $1,000 of CC debt.' },
      { score: 1, description: 'FICO Score less than 650. Note: Regardless of higher FICO, expected continuing income of $4,500-$4,999 for every $1,000 of CC debt.' },
      { score: 2, description: 'FICO Score 650-699. Note: Regardless of higher FICO, expected continuing income of $5,000-$5,499 for every $1,000 of CC debt.' },
      { score: 3, description: 'FICO Score 700-749. Note: Regardless of higher FICO, BK between 3-5 years OR expected continuing income of $5,500-$6,000 for every $1,000 of CC debt.' },
      { score: 4, description: 'FICO Score greater than 750.' },
      { score: 5, description: 'Not Applicable', disabled: true, showDash: true },
    ],
  },
  {
    key: 'equity',
    label: 'Equity',
    criteria: [
      { score: 0, description: 'Any other allowable SBA SOP structure that does not require injection.' },
      { score: 1, description: 'Less than 10% injection AND/OR 50% or more equity from Seller note on full standby.' },
      { score: 2, description: '10% cash equity from any source. Expansions: pro forma tangible D/W of 8:1 or less.' },
      { score: 3, description: '20% cash equity from any source OR 15% from personal sources. Expansions: pro forma tangible D/W of 6:1 or less.' },
      { score: 4, description: '25% cash equity from any source OR 20% from personal sources. Expansions: pro forma tangible D/W of 5:1 or less.' },
      { score: 5, description: '25% cash equity from personal sources. Expansions: pro forma tangible D/W of 4:1 or less.' },
    ],
  },
  {
    key: 'collateral',
    label: 'Collateral',
    criteria: [
      { score: 0, description: 'No CRE included in collateral OR only junior liens on residential.' },
      { score: 1, description: 'Less than 50% secured with any collateral OR less than 25% 1st lien on RE.' },
      { score: 2, description: 'Secured 50% of loan on discounted basis with any collateral OR 25% with 1st lien on RE.' },
      { score: 3, description: 'Secured 75% of loan on discounted basis with any collateral OR 50% with 1st lien on RE.' },
      { score: 4, description: 'Secured 100% of loan on discounted basis with any collateral OR 75% with 1st lien on RE. 504 1st Lien Construction.' },
      { score: 5, description: 'Secured 120% of loan on discounted basis with any collateral OR 100% secured with 1st lien on RE. 504 1st lien No construction.' },
    ],
  },
  {
    key: 'liquidity',
    label: 'Working Capital/Liquidity',
    criteria: [
      { score: 0, description: 'Working capital included in loan proceeds exceeds 50% of borrower cash injection.' },
      { score: 1, description: 'All, or substantially all of W/C is included in loan or companion loan and borrower has little or no residual liquidity.' },
      { score: 2, description: 'Borrower has sufficient documented working capital to inject from own resources (WC as calculated by U/W). In loan is OK as long as borrower has 1x or greater residual liquidity.' },
      { score: 3, description: 'No or minimal working capital requirement OR Borrower has 1.5X working capital from own liquid resources. Minimal is lesser of 5% of loan amount or $50K. None is included in loan.' },
      { score: 4, description: 'Not Applicable', disabled: true, showDash: true },
      { score: 5, description: 'Not Applicable', disabled: true, showDash: true },
    ],
  },
];

export default function RiskScoresSection() {
  const { data, updateProjectOverview } = useApplication();
  const { projectOverview } = data;

  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  // Get scores from projectOverview (using risk* fields)
  const scores: Record<string, number> = {
    repayment: projectOverview?.riskRepayment ?? 0,
    management: projectOverview?.riskManagement ?? 0,
    credit: projectOverview?.riskCredit ?? 0,
    equity: projectOverview?.riskEquity ?? 0,
    collateral: projectOverview?.riskCollateral ?? 0,
    liquidity: projectOverview?.riskLiquidity ?? 0,
  };

  const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
  const maxScore = 27; // 6 categories, but some have max of 4 or 5

  const handleScoreChange = (categoryKey: string, score: number) => {
    const fieldMap: Record<string, string> = {
      repayment: 'riskRepayment',
      management: 'riskManagement',
      credit: 'riskCredit',
      equity: 'riskEquity',
      collateral: 'riskCollateral',
      liquidity: 'riskLiquidity',
    };
    updateProjectOverview({ [fieldMap[categoryKey]]: score });
  };

  const toggleExpanded = (key: string) => {
    setExpandedCategories((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const getSelectedCriteriaDescription = (category: RiskCategory, score: number): string | null => {
    const criteria = category.criteria.find((c) => c.score === score);
    return criteria && !criteria.disabled ? criteria.description : null;
  };

  return (
    <div>
      <div className="p-4 sm:p-6 pb-3 sm:pb-4">
        <h1 className="text-[28px] font-bold text-[color:var(--t-color-text-body)]">Risk Scores</h1>
      </div>

      <div className="px-4 sm:px-6 pb-6">
        {/* Total Score Summary */}
        <div className="bg-white border border-[var(--t-color-border)] rounded-lg px-6 py-4 mb-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[color:var(--t-color-text-secondary)] text-sm font-medium">Total Score:</span>
              <span
                className="text-2xl font-bold text-[color:var(--t-color-text-body)]"
                data-testid="text-total-risk-score"
              >
                {totalScore}
              </span>
              <span className="text-[color:var(--t-color-text-muted)] text-lg">/{maxScore}</span>
            </div>
            <div className="flex items-center gap-4 text-sm flex-wrap">
              {riskCategories.map((category) => (
                <div key={category.key} className="flex items-center gap-2">
                  <span className="text-[color:var(--t-color-text-secondary)]">{category.label.split('/')[0]}:</span>
                  <span className="font-medium text-[color:var(--t-color-text-body)]">{scores[category.key]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Risk Categories */}
        <div className="bg-white rounded-lg border border-[var(--t-color-border)] divide-y divide-[#e5e7eb]">
          {riskCategories.map((category) => {
            const selectedScore = scores[category.key];
            const criteriaDescription = getSelectedCriteriaDescription(category, selectedScore);
            const isExpanded = expandedCategories.includes(category.key);

            return (
              <div key={category.key} className="transition-colors bg-white">
                <div className="px-4 py-3">
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-[color:var(--t-color-text-body)]">{category.label}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {category.criteria.map((criteria) => {
                        const isSelected = selectedScore === criteria.score;
                        const showDash = criteria.showDash === true;

                        return (
                          <button
                            key={criteria.score}
                            onClick={() => !criteria.disabled && handleScoreChange(category.key, criteria.score)}
                            disabled={criteria.disabled}
                            className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                              criteria.disabled
                                ? isSelected
                                  ? 'bg-[var(--t-color-accent)] text-white shadow-md scale-105'
                                  : 'bg-[var(--t-color-input-bg)] text-[color:var(--t-color-border)] cursor-not-allowed'
                                : isSelected
                                ? 'bg-[var(--t-color-accent)] text-white shadow-md scale-105'
                                : 'bg-white border border-[var(--t-color-border)] text-[color:var(--t-color-text-body)] hover:border-[var(--t-color-accent)] hover:bg-[#eff6ff] hover:scale-105'
                            }`}
                            title={criteria.disabled ? 'Not Applicable' : `Score ${criteria.score}`}
                            data-testid={`button-score-${category.key}-${criteria.score}`}
                          >
                            {showDash ? '—' : criteria.score}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Selected criteria description */}
                  {criteriaDescription && (
                    <div className="mt-3 p-3 bg-white/80 rounded-lg border border-[var(--t-color-border)]">
                      <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-[color:var(--t-color-accent)] mt-0.5 flex-shrink-0" />
                        <p className="text-[color:var(--t-color-text-body)] text-sm leading-relaxed">{criteriaDescription}</p>
                      </div>
                    </div>
                  )}

                  {/* View all criteria button */}
                  <button
                    onClick={() => toggleExpanded(category.key)}
                    className="mt-2 text-xs text-[color:var(--t-color-accent)] hover:text-[color:var(--t-color-primary)] font-medium flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid={`button-expand-${category.key}`}
                  >
                    {isExpanded ? 'Hide criteria' : 'View all criteria'}
                    <ChevronDown
                      className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* Expanded criteria list */}
                  {isExpanded && (
                    <div className="mt-3 space-y-2">
                      {category.criteria.map((criteria) => (
                        <div
                          key={criteria.score}
                          className={`p-3 rounded-lg border ${
                            criteria.disabled
                              ? 'bg-[#f9fafb] border-[var(--t-color-border)] opacity-50'
                              : selectedScore === criteria.score
                              ? 'bg-[#eff6ff] border-[var(--t-color-accent)]'
                              : 'bg-white border-[var(--t-color-border)]'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={`w-6 h-6 rounded flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                                criteria.disabled
                                  ? 'bg-[var(--t-color-input-bg)] text-[color:var(--t-color-text-muted)]'
                                  : selectedScore === criteria.score
                                  ? 'bg-[var(--t-color-accent)] text-white'
                                  : 'bg-[var(--t-color-input-bg)] text-[color:var(--t-color-text-body)]'
                              }`}
                            >
                              {criteria.disabled ? '—' : criteria.score}
                            </span>
                            <p className="text-sm text-[color:var(--t-color-text-body)]">{criteria.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

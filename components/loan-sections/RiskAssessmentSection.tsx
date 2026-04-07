'use client';

import CollapsibleSection from '@/components/loan-sections/CollapsibleSection';
import { useApplication } from '@/lib/applicationStore';
import { db, doc, getDoc } from '@/lib/db';
import type { ProjectTypeRule, RiskLevel } from '@/lib/schema';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface RiskAssessmentSectionProps {
  isReadOnly?: boolean;
}

// Classification state for Q1-Q5
interface ClassificationState {
  businessStage: 'startup' | 'existing' | 'acquiring' | '';
  ownershipChange: 'none' | 'partner-buyout' | 'third-party' | '';
  creComponent: 'none' | 'purchase' | 'improvements' | 'construction' | '';
  debtRefinance: 'none' | 'primary' | 'included' | '';
  riskLevelOverride: RiskLevel | '';
}

interface ComputedResult {
  projectType: string;
  riskLevel: RiskLevel;
  matchedRuleId: string;
}

const riskLevelOptions: RiskLevel[] = ['low', 'low-medium', 'medium', 'medium-high', 'high', 'very-high'];

const RISK_LEVEL_CONFIG: Record<RiskLevel, {
  label: string;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  position: number;
}> = {
  'low': {
    label: 'Low',
    color: '#00a82d',
    bgClass: 'bg-green-100',
    textClass: 'text-green-800',
    borderClass: 'border-green-300',
    position: 1,
  },
  'low-medium': {
    label: 'Low-Medium',
    color: '#6ba539',
    bgClass: 'bg-lime-100',
    textClass: 'text-lime-800',
    borderClass: 'border-lime-300',
    position: 2,
  },
  'medium': {
    label: 'Medium',
    color: '#fcd116',
    bgClass: 'bg-yellow-100',
    textClass: 'text-yellow-800',
    borderClass: 'border-yellow-300',
    position: 3,
  },
  'medium-high': {
    label: 'Medium-High',
    color: '#e57200',
    bgClass: 'bg-orange-100',
    textClass: 'text-orange-800',
    borderClass: 'border-orange-300',
    position: 4,
  },
  'high': {
    label: 'High',
    color: '#f4364c',
    bgClass: 'bg-red-100',
    textClass: 'text-red-800',
    borderClass: 'border-red-300',
    position: 5,
  },
  'very-high': {
    label: 'Very High',
    color: '#770125',
    bgClass: 'bg-red-200',
    textClass: 'text-red-900',
    borderClass: 'border-red-400',
    position: 6,
  },
};

// Map Q1-Q5 classification to legacy boolean format for rule matching
function classificationToBooleans(c: ClassificationState) {
  return {
    isStartup: c.businessStage === 'startup' ? true : c.businessStage ? false : undefined,
    hasExistingCashflow: c.businessStage === 'existing' || c.businessStage === 'acquiring' ? true : c.businessStage === 'startup' ? false : undefined,
    hasTransitionRisk: c.ownershipChange === 'partner-buyout' || c.ownershipChange === 'third-party' ? true : c.ownershipChange === 'none' ? false : undefined,
    includesRealEstate: c.creComponent === 'purchase' || c.creComponent === 'improvements' || c.creComponent === 'construction' ? true : c.creComponent === 'none' ? false : undefined,
    creScope: c.creComponent === 'purchase' ? 'purchase' as const : c.creComponent === 'improvements' ? 'improvement' as const : undefined,
    isPartnerBuyout: c.ownershipChange === 'partner-buyout' ? true : c.ownershipChange ? false : undefined,
    involvesConstruction: c.creComponent === 'construction' ? true : c.creComponent && c.creComponent !== 'none' ? false : c.creComponent === 'none' ? false : undefined,
    includesDebtRefinance: c.debtRefinance === 'primary' || c.debtRefinance === 'included' ? true : c.debtRefinance === 'none' ? false : undefined,
    debtRefinancePrimary: c.debtRefinance === 'primary' ? true : c.debtRefinance ? false : undefined,
  };
}

// Convert legacy boolean format for rule matching
function stringToBoolean(value: boolean | undefined): boolean | undefined {
  return value;
}

// Evaluate rules against boolean classification
function evaluateRules(
  rules: ProjectTypeRule[],
  booleans: ReturnType<typeof classificationToBooleans>
): ComputedResult | null {
  const sortedRules = [...rules].sort((a, b) => (a.priority ?? ((a as unknown as {order?: number}).order) ?? 0) - (b.priority ?? ((b as unknown as {order?: number}).order) ?? 0));

  const regularRules = sortedRules.filter(r => !r.isFallback);
  const fallbackRules = sortedRules.filter(r => r.isFallback);

  for (const rule of regularRules) {
    if (matchesRule(rule, booleans)) {
      return { projectType: rule.name, riskLevel: rule.riskLevel, matchedRuleId: rule.id };
    }
  }

  for (const rule of fallbackRules) {
    if (matchesRule(rule, booleans)) {
      return { projectType: rule.name, riskLevel: rule.riskLevel, matchedRuleId: rule.id };
    }
  }

  return null;
}

function matchesRule(rule: ProjectTypeRule, b: ReturnType<typeof classificationToBooleans>): boolean {
  if (rule.isStartup !== 'any' && b.isStartup !== undefined) {
    if (rule.isStartup !== b.isStartup) return false;
  }
  if (rule.hasExistingCashflow !== 'any' && b.hasExistingCashflow !== undefined) {
    if (rule.hasExistingCashflow !== b.hasExistingCashflow) return false;
  }
  if (rule.hasTransitionRisk !== 'any' && b.hasTransitionRisk !== undefined) {
    if (rule.hasTransitionRisk !== b.hasTransitionRisk) return false;
  }
  if (rule.includesRealEstate !== 'any' && b.includesRealEstate !== undefined) {
    if (rule.includesRealEstate !== b.includesRealEstate) return false;
  }
  if (rule.creScope !== 'any' && b.includesRealEstate && b.creScope) {
    if (rule.creScope !== b.creScope) return false;
  }
  if (rule.isPartnerBuyout !== 'any' && b.isPartnerBuyout !== undefined) {
    if (rule.isPartnerBuyout !== b.isPartnerBuyout) return false;
  }
  if (rule.involvesConstruction !== 'any' && b.involvesConstruction !== undefined) {
    if (rule.involvesConstruction !== b.involvesConstruction) return false;
  }
  if (rule.includesDebtRefinance !== undefined && rule.includesDebtRefinance !== 'any' && b.includesDebtRefinance !== undefined) {
    if (rule.includesDebtRefinance !== b.includesDebtRefinance) return false;
  }
  if (rule.debtRefinancePrimary !== undefined && rule.debtRefinancePrimary !== 'any' && b.debtRefinancePrimary !== undefined) {
    if (rule.debtRefinancePrimary !== b.debtRefinancePrimary) return false;
  }
  return true;
}

export default function RiskAssessmentSection({ isReadOnly = false }: RiskAssessmentSectionProps) {
  const { data, updateProjectOverview } = useApplication();
  const { projectOverview } = data;

  const [rules, setRules] = useState<ProjectTypeRule[]>([]);
  const [isLoadingRules, setIsLoadingRules] = useState(true);
  const [computedResult, setComputedResult] = useState<ComputedResult | null>(null);

  // Build classification from stored data
  const classification = useMemo((): ClassificationState => {
    const stored = projectOverview?.classification;
    if (stored) {
      return {
        businessStage: stored.businessStage || '',
        ownershipChange: stored.ownershipChange || '',
        creComponent: stored.creComponent || '',
        debtRefinance: stored.debtRefinance || '',
        riskLevelOverride: stored.riskLevelOverride || '',
      };
    }
    // Migrate from legacy boolean format if available
    const legacy = projectOverview?.riskAssessment;
    if (legacy) {
      let businessStage: ClassificationState['businessStage'] = '';
      if (legacy.isStartup === true) businessStage = 'startup';
      else if (legacy.hasExistingCashflow === true) businessStage = 'existing';

      let ownershipChange: ClassificationState['ownershipChange'] = '';
      if (legacy.isPartnerBuyout === true) ownershipChange = 'partner-buyout';
      else if (legacy.hasTransitionRisk === true) ownershipChange = 'third-party';
      else if (legacy.hasTransitionRisk === false && legacy.isPartnerBuyout === false) ownershipChange = 'none';

      let creComponent: ClassificationState['creComponent'] = '';
      if (legacy.includesRealEstate === false) creComponent = 'none';
      else if (legacy.involvesConstruction === true) creComponent = 'construction';
      else if (legacy.creScope === 'purchase') creComponent = 'purchase';
      else if (legacy.creScope === 'improvement') creComponent = 'improvements';

      let debtRefinance: ClassificationState['debtRefinance'] = '';
      if (legacy.includesDebtRefinance === false) debtRefinance = 'none';
      else if (legacy.debtRefinancePrimary === true) debtRefinance = 'primary';
      else if (legacy.includesDebtRefinance === true) debtRefinance = 'included';

      return { businessStage, ownershipChange, creComponent, debtRefinance, riskLevelOverride: '' };
    }
    return { businessStage: '', ownershipChange: '', creComponent: '', debtRefinance: '', riskLevelOverride: '' };
  }, [
    projectOverview?.classification?.businessStage,
    projectOverview?.classification?.ownershipChange,
    projectOverview?.classification?.creComponent,
    projectOverview?.classification?.debtRefinance,
    projectOverview?.classification?.riskLevelOverride,
    projectOverview?.riskAssessment?.isStartup,
    projectOverview?.riskAssessment?.hasExistingCashflow,
    projectOverview?.riskAssessment?.hasTransitionRisk,
    projectOverview?.riskAssessment?.includesRealEstate,
    projectOverview?.riskAssessment?.creScope,
    projectOverview?.riskAssessment?.isPartnerBuyout,
    projectOverview?.riskAssessment?.involvesConstruction,
    projectOverview?.riskAssessment?.includesDebtRefinance,
    projectOverview?.riskAssessment?.debtRefinancePrimary,
  ]);

  // Compute boolean format for rule matching
  const booleans = useMemo(() => classificationToBooleans(classification), [classification]);

  // Load rules from admin settings
  useEffect(() => {
    const loadRules = async () => {
      try {
        setIsLoadingRules(true);
        const docRef = doc(db, 'adminSettings', 'config');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setRules(data.projectTypeRules || []);
        }
      } catch (error) {
        console.error('Error loading risk assessment rules:', error);
      } finally {
        setIsLoadingRules(false);
      }
    };
    loadRules();
  }, []);

  // Evaluate rules when classification or rules change
  useEffect(() => {
    if (rules.length > 0) {
      const result = evaluateRules(rules, booleans);
      setComputedResult(result);

      if (result) {
        updateProjectOverview({
          computedProjectType: result.projectType,
          computedRiskLevel: classification.riskLevelOverride || result.riskLevel,
          matchedRuleId: result.matchedRuleId,
          riskAssessment: {
            isStartup: booleans.isStartup,
            hasExistingCashflow: booleans.hasExistingCashflow,
            hasTransitionRisk: booleans.hasTransitionRisk,
            includesRealEstate: booleans.includesRealEstate,
            creScope: booleans.creScope,
            isPartnerBuyout: booleans.isPartnerBuyout,
            involvesConstruction: booleans.involvesConstruction,
            includesDebtRefinance: booleans.includesDebtRefinance,
            debtRefinancePrimary: booleans.debtRefinancePrimary,
          },
        });
      } else {
        updateProjectOverview({
          computedProjectType: undefined,
          computedRiskLevel: undefined,
          matchedRuleId: undefined,
        });
      }
    }
  }, [rules, booleans, classification.riskLevelOverride, updateProjectOverview]);

  const updateClassification = (updates: Partial<ClassificationState>) => {
    const newClassification = { ...classification, ...updates };
    updateProjectOverview({
      classification: {
        businessStage: newClassification.businessStage || undefined,
        ownershipChange: newClassification.ownershipChange || undefined,
        creComponent: newClassification.creComponent || undefined,
        debtRefinance: newClassification.debtRefinance || undefined,
        riskLevelOverride: newClassification.riskLevelOverride || undefined,
      },
    });
  };

  const resolvedProjectType = computedResult?.projectType;
  const autoRiskLevel = computedResult?.riskLevel;
  const resolvedRiskLevel = classification.riskLevelOverride || autoRiskLevel;

  if (isLoadingRules) {
    return (
      <div className="px-4 sm:px-6 mb-4">
        <CollapsibleSection title="Risk Assessment">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CollapsibleSection>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 mb-4">
      <CollapsibleSection title="Risk Assessment">
        <div className="space-y-4">
          {/* Q1: Business Stage */}
          <div className="p-3 border border-[#e5e7eb] rounded-lg bg-[#f9fafb]">
            <label className="block text-sm font-medium text-[#374151] mb-2">
              Q1 — Which best describes the operating business being financed?
            </label>
            <div className="flex flex-col gap-2">
              {[
                { value: 'startup', label: 'Start-up / New venture (no historical operating financials)' },
                { value: 'existing', label: 'Existing operating business (historical financials/cashflow available)' },
                { value: 'acquiring', label: 'Acquiring an existing operating business (target has historical financials/cashflow)' },
              ].map((option) => (
                <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="businessStage"
                    value={option.value}
                    checked={classification.businessStage === option.value}
                    onChange={() => updateClassification({ businessStage: option.value as ClassificationState['businessStage'] })}
                    disabled={isReadOnly}
                    className="w-4 h-4 text-[#2563eb] border-[#d1d5db] focus:ring-[#2563eb]"
                    data-testid={`radio-business-stage-${option.value}`}
                  />
                  <span className="text-[15px] text-[#374151]">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Q2: Ownership Change */}
          <div className="p-3 border border-[#e5e7eb] rounded-lg bg-[#f9fafb]">
            <label className="block text-sm font-medium text-[#374151] mb-2">
              Q2 — Is there an ownership change in the operating business?
            </label>
            <div className="flex flex-col gap-2">
              {[
                { value: 'none', label: 'No (same ownership continues)' },
                { value: 'partner-buyout', label: 'Yes — Partner buyout / internal transfer (same business, ownership rearranged)' },
                { value: 'third-party', label: 'Yes — Third-party acquisition (new owner acquiring the business)' },
              ].map((option) => (
                <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="ownershipChange"
                    value={option.value}
                    checked={classification.ownershipChange === option.value}
                    onChange={() => updateClassification({ ownershipChange: option.value as ClassificationState['ownershipChange'] })}
                    disabled={isReadOnly}
                    className="w-4 h-4 text-[#2563eb] border-[#d1d5db] focus:ring-[#2563eb]"
                    data-testid={`radio-ownership-change-${option.value}`}
                  />
                  <span className="text-[15px] text-[#374151]">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Q3: Commercial Real Estate */}
          <div className="p-3 border border-[#e5e7eb] rounded-lg bg-[#f9fafb]">
            <label className="block text-sm font-medium text-[#374151] mb-2">
              Q3 — Is owner-occupied commercial real estate part of the project?
            </label>
            <div className="flex flex-col gap-2">
              {[
                { value: 'none', label: 'No' },
                { value: 'purchase', label: 'Yes — Purchase (buy an existing property)' },
                { value: 'improvements', label: 'Yes — Improvements / renovation / expansion to existing property' },
                { value: 'construction', label: 'Yes — Construction (ground-up or major build)' },
              ].map((option) => (
                <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="creComponent"
                    value={option.value}
                    checked={classification.creComponent === option.value}
                    onChange={() => updateClassification({ creComponent: option.value as ClassificationState['creComponent'] })}
                    disabled={isReadOnly}
                    className="w-4 h-4 text-[#2563eb] border-[#d1d5db] focus:ring-[#2563eb]"
                    data-testid={`radio-cre-component-${option.value}`}
                  />
                  <span className="text-[15px] text-[#374151]">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Q4: Debt Refinance */}
          <div className="p-3 border border-[#e5e7eb] rounded-lg bg-[#f9fafb]">
            <label className="block text-sm font-medium text-[#374151] mb-2">
              Q4 — Will the project refinance existing debt?
            </label>
            <div className="flex flex-col gap-2">
              {[
                { value: 'none', label: 'No' },
                { value: 'primary', label: 'Yes — Refinance only (primary purpose is refinancing)' },
                { value: 'included', label: 'Yes — Refinance is included (partial use of proceeds)' },
              ].map((option) => (
                <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="debtRefinance"
                    value={option.value}
                    checked={classification.debtRefinance === option.value}
                    onChange={() => updateClassification({ debtRefinance: option.value as ClassificationState['debtRefinance'] })}
                    disabled={isReadOnly}
                    className="w-4 h-4 text-[#2563eb] border-[#d1d5db] focus:ring-[#2563eb]"
                    data-testid={`radio-debt-refinance-${option.value}`}
                  />
                  <span className="text-[15px] text-[#374151]">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Q5: Use of Proceeds */}
          <div className="p-3 border border-[#e5e7eb] rounded-lg bg-[#f9fafb]">
            <label className="block text-sm font-medium text-[#374151] mb-2">
              Q5 — Use of proceeds (select all that apply)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {(() => {
                const autoChecked = new Set<string>();
                if (classification.ownershipChange === 'third-party') autoChecked.add('Business Acquisition / Change of Ownership');
                if (classification.ownershipChange === 'partner-buyout') autoChecked.add('Partner Buyout');
                if (classification.ownershipChange === 'partner-buyout' || classification.ownershipChange === 'third-party') autoChecked.add('Transition Risk');
                if (classification.creComponent === 'purchase') autoChecked.add('Commercial Real Estate: Purchase');
                if (classification.creComponent === 'improvements') autoChecked.add('Commercial Real Estate: Improvements');
                if (classification.creComponent === 'construction') autoChecked.add('Commercial Real Estate: Construction');
                if (classification.debtRefinance === 'primary' || classification.debtRefinance === 'included') autoChecked.add('Debt Refinance');

                return [
                  'Business Acquisition / Change of Ownership',
                  'Commercial Real Estate: Construction',
                  'Commercial Real Estate: Improvements',
                  'Commercial Real Estate: Purchase',
                  'Debt Refinance',
                  'Equipment Acquisition / Installation',
                  'Expansion',
                  'Franchise',
                  'Inventory Acquisition',
                  'Partner Buyout',
                  'Transition Risk',
                  'Working Capital',
                ].map((option) => {
                  const purposes = Array.isArray(projectOverview?.primaryProjectPurpose)
                    ? projectOverview.primaryProjectPurpose
                    : [];
                  const isAutoChecked = autoChecked.has(option);
                  const isChecked = purposes.includes(option) || isAutoChecked;

                  const handleToggle = () => {
                    if (isAutoChecked) return;
                    if (purposes.includes(option)) {
                      updateProjectOverview({
                        primaryProjectPurpose: purposes.filter((p: string) => p !== option),
                      });
                    } else {
                      updateProjectOverview({
                        primaryProjectPurpose: [...purposes, option],
                      });
                    }
                  };

                  return (
                    <label
                      key={option}
                      className={`flex items-center gap-2 ${isAutoChecked ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      <input
                        type="checkbox"
                        value={option}
                        checked={isChecked}
                        onChange={handleToggle}
                        className="w-5 h-5 text-[#2563eb] border-[#d1d5db] rounded focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-0 flex-shrink-0 disabled:cursor-not-allowed"
                        disabled={isReadOnly || isAutoChecked}
                        data-testid={`checkbox-purpose-${option.toLowerCase().replace(/[\s\/\:]+/g, '-')}`}
                      />
                      <span className="text-[15px] text-[#1a1a1a]">
                        {option}
                        {isAutoChecked && <span className="text-xs text-[#6b7280] ml-1">(auto)</span>}
                      </span>
                    </label>
                  );
                });
              })()}
            </div>
          </div>

          {/* Risk Result */}
          <div className="mt-3 p-3 border-2 border-dashed border-[#d1d5db] rounded-lg bg-white">
            {resolvedProjectType ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <CheckCircle className="w-5 h-5 text-[#10b981]" />
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-[#6b7280]">Project:</span>
                    <span className="text-[15px] font-semibold text-[#1a1a1a]" data-testid="text-resolved-project-type">
                      {resolvedProjectType}
                    </span>
                    {(() => {
                      const riskConfig = resolvedRiskLevel ? RISK_LEVEL_CONFIG[resolvedRiskLevel] : null;
                      return riskConfig ? (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${riskConfig.bgClass} ${riskConfig.textClass} ${riskConfig.borderClass}`} data-testid="risk-badge">
                          {riskConfig.label} Risk
                        </span>
                      ) : null;
                    })()}
                  </div>
                </div>

                <div className="mt-2" data-testid="risk-heat-map">
                  <div className="text-xs text-[#6b7280] mb-1.5">Risk Matrix Position:</div>
                  <div className="relative" data-testid="risk-gradient-bar">
                    <div
                      className="h-5 rounded-full overflow-hidden"
                      style={{
                        background: 'linear-gradient(to right, #00a82d 0%, #6ba539 15%, #8c9d01 30%, #fcd116 50%, #e57200 68%, #f4364c 83%, #770125 100%)'
                      }}
                    />
                    {(() => {
                      const activeConfig = resolvedRiskLevel ? RISK_LEVEL_CONFIG[resolvedRiskLevel] : null;
                      const positionPercent = activeConfig ? ((activeConfig.position - 1) / 5) * 100 : 0;
                      return (
                        <div
                          className="absolute top-0 transition-all duration-500 ease-out"
                          style={{ left: `${positionPercent}%`, transform: 'translateX(-50%)' }}
                          data-testid="risk-indicator"
                        >
                          <div
                            className="w-5 h-5 rounded-full border-[3px] border-white shadow-lg"
                            style={{ backgroundColor: activeConfig?.color || '#fcd116' }}
                          />
                          <div
                            className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold"
                            style={{ color: activeConfig?.color || '#1a1a1a' }}
                          >
                            {activeConfig?.label}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  <div className="flex justify-between mt-6 text-[10px] text-[#9ca3af]">
                    <span>Low</span>
                    <span>Very High</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-[#f59e0b]" />
                <span className="text-sm text-[#6b7280]">
                  {rules.length === 0
                    ? 'No classification rules have been configured. Contact an administrator to set up risk assessment rules.'
                    : 'Answer all questions above to determine the project type'}
                </span>
              </div>
            )}
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}

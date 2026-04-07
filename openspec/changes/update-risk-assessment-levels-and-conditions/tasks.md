## 1. Schema Changes (`lib/schema.ts`)
- [x] 1.1 Update `RiskLevel` type to `'low' | 'low-medium' | 'medium' | 'medium-high' | 'high' | 'very-high'`
- [x] 1.2 Add `includesDebtRefinance: TriStateCondition` and `debtRefinancePrimary: TriStateCondition` to `ProjectTypeRule`
- [x] 1.3 Rename `order: number` to `priority: number` in `ProjectTypeRule`
- [x] 1.4 Add `includesDebtRefinance?: boolean` and `debtRefinancePrimary?: boolean` to `RiskAssessmentAnswers`
- [x] 1.5 Update `ProjectOverview.computedRiskLevel` type to use `RiskLevel` type reference
- [x] 1.6 Add `includesDebtRefinance?: boolean` and `debtRefinancePrimary?: boolean` to `ProjectOverview.riskAssessment`

## 2. Admin Page — Risk Level UI (`app/bdo/admin/page.tsx`)
- [x] 2.1 Update the Risk Level radio group in the form modal from 3 options to 6 with correct labels and colors
- [x] 2.2 Update `emptyProjectTypeRuleForm` defaults: add new fields, rename `order` → `priority`
- [x] 2.3 Add two new dropdown fields ("Includes Debt Refinance?" and "Debt Refinance Primary?") to the Classification Conditions grid
- [x] 2.4 Rename the "Order" field label to "Priority" and add helper text
- [x] 2.5 Update the rule list badge color logic to handle all 6 risk levels
- [x] 2.6 Update the rule list badge label text to show all 6 level names
- [x] 2.7 Update rule sort logic from `a.order - b.order` to `a.priority - b.priority` (with backward-compat fallback)
- [x] 2.8 Update rule list display from `#{index + 1}` to `P{priority}` format
- [x] 2.9 Add condition badges for the two new debt refinance conditions in the rule list
- [x] 2.10 Update the `openProjectTypeRuleModal` function for renamed/new fields with backward-compat defaults
- [x] 2.11 Update description text to mention "priority" instead of "order"

## 3. BDO Risk Assessment Section (`components/loan-sections/RiskAssessmentSection.tsx`)
- [x] 3.1 Add two new yes/no radio question cards for "Includes Debt Refinance?" and "Debt Refinance Primary?"
- [x] 3.2 Add `includesDebtRefinance` and `debtRefinancePrimary` condition checks to `matchesRule()` function
- [x] 3.3 Update the risk result badge color/label logic for 6 risk levels
- [x] 3.4 Update the heat map gradient from 3 segments to 6 segments with correct colors
- [x] 3.5 Update the heat map indicator position calculation for 6 levels (centered in each segment)
- [x] 3.6 Update the heat map labels to show all 6 level names
- [x] 3.7 Update `ClassificationAnswers` type and `defaultClassification` to include the two new fields
- [x] 3.8 Wire new classification fields to `updateClassification` and Firestore save
- [x] 3.9 Update `allQuestionsAnswered` check to require the two new fields
- [x] 3.10 Update `useMemo` dependencies for classification to include new fields
- [x] 3.11 Update rule sort to use `priority` with backward-compat fallback to `order`

## 4. Data Migration Considerations
- [x] 4.1 Backward compatibility: all `priority` reads fall back to `(rule as unknown as {order?: number}).order` for existing Firestore rules; new condition fields default to `'any'` when undefined

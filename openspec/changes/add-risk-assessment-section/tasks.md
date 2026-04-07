## 1. Data Model & Schema
- [x] 1.1 Add `ProjectTypeRule` interface to `lib/schema.ts`
- [x] 1.2 Extend `AdminSettings` interface to include `projectTypeRules: ProjectTypeRule[]`
- [x] 1.3 Add risk assessment fields to `ProjectOverview` interface (riskAssessment, computedProjectType, computedRiskLevel, matchedRuleId)

## 2. Admin Settings - Risk Assessment Tab
- [x] 2.1 Add "Risk Assessment" tab trigger to TabsList in `app/bdo/admin/page.tsx`
- [x] 2.2 Add state for `projectTypeRules` and `editingProjectTypeRule`
- [x] 2.3 Create empty rule form template `emptyProjectTypeRuleForm`
- [x] 2.4 Add `projectTypeRules` to loadSettings() and saveSettings() functions
- [x] 2.5 Create TabsContent for "project-type-rules" with rule list display
- [x] 2.6 Add condition badge helper function `getConditionBadge()`
- [x] 2.7 Implement `openProjectTypeRuleModal()` function
- [x] 2.8 Implement `handleProjectTypeRuleSubmit()` function
- [x] 2.9 Implement `deleteProjectTypeRule()` function
- [x] 2.10 Create modal dialog for add/edit project type rule with all fields:
  - Rule name input
  - Description textarea
  - Risk level radio group (low/medium/high)
  - Fallback toggle switch
  - Condition selects for each classification question (tristate: yes/no/any)

## 3. Loan Application - Risk Assessment Section
- [x] 3.1 Create new `RiskAssessmentSection.tsx` component in `components/loan-sections/`
- [x] 3.2 Add classification questions as yes/no dropdowns
- [x] 3.3 Display computed project type and risk level badge
- [x] 3.4 Import and render RiskAssessmentSection in `ProjectOverviewSection.tsx` above Project Summary
- [x] 3.5 Add risk assessment fields to application store schema
- [x] 3.6 Connect classification answers to application store

## 4. Rule Evaluation Logic
- [x] 4.1 Create `evaluateRules()` utility function in RiskAssessmentSection
- [x] 4.2 Implement `matchesRule()` function for rule matching based on classification answers
- [x] 4.3 Return first matching rule or fallback rule
- [x] 4.4 Auto-update computed project type when answers change

## 5. Testing & Validation
- [ ] 5.1 Test admin CRUD operations for project type rules
- [ ] 5.2 Test rule evaluation with various classification combinations
- [ ] 5.3 Verify fallback rule behavior when no rules match
- [ ] 5.4 Test persistence of rules to Firestore

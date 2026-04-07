# Tasks: Simplify Questionnaire Rules with Main Category Dropdown

## 1. Update TypeScript Interfaces
- [x] 1.1 Remove the `RuleCondition` interface
- [x] 1.2 Update `QuestionnaireRule` interface:
  - Remove `conditions: RuleCondition[]`
  - Add `mainCategory: 'Business Overview' | 'Project Purpose' | 'Industry'`

## 2. Update Default/Empty Form State
- [x] 2.1 Update `emptyRuleForm` to use `mainCategory` instead of `conditions`

## 3. Update Rule Modal UI
- [x] 3.1 Remove the "Conditions" section with:
  - "Add Condition" button
  - Condition rows (field/operator/value dropdowns)
  - Remove condition buttons
- [x] 3.2 Add "Main Category" dropdown with options:
  - Business Overview
  - Project Purpose
  - Industry
- [x] 3.3 Update label from "Conditions *" to "Main Category *"

## 4. Update Handler Functions
- [x] 4.1 Remove `addCondition` function
- [x] 4.2 Remove `updateCondition` function
- [x] 4.3 Remove `removeCondition` function
- [x] 4.4 Update `handleRuleSubmit` validation:
  - Remove conditions length check
  - Add mainCategory validation

## 5. Update Rules Table Display
- [x] 5.1 Change "Conditions" column header to "Category"
- [x] 5.2 Display `mainCategory` value instead of conditions count

## 6. Update openRuleModal Function
- [x] 6.1 Update to load `mainCategory` instead of `conditions` when editing

## 7. Validation
- [x] 7.1 Run TypeScript compilation to verify no errors (pre-existing errors in pdf-exports and pdf-tools unrelated to this change)
- [x] 7.2 Test creating a new rule with mainCategory
- [x] 7.3 Test editing an existing rule
- [x] 7.4 Verify table displays category correctly

## Notes
- This is a breaking change for existing rules stored in Firestore
- Existing rules will need their `conditions` field migrated to `mainCategory`
- The questionnaire page (`app/bdo/borrower-portal/[id]/questionnaire/page.tsx`) may need updates to use `mainCategory` for filtering

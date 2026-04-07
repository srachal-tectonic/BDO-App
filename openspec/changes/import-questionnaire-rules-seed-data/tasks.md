## 1. Extend QuestionnaireRule interface
- [x] 1.1 Add `purposeKey?: string`, `naicsCodes?: string[]`, `questionOrder?: number` to `QuestionnaireRule` in `app/bdo/admin/page.tsx`
- [x] 1.2 Add the same fields to `QuestionnaireRule` in `app/bdo/borrower-portal/[id]/questionnaire/page.tsx`
- [x] 1.3 Update `emptyRuleForm` defaults to include `purposeKey: ''`, `naicsCodes: []`, `questionOrder: 0`

## 2. Create seed data conversion utility
- [x] 2.1 Create `lib/questionnaireRulesSeed.ts` with `getSeedRules()` — converts export JSON (snake_case → camelCase), sorts by category/group/questionOrder, assigns sequential order numbers
- [x] 2.2 Import JSON via `import seedDataRaw from '@/questionnaire_rules_export.json'` (resolveJsonModule already enabled in tsconfig)
- [x] 2.3 Create `mergeWithExisting()` — deduplicates by `name` + `mainCategory`, appends new rules with sequential order numbers
- [x] 2.4 Create `getImportCount()` — returns count of rules that would be imported (not already existing)

## 3. Admin UI — Import button
- [x] 3.1 Add "Import Seed Rules" button (with Download icon) next to "Add New Rule" in the Questionnaire Rules tab header
- [x] 3.2 Implement `handleImportSeedRules()` — checks count, shows confirmation dialog, merges, marks unsaved
- [x] 3.3 Shows alert if all rules already imported (no-op), or success alert with count after import

## 4. Admin UI — Display new fields
- [x] 4.1 Add "Details" column to the Questionnaire Rules table showing `purposeKey` (indigo badge) and `naicsCodes` (teal badge)
- [x] 4.2 Add `purposeKey` dropdown to Add/Edit Rule modal (shown when mainCategory is "Project Purpose") with all 14 purpose keys
- [x] 4.3 Add `naicsCodes` text input to Add/Edit Rule modal (shown when mainCategory is "Industry") with comma-separated prefixes
- [x] 4.4 Add `questionOrder` number input to Add/Edit Rule modal (alongside Order field in 2-col grid)
- [x] 4.5 Update `openRuleModal` to load new fields when editing existing rules

## 5. Verification
- [x] 5.1 TypeScript compilation passes with zero errors
- [x] 5.2 All 144 seed rules are unique (no name+category duplicates in export)
- [x] 5.3 JSON import confirmed working via resolveJsonModule + utf-8-sig safe reading

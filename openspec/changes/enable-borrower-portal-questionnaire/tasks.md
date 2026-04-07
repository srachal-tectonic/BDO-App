# Tasks: Enable Borrower Portal Questionnaire Route

## 1. Implementation

- [x] 1.1 Remove the redirect code (lines 1-8) from `app/bdo/borrower-portal/[id]/questionnaire/page.tsx`
- [x] 1.2 Uncomment the original questionnaire implementation (lines 10-851)
- [x] 1.3 Remove the comment block markers (`/* ORIGINAL CODE...` and closing `*/`)

## 2. Verification

- [ ] 2.1 Navigate to a project's loan application Step 9 (Business Questionnaire)
- [ ] 2.2 Click "Open Business Questionnaire" button
- [ ] 2.3 Verify the questionnaire page loads without redirecting
- [ ] 2.4 Test questionnaire functionality (text editing, AI generation, PDF export)

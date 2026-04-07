# Tasks: Fix Duplicate Header in Borrower Portal Step 1

## 1. Remove Duplicate Header from BusinessApplicantSection
- [x] 1.1 Remove the header div containing "Business Applicant" title from `BusinessApplicantSection.tsx` (lines 61-73)
- [x] 1.2 Keep the "About This Section" expandable description
- [x] 1.3 Ensure the component still renders correctly without its own header

## 2. Verify Fix
- [ ] 2.1 Test Borrower Portal step 1 shows only one "Business Applicant" title
- [ ] 2.2 Test "Total Ownership Identified" appears only once
- [ ] 2.3 Verify the fix doesn't affect BDO Tools page which also uses BusinessApplicantSection

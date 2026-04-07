# Tasks: Revert Individual Applicants Section

## 1. Restore Previous Component
- [x] 1.1 Replace `IndividualApplicantsSection.tsx` with the version from before commit 7c2ad8d
- [x] 1.2 Verify imports for AddressInput and PasswordToggle components
- [x] 1.3 Verify import for LearnMorePanel and IndirectOwnershipExplainer

## 2. Verify Component Structure
- [x] 2.1 Confirm expandable accordion cards are restored
- [x] 2.2 Confirm all inline form fields are present:
  - Basic Info (firstName, lastName, email, phone)
  - Identification (dateOfBirth, ssn with PasswordToggle)
  - Address (using AddressInput component)
  - Project Role dropdown
  - Ownership Percentage
  - Business Role/Involvement dropdowns
  - Industry Experience fields
  - Financial Information (netWorth, pcLiquidity, requiredIncomeFromBusiness)
- [x] 2.3 Confirm "Add Owner/Guarantor" button at bottom
- [x] 2.4 Confirm remove button on expanded cards

## 3. Verify Functionality
- [x] 3.1 Test accordion expand/collapse
- [x] 3.2 Test auto-expand first applicant on load
- [x] 3.3 Test adding new applicant (auto-expands)
- [x] 3.4 Test removing applicant
- [x] 3.5 Test inline field editing and data persistence

## 4. Update Project Page (if needed)
- [x] 4.1 Remove `projectId` prop from IndividualApplicantsSection usage in `app/bdo/projects/[id]/page.tsx`

## 5. TypeScript Verification
- [x] 5.1 Run TypeScript compilation to verify no type errors

## Notes
- The Owner Detail Page (`app/bdo/projects/[id]/individual/[applicantId]/page.tsx`) remains unchanged
- The `gender` field remains in the IndividualApplicant schema but won't be displayed in this component
- The previous version uses `useEffect` to auto-expand the first applicant

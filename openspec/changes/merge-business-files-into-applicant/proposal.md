# Change: Merge Business Files into Business Applicant Step

## Why
The current Loan Application has 11 steps, with "Business Files" as a separate step (step 4) after "Business Applicant" (step 3). Consolidating these into a single step improves the user experience by keeping related business information together and reducing the total number of steps from 11 to 10.

## What Changes
- Merge "Business Files" (step 4) into "Business Applicant" (step 3)
- Display the Business Files section below the Business Applicant fields within step 3
- Renumber all subsequent steps (steps 5-11 become steps 4-10)
- Update the `LOAN_APPLICATION_STEPS` array to have 10 items instead of 11
- Update the `renderSectionContent` switch statement to handle the merged step
- Update navigation logic to work with 10 steps instead of 11

## Impact
- Affected specs: `loan-application-steps` (new capability spec)
- Affected code:
  - `app/bdo/projects/[id]/page.tsx` - Update steps array, switch statement, and navigation logic

## Step Mapping (Before → After)

| Before (11 steps) | After (10 steps) |
|-------------------|------------------|
| 1. Project Overview | 1. Project Overview |
| 2. Funding Structure | 2. Funding Structure |
| 3. Business Applicant | 3. Business Applicant & Files |
| 4. Business Files | *(merged into step 3)* |
| 5. Individual Applicants | 4. Individual Applicants |
| 6. Individual Files | 5. Individual Files |
| 7. Applicant SBA Eligibility | 6. Applicant SBA Eligibility |
| 8. Project Information | 7. Project Information |
| 9. Business Questionnaire | 8. Business Questionnaire |
| 10. Risk Scores | 9. Risk Scores |
| 11. All Data | 10. All Data |

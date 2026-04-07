# Change: Reorganize Borrower Portal Steps

## Why
The Borrower Portal steps need to be reorganized to better match the logical flow of data collection and to separate concerns into more focused steps. The current 7-step flow combines file uploads with data entry in a way that may confuse borrowers.

## What Changes
- Reorganize from 7 steps to 8 steps
- Reorder steps to group related information together
- Combine file uploads into a single consolidated step
- Add dedicated steps for Personal Financial Statements and Other Owned Businesses (using existing fields)
- **No new fields added or removed** - purely a reorganization of the UI flow

### Current Steps (7):
1. Business Applicant - `BusinessApplicantSection`
2. Business Files - `BusinessFilesSection`
3. Individual Applicants - `IndividualApplicantsSection`
4. Individual Files - `IndividualFilesSection`
5. Applicant SBA Eligibility - `SBAEligibilitySection`
6. Project Information - `SellerInfoSection`
7. Business Questionnaire - `BusinessQuestionnaireSection`

### New Steps (8):
1. **Business Applicant** - Keep existing `BusinessApplicantSection`
2. **Individual Applicants** - Keep existing `IndividualApplicantsSection`
3. **Personal Financial Statements** - New component showing financial fields (netWorth, pcLiquidity, reqDraw, equityInjectionAmount) for each individual applicant. These fields exist in IndividualApplicant schema and are currently edited on the owner detail page.
4. **Other Owned Businesses** - New component for capturing affiliate/other business ownership information. This will need to extract or reference the affiliates data structure from the spreads configuration.
5. **SBA Eligibility** - Keep existing `SBAEligibilitySection`
6. **Project Information** - Keep existing `SellerInfoSection`
7. **File Uploads** - New consolidated component combining `BusinessFilesSection` and `IndividualFilesSection`
8. **Business Questionnaire** - Keep existing `BusinessQuestionnaireSection`

## Impact
- **Primary file**: `app/bdo/borrower-portal/[id]/page.tsx`
- **New components needed**:
  - `PersonalFinancialStatementsSection.tsx` - Display/edit financial fields for all individual applicants
  - `OtherOwnedBusinessesSection.tsx` - Capture affiliate business information
  - `CombinedFilesSection.tsx` - Combine business and individual file uploads
- **Existing components reused**: BusinessApplicantSection, IndividualApplicantsSection, SBAEligibilitySection, SellerInfoSection, BusinessQuestionnaireSection

## Open Questions
1. For "Personal Financial Statements" - should this show a summary table of all applicants' financials, or should it link to edit each applicant individually?
2. For "Other Owned Businesses" - what specific data should be collected? The affiliates structure in spreadsTemplateConfig.ts has financial statement fields, but is this the intended data to collect from borrowers?

# Change: Add Ownership Table to Business Applicant Section

## Why
The Business Applicant section needs an "Ownership of Applicant" table that allows users to define individual owners directly within this section. This table determines which individuals appear in Step 4 (Individual Applicants) and ensures total ownership equals 100%. The current implementation lacks this ownership management capability and several UX enhancements present in the Replit version.

## What Changes
- Add "Ownership of Applicant" table at the bottom of BusinessApplicantSection
- Display total ownership percentage in the section header (when entity is not to be formed)
- Add HelpCircle "Learn More" buttons to field labels with detailed contextual help
- Remove "Same as Subject Business" checkbox (only keep "Entity to be Formed")
- Accept `onLearnMore` and `projectId` props to enable help modal and navigation
- Update entity type dropdown options with more complete labels
- Clicking empty table rows adds new individual applicant and navigates to detail page

## Impact
- Affected specs: business-applicant-ui (new capability)
- Affected code:
  - `components/loan-sections/BusinessApplicantSection.tsx` - main implementation
  - `lib/applicationStore.ts` - may need `addIndividualApplicant` to return the new ID
- Dependencies:
  - `useLocation` from wouter for navigation
  - `HelpCircle` icon from lucide-react
  - Individual applicant data from application store

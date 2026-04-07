# Proposal: Revert Individual Applicants Section

## Summary
Revert the Individual Applicants section (Step 4) to the previous expandable accordion-style design with inline form editing, removing the recent redesign that introduced the ownership summary table and compact owner cards.

## Motivation
The recent redesign changed the user interaction model significantly:
- Moved detailed editing to a separate page
- Replaced inline form fields with a summary table and compact cards
- Added borrower portal link functionality

The user prefers the previous design where all applicant information could be viewed and edited inline within expandable accordion cards.

## What Gets Reverted

### Removed (Current Design)
- "Ownership of Applicant" summary table at the top
- Compact owner cards with completion status indicators
- Borrower portal link functionality (send link, copy link buttons)
- Navigation to separate detail page
- `projectId` prop
- `useRouter` hook and navigation logic
- `useToast` hook for copy/send feedback
- `getCompletionStatus` function
- `gender` field in the table (note: schema field remains)

### Restored (Previous Design)
- Expandable accordion cards for each applicant
- Inline form fields for all personal information:
  - Basic Info: First Name, Last Name, Email, Phone
  - Identification: Date of Birth, SSN (with PasswordToggle)
  - Address section (with AddressInput component)
  - Project Role dropdown
  - Ownership Percentage
  - Business Role/Involvement dropdowns
  - Industry Experience fields
  - Financial Information (Net Worth, PC Liquidity, Required Income)
- Auto-expand first applicant on load
- "Add Owner/Guarantor" button at bottom
- Remove button on each expanded card

## Scope

### In Scope
- Replace `IndividualApplicantsSection.tsx` with the previous version
- Ensure AddressInput and PasswordToggle components are properly imported

### Out of Scope
- Changes to the Owner Detail Page (`app/bdo/projects/[id]/individual/[applicantId]/page.tsx`)
- Schema changes (the `gender` field will remain in the schema)
- Changes to other components

## Technical Approach
Restore the component from git history (commit before 7c2ad8d) which contains the expandable accordion design with all inline form fields.

## Acceptance Criteria
1. Each applicant displays as an expandable accordion card
2. Clicking the card header expands/collapses the form fields
3. All personal information fields are editable inline
4. Address section uses AddressInput component
5. SSN field uses PasswordToggle component
6. First applicant auto-expands on page load
7. "Add Owner/Guarantor" button adds new applicant and expands it
8. Remove button appears on expanded cards (when more than one applicant)

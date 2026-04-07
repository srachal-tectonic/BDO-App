# Tasks: Add Ownership Table to Business Applicant Section

## 1. Update Component Props and Imports
- [x] 1.1 Add `onLearnMore` and `projectId` props to BusinessApplicantSection
- [x] 1.2 Import `useRouter` from next/navigation for navigation
- [x] 1.3 Import `HelpCircle` icon from lucide-react
- [x] 1.4 Import `IndividualApplicant` type from schema

## 2. Update Application Store
- [x] 2.1 Modify `addIndividualApplicant` to return the new applicant's ID
- [x] 2.2 Add `individualApplicants` and `updateIndividualApplicant` to component's store destructuring

## 3. Add Header Ownership Display
- [x] 3.1 Calculate total ownership percentage from individual applicants
- [x] 3.2 Add ownership percentage display to header (conditionally shown when entity not to be formed)

## 4. Add Help Buttons to Field Labels
- [x] 4.1 Add HelpCircle button to Legal Business Name label with help content
- [x] 4.2 Add HelpCircle button to DBA/Trade Name label with help content
- [x] 4.3 Add HelpCircle button to Entity Type label with help content
- [x] 4.4 Add HelpCircle button to Business TIN label with help content
- [x] 4.5 Add HelpCircle button to Year Established label with help content
- [x] 4.6 Add HelpCircle button to Website label with help content
- [x] 4.7 Add HelpCircle button to Business Address label with help content
- [x] 4.8 Add HelpCircle button to Project Address label with help content

## 5. Update Form Fields
- [x] 5.1 Remove "Same as Subject Business" checkbox
- [x] 5.2 Update entity type dropdown options with fuller descriptions (e.g., "Limited Liability Company (LLC)")
- [x] 5.3 Adjust margin classes from `mb-7` to `mb-4` for tighter spacing

## 6. Add Ownership Table
- [x] 6.1 Create table section with header "Ownership of Applicant"
- [x] 6.2 Add informational note about 100% ownership requirement
- [x] 6.3 Create table header row with columns: Name, Ownership %, Project Role, Business Role
- [x] 6.4 Render rows for existing individual applicants with editable fields
- [x] 6.5 Add empty placeholder rows (up to 5 total) that navigate to add new applicant on click
- [x] 6.6 Add totals row showing combined ownership percentage

## 7. Implement Navigation
- [x] 7.1 Create `handleAddAndNavigate` function to add applicant and navigate to detail page
- [x] 7.2 Wire up empty row click handlers to trigger navigation

## 8. Testing and Validation
- [x] 8.1 Verify ownership calculations update correctly when percentages change
- [x] 8.2 Verify clicking empty rows creates new applicant and navigates
- [x] 8.3 Verify help buttons trigger onLearnMore callback with correct content
- [x] 8.4 Verify conditional rendering when "Entity to be Formed" is checked

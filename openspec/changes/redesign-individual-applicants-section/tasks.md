# Tasks: Redesign Individual Applicants Section

## 1. Update Schema
- [x] 1.1 Add `gender` field to `IndividualApplicant` interface in `lib/schema.ts`

## 2. Update IndividualApplicantsSection Component
- [x] 2.1 Add new imports (`useRouter`, `useToast`, new icons: User, AlertCircle, CheckCircle2, Mail, Copy, Check)
- [x] 2.2 Add `projectId` prop to component interface
- [x] 2.3 Add state for `copiedApplicantId` to track copy feedback
- [x] 2.4 Add `getBorrowerPortalLink()` function to generate portal URLs
- [x] 2.5 Add `handleSendLink()` function to open mailto with pre-filled email
- [x] 2.6 Add `handleCopyLink()` function to copy link to clipboard
- [x] 2.7 Add `handleOpenDetail()` function to navigate to detail page
- [x] 2.8 Add `getCompletionStatus()` function to calculate completion percentage

## 3. Add Ownership Table
- [x] 3.1 Add "Ownership of Applicant" section header with blue underline
- [x] 3.2 Add info note about 100% ownership requirement
- [x] 3.3 Create table with columns: Owner's Name, Title, Ownership %, Gender
- [x] 3.4 Render existing applicants as editable table rows
- [x] 3.5 Add empty placeholder rows that trigger add on click
- [x] 3.6 Add total row showing sum of ownership percentages

## 4. Add Owner Cards Section
- [x] 4.1 Add "Individual Owner Details" section header
- [x] 4.2 Create responsive card grid (1 col mobile, 2 cols desktop)
- [x] 4.3 Implement card header with avatar, name, title, ownership %
- [x] 4.4 Add completion progress bar with percentage
- [x] 4.5 Add completion status indicator (Complete/Needs attention)
- [x] 4.6 Implement card footer with action buttons (Send Link, Copy Link, Remove)

## 5. Remove Inline Form Fields
- [x] 5.1 Remove Personal Information section from inline view
- [x] 5.2 Remove Project & Business Involvement section from inline view
- [x] 5.3 Remove Personal Financials section from inline view
- [x] 5.4 Remove "Add Individual" button (replaced by table click-to-add)

## 6. Pass Props from Parent
- [x] 6.1 Update `app/bdo/projects/[id]/page.tsx` to pass `projectId` prop to IndividualApplicantsSection

## 7. Testing and Validation
- [ ] 7.1 Verify ownership table displays and edits correctly
- [ ] 7.2 Verify owner cards show completion status accurately
- [ ] 7.3 Verify Send Link opens email client with correct content
- [ ] 7.4 Verify Copy Link copies correct URL and shows feedback
- [ ] 7.5 Verify clicking card navigates to detail page (or shows toast if page doesn't exist)
- [ ] 7.6 Verify total ownership percentage calculates correctly

## Notes
- The detail page route (`/project/{projectId}/individual/{applicantId}`) may not exist yet - handle gracefully with toast message
- Keep the LearnMorePanel and IndirectOwnershipExplainer components as-is
- Maintain existing data-testid attributes where possible for testing compatibility
- The completion status checks: firstName, lastName, email, phone, ssn, projectRole

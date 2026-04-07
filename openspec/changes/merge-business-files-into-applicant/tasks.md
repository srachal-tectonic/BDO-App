# Tasks: Merge Business Files into Business Applicant Step

## 1. Update Steps Array
- [x] 1.1 Update `LOAN_APPLICATION_STEPS` array in `app/bdo/projects/[id]/page.tsx`
- [x] 1.2 Change step 3 title from "Business Applicant" to "Business Applicant & Files"
- [x] 1.3 Remove step 4 "Business Files" from the array
- [x] 1.4 Renumber steps 5-11 to 4-10

## 2. Update Section Rendering
- [x] 2.1 Modify `renderSectionContent()` case 3 to render both `BusinessApplicantSection` and `BusinessFilesSection`
- [x] 2.2 Add a visual separator or heading between the two sections
- [x] 2.3 Remove case 4 for `BusinessFilesSection`
- [x] 2.4 Renumber cases 5-11 to 4-10 in the switch statement

## 3. Update Navigation Logic
- [x] 3.1 Update `handleNext()` to check against 10 instead of 11
- [x] 3.2 Update any hardcoded references to step 11 (now step 10)
- [x] 3.3 Verify "Continue" button appears on steps 1-9 and "Save All Changes" on step 10

## 4. Testing and Validation
- [ ] 4.1 Verify step 3 displays both Business Applicant fields and Business Files section
- [ ] 4.2 Verify all 10 steps are accessible via sidebar navigation
- [ ] 4.3 Verify Next/Previous navigation works correctly through all 10 steps
- [ ] 4.4 Verify step completion tracking works with the new numbering
- [ ] 4.5 Verify the final step (10) shows "Save All Changes" button

## Notes
- The `BusinessFilesSection` component requires `projectId` and `sharepointFolderId` props
- Consider adding a section heading like "Business Files" above the files section within step 3
- No changes needed to the individual section components themselves

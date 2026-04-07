# Tasks: Redesign File Uploads Section

## 1. Create Applicant Selection Modal
- [x] 1.1 Create new component `ApplicantSelectionModal.tsx` in `components/loan-sections/`
- [x] 1.2 Modal should display list of individual applicants from the application store
- [x] 1.3 Each applicant should be clickable with their full name displayed
- [x] 1.4 Modal should have Cancel button and close when applicant is selected
- [x] 1.5 Style modal consistent with existing modals (e.g., `YearSelectionModal`)

## 2. Redesign CombinedFilesSection Component
- [x] 2.1 Add "About This Section" collapsible accordion at the top
- [x] 2.2 Add accordion content with guidance text about file uploads
- [x] 2.3 Rename/reorganize sections to: "Business Applicant", "Individual Applicants", "Other Businesses", "Project Files"
- [x] 2.4 Update styling to match the accordion pattern used in other sections (e.g., SBAEligibilitySection)

## 3. Integrate Applicant Selection for Individual Uploads
- [x] 3.1 Add state management for applicant selection modal
- [x] 3.2 When user clicks upload in "Individual Applicants" section, trigger applicant selection modal
- [x] 3.3 After applicant selection, proceed with file upload using selected applicant's name
- [x] 3.4 Pass selected applicant name to `FileUploadWithYearTags` component

## 4. Connect to Application Store
- [x] 4.1 Import `useApplication` hook in `CombinedFilesSection`
- [x] 4.2 Access `individualApplicants` from the store
- [x] 4.3 Handle case where no individual applicants exist (show message or disable section)

## 5. Testing and Verification
- [ ] 5.1 Test "About This Section" accordion expands/collapses correctly
- [ ] 5.2 Test applicant selection modal appears when uploading individual files
- [ ] 5.3 Verify files are uploaded to correct SharePoint folder based on selected applicant
- [ ] 5.4 Test all four upload sections work independently
- [ ] 5.5 Test with no individual applicants (edge case)

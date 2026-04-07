# Tasks: Simplify File Uploads with Modal-Based File Type Selection

## 1. Create File Type Selection Modal Component
- [x] 1.1 Create new component `FileTypeSelectionModal.tsx` in `components/loan-sections/`
- [x] 1.2 Modal should accept a `section` prop to determine which file type options to display
- [x] 1.3 Display filename at the top of the modal
- [x] 1.4 Display file type options as clickable cards/buttons
- [x] 1.5 Include Cancel button that closes modal without uploading
- [x] 1.6 Style consistent with existing modals (YearSelectionModal, ApplicantSelectionModal)

## 2. Create Combined Applicant and File Type Modal
- [x] 2.1 Create new component `IndividualFileUploadModal.tsx` in `components/loan-sections/`
- [x] 2.2 Implement two-step flow: applicant selection → file type selection
- [x] 2.3 Display list of individual applicants from application store
- [x] 2.4 After applicant selection, show file type options for individual files
- [x] 2.5 Include Back button to return to applicant selection
- [x] 2.6 Include Cancel button to abort upload
- [x] 2.7 Return both selected applicant and file type on confirmation

## 3. Simplify CombinedFilesSection Layout
- [x] 3.1 Replace multiple upload fields in Business Applicant section with single upload area
- [x] 3.2 Replace applicant selector + multiple upload fields in Individual Applicants with single upload area
- [x] 3.3 Keep Other Businesses and Project Files sections unchanged (already single field)
- [x] 3.4 Update section labels to indicate all file types are accepted

## 4. Integrate File Type Selection Flow
- [x] 4.1 Add state management for pending file and selected file type
- [x] 4.2 When file selected in Business Applicant section, open FileTypeSelectionModal
- [x] 4.3 When file selected in Individual Applicants section, open IndividualFileUploadModal
- [x] 4.4 After file type selection, check if year tags needed (Tax Returns)
- [x] 4.5 If year tags needed, open YearSelectionModal before uploading
- [x] 4.6 Pass selected file type as metadata to SharePoint upload

## 5. Update File Display with Type Badges
- [x] 5.1 Store file type in file metadata alongside years and description
- [x] 5.2 Display file type badge on uploaded files in the list
- [x] 5.3 Optionally group files by type within each section

## 6. Testing and Verification
- [ ] 6.1 Test Business Applicant file type selection flow
- [ ] 6.2 Test Individual Applicants combined modal flow (applicant + file type)
- [ ] 6.3 Test Back button in Individual Applicants modal
- [ ] 6.4 Test Cancel button in all modals
- [ ] 6.5 Test year selection appears for Tax Returns file types
- [ ] 6.6 Test files upload to correct SharePoint folder
- [ ] 6.7 Test file type badges display correctly on uploaded files

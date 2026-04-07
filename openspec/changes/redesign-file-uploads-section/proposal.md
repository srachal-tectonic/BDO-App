# Change: Redesign File Uploads section in Borrower Portal

## Why

The current File Uploads section (Step 7) in the Borrower Portal has a flat structure with "Business Files" and "Individual Files" sections that don't align with the SharePoint folder structure. Users need a clearer organization that matches the document storage backend and provides better guidance on what to upload. Additionally, when uploading individual applicant files, there's no way to specify which applicant the files belong to.

## What Changes

1. **Add "About This Section" accordion** at the top with helpful guidance text:
   > "Please upload all required documents for your loan application. Organize your files by category to help us process your application more efficiently. Accepted formats include PDF, JPG, PNG, and common document formats."

2. **Reorganize sections** to match SharePoint folder structure:
   - **Business Applicant** - Documents for the primary business entity
   - **Individual Applicants** - Personal documents for each individual applicant
   - **Other Businesses** - Documents for other businesses owned by applicants
   - **Project Files** - General project-related documents

3. **Add applicant selection modal** for Individual Applicants section:
   - When user attempts to upload in Individual Applicants section, show a modal
   - Modal displays list of individual applicants from the application
   - User selects which applicant the file belongs to
   - Files are then uploaded to that applicant's named folder in SharePoint

## Impact

- Affected specs: `borrower-portal` (File Uploads step)
- Affected code:
  - `components/loan-sections/CombinedFilesSection.tsx` - Complete redesign
  - New component: `ApplicantSelectionModal.tsx` - Modal for selecting individual applicants
  - Integration with existing `useApplication()` hook to access individual applicants list

# Change: Simplify File Uploads with Modal-Based File Type Selection

## Why

The current File Uploads section (Step 7) in the Borrower Portal has multiple separate upload fields within each section. This requires users to find and click on the specific upload area for each file type. A simpler approach would be to have one upload field per section, with a modal that appears after file selection to let users specify what type of file they are uploading. For Individual Applicants, the modal should also ask which applicant the file belongs to.

## What Changes

1. **Simplify each section to a single upload field**:
   - Business Applicant: One upload area instead of 4 separate fields
   - Individual Applicants: One upload area instead of requiring applicant selection first
   - Other Businesses: Already has one field (no change)
   - Project Files: Already has one field (no change)

2. **Add File Type Selection Modal**:
   - Appears after user selects a file to upload
   - Displays file type options specific to the section:
     - **Business Applicant options**: Business Federal Tax Returns, Interim Income Statement, Interim Balance Sheet, Other Business Files
     - **Individual Applicants options**: Personal Federal Tax Returns, Personal Financial Statements, Resume, Other Individual Files
     - **Other Businesses**: No modal needed (single category)
     - **Project Files**: No modal needed (single category)

3. **Enhanced Individual Applicants Modal**:
   - For Individual Applicants section, modal should have two selection steps:
     1. Select which individual applicant
     2. Select file type
   - Both selections required before upload proceeds

4. **Year tag handling**:
   - If selected file type requires year tags (Tax Returns), show year selection after file type selection
   - If selected file type doesn't require year tags, proceed directly to upload

## Impact

- Affected specs: `borrower-portal` (File Uploads step)
- Affected code:
  - `components/loan-sections/CombinedFilesSection.tsx` - Simplify to single upload per section
  - New component: `FileTypeSelectionModal.tsx` - Modal for selecting file type
  - Update existing: `ApplicantSelectionModal.tsx` - Extend to include file type selection for individual files
  - Integration with existing `FileUploadWithYearTags` and `YearSelectionModal` components

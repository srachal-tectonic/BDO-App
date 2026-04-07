# Change: Restyle File Uploads Section with Card Layout

## Why

The current File Uploads section uses a flat layout with blue-underlined headers. The design needs to be updated to a card-based layout that matches other application sections, with white background cards, "Required Uploads" subsections showing what documents are needed, and a simplified file display that shows only filenames without removal capability.

## What Changes

1. **Card-based section styling**:
   - Each section (Business Applicant, Individual Applicants, Other Businesses, Project Files) wrapped in a white card with border and rounded corners
   - Header styled with bottom border (gray, not blue underline)
   - Consistent padding and spacing

2. **"Required Uploads" subsection for Business Applicant and Individual Applicants**:
   - **Business Applicant** shows:
     - "Please upload the following documents for **[Business Name]**:"
     - Last Three Years of Federal Tax Returns
     - Interim Income Statement and Balance Sheet
     - Accounts Payable and Accounts Receivable Aging Reports
     - Debt Schedule
   - **Individual Applicants** shows (for each applicant):
     - Last Three Years Personal Federal Tax Returns
     - Personal Financial Statement
     - Personal Income and Expense Analysis

3. **Remove file removal capability**:
   - Remove the "X" button from uploaded files
   - Files once uploaded to SharePoint cannot be removed from the UI

4. **Simplified file display**:
   - Show only the filename (no file type badges, no SharePoint badge, no year badges)
   - No download link or clickable URL
   - Simple list of uploaded file names

## Impact

- Affected specs: `borrower-portal` (File Uploads step)
- Affected code:
  - `components/loan-sections/CombinedFilesSection.tsx` - Update styling and file list rendering
  - Access business entity name from application store for dynamic display

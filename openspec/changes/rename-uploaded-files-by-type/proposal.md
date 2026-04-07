# Change: Rename Uploaded Files in SharePoint by Selected Type and Year

## Why

Currently, files uploaded to SharePoint retain their original filenames. This makes it difficult to identify documents at a glance in SharePoint. Users want uploaded files to be automatically renamed based on the selected file type and year(s) to create a consistent, organized naming convention in SharePoint.

## What Changes

1. **Rename files on upload based on selected metadata**:
   - Files are renamed before uploading to SharePoint
   - The new filename combines the year(s) and file type label
   - Original file extension is preserved

2. **Naming convention**:
   - **Business files with year**: `[Year(s)] [File Type Label].[ext]`
     - Example: `2025 Business Federal Tax Returns.pdf`
     - Multiple years: `2024, 2025 Business Federal Tax Returns.pdf`

   - **Business files without year**: `[File Type Label].[ext]`
     - Example: `Interim Balance Sheet.pdf`

   - **Individual files with year**: `[Year(s)] [Applicant Name] [File Type Label].[ext]`
     - Example: `2025 John Smith Personal Federal Tax Returns.pdf`

   - **Individual files without year**: `[Applicant Name] [File Type Label].[ext]`
     - Example: `John Smith Resume.pdf`

   - **Other Businesses / Project Files**: Keep original filename (no file type selection)

## Impact

- Affected specs: `borrower-portal` (File Uploads)
- Affected code:
  - `components/loan-sections/CombinedFilesSection.tsx` - Generate new filename before upload
  - `app/api/sharepoint/upload/route.ts` - Accept and use the provided filename (may already support this)

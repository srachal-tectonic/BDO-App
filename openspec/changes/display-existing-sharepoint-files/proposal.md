# Change: Display Existing SharePoint Files in Borrower Portal

## Why

Currently, the File Uploads section in the Borrower Portal only shows files uploaded during the current session. When users return to the application, they cannot see what files have already been uploaded to SharePoint. Users need to see previously uploaded documents to know what they've already submitted and what's still needed.

## What Changes

1. **Fetch existing files on page load**:
   - When the File Uploads section loads, call the existing `GET /api/sharepoint/files` API
   - Parse the response to categorize files by their folder location

2. **Display files in their respective sections**:
   - **Business Applicant**: Show files from the "Business Applicant" subfolder
   - **Individual Applicants**: Show files from individual applicant name subfolders (e.g., "John Smith")
   - **Other Businesses**: Show files from the "Other Businesses" subfolder
   - **Project Files**: Show files from the "Project Files" subfolder

3. **File display**:
   - Show only filenames (consistent with current upload display)
   - No download links or actions
   - Distinguish between existing files and newly uploaded files (optional visual indicator)

4. **Loading state**:
   - Show loading indicator while fetching files from SharePoint
   - Handle errors gracefully (show message if fetch fails)

## Impact

- Affected specs: `borrower-portal` (File Uploads step)
- Affected code:
  - `components/loan-sections/CombinedFilesSection.tsx` - Add API call and file categorization logic
  - Uses existing `GET /api/sharepoint/files?projectId={projectId}` endpoint (no backend changes needed)

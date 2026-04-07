# Change: Update SharePoint folder structure with subfolders

## Why

Currently, when a SharePoint folder is created for a project, it creates a single folder named after the project. This flat structure doesn't provide organization for different document types. Loan officers and borrowers need a standardized folder hierarchy to easily locate and manage documents for business applicants, other owned businesses, and general project files.

## What Changes

- Modify the SharePoint folder creation to generate a main project folder with three subfolders inside:
  - **Business Applicant** - For documents related to the primary business applicant
  - **Other Businesses** - For documents related to other businesses owned by applicants
  - **Project Files** - For general project-related documents
- Update the `createSharePointFolder` function in `lib/sharepoint.ts` to create the subfolder structure
- Update the API endpoints to handle the new folder structure
- Store references to subfolder IDs in Firestore for direct access

## Impact

- Affected specs: `sharepoint-integration`
- Affected code:
  - `lib/sharepoint.ts` - Update `createSharePointFolder` to create subfolders
  - `app/api/sharepoint/create-folder/route.ts` - Update API response to include subfolder IDs
  - `app/api/sharepoint/files/route.ts` - Update auto-creation logic for new structure
  - Firestore project documents - Store additional subfolder references

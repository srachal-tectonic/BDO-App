# Tasks: Update SharePoint Folder Structure

## 1. Update SharePoint Library
- [x] 1.1 Create a new function `createSubfolder` in `lib/sharepoint.ts` to create a subfolder within a parent folder
- [x] 1.2 Update `createSharePointFolder` to create the main project folder and then create three subfolders inside it
- [x] 1.3 Define constants for subfolder names: "Business Applicant", "Other Businesses", "Project Files"
- [x] 1.4 Return subfolder IDs along with the main folder ID from `createSharePointFolder`

## 2. Update API Endpoints
- [x] 2.1 Update `app/api/sharepoint/create-folder/route.ts` to return subfolder IDs in the response
- [x] 2.2 Update `app/api/sharepoint/files/route.ts` auto-creation logic to create the new folder structure
- [x] 2.3 Update response types/interfaces to include subfolder information

## 3. Update Firestore Schema
- [x] 3.1 Define new fields for storing subfolder IDs in project documents:
  - `sharepointBusinessApplicantFolderId`
  - `sharepointOtherBusinessesFolderId`
  - `sharepointProjectFilesFolderId`
- [x] 3.2 Update Firestore save logic to store subfolder references

## 4. Update Upload Routing
- [x] 4.1 Add `mapSubfolderName()` function to translate UI names to SharePoint folder names ("Business Files" → "Business Applicant")
- [x] 4.2 Add `applicantName` parameter handling in upload API for individual applicant folders
- [x] 4.3 Update `FileUploadWithYearTags` component to accept `applicantName` prop
- [x] 4.4 Update `IndividualFilesSection` to accept and pass `applicantName` prop
- [x] 4.5 Update `CombinedFilesSection` to accept and pass `applicantName` prop

## 5. Testing and Verification
- [ ] 5.1 Test folder creation creates main folder with three subfolders
- [ ] 5.2 Verify subfolder IDs are correctly stored in Firestore
- [ ] 5.3 Test "Business Files" uploads go to "Business Applicant" folder
- [ ] 5.4 Test individual applicant files create/use applicant-named folders
- [ ] 5.5 Test auto-creation flow creates complete folder structure

# Tasks: Display Existing SharePoint Files in Borrower Portal

## 1. Add File Fetching on Component Mount
- [x] 1.1 Add `useEffect` hook to fetch files when component mounts
- [x] 1.2 Call `GET /api/sharepoint/files?projectId={projectId}` endpoint
- [x] 1.3 Add loading state (`isLoadingFiles`) to track fetch progress
- [x] 1.4 Add error state (`loadFilesError`) to track fetch failures

## 2. Parse and Categorize SharePoint Files
- [x] 2.1 Create function to categorize files by folder name
- [x] 2.2 Identify "Business Applicant" folder files
- [x] 2.3 Identify individual applicant folder files (folders not matching known names)
- [x] 2.4 Identify "Other Businesses" folder files
- [x] 2.5 Identify "Project Files" folder files

## 3. Update State to Include Existing Files
- [x] 3.1 Initialize file state arrays with existing files from SharePoint
- [x] 3.2 Merge newly uploaded files with existing files
- [x] 3.3 Avoid duplicates when user uploads a file that already exists

## 4. Add Loading UI
- [x] 4.1 Show loading indicator in each section while fetching
- [x] 4.2 Keep upload areas functional during loading
- [x] 4.3 Show error message if fetch fails (non-blocking)

## 5. Testing and Verification
- [ ] 5.1 Test with project that has existing files in SharePoint
- [ ] 5.2 Test with project that has no SharePoint folder
- [ ] 5.3 Test with project that has empty SharePoint folder
- [ ] 5.4 Test uploading new file after existing files are displayed
- [ ] 5.5 Test error handling when API call fails

# Tasks: Rename Uploaded Files in SharePoint by Selected Type and Year

## 1. Create File Naming Utility Function
- [x] 1.1 Create `generateUploadFilename` function that accepts file type label, years array, applicant name (optional), and original file extension
- [x] 1.2 Handle single year: `2025 Business Federal Tax Returns.pdf`
- [x] 1.3 Handle multiple years: `2024, 2025 Business Federal Tax Returns.pdf` (sorted ascending)
- [x] 1.4 Handle no years: `Interim Balance Sheet.pdf`
- [x] 1.5 Handle individual with year: `2025 John Smith Personal Federal Tax Returns.pdf`
- [x] 1.6 Handle individual without year: `John Smith Resume.pdf`

## 2. Update Business File Upload Flow
- [x] 2.1 Extract file extension from original filename
- [x] 2.2 Generate new filename using file type label and selected years
- [x] 2.3 Create new File object with renamed filename before upload
- [x] 2.4 Pass renamed file to SharePoint upload

## 3. Update Individual File Upload Flow
- [x] 3.1 Generate new filename using applicant name, file type label, and selected years
- [x] 3.2 Create new File object with renamed filename before upload
- [x] 3.3 Pass renamed file to SharePoint upload

## 4. Verify SharePoint Upload API Compatibility
- [x] 4.1 Confirm upload API uses the file's name property for SharePoint filename
- [x] 4.2 Update API if needed to accept/use custom filename (not needed - API already uses file.name)

## 5. Testing and Verification
- [ ] 5.1 Test Business file upload with single year - verify filename in SharePoint
- [ ] 5.2 Test Business file upload with multiple years - verify comma-separated format
- [ ] 5.3 Test Business file upload without year - verify file type only naming
- [ ] 5.4 Test Individual file upload with year and applicant name
- [ ] 5.5 Test Individual file upload without year
- [ ] 5.6 Test Other Businesses upload - verify original filename preserved
- [ ] 5.7 Test Project Files upload - verify original filename preserved

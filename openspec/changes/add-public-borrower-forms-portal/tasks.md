## 1. Data Model & Backend Setup

- [x] 1.1 Add TypeScript types for portal token and borrower uploads in `types/index.ts`
- [x] 1.2 Add Firestore helper function to generate and store portal token
- [x] 1.3 Add Firestore helper function to validate portal token and retrieve forms data
- [x] 1.4 Add Firestore helper function to store borrower upload metadata
- [x] 1.5 Add Firestore helper function to mark form as downloaded (update `downloadedAt`)
- [x] 1.6 Update `generateFormsForProject` to also generate portal token (handled in BorrowerFormsSection)

## 2. API Endpoints

- [x] 2.1 Create `app/api/forms/[token]/route.ts` - GET endpoint to validate token and return forms list
- [x] 2.2 Create `app/api/forms/[token]/download/[formId]/route.ts` - GET endpoint to download form PDF and track download
- [x] 2.3 Create `app/api/forms/[token]/upload/route.ts` - POST endpoint to upload completed documents
- [x] 2.4 Add file validation (size limit, allowed types) to upload endpoint
- [x] 2.5 Add rate limiting to upload endpoint

## 3. Public Forms Portal Page

- [x] 3.1 Create `app/forms/[token]/page.tsx` - main portal page component
- [x] 3.2 Implement token validation and error states (invalid/expired token)
- [x] 3.3 Display project/borrower information header
- [x] 3.4 Create forms list with download buttons
- [x] 3.5 Create file upload dropzone component
- [x] 3.6 Implement upload progress indicator
- [x] 3.7 Show upload success confirmation (without listing uploaded files)
- [x] 3.8 Add mobile-responsive styling

## 4. Update BDO Admin Interface

- [x] 4.1 Update `BorrowerFormsSection` to generate token when copying portal link
- [x] 4.2 Update portal link URL format to use `/forms/[token]`
- [x] 4.3 Add "Regenerate Link" button to create new token (invalidates old)
- [x] 4.4 Display download status for each form (show when borrower downloaded)
- [x] 4.5 Add section to view borrower uploaded files
- [x] 4.6 Add download button for BDO to retrieve borrower uploads

## 5. Testing & Validation

- [ ] 5.1 Test form generation creates valid portal token
- [ ] 5.2 Test public portal page loads correctly with valid token
- [ ] 5.3 Test invalid token shows appropriate error
- [ ] 5.4 Test form download works and tracks download timestamp
- [ ] 5.5 Test file upload works with valid files
- [ ] 5.6 Test file upload rejects invalid file types
- [ ] 5.7 Test file upload rejects files over size limit
- [ ] 5.8 Test uploaded files appear in BDO admin view
- [ ] 5.9 Test borrower cannot see/download their uploaded files from portal

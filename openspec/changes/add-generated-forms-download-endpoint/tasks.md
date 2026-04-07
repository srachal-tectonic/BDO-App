# Tasks: Add Generated Forms Download API Endpoint

## 1. Firestore Functions
- [x] 1.1 Add `getGeneratedFormById` function to fetch a single form by ID
- [x] 1.2 Add `updateGeneratedFormStatus` function to update form status and timestamps

## 2. API Endpoint
- [x] 2.1 Create directory `app/api/generated-forms/[id]/download/`
- [x] 2.2 Create `route.ts` with GET handler
- [x] 2.3 Fetch form record from Firestore using form ID
- [x] 2.4 Return 404 if form not found
- [x] 2.5 Generate placeholder PDF with form name (initial implementation)
- [x] 2.6 Set appropriate response headers for PDF download
- [x] 2.7 Update form status to 'downloaded' and set downloadedAt timestamp

## 3. Testing
- [ ] 3.1 Verify download button triggers PDF download
- [ ] 3.2 Verify form status updates to 'downloaded' after download
- [ ] 3.3 Verify 404 returned for invalid form ID

# Change: Add Generated Forms Download API Endpoint

## Why
The Borrower Forms feature allows BDOs to generate forms for borrowers, but clicking the "Download" button results in a 404 error because the API endpoint `/api/generated-forms/[id]/download` does not exist. This breaks the core functionality of the feature.

## What Changes
- Create new API route `app/api/generated-forms/[id]/download/route.ts`
- The endpoint will:
  - Fetch the generated form record from Firestore
  - Generate or retrieve the PDF file for the form
  - Return the PDF as a downloadable file response
  - Update the form status to 'downloaded' and record the download timestamp
- Add Firestore function to update form download status

## Impact
- Affected specs: `borrower-forms-api` (new capability)
- Affected code:
  - `app/api/generated-forms/[id]/download/route.ts` - New API endpoint
  - `services/firestore.ts` - Add function to update form download status
- No breaking changes

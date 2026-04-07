# Change: Add Borrower Forms Tab to Loan Application Page

## Why
BDOs need a way to generate fillable PDF forms for borrowers to complete and upload. Currently, there is no dedicated section for managing borrower forms within the loan application workflow. This feature will streamline the document collection process by allowing BDOs to generate pre-filled forms and share a portal link with borrowers.

## What Changes
- Add a new "Borrower Forms" tab to the Loan Application page (after the "Notes" tab)
- Create a new `BorrowerFormsSection` component with:
  - Page title "Borrower Forms" with descriptive text
  - "Generate Forms for Borrower" card with action button
  - List of generated forms with status badges (Pending, Downloaded, Uploaded, Completed, Error)
  - Portal link sharing functionality (copy link, open portal)
  - Progress tracking showing completed vs total forms
- Add API endpoints for form generation and retrieval
- Add `GeneratedForm` data model for tracking form status

## Impact
- Affected specs: `loan-application-page` (new capability)
- Affected code:
  - `app/bdo/projects/[id]/page.tsx` - Add new tab trigger and content
  - `components/loan-sections/BorrowerFormsSection.tsx` - New component (to be created)
  - `app/api/projects/[id]/generated-forms/route.ts` - New API endpoint (to be created)
  - `app/api/projects/[id]/generate-forms/route.ts` - New API endpoint (to be created)
- Data model: New `generatedForms` collection in Firestore

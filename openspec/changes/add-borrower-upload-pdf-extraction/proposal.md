# Change: Add Automatic PDF Data Extraction for Borrower Uploads

## Why
When borrowers upload completed PDF forms through the public portal, BDOs must manually review each document and re-enter the data into the loan application. This is time-consuming, error-prone, and creates unnecessary friction in the loan processing workflow. By automatically extracting form field data from uploaded PDFs, we can significantly reduce manual data entry and accelerate the loan application process.

## What Changes
- Automatically parse PDF form fields when borrowers upload documents through the portal
- Store extracted data in Firestore linked to the borrower upload record
- Create predefined field mappings for the 5 standard SBA forms:
  - SBA Form 1919 (Borrower Information Form)
  - SBA Form 413 (Personal Financial Statement)
  - SBA Form 912 (Statement of Personal History)
  - IRS Form 4506-C (Request for Transcript of Tax Return)
  - SBA Form 159 (Fee Disclosure Form)
- Add extraction status tracking (pending, extracted, reviewed, applied, failed)
- Create BDO interface to review extracted data before applying to loan application
- Allow BDOs to approve/reject/edit extracted values
- Apply approved data to loan application with audit trail

## Impact
- Affected specs: `borrower-upload-extraction` (new capability)
- Affected code:
  - `app/api/forms/[token]/upload/route.ts` - Trigger extraction after upload
  - `app/api/projects/[id]/borrower-uploads/[uploadId]/extract/route.ts` - Manual extraction trigger
  - `app/api/projects/[id]/borrower-uploads/[uploadId]/extraction/route.ts` - Get/update extraction data
  - `app/api/projects/[id]/borrower-uploads/[uploadId]/apply/route.ts` - Apply extracted data
  - `components/loan-sections/BorrowerFormsSection.tsx` - Add extraction review UI
  - `lib/pdf-extraction/sba-form-mappings.ts` - Predefined SBA form field mappings
  - `lib/pdf-extraction/extractor.ts` - PDF extraction utilities
  - `services/firestore.ts` - Add extraction data storage functions
- Data model changes:
  - Add `extractionStatus` field to borrower uploads
  - Add `extractedData` subcollection for storing extracted field values
  - Add `extractionHistory` for audit trail of applied data

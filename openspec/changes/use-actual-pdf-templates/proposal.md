# Change: Use Actual PDF Templates for Generated Forms

## Why
The current implementation generates placeholder PDFs with simple text. The user has provided actual SBA form PDFs in the `/pdfs` folder that should be served instead. These are the official fillable forms that borrowers need to complete.

## What Changes
- Update the download endpoint to serve actual PDF files from the `/pdfs` folder instead of generating placeholder PDFs
- Create a mapping between form names and their corresponding PDF files:
  - "SBA Form 1919 - Borrower Information Form" → `SBA_Form_1919_-_Borrower_Information_Form.pdf`
  - "SBA Form 413 - Personal Financial Statement" → `SBAForm413.pdf`
  - "SBA Form 912 - Statement of Personal History" → `SBA-912-508.pdf`
  - "IRS Form 4506-C - Request for Transcript of Tax Return" → `f4506c.pdf`
  - "SBA Form 159 - Fee Disclosure Form" → `SBA Form 159_2.10.22-508_0.pdf`
- Read the actual PDF file from disk and return it in the response
- Keep the status update logic (marking form as 'downloaded')

## Impact
- Affected specs: `borrower-forms-api` (modify existing)
- Affected code:
  - `app/api/generated-forms/[id]/download/route.ts` - Replace placeholder PDF generation with file serving
- No breaking changes - same API contract, just different PDF content

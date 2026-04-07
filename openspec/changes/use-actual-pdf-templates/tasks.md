# Tasks: Use Actual PDF Templates for Generated Forms

## 1. PDF Template Mapping
- [x] 1.1 Create a mapping object linking form names to PDF filenames
- [x] 1.2 Map "SBA Form 1919 - Borrower Information Form" to `SBA_Form_1919_-_Borrower_Information_Form.pdf`
- [x] 1.3 Map "SBA Form 413 - Personal Financial Statement" to `SBAForm413.pdf`
- [x] 1.4 Map "SBA Form 912 - Statement of Personal History" to `SBA-912-508.pdf`
- [x] 1.5 Map "IRS Form 4506-C - Request for Transcript of Tax Return" to `f4506c.pdf`
- [x] 1.6 Map "SBA Form 159 - Fee Disclosure Form" to `SBA Form 159_2.10.22-508_0.pdf`

## 2. Update Download Endpoint
- [x] 2.1 Import Node.js `fs` and `path` modules
- [x] 2.2 Look up the PDF filename from the form name using the mapping
- [x] 2.3 Construct the file path to the PDF in the `/pdfs` folder
- [x] 2.4 Read the PDF file from disk
- [x] 2.5 Return 404 if the PDF file doesn't exist on disk
- [x] 2.6 Return the actual PDF content with proper headers
- [x] 2.7 Remove placeholder PDF generation code (pdf-lib usage)

## 3. Testing
- [ ] 3.1 Verify each form downloads the correct PDF file
- [ ] 3.2 Verify PDFs are valid and can be opened
- [ ] 3.3 Verify form status still updates to 'downloaded'
- [ ] 3.4 Verify 404 is returned for forms with missing PDF templates

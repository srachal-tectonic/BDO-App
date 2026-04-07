## MODIFIED Requirements

### Requirement: Generated Form Download Endpoint
The system SHALL provide an API endpoint to download generated borrower forms as PDF files using actual PDF templates stored on the server.

#### Scenario: Successfully download a form with matching template
- **WHEN** a GET request is made to `/api/generated-forms/[id]/download`
- **AND** the form ID exists in the database
- **AND** a PDF template file exists for the form type
- **THEN** the response returns the actual PDF template file
- **AND** the Content-Type header is set to `application/pdf`
- **AND** the Content-Disposition header triggers a file download with the form name
- **AND** the form status is updated to 'downloaded'
- **AND** the downloadedAt timestamp is recorded

#### Scenario: Form not found in database
- **WHEN** a GET request is made to `/api/generated-forms/[id]/download`
- **AND** the form ID does not exist in the database
- **THEN** a 404 Not Found response is returned
- **AND** the response body contains an error message

#### Scenario: PDF template file not found
- **WHEN** a GET request is made to `/api/generated-forms/[id]/download`
- **AND** the form ID exists in the database
- **AND** no PDF template file exists for the form type
- **THEN** a 404 Not Found response is returned
- **AND** the response body contains an error message indicating the template is missing

## ADDED Requirements

### Requirement: PDF Template Mapping
The system SHALL maintain a mapping between form names and their corresponding PDF template files.

#### Scenario: Form name to PDF file mapping
- **WHEN** a form is requested for download
- **THEN** the system looks up the PDF filename using the following mapping:
  - "SBA Form 1919 - Borrower Information Form" → `SBA_Form_1919_-_Borrower_Information_Form.pdf`
  - "SBA Form 413 - Personal Financial Statement" → `SBAForm413.pdf`
  - "SBA Form 912 - Statement of Personal History" → `SBA-912-508.pdf`
  - "IRS Form 4506-C - Request for Transcript of Tax Return" → `f4506c.pdf`
  - "SBA Form 159 - Fee Disclosure Form" → `SBA Form 159_2.10.22-508_0.pdf`

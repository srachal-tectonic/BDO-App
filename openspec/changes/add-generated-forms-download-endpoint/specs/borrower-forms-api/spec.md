## ADDED Requirements

### Requirement: Generated Form Download Endpoint
The system SHALL provide an API endpoint to download generated borrower forms as PDF files.

#### Scenario: Successfully download a form
- **WHEN** a GET request is made to `/api/generated-forms/[id]/download`
- **AND** the form ID exists in the database
- **THEN** the response returns a PDF file with appropriate headers
- **AND** the Content-Type header is set to `application/pdf`
- **AND** the Content-Disposition header triggers a file download with the form name
- **AND** the form status is updated to 'downloaded'
- **AND** the downloadedAt timestamp is recorded

#### Scenario: Form not found
- **WHEN** a GET request is made to `/api/generated-forms/[id]/download`
- **AND** the form ID does not exist in the database
- **THEN** a 404 Not Found response is returned
- **AND** the response body contains an error message

### Requirement: Form Status Update on Download
The system SHALL update the form record when a download occurs.

#### Scenario: First download updates status
- **WHEN** a form with status 'pending' is downloaded
- **THEN** the status is updated to 'downloaded'
- **AND** the downloadedAt field is set to the current timestamp

#### Scenario: Subsequent downloads preserve uploaded status
- **WHEN** a form with status 'uploaded' or 'imported' is downloaded again
- **THEN** the status remains unchanged
- **AND** the downloadedAt field is updated to the current timestamp

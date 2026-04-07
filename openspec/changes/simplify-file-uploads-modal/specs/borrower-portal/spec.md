# Borrower Portal - Simplified File Uploads with Modal Selection

## MODIFIED Requirements

### Requirement: Single Upload Field Per Section

Each file upload section SHALL have exactly one upload field instead of multiple category-specific fields.

The File Uploads step (Step 7) SHALL display the following sections, each with a single upload area:
1. **Business Applicant** - Single upload field for all business documents
2. **Individual Applicants** - Single upload field for all individual applicant documents
3. **Other Businesses** - Single upload field (unchanged)
4. **Project Files** - Single upload field (unchanged)

#### Scenario: User views simplified Business Applicant section

- **WHEN** a user views the Business Applicant section
- **THEN** the system SHALL display a single upload area
- **AND** the upload area SHALL accept PDF, XLSX, DOC, DOCX, and image files
- **AND** the upload area label SHALL indicate it accepts all business documents

#### Scenario: User views simplified Individual Applicants section

- **WHEN** a user views the Individual Applicants section
- **AND** at least one individual applicant exists in the application
- **THEN** the system SHALL display a single upload area
- **AND** the upload area SHALL NOT require pre-selecting an applicant before uploading

### Requirement: File Type Selection Modal for Business Applicant

When a user uploads a file to the Business Applicant section, the system SHALL display a modal prompting the user to select the file type.

The modal SHALL:
- Display the filename being uploaded
- Present the following file type options as clickable buttons:
  - Business Federal Tax Returns
  - Interim Income Statement
  - Interim Balance Sheet
  - Other Business Files
- Include a Cancel button to abort the upload
- Close automatically after a file type is selected

#### Scenario: User uploads file to Business Applicant section

- **WHEN** a user selects a file in the Business Applicant upload area
- **THEN** the system SHALL display a file type selection modal
- **AND** the modal SHALL display the filename
- **AND** the modal SHALL present four file type options

#### Scenario: User selects file type from Business Applicant modal

- **WHEN** a user clicks on a file type option in the modal
- **THEN** the modal SHALL close
- **AND** if the file type is "Business Federal Tax Returns", the system SHALL display the year selection modal
- **AND** if the file type is not "Business Federal Tax Returns", the file SHALL upload immediately

#### Scenario: User cancels file type selection

- **WHEN** a user clicks Cancel in the file type selection modal
- **THEN** the modal SHALL close
- **AND** the file SHALL NOT be uploaded

### Requirement: Individual Applicant and File Type Selection Modal

When a user uploads a file to the Individual Applicants section, the system SHALL display a combined modal that allows selection of both the individual applicant AND the file type.

The modal SHALL:
- Display the filename being uploaded
- Present a list of individual applicants to select from (showing full name)
- After applicant selection, present the following file type options:
  - Personal Federal Tax Returns
  - Personal Financial Statements
  - Resume
  - Other Individual Files
- Include a Cancel button to abort the upload
- Include a Back button to change applicant selection
- Close automatically after both selections are made

#### Scenario: User uploads file to Individual Applicants section

- **WHEN** a user selects a file in the Individual Applicants upload area
- **THEN** the system SHALL display a combined selection modal
- **AND** the modal SHALL first prompt for applicant selection
- **AND** after applicant selection, the modal SHALL prompt for file type selection

#### Scenario: User completes both selections

- **WHEN** a user selects an applicant AND selects a file type
- **THEN** the modal SHALL close
- **AND** if the file type is "Personal Federal Tax Returns", the system SHALL display the year selection modal
- **AND** if the file type is not "Personal Federal Tax Returns", the file SHALL upload immediately
- **AND** the file SHALL be uploaded to a SharePoint folder named after the selected applicant

#### Scenario: User goes back to change applicant selection

- **WHEN** a user is on the file type selection step
- **AND** the user clicks the Back button
- **THEN** the modal SHALL return to the applicant selection step
- **AND** the user SHALL be able to select a different applicant

### Requirement: Year Selection Integration

For file types that require year tags (Tax Returns), the year selection modal SHALL appear after the file type selection modal closes.

#### Scenario: User selects Tax Returns file type

- **WHEN** a user selects "Business Federal Tax Returns" or "Personal Federal Tax Returns" as the file type
- **THEN** the file type modal SHALL close
- **AND** the year selection modal SHALL appear
- **AND** the user SHALL be able to select one or more years for the file

### Requirement: Uploaded Files Display

Files uploaded through the simplified interface SHALL be displayed in their respective sections with the selected file type as a label/badge.

#### Scenario: User views uploaded files

- **WHEN** a user has uploaded files through the simplified interface
- **THEN** each file SHALL display its filename
- **AND** each file SHALL display a badge indicating the selected file type
- **AND** files with year tags SHALL display year badges
- **AND** files SHALL be grouped or labeled by their file type within the section

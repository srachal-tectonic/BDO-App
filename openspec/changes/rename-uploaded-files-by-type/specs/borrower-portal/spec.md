# Borrower Portal - Rename Uploaded Files by Type and Year

## ADDED Requirements

### Requirement: File Renaming for Business Applicant Uploads

When a user uploads a file to the Business Applicant section, the file SHALL be renamed based on the selected file type and year(s) before uploading to SharePoint.

The naming format SHALL be:
- **With year(s)**: `[Year(s)] [File Type Label].[extension]`
- **Without year**: `[File Type Label].[extension]`

When multiple years are selected, the years SHALL be comma-separated and sorted in ascending order.

#### Scenario: User uploads Business Federal Tax Returns with single year

- **GIVEN** a user selects a file to upload in the Business Applicant section
- **AND** the user selects "Business Federal Tax Returns" as the file type
- **AND** the user selects "2025" as the year
- **WHEN** the file is uploaded to SharePoint
- **THEN** the file SHALL be named "2025 Business Federal Tax Returns.[original extension]"

#### Scenario: User uploads Business Federal Tax Returns with multiple years

- **GIVEN** a user selects a file to upload in the Business Applicant section
- **AND** the user selects "Business Federal Tax Returns" as the file type
- **AND** the user selects "2024" and "2025" as the years
- **WHEN** the file is uploaded to SharePoint
- **THEN** the file SHALL be named "2024, 2025 Business Federal Tax Returns.[original extension]"

#### Scenario: User uploads Interim Balance Sheet (no year required)

- **GIVEN** a user selects a file to upload in the Business Applicant section
- **AND** the user selects "Interim Balance Sheet" as the file type
- **WHEN** the file is uploaded to SharePoint
- **THEN** the file SHALL be named "Interim Balance Sheet.[original extension]"

### Requirement: File Renaming for Individual Applicant Uploads

When a user uploads a file to the Individual Applicants section, the file SHALL be renamed based on the selected applicant name, file type, and year(s) before uploading to SharePoint.

The naming format SHALL be:
- **With year(s)**: `[Year(s)] [Applicant Name] [File Type Label].[extension]`
- **Without year**: `[Applicant Name] [File Type Label].[extension]`

#### Scenario: User uploads Personal Federal Tax Returns for individual

- **GIVEN** a user selects a file to upload in the Individual Applicants section
- **AND** the user selects "John Smith" as the applicant
- **AND** the user selects "Personal Federal Tax Returns" as the file type
- **AND** the user selects "2025" as the year
- **WHEN** the file is uploaded to SharePoint
- **THEN** the file SHALL be named "2025 John Smith Personal Federal Tax Returns.[original extension]"

#### Scenario: User uploads Resume for individual (no year required)

- **GIVEN** a user selects a file to upload in the Individual Applicants section
- **AND** the user selects "Jane Doe" as the applicant
- **AND** the user selects "Resume" as the file type
- **WHEN** the file is uploaded to SharePoint
- **THEN** the file SHALL be named "Jane Doe Resume.[original extension]"

### Requirement: Original Filename for Other Sections

Files uploaded to the "Other Businesses" and "Project Files" sections SHALL retain their original filenames.

#### Scenario: User uploads to Other Businesses section

- **GIVEN** a user uploads a file named "my-document.pdf" to the Other Businesses section
- **WHEN** the file is uploaded to SharePoint
- **THEN** the file SHALL retain the name "my-document.pdf"

#### Scenario: User uploads to Project Files section

- **GIVEN** a user uploads a file named "contract-draft.docx" to the Project Files section
- **WHEN** the file is uploaded to SharePoint
- **THEN** the file SHALL retain the name "contract-draft.docx"

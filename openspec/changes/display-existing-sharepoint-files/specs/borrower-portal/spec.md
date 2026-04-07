# Borrower Portal - Display Existing SharePoint Files

## ADDED Requirements

### Requirement: Fetch Existing Files on Page Load

When the File Uploads section loads, the system SHALL fetch the list of existing files from SharePoint for the current project.

The system SHALL:
- Call the SharePoint files API with the current project ID
- Parse the folder structure to identify files in each section
- Display files organized by their respective upload sections

#### Scenario: User navigates to File Uploads section

- **WHEN** a user navigates to the File Uploads step in the Borrower Portal
- **AND** the project has a SharePoint folder
- **THEN** the system SHALL fetch existing files from SharePoint
- **AND** the system SHALL display a loading indicator while fetching
- **AND** the system SHALL display existing files once loaded

#### Scenario: User navigates to File Uploads with no SharePoint folder

- **WHEN** a user navigates to the File Uploads step
- **AND** the project does not have a SharePoint folder yet
- **THEN** the system SHALL not show any existing files
- **AND** the system SHALL allow the user to upload new files normally

### Requirement: Categorize Files by Folder

Files fetched from SharePoint SHALL be categorized and displayed in their respective upload sections based on the folder they reside in.

The categorization SHALL be:
- Files in "Business Applicant" folder → displayed in Business Applicant section
- Files in individual applicant name folders (e.g., "John Smith") → displayed in Individual Applicants section
- Files in "Other Businesses" folder → displayed in Other Businesses section
- Files in "Project Files" folder → displayed in Project Files section

#### Scenario: Files exist in Business Applicant folder

- **GIVEN** the SharePoint project folder contains a "Business Applicant" subfolder with files
- **WHEN** the File Uploads section loads
- **THEN** those files SHALL be displayed in the Business Applicant section

#### Scenario: Files exist in individual applicant folders

- **GIVEN** the SharePoint project folder contains subfolders named after individual applicants
- **AND** those folders contain files
- **WHEN** the File Uploads section loads
- **THEN** those files SHALL be displayed in the Individual Applicants section

### Requirement: Display Existing Files as Read-Only List

Existing files from SharePoint SHALL be displayed as a simple list of filenames with no interactive actions.

The display SHALL:
- Show only the filename
- Not include download links
- Not include remove/delete buttons
- Be visually consistent with newly uploaded files

#### Scenario: User views existing files

- **WHEN** a user views the File Uploads section with existing files
- **THEN** each file SHALL display only its filename
- **AND** files SHALL NOT be clickable or downloadable
- **AND** files SHALL NOT have remove buttons

### Requirement: Loading and Error States

The system SHALL display appropriate loading and error states when fetching files.

#### Scenario: Files are being fetched

- **WHEN** the system is fetching files from SharePoint
- **THEN** the system SHALL display a loading indicator in each section
- **AND** the upload areas SHALL remain functional

#### Scenario: File fetch fails

- **WHEN** the system fails to fetch files from SharePoint
- **THEN** the system SHALL display an error message
- **AND** the user SHALL still be able to upload new files
- **AND** the error SHALL NOT block the upload functionality

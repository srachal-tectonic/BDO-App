# Borrower Portal - File Uploads Section Redesign

## ADDED Requirements

### Requirement: File Uploads About Section

The File Uploads step (Step 7) SHALL display an expandable "About This Section" accordion at the top of the page.

The accordion SHALL contain the following guidance text:
> "Please upload all required documents for your loan application. Organize your files by category to help us process your application more efficiently. Accepted formats include PDF, JPG, PNG, and common document formats."

The accordion SHALL:
- Be expanded by default when the page loads
- Be collapsible by clicking the header
- Use the same styling pattern as other "About This Section" accordions in the application

#### Scenario: User views File Uploads section

- **WHEN** a user navigates to the File Uploads step in the Borrower Portal
- **THEN** the system SHALL display an "About This Section" accordion at the top
- **AND** the accordion SHALL be expanded by default
- **AND** the accordion SHALL contain guidance text about uploading documents

### Requirement: Reorganized File Upload Categories

The File Uploads section SHALL be organized into four distinct upload categories that align with the SharePoint folder structure:
1. **Business Applicant** - For documents related to the primary business entity
2. **Individual Applicants** - For personal documents of individual applicants
3. **Other Businesses** - For documents related to other businesses owned by applicants
4. **Project Files** - For general project-related documents

Each category SHALL have its own upload area with appropriate file type fields.

#### Scenario: User views file upload categories

- **WHEN** a user views the File Uploads section
- **THEN** the system SHALL display four upload categories: Business Applicant, Individual Applicants, Other Businesses, and Project Files
- **AND** each category SHALL be visually distinct with a section header

### Requirement: Applicant Selection Modal for Individual Uploads

When a user attempts to upload a file in the "Individual Applicants" section, the system SHALL display a modal prompting the user to select which individual applicant the file belongs to.

The modal SHALL:
- Display a list of all individual applicants from the current application
- Show each applicant's full name (first name + last name)
- Allow the user to select one applicant by clicking on their name
- Include a Cancel button to dismiss the modal without uploading
- Close automatically after an applicant is selected

After selection, the file upload SHALL proceed with the selected applicant's name used to determine the SharePoint folder destination.

#### Scenario: User uploads file to Individual Applicants section

- **WHEN** a user selects a file to upload in the Individual Applicants section
- **THEN** the system SHALL display a modal with the title "Select Individual Applicant"
- **AND** the modal SHALL list all individual applicants from the application
- **AND** each applicant's full name SHALL be displayed as a clickable option

#### Scenario: User selects applicant from modal

- **WHEN** a user clicks on an applicant name in the selection modal
- **THEN** the modal SHALL close
- **AND** the file upload SHALL proceed
- **AND** the file SHALL be uploaded to a SharePoint folder named after the selected applicant

#### Scenario: User cancels applicant selection

- **WHEN** a user clicks the Cancel button in the applicant selection modal
- **THEN** the modal SHALL close
- **AND** the file upload SHALL be cancelled
- **AND** no file SHALL be uploaded

#### Scenario: No individual applicants exist

- **WHEN** a user views the Individual Applicants upload section
- **AND** no individual applicants have been added to the application
- **THEN** the system SHALL display a message indicating no applicants are available
- **AND** the upload functionality SHALL be disabled for this section

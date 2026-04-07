# Borrower Portal - File Uploads Card Layout Styling

## MODIFIED Requirements

### Requirement: Card-Based Section Layout

Each file upload section SHALL be displayed within a card container with the following styling:
- White background (`bg-white`)
- Gray border (`border border-[#e5e7eb]`)
- Rounded corners (`rounded-lg`)
- Padding (`p-6`)

The section header SHALL:
- Use `text-lg font-semibold text-[#1a1a1a]`
- Have bottom padding and a gray bottom border (`mb-4 pb-3 border-b border-[#e5e7eb]`)
- NOT use the blue underline styling

#### Scenario: User views file upload sections

- **WHEN** a user views the File Uploads step
- **THEN** each section (Business Applicant, Individual Applicants, Other Businesses, Project Files) SHALL be displayed in a white card with border
- **AND** the section headers SHALL have a gray bottom border instead of a blue underline

### Requirement: Required Uploads Subsection for Business Applicant

The Business Applicant section SHALL display a "Required Uploads" subsection that lists the documents needed.

The subsection SHALL:
- Display a heading "Required Uploads" in `text-[15px] font-semibold text-[#1f2937]`
- Display the text "Please upload the following documents for **[Business Name]**:" where [Business Name] is dynamically pulled from the application's business entity data
- Display the following required documents as a bullet list:
  - Last Three Years of Federal Tax Returns
  - Interim Income Statement and Balance Sheet
  - Accounts Payable and Accounts Receivable Aging Reports
  - Debt Schedule

#### Scenario: User views Business Applicant section with business name

- **WHEN** a user views the Business Applicant section
- **AND** a business entity name exists in the application
- **THEN** the system SHALL display "Please upload the following documents for **[Business Name]**:"
- **AND** the business name SHALL be displayed in bold/semibold styling

#### Scenario: User views Business Applicant section without business name

- **WHEN** a user views the Business Applicant section
- **AND** no business entity name exists in the application
- **THEN** the system SHALL display "Please upload the following documents:"
- **AND** the required uploads list SHALL still be displayed

### Requirement: Required Uploads Subsection for Individual Applicants

The Individual Applicants section SHALL display a "Required Uploads" subsection that lists the documents needed for each individual applicant.

The required documents SHALL be:
- Last Three Years Personal Federal Tax Returns
- Personal Financial Statement
- Personal Income and Expense Analysis

#### Scenario: User views Individual Applicants section

- **WHEN** a user views the Individual Applicants section
- **AND** at least one individual applicant exists
- **THEN** the system SHALL display the required uploads list

### Requirement: File Removal Disabled

Users SHALL NOT be able to remove uploaded files from the UI.

The file list SHALL:
- NOT display a remove/delete button (X icon)
- Display files as read-only entries
- Files uploaded to SharePoint remain visible but cannot be removed from the interface

#### Scenario: User views uploaded files

- **WHEN** a user has uploaded files to a section
- **THEN** the files SHALL be displayed without a remove button
- **AND** the user SHALL NOT be able to delete or remove files from the list

### Requirement: Simplified File Display

Uploaded files SHALL be displayed with only the filename, without additional badges or metadata.

The file display SHALL:
- Show only the original filename
- NOT display file type badges
- NOT display "SharePoint" badge
- NOT display year badges
- NOT provide a download link or clickable URL

#### Scenario: User views uploaded file list

- **WHEN** a user views the list of uploaded files in any section
- **THEN** each file SHALL display only its filename
- **AND** no badges or additional metadata SHALL be visible

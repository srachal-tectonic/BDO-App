# PDF Tools Capability

## ADDED Requirements

### Requirement: PDF Tools Navigation
The BDO project view SHALL display a "PDF Tools" button to the right of the Notes tab that navigates to the PDF Tools page.

#### Scenario: User clicks PDF Tools button
- **WHEN** a BDO user is viewing a project at `/bdo/projects/[id]`
- **AND** clicks the "PDF Tools" button
- **THEN** they are navigated to `/bdo/projects/[id]/pdf-tools`

#### Scenario: PDF Tools button visibility
- **WHEN** a BDO user views a project page
- **THEN** the "PDF Tools" button is visible as a button (not a tab) to the right of the Notes tab

### Requirement: PDF Import Upload
The system SHALL allow BDO users to upload fillable PDF forms and extract form field data.

#### Scenario: Upload valid PDF
- **WHEN** a user uploads a fillable PDF file
- **THEN** the system extracts all form fields with their names, types, and current values
- **AND** displays the extracted fields in the mapping interface
- **AND** provides AI-suggested mappings to application fields

#### Scenario: Upload invalid file type
- **WHEN** a user attempts to upload a non-PDF file
- **THEN** the system displays an error message "Please select a PDF file"
- **AND** does not process the file

#### Scenario: View recent imports
- **WHEN** a user is on the PDF import upload step
- **THEN** they can see a list of recent import sessions for the current project
- **AND** can click on a session to continue mapping or re-apply

### Requirement: PDF Field Mapping
The system SHALL allow users to map extracted PDF fields to loan application fields.

#### Scenario: Map PDF field to application field
- **WHEN** a user is on the mapping step
- **THEN** they can select an application section for each PDF field
- **AND** select a specific field within that section
- **AND** see the current value from the PDF displayed

#### Scenario: Apply mapping template
- **WHEN** a user has saved mapping templates
- **THEN** they can select a template to auto-populate all field mappings
- **AND** see a confirmation of how many mappings were applied

#### Scenario: Remove field mapping
- **WHEN** a user clicks the remove button on a field mapping
- **THEN** that mapping is removed from the list
- **AND** the field will not be imported

### Requirement: PDF Import Application
The system SHALL apply mapped field values from the PDF to the loan application.

#### Scenario: Apply import successfully
- **WHEN** a user reviews their mappings and clicks "Apply Import to Application"
- **THEN** the mapped PDF field values are populated into the corresponding loan application fields
- **AND** the user sees a success message
- **AND** the import session status is updated to "applied"

#### Scenario: Review before applying
- **WHEN** a user is on the review step
- **THEN** they can see all configured mappings with their source values
- **AND** optionally save the mappings as a template before applying

### Requirement: PDF Export
The system SHALL generate fillable PDF forms that can be blank or pre-filled with application data.

#### Scenario: Export blank form
- **WHEN** a user selects a form type and clicks "Blank Fillable PDF"
- **THEN** the system generates a blank fillable PDF of that form type
- **AND** downloads the file automatically

#### Scenario: Export pre-filled form
- **WHEN** a user selects a form type and clicks "Pre-filled PDF"
- **THEN** the system generates a PDF with current loan application data filled in
- **AND** downloads the file automatically

#### Scenario: Select form type
- **WHEN** a user is on the export tab
- **THEN** they can select from available form types including:
  - SBA Form 1919 - Borrower Information
  - SBA Form 1920 - Lender's Application
  - SBA Form 413 - Personal Financial Statement
  - SBA Form 912 - Statement of Personal History
  - IRS Form 4506-T - Request for Transcript
  - Business Questionnaire
  - Sources & Uses Statement

### Requirement: Mapping Templates
The system SHALL allow users to save and reuse field mapping configurations.

#### Scenario: Save mapping template
- **WHEN** a user is on the review step
- **AND** enters a template name and clicks "Save Template"
- **THEN** the current mappings are saved as a reusable template
- **AND** the template appears in the templates list

#### Scenario: View saved templates
- **WHEN** a user navigates to the Mapping Templates tab
- **THEN** they see a list of all saved templates with name, field count, and source form name

#### Scenario: Delete template
- **WHEN** a user clicks the delete button on a template
- **THEN** the template is removed from the system
- **AND** no longer appears in the templates list or dropdown

#### Scenario: Use template from list
- **WHEN** a user clicks "Use Template" on a saved template
- **THEN** they are switched to the import tab
- **AND** the template mappings are applied to the current session

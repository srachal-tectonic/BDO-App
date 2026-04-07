# Questionnaire Export Capability

## ADDED Requirements

### Requirement: Export to PDF Button
The Business Questionnaire page SHALL display an "Export to PDF" button that generates a downloadable PDF document.

#### Scenario: Export button visibility
- **WHEN** a BDO user views the Business Questionnaire page at `/bdo/borrower-portal/[id]/questionnaire`
- **THEN** an "Export to PDF" button is visible in the page header area
- **AND** the button displays a download/file icon

#### Scenario: Export button click
- **WHEN** a user clicks the "Export to PDF" button
- **THEN** the system generates a PDF document
- **AND** downloads the file automatically
- **AND** the filename follows the format `{ProjectName}_Business_Questionnaire.pdf`

#### Scenario: Export loading state
- **WHEN** a user clicks the "Export to PDF" button
- **THEN** the button displays a loading indicator
- **AND** is disabled until generation completes

### Requirement: PDF Header Section
The generated PDF SHALL include a header section with document identification information.

#### Scenario: PDF title display
- **WHEN** a PDF is generated
- **THEN** "Business Questionnaire" appears as the main title at the top of the document
- **AND** the title is displayed in large, bold text

#### Scenario: PDF subtitle display
- **WHEN** a PDF is generated for a project
- **THEN** the project name appears below the title as a subtitle
- **AND** the export date appears below the subtitle in format "Exported: {Month} {Day}, {Year}"

### Requirement: PDF Category Sections
The generated PDF SHALL group questions by their mainCategory with distinct section headers.

#### Scenario: Category section headers
- **WHEN** a PDF is generated with questions in multiple categories
- **THEN** each category appears as a section header (e.g., "Business Overview")
- **AND** a blue underline appears below each section header
- **AND** sections appear in order: Business Overview, Project Purpose, Industry

#### Scenario: Project Purpose section header
- **WHEN** a PDF is generated with questions in the "Project Purpose" category
- **THEN** the section header includes the primary project purpose (e.g., "Project Purpose - Business Acquisition")

### Requirement: PDF Question Numbering
The generated PDF SHALL display questions with sequential numbering across all sections.

#### Scenario: Sequential question numbers
- **WHEN** a PDF is generated with questions across multiple categories
- **THEN** questions are numbered sequentially (1, 2, 3...)
- **AND** numbering continues across category sections (not restarting)
- **AND** question text appears in bold after the number

### Requirement: PDF Answer Fields
The generated PDF SHALL include fillable text fields for each question's answer.

#### Scenario: Answer field with response
- **WHEN** a PDF is generated for a question that has a saved response
- **THEN** a text field appears below the question
- **AND** the field has a gray background
- **AND** the field contains the saved response text

#### Scenario: Answer field without response
- **WHEN** a PDF is generated for a question with no saved response
- **THEN** a text field appears below the question
- **AND** the field has a gray background
- **AND** the field is empty but fillable

#### Scenario: Multi-page support
- **WHEN** a PDF is generated with many questions
- **AND** content exceeds one page
- **THEN** additional pages are created automatically
- **AND** content flows properly across page boundaries

## ADDED Requirements

### Requirement: Borrower Forms Tab
The Loan Application page SHALL include a "Borrower Forms" tab positioned after the "Notes" tab that allows BDOs to generate and manage fillable PDF forms for borrowers.

#### Scenario: Tab visibility and position
- **WHEN** a BDO views the Loan Application page
- **THEN** a "Borrower Forms" tab is displayed in the tab list
- **AND** it is positioned after the "Notes" tab and before "Broker Access" tab
- **AND** the tab displays a FileText icon with the label "Borrower Forms"

#### Scenario: View Borrower Forms section
- **WHEN** a BDO clicks the "Borrower Forms" tab
- **THEN** the section displays the title "Borrower Forms"
- **AND** displays descriptive text "Generate fillable PDF forms for borrowers to complete and upload."
- **AND** displays a "Generate Forms for Borrower" card with an action button

### Requirement: Form Generation
The BorrowerFormsSection SHALL allow BDOs to generate project-specific PDF forms pre-filled with available data.

#### Scenario: Generate forms for first time
- **WHEN** no forms have been generated yet
- **THEN** an empty state message is displayed explaining the feature
- **AND** a "Generate Forms" button is available
- **WHEN** the BDO clicks "Generate Forms"
- **THEN** forms are generated and a success toast is displayed
- **AND** the generated forms list appears

#### Scenario: Regenerate existing forms
- **WHEN** forms have already been generated
- **THEN** the button displays "Regenerate Forms"
- **AND** portal link sharing options are displayed
- **WHEN** the BDO clicks "Regenerate Forms"
- **THEN** new forms are generated replacing the previous ones

### Requirement: Generated Forms List
The BorrowerFormsSection SHALL display a list of all generated forms with their current status.

#### Scenario: Display forms with status badges
- **WHEN** forms have been generated
- **THEN** each form displays its name, status badge, and relevant timestamps
- **AND** status badges are color-coded:
  - Pending: amber/yellow
  - Downloaded: blue
  - Uploaded: purple
  - Completed (imported): green
  - Error: red/destructive

#### Scenario: Download form
- **WHEN** a BDO clicks the "Download" button on a form
- **THEN** the form PDF is downloaded to their device

#### Scenario: Progress tracking
- **WHEN** forms are displayed
- **THEN** a progress indicator shows "X of Y forms completed by borrower"
- **AND** the generation date is displayed

### Requirement: Portal Link Sharing
The BorrowerFormsSection SHALL provide functionality to share the borrower portal link.

#### Scenario: Copy portal link
- **WHEN** the BDO clicks "Copy Portal Link"
- **THEN** the portal URL is copied to the clipboard
- **AND** a success toast notification is displayed

#### Scenario: Open portal in new tab
- **WHEN** the BDO clicks "Open Portal"
- **THEN** the borrower portal opens in a new browser tab

#### Scenario: Share instructions card
- **WHEN** forms have been generated
- **THEN** a sharing instructions card is displayed
- **AND** it shows the portal URL with a copy button
- **AND** it explains how borrowers can use the portal

### Requirement: Generated Form Data Model
Each generated form SHALL track the following data fields.

#### Scenario: Form data structure
- **WHEN** a form is generated and stored
- **THEN** it contains an `id` field with a unique identifier
- **AND** a `projectId` field linking to the project
- **AND** a `formName` field with the form title
- **AND** a `status` field with one of: 'pending', 'downloaded', 'uploaded', 'imported', 'error'
- **AND** a `generatedAt` timestamp
- **AND** optional `downloadedAt`, `uploadedAt`, and `importedAt` timestamps

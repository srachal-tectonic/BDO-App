# Individual Applicants UI

## ADDED Requirements

### Requirement: Ownership Summary Table
The Individual Applicants section SHALL display an ownership summary table at the top for quick data entry.

#### Scenario: View ownership table
- **WHEN** a BDO user views the Individual Applicants step
- **THEN** they see an "Ownership of Applicant" table with columns:
  - Owner's Legal Name (First Name, Last Name)
  - Title (dropdown: Managing Partner, Partner, Owner, Minority Owner, Member)
  - Ownership percentage
  - Gender (dropdown: Male, Female, Not Disclosed)

#### Scenario: Edit owner in table
- **WHEN** a BDO user modifies a field in the ownership table
- **THEN** the corresponding individual applicant data is updated immediately
- **AND** the total ownership percentage recalculates

#### Scenario: Add owner via table
- **WHEN** a BDO user clicks an empty row in the ownership table
- **THEN** a new individual applicant is created
- **AND** the row becomes editable

#### Scenario: View ownership total
- **WHEN** viewing the ownership table
- **THEN** the bottom row displays the sum of all ownership percentages
- **AND** a note reminds users that ownership must total 100%

### Requirement: Owner Cards with Completion Status
The Individual Applicants section SHALL display owner cards showing completion progress and quick actions.

#### Scenario: View owner cards
- **WHEN** a BDO user views the Individual Applicants step
- **THEN** they see a card for each individual applicant showing:
  - Avatar icon with owner name
  - Title and ownership percentage
  - Completion progress bar (0-100%)
  - Status indicator (Complete or Needs attention)

#### Scenario: Calculate completion status
- **WHEN** displaying an owner card
- **THEN** the completion percentage is calculated based on required fields:
  - First Name
  - Last Name
  - Email
  - Phone
  - SSN
  - Project Role
- **AND** 100% shows green "Complete" status
- **AND** less than 100% shows amber "Needs attention" status

#### Scenario: Navigate to owner detail
- **WHEN** a BDO user clicks on an owner card (not action buttons)
- **THEN** they navigate to the individual applicant detail page

### Requirement: Borrower Portal Link Actions
Owner cards SHALL provide actions to share borrower portal links with applicants.

#### Scenario: Send portal link via email
- **WHEN** a BDO user clicks "Send Link" on an owner card
- **THEN** their email client opens with:
  - To: The applicant's email (if available)
  - Subject: Pre-filled with project name
  - Body: Pre-filled message containing the borrower portal URL

#### Scenario: Copy portal link
- **WHEN** a BDO user clicks "Copy Link" on an owner card
- **THEN** the borrower portal URL is copied to clipboard
- **AND** a toast notification confirms the copy
- **AND** the button shows a checkmark briefly

#### Scenario: Remove owner
- **WHEN** a BDO user clicks "Remove" on an owner card
- **AND** there is more than one owner
- **THEN** the individual applicant is deleted
- **AND** the Remove button is hidden if only one owner remains

## MODIFIED Requirements

### Requirement: Individual Applicant Data Fields
The IndividualApplicant type SHALL include a gender field.

#### Scenario: Store gender selection
- **WHEN** a BDO user selects a gender in the ownership table
- **THEN** the selection is stored in the applicant's `gender` field
- **AND** persists when the application is saved

## REMOVED Requirements

### Requirement: Inline Expandable Form Fields
The inline expandable accordion with detailed form fields (Personal Information, Project & Business Involvement, Personal Financials) is removed from the Individual Applicants section. These fields are now accessed via the individual applicant detail page.

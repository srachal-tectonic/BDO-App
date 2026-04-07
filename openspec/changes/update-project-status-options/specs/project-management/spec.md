# Project Management - Status Options Update

## ADDED Requirements

### Requirement: Project Status Values
The system SHALL support the following project status values: "Draft", "Watch List", "Warmer Leads", "Active Lead", "PQ Advance", "PQ More Info", "UW", "Closing", "Adverse Action", "Withdrawn".

#### Scenario: Valid status values
- **WHEN** a project status is set or changed
- **THEN** the status MUST be one of the defined values: Draft, Watch List, Warmer Leads, Active Lead, PQ Advance, PQ More Info, UW, Closing, Adverse Action, Withdrawn

#### Scenario: Status color coding
- **WHEN** a project status is displayed
- **THEN** the status SHALL be color-coded according to its category:
  - Draft: Gray
  - Watch List, Warmer Leads: Blue
  - Active Lead: Green
  - PQ Advance, PQ More Info: Yellow/Amber
  - UW: Purple
  - Closing: Teal
  - Adverse Action, Withdrawn: Red

### Requirement: Inline Status Editing
The system SHALL allow users to change project status directly from the projects table view using an inline dropdown selector.

#### Scenario: Status dropdown display
- **WHEN** a user views the projects table
- **THEN** the Status column SHALL display a dropdown selector for each project row

#### Scenario: Changing status via dropdown
- **WHEN** a user selects a new status from the dropdown
- **THEN** the system SHALL immediately update the project status in the database
- **AND** the table SHALL reflect the new status without page refresh

#### Scenario: Status change persistence
- **WHEN** a user changes a project status via the dropdown
- **THEN** the new status SHALL be persisted to Firestore
- **AND** the status change SHALL be reflected across all views of the project

#### Scenario: Status change error handling
- **WHEN** a status change fails to persist
- **THEN** the system SHALL revert the dropdown to the previous status
- **AND** display an error message to the user

## REMOVED Requirements

### Requirement: Legacy Stage Values
**Reason**: The previous stage values (Lead, BDO, Underwriting, Closing, Servicing) do not reflect the actual pipeline workflow.
**Migration**: Existing projects will be migrated to equivalent new status values.

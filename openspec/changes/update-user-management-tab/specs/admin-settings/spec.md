# Admin Settings - User Management Tab

## MODIFIED Requirements

### Requirement: User Management Tab
The Admin Settings SHALL include a "User Management" tab for managing application users.

#### Scenario: Tab naming
- **WHEN** the Admin Settings page is displayed
- **THEN** the tab SHALL be labeled "User Management" instead of "Firebase Users"

#### Scenario: Add User button
- **WHEN** the User Management tab is active
- **THEN** an "Add User" button SHALL be displayed in the card header
- **AND** clicking the button SHALL open the Add User modal

## ADDED Requirements

### Requirement: Add User Modal
The system SHALL provide a modal dialog for adding new users.

#### Scenario: Modal fields
- **WHEN** the Add User modal is opened
- **THEN** the modal SHALL contain the following fields:
  - First Name (text input)
  - Last Name (text input)
  - Email (email input, required)
  - Phone (text input)
  - Role (dropdown, required)

#### Scenario: Role options
- **WHEN** the Role dropdown is opened
- **THEN** the following options SHALL be available:
  - BDO
  - BDO Manager
  - Credit Executive
  - BDA

#### Scenario: User creation success
- **WHEN** the user fills in required fields and clicks "Add User"
- **THEN** a new user document SHALL be created in Firestore
- **AND** the user list SHALL refresh to show the new user
- **AND** the modal SHALL close
- **AND** the form SHALL be reset

#### Scenario: User creation validation
- **WHEN** the user attempts to submit without required fields
- **THEN** the system SHALL prevent submission
- **AND** display appropriate validation messages

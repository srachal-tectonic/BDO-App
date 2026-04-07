# Project Management - Added Date Column

## ADDED Requirements

### Requirement: Added Date Column Display
The Projects table SHALL display an "Added Date" column showing when each project was created.

#### Scenario: Column position
- **WHEN** the Projects table is displayed
- **THEN** the "Added Date" column SHALL appear between the "Status" column and the "Actions" column

#### Scenario: Date formatting
- **WHEN** a project's Added Date is displayed
- **THEN** the date SHALL be formatted in CST (America/Chicago) timezone
- **AND** the format SHALL include both date and time (e.g., "Jan 14, 2026 2:30 PM")

#### Scenario: Automatic population
- **WHEN** a project is created
- **THEN** the Added Date SHALL be automatically set to the creation timestamp
- **AND** no manual input SHALL be required from the user

#### Scenario: Missing date handling
- **WHEN** a project has no createdAt value
- **THEN** the Added Date column SHALL display a dash "-" or appropriate placeholder

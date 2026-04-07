# DSCR Period Dropdowns Capability

## MODIFIED Requirements

### Requirement: DSCR Period Selection
The DSCR section SHALL display Period fields as dropdown selects with predefined year options instead of free-text inputs.

#### Scenario: Period dropdown options
- **WHEN** a user views the DSCR section in the Funding Structure step
- **THEN** each Period field (1-4) displays as a dropdown select
- **AND** each dropdown contains options: "2022", "2023", "2024", "2025", "Interim"

#### Scenario: Period selection
- **WHEN** a user clicks on a Period dropdown
- **AND** selects an option (e.g., "2024")
- **THEN** the selected value is displayed in the dropdown
- **AND** the value is saved to the application data

#### Scenario: Empty period state
- **WHEN** a Period dropdown has no selection
- **THEN** the dropdown displays placeholder text "Select period"

#### Scenario: Period persistence
- **WHEN** a user selects a period value
- **AND** navigates away from the page
- **AND** returns to the Funding Structure step
- **THEN** the previously selected period value is displayed

#### Scenario: Read-only mode
- **WHEN** the form is in read-only mode
- **THEN** the Period dropdowns are disabled
- **AND** the user cannot change the selected values

### Requirement: DSCR Data Storage
The application store SHALL persist DSCR period and ratio values.

#### Scenario: Store DSCR data
- **WHEN** a user selects a period or enters a DSCR value
- **THEN** the value is stored in the application state under `dscr` field
- **AND** the data persists to Firestore when the application is saved

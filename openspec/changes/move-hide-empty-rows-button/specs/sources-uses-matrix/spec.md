## MODIFIED Requirements

### Requirement: Hide Empty Rows Toggle Position
The "Hide Empty Rows" / "Show Empty Rows" toggle button SHALL be positioned below the "Current Spreads" card and above the Sources & Uses table.

#### Scenario: Button position with existing workbook
- **GIVEN** a user views the Sources and Uses matrix
- **AND** a spreads workbook exists for the project
- **WHEN** the matrix is rendered
- **THEN** the "Hide Empty Rows" toggle button appears below the "Current Spreads" card
- **AND** the button appears above the Sources & Uses table

#### Scenario: Button position without workbook
- **GIVEN** a user views the Sources and Uses matrix
- **AND** no spreads workbook exists for the project
- **WHEN** the matrix is rendered
- **THEN** the "Hide Empty Rows" toggle button appears above the Sources & Uses table
- **AND** the "Create Spreads" button appears at the top of the card

#### Scenario: Toggle functionality unchanged
- **GIVEN** a user views the Sources and Uses matrix
- **WHEN** the user clicks the "Hide Empty Rows" button
- **THEN** rows with zero totals are hidden from the table
- **AND** the button text changes to "Show Empty Rows"

## ADDED Requirements

### Requirement: Auto-Collapse Empty Sources & Uses Cards
The system SHALL automatically collapse a Sources & Uses card (7(a) Standard, 504, or 7(a) Express) when all row values in that table are zero or undefined. The system SHALL automatically expand a card when its table receives non-zero data (e.g., after marking a new primary spread). The user SHALL still be able to manually expand or collapse any card regardless of data state.

#### Scenario: Initial load with no primary spread
- **WHEN** the BDO opens Step 2 (Financials) and no primary spread is set
- **THEN** all three Sources & Uses cards are collapsed

#### Scenario: Primary spread populates only 7(a) data
- **WHEN** the BDO marks a spread as primary that has data only in the 7(a) table
- **THEN** the 7(a) Standard card auto-expands
- **AND** the 504 and Express cards remain collapsed

#### Scenario: Switching primary spread causes table data to change
- **WHEN** the BDO switches to a different primary spread that populates the 504 table and empties the 7(a) table
- **THEN** the 504 card auto-expands
- **AND** the 7(a) Standard card auto-collapses

#### Scenario: Manual toggle is preserved
- **WHEN** the BDO manually collapses an expanded card that has data
- **THEN** the card remains collapsed until data changes or the user re-expands it

### Requirement: Hide Empty Rows by Default
The system SHALL hide empty rows (rows where all source values are zero) by default in every Sources & Uses table. The user SHALL be able to toggle visibility of empty rows via the existing "Show Empty Rows" / "Hide Empty Rows" button.

#### Scenario: Table loads with mixed data
- **WHEN** a Sources & Uses table renders with some rows containing values and others all-zero
- **THEN** only rows with at least one non-zero value are displayed
- **AND** the toggle button reads "Show Empty Rows"

#### Scenario: User toggles to show empty rows
- **WHEN** the BDO clicks "Show Empty Rows"
- **THEN** all rows including empty ones are displayed
- **AND** the toggle button reads "Hide Empty Rows"

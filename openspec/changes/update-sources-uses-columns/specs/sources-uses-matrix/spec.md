## ADDED Requirements

### Requirement: Sources and Uses Matrix Column Structure
The Sources and Uses matrix SHALL display the following columns in order: Use Category, T Bank Loan, Borrower, Seller Note, 3rd Party, Total, SBA Term, %.

#### Scenario: Matrix displays correct columns
- **GIVEN** a user views the Sources and Uses matrix
- **WHEN** the matrix is rendered
- **THEN** the columns are displayed in order: Use Category, T Bank Loan, Borrower, Seller Note, 3rd Party, Total, SBA Term, %

#### Scenario: T Bank Loan column accepts numeric input
- **GIVEN** a user is editing the Sources and Uses matrix
- **WHEN** the user enters a value in the T Bank Loan column
- **THEN** the value is stored as the primary SBA 7(a) loan amount for that use category

#### Scenario: Borrower column accepts numeric input
- **GIVEN** a user is editing the Sources and Uses matrix
- **WHEN** the user enters a value in the Borrower column
- **THEN** the value is stored as the borrower's equity injection for that use category

#### Scenario: 3rd Party column accepts numeric input
- **GIVEN** a user is editing the Sources and Uses matrix
- **WHEN** the user enters a value in the 3rd Party column
- **THEN** the value is stored as third-party financing for that use category

### Requirement: SBA Term Column
The Sources and Uses matrix SHALL include an SBA Term column to track the loan term in months for each use category.

#### Scenario: SBA Term accepts numeric input
- **GIVEN** a user is editing the Sources and Uses matrix
- **WHEN** the user enters a value in the SBA Term column
- **THEN** the value is stored as the loan term in months for that use category

#### Scenario: SBA Term is optional
- **GIVEN** a use category row in the matrix
- **WHEN** the user does not enter an SBA Term value
- **THEN** the field remains empty and does not affect calculations

### Requirement: Row Percentage Column
The Sources and Uses matrix SHALL display a percentage column showing each row's contribution to the grand total.

#### Scenario: Percentage calculated correctly
- **GIVEN** a Sources and Uses matrix with data
- **WHEN** the matrix is rendered
- **THEN** each row's percentage column shows (row total / grand total) * 100, formatted with one decimal place

#### Scenario: Percentage shows 0% when grand total is zero
- **GIVEN** a Sources and Uses matrix with no data entered
- **WHEN** the matrix is rendered
- **THEN** all percentage values display as "0%"

### Requirement: Row Total Calculation
The Total column SHALL sum T Bank Loan, Borrower, Seller Note, and 3rd Party values for each row.

#### Scenario: Row total includes all funding sources
- **GIVEN** a use category with values in multiple columns
- **WHEN** the row total is calculated
- **THEN** the total equals T Bank Loan + Borrower + Seller Note + 3rd Party

#### Scenario: Row total excludes SBA Term
- **GIVEN** a use category with an SBA Term value
- **WHEN** the row total is calculated
- **THEN** the SBA Term value is not included in the total

## REMOVED Requirements

### Requirement: SBA 504 Column
**Reason**: Consolidated into "3rd Party" column to simplify the matrix structure.
**Migration**: Existing SBA 504 values should be migrated to the "3rd Party" field.

### Requirement: CDC Column
**Reason**: Consolidated into "3rd Party" column to simplify the matrix structure.
**Migration**: Existing CDC values should be combined with SBA 504 values into "3rd Party" field.

### Requirement: Column Percentage Header Row
**Reason**: Replaced with per-row percentage column for clearer visibility.
**Migration**: No data migration needed; this was a calculated display only.

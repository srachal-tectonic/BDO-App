# Sources & Uses Tables Specification

## ADDED Requirements

### Requirement: Independent Table State

The application SHALL maintain separate state for each of the three Sources & Uses tables (7(a) Standard, SBA 504, 7(a) Express). Changes to one table SHALL NOT affect the data in the other tables.

#### Scenario: Editing 7(a) Standard table does not affect other tables
- **WHEN** user edits a cell value in the 7(a) Standard Sources & Uses table
- **THEN** only the 7(a) Standard table data is updated
- **AND** the SBA 504 table data remains unchanged
- **AND** the 7(a) Express table data remains unchanged

#### Scenario: Editing SBA 504 table does not affect other tables
- **WHEN** user edits a cell value in the SBA 504 Sources & Uses table
- **THEN** only the SBA 504 table data is updated
- **AND** the 7(a) Standard table data remains unchanged
- **AND** the 7(a) Express table data remains unchanged

#### Scenario: Editing 7(a) Express table does not affect other tables
- **WHEN** user edits a cell value in the 7(a) Express Sources & Uses table
- **THEN** only the 7(a) Express table data is updated
- **AND** the 7(a) Standard table data remains unchanged
- **AND** the SBA 504 table data remains unchanged

### Requirement: Table-Specific Column Labels

The application SHALL display the appropriate fourth column label based on the table type.

#### Scenario: 7(a) Standard table shows "3rd Party" column
- **WHEN** the 7(a) Standard Sources & Uses table is displayed
- **THEN** the fourth funding source column SHALL be labeled "3rd Party"

#### Scenario: SBA 504 table shows "CDC 504" column
- **WHEN** the SBA 504 Sources & Uses table is displayed
- **THEN** the fourth funding source column SHALL be labeled "CDC 504"

#### Scenario: 7(a) Express table shows "3rd Party" column
- **WHEN** the 7(a) Express Sources & Uses table is displayed
- **THEN** the fourth funding source column SHALL be labeled "3rd Party"

### Requirement: Mark as Primary Populates All Tables

When a spread is marked as primary, the application SHALL populate all three Sources & Uses tables with their respective synced data from Firebase.

#### Scenario: Mark as Primary populates all three tables
- **WHEN** user clicks "Mark as Primary" on a synced spread
- **AND** confirms the action
- **THEN** the 7(a) Standard table SHALL be populated with synced `sourcesUses7a` data
- **AND** the SBA 504 table SHALL be populated with synced `sourcesUses504` data
- **AND** the 7(a) Express table SHALL be populated with synced `sourcesUsesExpress` data

### Requirement: Independent Data Persistence

The application SHALL persist each table's data independently to Firestore.

#### Scenario: All three tables persist independently
- **WHEN** project data is saved
- **THEN** `sourcesUses7a` data SHALL be saved to Firestore
- **AND** `sourcesUses504` data SHALL be saved to Firestore
- **AND** `sourcesUsesExpress` data SHALL be saved to Firestore

#### Scenario: Data loads independently on page reload
- **WHEN** the project page is loaded
- **THEN** the 7(a) Standard table SHALL display previously saved `sourcesUses7a` data
- **AND** the SBA 504 table SHALL display previously saved `sourcesUses504` data
- **AND** the 7(a) Express table SHALL display previously saved `sourcesUsesExpress` data

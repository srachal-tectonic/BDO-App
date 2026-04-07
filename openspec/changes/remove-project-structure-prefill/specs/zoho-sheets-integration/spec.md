## MODIFIED Requirements

### Requirement: Spread Creation Cell Pre-Fill
When creating a new Zoho Sheet spread from the template, the system SHALL NOT pre-fill any cells on the "1. Project Structure" sheet. All sources and uses data, loan terms, and project description SHALL only be written to the "2. Sources and Uses" sheet (and other applicable sheets). Other sheet pre-fills (3. Financials, 4. PFS, 5. Collateral, _ProjectMetadata) SHALL remain unchanged.

#### Scenario: New spread created with no Sheet 1 pre-fill
- **WHEN** a user generates a new spread from the loan application
- **THEN** the "1. Project Structure" sheet contains no pre-filled values from the application
- **AND** the "2. Sources and Uses" sheet contains all sources and uses data (use categories, totals, project summary)
- **AND** sheets 3-5 and _ProjectMetadata contain their respective pre-filled data as before

#### Scenario: Sources and Uses data written only to Sheet 2
- **WHEN** the spread data mapper processes sources and uses categories (real estate acquisition, working capital, closing costs, etc.)
- **THEN** data is written to "2. Sources and Uses" rows 6-21 with funding source breakdown columns (T Bank, Borrower, Seller Note, 3rd Party)
- **AND** no data is written to "1. Project Structure" rows 29-44

#### Scenario: Loan terms not written to Sheet 1
- **WHEN** the spread data mapper processes loan terms (T Bank loan, seller note)
- **THEN** no loan term data (amount, rate, term, amortization, payment) is written to "1. Project Structure" columns C or E
- **AND** no project description is written to "1. Project Structure" cell B5

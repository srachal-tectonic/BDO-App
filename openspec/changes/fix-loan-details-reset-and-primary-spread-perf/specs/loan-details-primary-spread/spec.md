## ADDED Requirements

### Requirement: Loan Type Resets When Spread Data Is Empty
When a spread is marked as primary and the resulting Sources & Uses data for a loan program has a $0 loan amount, the corresponding Loan Details type SHALL be cleared back to empty.

#### Scenario: Switching from a spread with 504 data to one without
- **WHEN** a BDO marks a spread as primary
- **AND** the new spread has no 504 Sources & Uses data (CDC 504 column total is $0)
- **THEN** Loan 2 Type SHALL be cleared to empty (not left as "SBA 504")
- **AND** Loan 2 Amount SHALL be set to $0

#### Scenario: Switching from a spread with 7(a) data to one without
- **WHEN** a BDO marks a spread as primary
- **AND** the new spread has no 7(a) Sources & Uses data (tBankLoan column total is $0)
- **THEN** Loan 1 Type SHALL be cleared to empty (not left as "SBA 7(a) Standard")
- **AND** Loan 1 Amount SHALL be set to $0

#### Scenario: Loan type is preserved when amount is non-zero
- **WHEN** a BDO marks a spread as primary
- **AND** a loan amount is non-zero
- **AND** the BDO had previously manually selected a different loan type
- **THEN** the manually selected Loan Type SHALL NOT be overwritten

### Requirement: Batched Store Updates When Marking Primary Spread
When a spread is marked as primary, all three Sources & Uses table updates SHALL be applied in a single store operation to minimize UI re-renders and prevent freezing.

#### Scenario: Mark as primary updates three tables in one operation
- **WHEN** a BDO marks a spread as primary
- **THEN** the 7(a), 504, and Express Sources & Uses tables SHALL be updated in a single Zustand `set()` call
- **AND** the UI SHALL remain responsive (no multi-second freeze)

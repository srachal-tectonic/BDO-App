# Fix Duplicate Header in Borrower Portal

## MODIFIED Requirements

### Requirement: BusinessApplicantSection Header Display
The BusinessApplicantSection component SHALL NOT display its own header when rendered inside the Borrower Portal, as the page already provides the section title and ownership indicator.

#### Scenario: No duplicate headers on step 1
- **WHEN** a user navigates to Borrower Portal step 1 (Business Applicant)
- **THEN** "Business Applicant" title is displayed exactly once
- **AND** "Total Ownership Identified" percentage is displayed exactly once
- **AND** the "About This Section" expandable description remains visible

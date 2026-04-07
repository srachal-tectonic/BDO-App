# Borrower Portal - SBA Eligibility Explanations

## ADDED Requirements

### Requirement: SBA Eligibility Explanation Fields

The system SHALL display a "Please explain" text area field under each SBA eligibility question when the borrower selects "Yes" as their answer.

The explanation fields SHALL:
- Appear conditionally only when "Yes" is selected for the corresponding question
- Be hidden when "No" is selected or no selection has been made
- Accept free-form text input for the borrower to provide context
- Persist the explanation text with the application data
- Be accessible to BDOs reviewing the application

The following questions SHALL each have a corresponding explanation field:
1. Criminal conviction question (`convictedExplanation`)
2. Criminal charge/arraignment question (`arrestedExplanation`)
3. Pending lawsuits question (`pendingLawsuitsExplanation`)
4. Child support delinquency question (`childSupportExplanation`)
5. Tax liens question (`taxLiensExplanation`)
6. Bankruptcy question (`bankruptcyExplanation`)
7. Federal debt delinquency question (`federalDebtExplanation`)

#### Scenario: Borrower answers Yes to a question

- **WHEN** a borrower selects "Yes" for an SBA eligibility question
- **THEN** a text area labeled "Please explain" SHALL appear below the Yes/No options
- **AND** the text area SHALL have placeholder text guiding the borrower to provide details

#### Scenario: Borrower answers No to a question

- **WHEN** a borrower selects "No" for an SBA eligibility question
- **THEN** no explanation text area SHALL be displayed for that question
- **AND** any previously entered explanation text for that question SHALL be cleared

#### Scenario: Borrower provides explanation text

- **WHEN** a borrower enters text in the explanation field
- **THEN** the text SHALL be saved to the application data
- **AND** the text SHALL be associated with the corresponding eligibility question
- **AND** the text SHALL persist when navigating between application steps

#### Scenario: BDO reviews application with explanations

- **WHEN** a BDO views an application where the borrower answered "Yes" to eligibility questions
- **THEN** the BDO SHALL see both the Yes answer and the borrower's explanation text

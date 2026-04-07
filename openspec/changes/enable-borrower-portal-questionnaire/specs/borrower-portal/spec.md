## ADDED Requirements

### Requirement: Standalone Questionnaire Page Access

The system SHALL allow users to access the Business Questionnaire page via the `/bdo/borrower-portal/{projectId}/questionnaire` route without redirecting to another page.

#### Scenario: User opens questionnaire from loan application

- **WHEN** user clicks "Open Business Questionnaire" button from Step 9 of the loan application
- **THEN** the browser navigates to `/bdo/borrower-portal/{projectId}/questionnaire`
- **AND** the questionnaire page loads and displays the questionnaire form
- **AND** the user is NOT redirected to `/bdo/projects`

#### Scenario: Direct navigation to questionnaire page

- **WHEN** user navigates directly to `/bdo/borrower-portal/{projectId}/questionnaire`
- **THEN** the questionnaire page loads with the project's questionnaire data
- **AND** the user can view and edit questionnaire fields

# Projects Table

## MODIFIED Requirements

### Requirement: Display Project List with Summary Information
The system SHALL display a table of projects with summary information including project name, industry, BDO assignment, project total, loan amount, status, and available actions.

#### Scenario: Table columns displayed in correct order
- **WHEN** a user views the projects table at `/bdo/projects`
- **THEN** the table SHALL display columns in this order: Project Name, Industry, BDO, Project Total, Loan Amount, Status, Actions

#### Scenario: BDO column displays assigned user
- **WHEN** a project has an assigned BDO
- **THEN** the BDO column SHALL display the `bdoUserName` value for that project

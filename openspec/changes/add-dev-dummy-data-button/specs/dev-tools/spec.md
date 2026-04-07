## ADDED Requirements

### Requirement: Dev-Only Dummy Data Button
The system SHALL provide a button to populate loan application forms with sample data, visible only in development environment.

#### Scenario: Button visibility in development
- **WHEN** a BDO views a project page
- **AND** the application is running in development mode (localhost)
- **THEN** a "Fill with Dummy Data" button is displayed

#### Scenario: Button hidden in production
- **WHEN** a BDO views a project page
- **AND** the application is running in production mode
- **THEN** the "Fill with Dummy Data" button is NOT displayed

#### Scenario: Populate form with dummy data
- **WHEN** a BDO clicks the "Fill with Dummy Data" button
- **THEN** all loan application form sections are populated with sample data
- **AND** the Project Overview section contains business name, description, and NAICS code
- **AND** the Funding Structure section contains loan amounts and sources/uses
- **AND** the Business Applicant section contains company information
- **AND** at least one Individual Applicant is added with ownership percentage

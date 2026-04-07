## MODIFIED Requirements

### Requirement: BDO Portal Loan Application Steps
The BDO Portal SHALL provide a 10-step loan application workflow with the following steps:
1. Project Overview
2. Financials
3. Business Applicant
4. Individual Applicants
5. Other Owned Businesses
6. Applicant SBA Eligibility
7. Project Information
8. File Uploads
9. Business Questionnaire
10. All Data

#### Scenario: Step 5 displays Other Owned Businesses
- **WHEN** a BDO user navigates to Step 5 of the loan application
- **THEN** the system SHALL display the "Other Owned Businesses" section
- **AND** the sidebar SHALL show "Other Owned Businesses" as the Step 5 title

#### Scenario: Other Owned Businesses data collection
- **WHEN** Step 5 (Other Owned Businesses) is active
- **THEN** the system SHALL display a question asking if owners have other businesses
- **AND** if "Yes" is selected, the system SHALL display a table to capture business details including:
  - Business Name
  - Owners & Ownership Percentages (with ability to add multiple owners per business)
  - Role in Business (Active - Full Time, Active - Part Time, Passive)
  - Industry/NAICS code

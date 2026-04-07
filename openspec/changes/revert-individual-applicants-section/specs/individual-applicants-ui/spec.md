# Individual Applicants UI

## MODIFIED Requirements

### Requirement: Individual Applicant Display
The Individual Applicants section SHALL display each applicant as an expandable accordion card with inline form editing capabilities.

#### Scenario: User views applicant list
- **Given** a user navigates to the Individual Applicants section
- **When** the page loads
- **Then** the first applicant card is automatically expanded
- **And** each applicant displays as a collapsible card
- **And** the card header shows the applicant name or "Owner/Guarantor [N]" if unnamed

#### Scenario: User expands an applicant card
- **Given** a user is viewing the Individual Applicants section
- **When** the user clicks on a collapsed applicant card header
- **Then** the card expands to reveal all form fields
- **And** the expand/collapse chevron icon rotates

#### Scenario: User edits applicant information inline
- **Given** a user has expanded an applicant card
- **When** the user modifies any form field
- **Then** the change is saved to the application state
- **And** the user does not need to navigate to a separate page

### Requirement: Applicant Form Fields
Each expanded applicant card SHALL display comprehensive form fields for data entry.

#### Scenario: User views expanded applicant form
- **Given** a user has expanded an applicant card
- **Then** the following field groups are visible:
  - Basic Information: First Name, Last Name, Email, Phone
  - Identification: Date of Birth, Social Security Number (masked)
  - Address: Street, City, State, Zip Code
  - Role: Project Role dropdown, Ownership Percentage
  - Involvement: Business Role dropdown
  - Experience: Industry Experience type, Years of Experience
  - Financial: Net Worth, Post-Close Liquidity, Required Income from Business

### Requirement: Add and Remove Applicants
Users SHALL be able to add new applicants and remove existing ones.

#### Scenario: User adds a new applicant
- **Given** a user is viewing the Individual Applicants section
- **When** the user clicks the "Add Owner/Guarantor" button
- **Then** a new applicant card is created
- **And** the new card is automatically expanded

#### Scenario: User removes an applicant
- **Given** a user has expanded an applicant card
- **And** there is more than one applicant
- **When** the user clicks the remove button
- **Then** the applicant is removed from the list

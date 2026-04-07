# Owner Detail Page

## ADDED Requirements

### Requirement: Owner Detail Page Access
The application SHALL provide a dedicated page for viewing and editing individual applicant details.

#### Scenario: Navigate to owner detail page
- **WHEN** a BDO user clicks on an owner card in the Individual Applicants section
- **THEN** they navigate to `/bdo/projects/{projectId}/individual/{applicantId}`
- **AND** the page displays the selected applicant's complete information

#### Scenario: View owner not found
- **WHEN** a user navigates to an owner detail page with an invalid applicant ID
- **THEN** they see an "Owner Not Found" message
- **AND** they can navigate back to the Individual Applicants section

### Requirement: Owner Detail Page Header
The owner detail page SHALL display a header with navigation and quick actions.

#### Scenario: View page header
- **WHEN** viewing the owner detail page
- **THEN** the header displays:
  - Back navigation link to Individual Applicants
  - Breadcrumb showing "Individual Applicants › Owner Name"
  - Owner's full name as page title
  - Send Link button
  - Copy Link button

#### Scenario: Send borrower portal link
- **WHEN** a BDO user clicks "Send Link"
- **THEN** their email client opens with pre-filled subject and body
- **AND** the body contains the borrower portal URL

#### Scenario: Copy borrower portal link
- **WHEN** a BDO user clicks "Copy Link"
- **THEN** the borrower portal URL is copied to clipboard
- **AND** a toast notification confirms the copy

### Requirement: Personal Information Section
The owner detail page SHALL display editable personal information fields.

#### Scenario: Edit personal information
- **WHEN** viewing the Personal Information section
- **THEN** the user can edit:
  - First Name
  - Last Name
  - Social Security Number (masked)
  - Estimated Credit Score (dropdown)
  - Mobile Phone Number
  - Email Address
  - Home Address

#### Scenario: Credit score explanation required
- **WHEN** the estimated credit score is "600-649" or "Below 600"
- **THEN** a Credit Score Explanation textarea appears
- **AND** the user should provide an explanation

### Requirement: Project & Business Involvement Section
The owner detail page SHALL display editable business involvement fields.

#### Scenario: Edit project role
- **WHEN** editing the Project Role field
- **THEN** options include: Owner & Guarantor, Owner Non-Guarantor, Non-Owner Key Manager, Other
- **AND** selecting "Non-Owner Key Manager" or "Other" disables Ownership % and Ownership Type fields

#### Scenario: Indirect ownership description
- **WHEN** Ownership Type is set to "Through an Entity"
- **THEN** an Indirect Ownership Description textarea appears

#### Scenario: Edit business role
- **WHEN** editing the Business Role field
- **THEN** options include: Active - Full Time, Active - Part Time, Passive
- **AND** selecting "Passive" disables Travel Time, Experience, and Years of Experience fields

#### Scenario: Business role description required
- **WHEN** Business Role is "Active - Full Time" or "Active - Part Time"
- **THEN** a Business Role Description textarea appears

#### Scenario: Plan to be on-site required
- **WHEN** Travel Time to Business is "more than 120 minutes"
- **THEN** a Plan to be On-Site textarea appears

### Requirement: Personal Financials Section
The owner detail page SHALL display editable financial fields with currency formatting.

#### Scenario: Edit personal financials
- **WHEN** viewing the Personal Financials section
- **THEN** the user can edit currency-formatted inputs for:
  - Net Worth
  - Post-Close Liquidity
  - Required Income from Business
  - Equity Injection Amount
- **AND** each field has a learn more button with contextual help

### Requirement: Auto-Save Functionality
The owner detail page SHALL automatically save changes.

#### Scenario: Auto-save changes
- **WHEN** the user modifies any field
- **THEN** changes are automatically saved after 2 seconds of inactivity
- **AND** no manual save button is required during editing

#### Scenario: Cleanup on navigation
- **WHEN** the user navigates away from the page
- **THEN** any pending auto-save timeout is cleared
- **AND** no memory leaks occur

### Requirement: Learn More Help Panels
Each complex field SHALL have a learn more button with contextual help.

#### Scenario: View learn more content
- **WHEN** a user clicks a learn more (?) button next to a field
- **THEN** a panel opens with:
  - What information is being requested
  - Why we need it

## MODIFIED Requirements

### Requirement: IndividualApplicant Schema
The IndividualApplicant type SHALL include additional fields for the detail page.

#### Scenario: New schema fields
- **WHEN** saving applicant data from the detail page
- **THEN** the following new fields are stored:
  - `estimatedCreditScore` (string) - Credit score range selection
  - `creditScoreExplanation` (string) - Explanation for low credit scores
  - `planToBeOnSite` (string) - Plan for long commute situations

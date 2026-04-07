# Individual Applicant Cards

## MODIFIED Requirements

### Requirement: Personal Information Section Fields
The Personal Information section MUST display identity and contact fields for each individual applicant.

#### Scenario: User views Personal Information section
Given an individual applicant card is expanded
When the user views the Personal Information section
Then the following fields are displayed in order:
  - First Name (text input)
  - Middle Name (text input)
  - Last Name (text input)
  - Suffix (text input)
  - Social Security Number (masked input)
  - Date of Birth (date input)
  - Phone (tel input)
  - Email (email input)
  - Home Address (address autocomplete)
  - Estimated Credit Score (dropdown)

#### Scenario: User selects credit score range
Given an individual applicant card is expanded
When the user clicks the Estimated Credit Score dropdown
Then the following options are available:
  - 750+
  - 700-749
  - 650-699
  - 600-649
  - Below 600

### Requirement: Project & Business Involvement Section Fields
The Project & Business Involvement section MUST capture the applicant's role and ownership details.

#### Scenario: User views Project & Business Involvement section
Given an individual applicant card is expanded
When the user views the Project & Business Involvement section
Then the following fields are displayed in order:
  - Project Role (dropdown)
  - Ownership % (number input)
  - Ownership Type (dropdown: Direct, Through an Entity)
  - Title (text input)
  - Indirect Ownership Description (textarea, conditional)
  - Role in Business Operations (dropdown)
  - Travel Time to Business (dropdown)
  - Relevant Experience (dropdown)
  - Years of Experience (dropdown)
  - Role description textarea with label "Describe your role in the business and how your experience qualifies you for it."
  - Plan to be On-Site (dropdown: Yes, No)

#### Scenario: User selects indirect ownership type
Given the user has selected "Through an Entity" for Ownership Type
Then the Indirect Ownership Description textarea is displayed
And the textarea allows multi-line input

#### Scenario: User selects direct ownership type
Given the user has selected "Direct Ownership" for Ownership Type
Then the Indirect Ownership Description textarea is hidden

## REMOVED Requirements

### Requirement: Personal Financials Section
The Personal Financials section is removed from individual applicant cards.

#### Scenario: User views expanded applicant card
Given an individual applicant card is expanded
When the user views all available sections
Then no Personal Financials section is displayed
And no Net Worth field is displayed
And no Post-Close Liquidity field is displayed
And no Required Income from Business field is displayed
And no Equity Injection Amount field is displayed

## ADDED Requirements

### Requirement: Middle Name Field
The system MUST allow individual applicants to provide their middle name for complete identification.

#### Scenario: User enters middle name
Given an individual applicant card is expanded
When the user enters a value in the Middle Name field
Then the value is saved to the applicant's middleName property

### Requirement: Suffix Field
The system MUST allow individual applicants to provide their name suffix (Jr., Sr., III, etc.).

#### Scenario: User enters suffix
Given an individual applicant card is expanded
When the user enters a value in the Suffix field
Then the value is saved to the applicant's suffix property

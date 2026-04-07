# Borrower Portal Steps Reorganization

## MODIFIED Requirements

### Requirement: Borrower Portal Step Navigation
The Borrower Portal SHALL provide an 8-step wizard interface for borrowers to complete their loan application with the following steps in order:
1. Business Applicant
2. Individual Applicants
3. Personal Financial Statements
4. Other Owned Businesses
5. SBA Eligibility
6. Project Information
7. File Uploads
8. Business Questionnaire

#### Scenario: User navigates through all steps
- **WHEN** a borrower accesses the Borrower Portal
- **THEN** they see a horizontal step indicator showing 8 steps
- **AND** they can navigate forward and backward through all steps
- **AND** completed steps are visually marked with a checkmark

#### Scenario: Step 3 displays personal financial information
- **WHEN** the borrower is on step 3 "Personal Financial Statements"
- **THEN** they see a list of all individual applicants
- **AND** for each applicant they can view/edit: Net Worth, Post-Close Liquidity, Required Income from Business, Equity Injection Amount

#### Scenario: Step 4 captures other owned businesses
- **WHEN** the borrower is on step 4 "Other Owned Businesses"
- **THEN** they can add information about affiliate businesses or other businesses they own
- **AND** this information is saved with the loan application

#### Scenario: Step 7 combines all file uploads
- **WHEN** the borrower is on step 7 "File Uploads"
- **THEN** they see file upload sections for both business documents and individual documents
- **AND** business files include: Federal Business Tax Returns, Financial Statements, Other Business Documents
- **AND** individual files include: Personal Federal Tax Returns, Personal Financial Statements, Resume, Other Files

## ADDED Requirements

### Requirement: Personal Financial Statements Section
The system SHALL provide a dedicated section for viewing and editing personal financial information for all individual applicants.

#### Scenario: Display financial summary for all applicants
- **WHEN** the Personal Financial Statements section is displayed
- **THEN** all individual applicants are listed with their financial fields
- **AND** each applicant shows: Net Worth, Post-Close Liquidity, Required Income from Business, Equity Injection Amount
- **AND** the user can edit these values inline

### Requirement: Other Owned Businesses Section
The system SHALL provide a section for capturing information about other businesses owned by the applicants (affiliates).

#### Scenario: Add other owned business
- **WHEN** the borrower clicks "Add Business" in the Other Owned Businesses section
- **THEN** a form is displayed to capture business information
- **AND** the business is added to the list of other owned businesses
- **AND** the data is persisted with the loan application

### Requirement: Combined Files Upload Section
The system SHALL provide a consolidated file upload section that includes both business and individual document uploads.

#### Scenario: Upload business files in combined section
- **WHEN** the borrower is in the File Uploads section
- **THEN** they see a "Business Files" subsection
- **AND** they can upload Federal Business Tax Returns, Financial Statements, and Other Business Documents

#### Scenario: Upload individual files in combined section
- **WHEN** the borrower is in the File Uploads section
- **THEN** they see an "Individual Files" subsection
- **AND** they can upload Personal Federal Tax Returns, Personal Financial Statements, Resume, and Other Files

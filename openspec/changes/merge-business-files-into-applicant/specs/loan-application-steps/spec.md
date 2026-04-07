# Loan Application Steps

## ADDED Requirements

### Requirement: Ten-Step Loan Application Flow
The Loan Application SHALL have exactly 10 steps for BDO users to complete, with Business Applicant and Business Files combined into a single step.

#### Scenario: View loan application steps
- **WHEN** a BDO user views a project's Loan Application tab
- **THEN** the sidebar displays 10 steps in order:
  1. Project Overview
  2. Funding Structure
  3. Business Applicant & Files
  4. Individual Applicants
  5. Individual Files
  6. Applicant SBA Eligibility
  7. Project Information
  8. Business Questionnaire
  9. Risk Scores
  10. All Data

#### Scenario: Navigate through all steps
- **WHEN** a BDO user clicks "Continue" from step 1
- **AND** continues clicking "Continue" through each step
- **THEN** they progress through all 10 steps sequentially
- **AND** step 10 displays "Save All Changes" instead of "Continue"

### Requirement: Combined Business Applicant and Files Step
Step 3 of the Loan Application SHALL display both the Business Applicant form fields and the Business Files section together.

#### Scenario: View combined business step
- **WHEN** a BDO user navigates to step 3 "Business Applicant & Files"
- **THEN** they see the Business Applicant form fields at the top
- **AND** they see the Business Files section below the form fields
- **AND** both sections are functional within the same step

#### Scenario: Upload files in combined step
- **WHEN** a BDO user is on step 3 "Business Applicant & Files"
- **AND** scrolls to the Business Files section
- **THEN** they can upload, view, and manage business files
- **AND** this functions identically to how it worked as a separate step

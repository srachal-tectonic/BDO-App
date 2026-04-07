# BDO Project Page - Remove Business Files from Step 3

## MODIFIED Requirements

### Requirement: Step 3 Business Applicant Content
Step 3 "Business Applicant" SHALL only display the business applicant information form without file upload functionality.

#### Scenario: Step 3 displays only business applicant form
- **WHEN** the user navigates to Step 3 "Business Applicant"
- **THEN** only the BusinessApplicantSection form SHALL be displayed
- **AND** no file upload section SHALL be shown

#### Scenario: Business file uploads available in Step 8
- **WHEN** the user needs to upload business documents
- **THEN** they SHALL use Step 8 "File Uploads" which contains the Business Applicant upload section

## REMOVED Requirements

### Requirement: Business Files Section in Step 3
**Reason**: Redundant with Step 8 "File Uploads" which now consolidates all file uploads.
**Migration**: Users should upload business files in Step 8 "File Uploads" under the "Business Applicant" section.

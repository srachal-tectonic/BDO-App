# File Uploads - Dynamic Instructions

## ADDED Requirements

### Requirement: Dynamic File Upload Instructions
The File Uploads section SHALL display instructions configured in Admin Settings for each upload category.

#### Scenario: Fetch instructions from Admin Settings
- **WHEN** the File Uploads section loads
- **THEN** the system SHALL fetch file upload instructions from the Admin Settings configuration

#### Scenario: Display Business Applicant instructions
- **WHEN** the Business Applicant upload section is displayed
- **THEN** the instructions from Admin Settings `fileUploadInstructions.businessApplicant` SHALL be shown
- **AND** the instructions SHALL appear below the section header

#### Scenario: Display Individual Applicants instructions
- **WHEN** the Individual Applicants upload section is displayed
- **THEN** the instructions from Admin Settings `fileUploadInstructions.individualApplicants` SHALL be shown
- **AND** the instructions SHALL appear below the section header

#### Scenario: Display Other Businesses instructions
- **WHEN** the Other Businesses upload section is displayed
- **THEN** the instructions from Admin Settings `fileUploadInstructions.otherBusinesses` SHALL be shown
- **AND** the instructions SHALL appear below the section header

#### Scenario: Display Project Files instructions
- **WHEN** the Project Files upload section is displayed
- **THEN** the instructions from Admin Settings `fileUploadInstructions.projectFiles` SHALL be shown
- **AND** the instructions SHALL appear below the section header

#### Scenario: Fallback when instructions not configured
- **WHEN** Admin Settings file upload instructions are empty or not configured
- **THEN** the system SHALL display default placeholder text or no instructions

## REMOVED Requirements

### Requirement: Hardcoded File Upload Instructions
**Reason**: Replaced by dynamic instructions from Admin Settings for administrator flexibility.
**Migration**: Existing hardcoded instructions can be copied to Admin Settings configuration.

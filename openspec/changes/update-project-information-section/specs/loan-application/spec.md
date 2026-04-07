# Project Information Section Spec Delta

## ADDED Requirements

### Requirement: Business Acquisition Details
The Project Information section SHALL display a "Business Acquisition Details" header with descriptive text explaining the section purpose.

#### Scenario: Section header displays
- **WHEN** user views the Project Information step
- **THEN** a section header "Business Acquisition Details" is displayed
- **AND** descriptive text explains this section captures details about the business being acquired

### Requirement: DBA Name Field
The system SHALL provide a DBA (Doing Business As) Name field for the seller's business.

#### Scenario: User enters DBA name
- **WHEN** user enters text in the DBA Name field
- **THEN** the value is saved to sellerInfo.dbaName
- **AND** the field accepts any text input

### Requirement: Acquisition Type Selection
The system SHALL provide radio button selection for Type of Acquisition with options "Stock Purchase" and "Asset Purchase".

#### Scenario: User selects acquisition type
- **WHEN** user selects "Stock Purchase" or "Asset Purchase"
- **THEN** the selection is saved to sellerInfo.acquisitionType
- **AND** a help icon provides learn more information about the difference

#### Scenario: Learn more for acquisition type
- **WHEN** user clicks the help icon next to acquisition type
- **THEN** a LearnMorePanel displays explaining stock vs asset purchase differences

### Requirement: Purchasing 100 Percent Question
The system SHALL ask if the buyer is purchasing 100% of the business with Yes/No options.

#### Scenario: User indicates purchasing 100%
- **WHEN** user selects "Yes" for purchasing 100%
- **THEN** the value is saved to sellerInfo.isPurchasing100Percent
- **AND** no additional fields are shown

#### Scenario: User indicates not purchasing 100%
- **WHEN** user selects "No" for purchasing 100%
- **THEN** a textarea appears for describing other owners
- **AND** the description is saved to sellerInfo.otherOwnersDescription

### Requirement: Purchase Contract Status
The system SHALL provide a dropdown for Purchase Contract Status with options including LOI signed, contract executed, etc.

#### Scenario: User selects contract status
- **WHEN** user selects a status from the dropdown
- **THEN** the selection is saved to sellerInfo.contractStatus

### Requirement: Seller Carry Note
The system SHALL ask if the seller will carry a note with Yes/No options.

#### Scenario: User indicates seller will carry note
- **WHEN** user selects "Yes" for seller carry note
- **THEN** a textarea appears for describing the terms
- **AND** the terms are saved to sellerInfo.sellerCarryNoteTerms

#### Scenario: User indicates no seller carry note
- **WHEN** user selects "No" for seller carry note
- **THEN** no additional fields are shown

### Requirement: LOI/Purchase Contract Upload
The system SHALL provide a file upload section for LOI or Purchase Contract documents.

#### Scenario: User uploads contract documents
- **WHEN** user uploads files to the LOI/Purchase Contract section
- **THEN** files are stored and associated with the seller info

### Requirement: Real Estate Purchase Description
The system SHALL provide a textarea for describing real estate purchase details.

#### Scenario: User enters real estate description
- **WHEN** user enters text in the Real Estate Purchase field
- **THEN** the value is saved to sellerInfo.realEstatePurchaseDescription

## REMOVED Requirements

### Requirement: Primary Contact Fields
The Primary Contact Name, Phone, and Email fields SHALL be removed from the Project Information section.

**Reason**: These fields are not present in the updated Replit design and are not required for SBA loan processing.

**Migration**: Existing data in contactName, contactPhone, contactEmail fields will be preserved in the database but not displayed in the UI.

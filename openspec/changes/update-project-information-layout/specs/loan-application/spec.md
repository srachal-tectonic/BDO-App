# Project Information Layout Spec Delta

## MODIFIED Requirements

### Requirement: Business Acquisition Details
The Project Information section SHALL display business acquisition fields in a two-column responsive layout for efficient screen space usage.

#### Scenario: Two-column layout on desktop
- **WHEN** user views the Project Information step on a medium or larger screen
- **THEN** "Legal Name of Business Being Acquired" and "DBA Name of Business Being Acquired" appear side-by-side
- **AND** "Business Address" and "Business Website" appear side-by-side on the next row
- **AND** "Type of Acquisition" and "Are You Purchasing 100%?" appear side-by-side

#### Scenario: Single-column layout on mobile
- **WHEN** user views the Project Information step on a small screen
- **THEN** all fields stack vertically in single column layout
- **AND** the form remains fully functional and readable

#### Scenario: Conditional field spans full width
- **WHEN** user selects "No" for purchasing 100%
- **THEN** the "Other Owners" textarea appears below and spans the full width

## REMOVED Requirements

### Requirement: Real Estate Purchase Description
The Real Estate Purchase description section SHALL be removed from the Project Information step.

**Reason**: This field is not needed in the current workflow and adds unnecessary complexity to the form.

**Migration**: Existing data in `realEstatePurchaseDescription` field will be preserved in the database but not displayed in the UI.

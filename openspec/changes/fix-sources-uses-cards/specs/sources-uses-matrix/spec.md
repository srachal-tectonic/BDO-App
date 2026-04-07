## MODIFIED Requirements

### Requirement: Three Collapsible Cards UI
The UI SHALL display three collapsible cards, one for each Sources & Uses table type, with editable tables.

#### Scenario: Tables are editable and visible without sync
- **GIVEN** a user views the Sources & Uses section
- **WHEN** the page renders (even without Zoho Sheets generated)
- **THEN** all three cards display editable Sources & Uses tables
- **AND** tables show data from the application store
- **AND** users can edit values in the tables

#### Scenario: First card with Spreads section
- **GIVEN** a user views the Sources & Uses section
- **WHEN** the page renders
- **THEN** the first card is titled "Sources & Uses - 7(a) Standard"
- **AND** the first card contains the "Current Spreads" section (when workbook exists)
- **AND** the first card contains the "Create Spreads" button (when no workbook exists)
- **AND** the first card contains an editable Sources & Uses table
- **AND** the first card does NOT contain a Sync button

#### Scenario: Second and third cards without Spreads section
- **GIVEN** a user views the Sources & Uses section
- **WHEN** the page renders
- **THEN** the second card is titled "Sources & Uses - 504"
- **AND** the third card is titled "Sources & Uses - 7(a) Express"
- **AND** both cards contain only editable Sources & Uses tables
- **AND** neither card contains a Spreads section or Sync button

#### Scenario: Data used for Spreads generation
- **GIVEN** a user has entered data in the Sources & Uses tables
- **WHEN** the user clicks "Create Spreads"
- **THEN** the data from the tables is used to prefill the Zoho Sheet

## REMOVED Requirements

### Requirement: Read-only Synced Tables
**Reason**: Tables should be editable, not read-only displays of synced data
**Migration**: Use editable SourcesUsesMatrix component instead of read-only SourcesUsesTable

### Requirement: Sync Button in UI
**Reason**: Sync is triggered externally via API, not from a UI button
**Migration**: Remove Sync button from SourcesUsesCards component

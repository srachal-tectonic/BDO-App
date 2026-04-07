# Sources & Uses Primary Spread Loading Specification

## ADDED Requirements

### Requirement: Load Primary Spread Data on Page Mount

When the Financials step loads and a Primary Spread has been previously selected, the application SHALL automatically populate all three Sources & Uses tables with the synced data from the Primary Spread.

#### Scenario: Page loads with existing Primary Spread
- **WHEN** user navigates to the Financials step
- **AND** a Primary Spread ID exists for the project
- **THEN** the application SHALL fetch the synced data from Firebase
- **AND** populate the 7(a) Standard table with mapped `sourcesUses7a` data
- **AND** populate the SBA 504 table with mapped `sourcesUses504` data
- **AND** populate the 7(a) Express table with mapped `sourcesUsesExpress` data

#### Scenario: Page loads without Primary Spread
- **WHEN** user navigates to the Financials step
- **AND** no Primary Spread ID exists for the project
- **THEN** the application SHALL display empty tables
- **AND** allow the user to manually enter data or select a Primary Spread

### Requirement: Refresh Data When Changing Primary Spread

When a user marks a different spread as Primary, the application SHALL always fetch fresh data and update all three Sources & Uses tables, regardless of whether data was previously populated.

#### Scenario: Change Primary from Spread A to Spread B
- **WHEN** Spread A is currently marked as Primary
- **AND** user clicks "Mark as Primary" on Spread B
- **AND** confirms the action
- **THEN** the application SHALL fetch the latest synced data from Firebase
- **AND** update the 7(a) Standard table with new mapped data
- **AND** update the SBA 504 table with new mapped data
- **AND** update the 7(a) Express table with new mapped data
- **AND** update the Primary badge to show on Spread B
- **AND** remove the Primary badge from Spread A

#### Scenario: Re-select same spread as Primary
- **WHEN** Spread A is currently marked as Primary
- **AND** user clicks "Mark as Primary" on Spread A again
- **THEN** the application SHALL fetch the latest synced data from Firebase
- **AND** refresh all three tables with the current synced data

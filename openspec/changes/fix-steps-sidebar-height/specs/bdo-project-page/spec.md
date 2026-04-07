# BDO Project Page - Sidebar Height Fix

## MODIFIED Requirements

### Requirement: Steps Sidebar Display
The Application Steps sidebar SHALL display with a fixed height that ends after the last step, regardless of main content height.

#### Scenario: Sidebar height consistency
- **WHEN** the user navigates to any step (1-10)
- **THEN** the sidebar height SHALL remain consistent
- **AND** the sidebar SHALL end visually after the last step item

#### Scenario: Sidebar does not stretch with content
- **WHEN** the main content area contains tall content (e.g., File Uploads, All Data)
- **THEN** the sidebar SHALL NOT stretch to match the content height
- **AND** the sidebar SHALL maintain its natural height based on the step list

#### Scenario: Sidebar alignment
- **WHEN** the loan application tab is displayed
- **THEN** the sidebar SHALL be aligned to the top of the grid row
- **AND** the sidebar SHALL use `self-start` alignment to prevent stretching

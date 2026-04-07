# Project Management - Status Filter Dropdown

## MODIFIED Requirements

### Requirement: Project Status Filtering
The Projects table SHALL provide a dropdown selector for filtering projects by status.

#### Scenario: Filter dropdown display
- **WHEN** the Projects page is displayed
- **THEN** a status filter dropdown SHALL be shown in the filters section
- **AND** the dropdown SHALL default to "All" showing all projects

#### Scenario: Filter by specific status
- **WHEN** a user selects a specific status from the dropdown
- **THEN** only projects with that status SHALL be displayed in the table

#### Scenario: Show all projects
- **WHEN** a user selects "All" from the dropdown
- **THEN** all projects SHALL be displayed regardless of status

#### Scenario: Available filter options
- **WHEN** a user opens the filter dropdown
- **THEN** the dropdown SHALL contain "All" as the first option
- **AND** all 10 status values SHALL be available: Draft, Watch List, Warmer Leads, Active Lead, PQ Advance, PQ More Info, UW, Closing, Adverse Action, Withdrawn

## REMOVED Requirements

### Requirement: Filter Buttons
**Reason**: Individual filter buttons for each status create a cluttered UI with 10+ options.
**Migration**: Replaced by dropdown selector with identical functionality.

## ADDED Requirements

### Requirement: File Upload Instructions Tab Accessibility

The Admin Settings page SHALL display a "File Upload Instructions" tab in the navigation bar that allows administrators to access the file upload instructions configuration panel.

#### Scenario: Tab is visible in Admin Settings navigation

- **WHEN** an administrator navigates to the Admin Settings page (`/bdo/admin`)
- **THEN** a "File Upload Instructions" tab is displayed in the TabsList
- **AND** the tab includes an appropriate icon (FileUp)
- **AND** the tab is positioned among the other admin settings tabs

#### Scenario: Tab opens File Upload Instructions content

- **WHEN** an administrator clicks the "File Upload Instructions" tab
- **THEN** the tab becomes active
- **AND** the File Upload Instructions configuration panel is displayed
- **AND** four textarea fields are shown for: Business Applicant, Individual Applicants, Other Businesses, and Project Files

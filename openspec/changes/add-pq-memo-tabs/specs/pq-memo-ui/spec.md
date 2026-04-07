# PQ Memo UI

## ADDED Requirements

### Requirement: Tabbed Navigation in PQ Memo
The PQ Memo form SHALL display a tabbed navigation interface with three tabs: "Overview", "Risk Scores", and "BDO Summary".

#### Scenario: User views PQ Memo with default tab
- **Given** a user navigates to the PQ Memo page
- **When** the page loads
- **Then** the "Overview" tab is active by default
- **And** the Overview tab content (loan structure, project description, key individuals, sources/uses, cash flow) is visible
- **And** three tabs are displayed: "Overview", "Risk Scores", "BDO Summary"

#### Scenario: User switches to Risk Scores tab
- **Given** a user is viewing the PQ Memo page
- **When** the user clicks the "Risk Scores" tab
- **Then** the Risk Scores tab becomes active
- **And** the RiskScoresSection component is displayed
- **And** the user can select risk scores for each category

#### Scenario: User switches to BDO Summary tab
- **Given** a user is viewing the PQ Memo page
- **When** the user clicks the "BDO Summary" tab
- **Then** the BDO Summary tab becomes active
- **And** a placeholder message is displayed

### Requirement: Tab Visual Styling
Tabs SHALL be styled with visual indicators to show active/inactive state.

#### Scenario: Active tab styling
- **Given** a user is viewing the PQ Memo page
- **When** a tab is active
- **Then** the active tab has a blue bottom border (border-blue-500)
- **And** the active tab has a white background
- **And** inactive tabs have a transparent border

#### Scenario: Tab bar styling
- **Given** a user is viewing the PQ Memo page
- **When** the tabs are rendered
- **Then** the tab bar has a gray background (bg-gray-50)
- **And** each tab displays an icon next to its label
- **And** the icons are FileText (Overview), BarChart3 (Risk Scores), and ClipboardList (BDO Summary)

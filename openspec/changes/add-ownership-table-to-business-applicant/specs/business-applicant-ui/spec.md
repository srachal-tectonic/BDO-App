## ADDED Requirements

### Requirement: Ownership Table Display
The BusinessApplicantSection SHALL display an "Ownership of Applicant" table that shows all individual applicants with editable fields for name, ownership percentage, project role, and business role.

#### Scenario: Display existing individual applicants in table
- **WHEN** the BusinessApplicantSection is rendered
- **AND** there are existing individual applicants in the application store
- **THEN** each applicant SHALL be displayed as a row in the ownership table
- **AND** each row SHALL show first name, last name, ownership percentage, project role dropdown, and business role dropdown

#### Scenario: Display empty placeholder rows
- **WHEN** there are fewer than 5 individual applicants
- **THEN** empty placeholder rows SHALL be displayed to fill up to 5 rows total
- **AND** empty rows SHALL be clickable to add a new applicant

#### Scenario: Display totals row
- **WHEN** the ownership table is rendered
- **THEN** a totals row SHALL be displayed at the bottom showing the combined ownership percentage

---

### Requirement: Ownership Percentage Header Display
The BusinessApplicantSection SHALL display the total ownership percentage in the section header when the business entity is not marked as "to be formed".

#### Scenario: Show total ownership in header
- **WHEN** the "Entity to be Formed" checkbox is unchecked
- **THEN** the header SHALL display the total ownership percentage with label "Total Ownership Identified"

#### Scenario: Hide ownership display for entity to be formed
- **WHEN** the "Entity to be Formed" checkbox is checked
- **THEN** the header SHALL NOT display the total ownership percentage

---

### Requirement: Ownership Table Editing
The ownership table SHALL allow inline editing of individual applicant fields.

#### Scenario: Edit applicant name
- **WHEN** a user types in the first name or last name input field
- **THEN** the corresponding individual applicant's name SHALL be updated in the application store

#### Scenario: Edit ownership percentage
- **WHEN** a user changes the ownership percentage value
- **THEN** the individual applicant's ownership percentage SHALL be updated
- **AND** the total ownership calculation SHALL update immediately

#### Scenario: Select project role
- **WHEN** a user selects a project role from the dropdown
- **THEN** the options SHALL include: Owner & Guarantor, Owner Non-Guarantor, Non-Owner Key Manager, Other

#### Scenario: Select business role
- **WHEN** a user selects a business role from the dropdown
- **THEN** the options SHALL include: Active - Full Time, Active - Part Time, Passive

---

### Requirement: Add Applicant via Table
Users SHALL be able to add new individual applicants by clicking on empty rows in the ownership table.

#### Scenario: Click empty row to add applicant
- **WHEN** a user clicks on an empty placeholder row in the ownership table
- **THEN** a new individual applicant SHALL be created
- **AND** the user SHALL be navigated to the individual applicant detail page for the new applicant

---

### Requirement: Help Buttons on Field Labels
Each form field label in the BusinessApplicantSection SHALL have a help button that displays contextual information.

#### Scenario: Click help button
- **WHEN** a user clicks the HelpCircle icon next to a field label
- **AND** an `onLearnMore` callback is provided
- **THEN** the callback SHALL be invoked with the field title and detailed help content

#### Scenario: Help button visibility
- **WHEN** no `onLearnMore` callback is provided
- **THEN** the help buttons SHALL NOT be rendered

---

### Requirement: Simplified Checkbox Options
The BusinessApplicantSection SHALL only display the "Entity to be Formed" checkbox, removing the "Same as Subject Business" checkbox.

#### Scenario: Entity to be formed checkbox
- **WHEN** the section is rendered
- **THEN** only the "Entity to be Formed" checkbox SHALL be displayed in the highlighted checkbox area
- **AND** the "Same as Subject Business" checkbox SHALL NOT be present

---

### Requirement: Entity Type Dropdown Options
The entity type dropdown SHALL provide complete, descriptive labels for each business entity type.

#### Scenario: Select entity type
- **WHEN** a user opens the entity type dropdown
- **THEN** the options SHALL include:
  - Cooperative
  - Corporation
  - Limited Liability Company (LLC)
  - Limited Liability Partnership
  - Partnership
  - Sole Proprietorship
  - Subchapter S Corporation
  - Trust

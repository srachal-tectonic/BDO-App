## MODIFIED Requirements

### Requirement: Detailed Score Criteria Definitions
The CreditMatrixScoring component SHALL display detailed criteria definitions for each score level (0-5) in each risk category.

#### Scenario: Display score criteria
- **WHEN** a score button is selected
- **THEN** the corresponding criteria description SHALL be displayed below the score buttons
- **AND** the description SHALL explain the specific requirements for that score level

#### Scenario: Handle N/A scores
- **WHEN** a category has N/A for certain score levels (e.g., Credit score 5 = N/A)
- **THEN** the score button SHALL display "N/A" or a dash
- **AND** the button SHALL still be selectable

---

### Requirement: Expandable Score Criteria Sections
Each category card SHALL have an expandable section to view all score criteria definitions.

#### Scenario: Expand category criteria
- **WHEN** a user clicks the expand button on a category
- **THEN** all score criteria (0-5) SHALL be displayed in a list
- **AND** the currently selected score SHALL be highlighted

#### Scenario: Collapse category criteria
- **WHEN** a user clicks the expand button on an already expanded category
- **THEN** the criteria list SHALL collapse
- **AND** only the selected score's criteria SHALL remain visible

---

### Requirement: Score Summary Header
The component SHALL display a summary header showing total score and individual category scores.

#### Scenario: Display total score
- **WHEN** the component is rendered
- **THEN** the total score SHALL be displayed with format "X/27"
- **AND** the maximum score is 27 (accounting for N/A scores in some categories)

#### Scenario: Display category scores
- **WHEN** the component is rendered
- **THEN** each category's current score SHALL be displayed inline in the header

---

### Requirement: Score Badge Color Coding
Score buttons and badges SHALL be color-coded based on risk level.

#### Scenario: High scores (4-5)
- **WHEN** a category score is 4 or 5
- **THEN** the score badge SHALL have a green background (#10b981)

#### Scenario: Medium score (3)
- **WHEN** a category score is 3
- **THEN** the score badge SHALL have a yellow/amber background (#f59e0b)

#### Scenario: Low score (2)
- **WHEN** a category score is 2
- **THEN** the score badge SHALL have an orange background (#f97316)

#### Scenario: Very low scores (0-1)
- **WHEN** a category score is 0 or 1
- **THEN** the score badge SHALL have a red background (#ef4444)

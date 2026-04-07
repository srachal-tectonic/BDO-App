## ADDED Requirements

### Requirement: Credit Matrix Scoring Component
The PQ Memo SHALL provide a CreditMatrixScoring component for evaluating loan applications across six key risk categories with scores from 1-5.

#### Scenario: Display score buttons for each category
- **WHEN** the CreditMatrixScoring component is rendered
- **THEN** it SHALL display score buttons (1-5) for each of the six categories: Repayment, Management, Equity, Collateral, Credit, and Liquidity
- **AND** higher scores SHALL indicate lower risk

#### Scenario: Select a score for a category
- **WHEN** a user clicks a score button for a category
- **THEN** the button SHALL show a selected state (highlighted)
- **AND** the `onScoreChange` callback SHALL be invoked with the category and new score

#### Scenario: Display explanation field for each category
- **WHEN** the CreditMatrixScoring component is rendered
- **THEN** each category SHALL have a textarea field for entering an explanation

#### Scenario: Update explanation text
- **WHEN** a user types in an explanation textarea
- **THEN** the `onExplanationChange` callback SHALL be invoked with the category and new text

#### Scenario: Disabled mode
- **WHEN** the `disabled` prop is true
- **THEN** all score buttons and explanation fields SHALL be disabled and not editable

---

### Requirement: Risk Scores Tab Content
The PQ Memo Risk Scores tab SHALL display a Credit Matrix Scoring section with header and description.

#### Scenario: Display section header
- **WHEN** the Risk Scores tab is selected
- **THEN** the section SHALL display a "Credit Matrix Scoring" header with blue underline styling

#### Scenario: Display section description
- **WHEN** the Risk Scores tab is rendered
- **THEN** it SHALL display descriptive text: "Evaluate the loan application across six key risk categories. Each category is scored from 1-5, with higher scores indicating lower risk."

#### Scenario: Persist score changes
- **WHEN** a score is changed via CreditMatrixScoring
- **THEN** the score SHALL be saved to `pqMemo.creditScoring[category]`

#### Scenario: Persist explanation changes
- **WHEN** an explanation is changed via CreditMatrixScoring
- **THEN** the explanation SHALL be saved to `pqMemo.scoreExplanations[category]`

---

### Requirement: Score Data Structure
The pqMemo object SHALL support creditScoring and scoreExplanations fields for the six risk categories.

#### Scenario: Credit scoring structure
- **WHEN** credit scores are stored
- **THEN** they SHALL be stored in `pqMemo.creditScoring` as an object with keys: repayment, management, equity, collateral, credit, liquidity
- **AND** each value SHALL be a number from 1-5

#### Scenario: Score explanations structure
- **WHEN** score explanations are stored
- **THEN** they SHALL be stored in `pqMemo.scoreExplanations` as an object with keys: repayment, management, equity, collateral, credit, liquidity
- **AND** each value SHALL be a string

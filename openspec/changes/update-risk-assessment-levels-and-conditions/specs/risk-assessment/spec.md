## MODIFIED Requirements

### Requirement: Risk Level Classification
The system SHALL support six risk levels for project type rules: Low (green), Low-Medium (olive/lime), Medium (yellow), Medium-High (orange), High (red), and Very High (dark red). Each risk level SHALL have a distinct color for badge display and heat map visualization. The `RiskLevel` type SHALL be `'low' | 'low-medium' | 'medium' | 'medium-high' | 'high' | 'very-high'`.

#### Scenario: Admin selects from six risk levels when creating a rule
- **WHEN** an admin opens the Add/Edit Project Type Rule form
- **THEN** six risk level options are displayed: Low (green), Low-Medium (olive), Medium (yellow), Medium-High (orange), High (red), Very High (dark red)
- **AND** each option is visually distinguished by its assigned color

#### Scenario: Risk level badge displays correct color for all six levels
- **WHEN** a project type rule is displayed in the admin rule list or BDO risk assessment result
- **THEN** the badge color matches the risk level: green for Low, olive/lime for Low-Medium, yellow for Medium, orange for Medium-High, red for High, dark red for Very High

#### Scenario: Heat map renders six segments
- **WHEN** the BDO risk assessment computes a risk level
- **THEN** the heat map gradient displays six color segments (green → olive → yellow → orange → red → dark red)
- **AND** the indicator is positioned at the center of the matching segment

### Requirement: Classification Conditions
The system SHALL evaluate project type rules against classification conditions using tristate matching (Any/Yes/No). Conditions SHALL include: Is Startup, Has Existing Cashflow, Has Transition Risk, Includes Real Estate, CRE Scope, Is Partner Buyout, Involves Construction, Includes Debt Refinance, and Debt Refinance Primary. Each condition set to "Any" SHALL always match regardless of the BDO's answer.

#### Scenario: Debt refinance conditions used in rule matching
- **WHEN** a project type rule has `includesDebtRefinance` set to `true` and `debtRefinancePrimary` set to `true`
- **AND** a BDO answers "Yes" to both "Includes Debt Refinance?" and "Debt Refinance Primary?"
- **THEN** the rule's debt refinance conditions match

#### Scenario: Debt refinance condition set to Any always matches
- **WHEN** a project type rule has `includesDebtRefinance` set to `'any'`
- **THEN** the condition matches regardless of whether the BDO answered Yes, No, or left it unanswered

#### Scenario: Admin configures debt refinance conditions
- **WHEN** an admin opens the Add/Edit Project Type Rule form
- **THEN** two dropdown fields are shown: "Includes Debt Refinance?" and "Debt Refinance Primary?"
- **AND** each dropdown has options: Any, Yes, No
- **AND** both default to "Any" for new rules

### Requirement: Rule Priority
Each project type rule SHALL have a `priority` field (number). Rules SHALL be evaluated in ascending priority order (lower number = higher priority). When multiple rules match the BDO's answers, the rule with the lowest priority number SHALL be selected. The admin form SHALL label this field "Priority" with a description indicating that lower numbers are evaluated first.

#### Scenario: Lower priority number takes precedence
- **WHEN** two rules both match the current classification answers
- **AND** Rule A has priority 1 and Rule B has priority 2
- **THEN** Rule A is selected as the matching rule

#### Scenario: Admin sets priority on a new rule
- **WHEN** an admin creates a new project type rule
- **THEN** the form shows a "Priority" field (number input)
- **AND** the field auto-populates with the next available priority number

## ADDED Requirements

### Requirement: Risk Assessment Rules Administration
The system SHALL provide an administration interface for managing project type classification rules.

#### Scenario: Admin views Risk Assessment tab
- **WHEN** an admin navigates to the Admin Settings page
- **THEN** a "Risk Assessment" tab SHALL be visible in the tab list
- **AND** clicking the tab SHALL display the Risk Assessment Rules management interface

#### Scenario: Admin creates a new project type rule
- **WHEN** an admin clicks "Add Project Type" button
- **THEN** a modal dialog SHALL appear with fields for:
  - Rule name (required text input)
  - Description (optional textarea)
  - Risk level (radio: low/medium/high)
  - Is fallback toggle (switch)
  - Classification conditions (each with Yes/No/Any selector):
    - Is startup
    - Has existing cashflow
    - Has transition risk
    - Includes real estate
    - CRE scope (purchase/improvement/any)
    - Is partner buyout
    - Involves construction
- **AND** saving SHALL persist the rule to Firestore adminSettings/config

#### Scenario: Admin edits an existing rule
- **WHEN** an admin clicks the Edit button on a rule card
- **THEN** the modal SHALL open pre-populated with the rule's current values
- **AND** saving SHALL update the existing rule in Firestore

#### Scenario: Admin deletes a rule
- **WHEN** an admin clicks the Delete button on a rule card
- **THEN** the rule SHALL be removed from the rules list
- **AND** the deletion SHALL be persisted to Firestore

#### Scenario: Rules display with condition badges
- **WHEN** rules are displayed in the list
- **THEN** each rule SHALL show:
  - Order number
  - Rule name
  - Risk level badge (color-coded: green=low, amber=medium, red=high)
  - Fallback badge (if applicable)
  - Condition badges for non-"any" conditions only

### Requirement: Risk Assessment Data Model
The system SHALL store project type rules in the AdminSettings Firestore document.

#### Scenario: ProjectTypeRule structure
- **WHEN** a project type rule is stored
- **THEN** it SHALL contain:
  - id: unique identifier
  - name: rule display name
  - description: optional explanation
  - riskLevel: 'low' | 'medium' | 'high'
  - isFallback: boolean
  - order: numeric position
  - Tristate conditions (true | false | 'any'):
    - isStartup
    - hasExistingCashflow
    - hasTransitionRisk
    - includesRealEstate
    - creScope
    - isPartnerBuyout
    - involvesConstruction

### Requirement: Loan Application Risk Assessment Section
The system SHALL provide a Risk Assessment section in Step 1 of the Loan Application.

#### Scenario: Risk Assessment section placement
- **WHEN** a BDO views Step 1 (Project Overview) of a loan application
- **THEN** a "Risk Assessment" collapsible section SHALL appear above the "Project Summary" section

#### Scenario: Classification questions display
- **WHEN** a BDO opens the Risk Assessment section
- **THEN** the following Yes/No questions SHALL be displayed:
  - Is this a startup business?
  - Does the business have existing cashflow?
  - Is there transition risk involved?
  - Does the project include real estate?
  - Is this a partner buyout?
  - Does this involve construction?
- **AND** if "includes real estate" is Yes, a CRE Scope dropdown SHALL appear (Purchase/Improvement)

#### Scenario: Computed project type display
- **WHEN** a BDO answers classification questions
- **THEN** the system SHALL evaluate rules in order and display:
  - Matched project type name
  - Risk level badge (color-coded)
- **AND** if no rule matches and no fallback exists, "Not Classified" SHALL be displayed

### Requirement: Rule Evaluation Logic
The system SHALL evaluate project type rules based on BDO answers to classification questions.

#### Scenario: First-match rule evaluation
- **WHEN** classification answers are provided
- **THEN** rules SHALL be evaluated in order (by `order` field)
- **AND** the first rule where all non-"any" conditions match SHALL be selected
- **AND** if no rule matches, the fallback rule (if configured) SHALL be selected

#### Scenario: Tristate condition matching
- **WHEN** evaluating a rule condition
- **THEN** condition value 'any' SHALL match any answer (Yes or No)
- **AND** condition value true SHALL only match answer Yes
- **AND** condition value false SHALL only match answer No

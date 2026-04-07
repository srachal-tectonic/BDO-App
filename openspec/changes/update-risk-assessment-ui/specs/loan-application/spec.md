## MODIFIED Requirements

### Requirement: Loan Application Risk Assessment Section
The system SHALL provide a Risk Assessment section in Step 1 of the Loan Application with radio button inputs and visual risk feedback.

#### Scenario: Classification questions display with radio buttons
- **WHEN** a BDO views the Risk Assessment section
- **THEN** each classification question SHALL be displayed in a card-style container with gray background
- **AND** each question SHALL have Yes/No radio button options displayed side-by-side
- **AND** questions SHALL be arranged in a 2-column grid on medium screens and above

#### Scenario: CRE scope conditional display
- **WHEN** the "Is Real Estate part of the transaction?" question is answered "Yes"
- **THEN** a follow-up question "If CRE, is this CRE purchase or improvement?" SHALL appear
- **AND** the follow-up question SHALL have Purchase/Improvement radio button options

#### Scenario: Computed result with risk heat map
- **WHEN** all classification questions have been answered
- **AND** a matching project type rule is found
- **THEN** the computed result SHALL display:
  - A green CheckCircle icon
  - The project type name in bold
  - A risk level badge (Low/Medium/High) with appropriate color
  - A gradient heat map bar showing risk levels (green → amber → red)
  - An animated position indicator on the heat map at the corresponding risk level position

#### Scenario: Incomplete answers warning
- **WHEN** not all classification questions have been answered
- **THEN** an amber AlertCircle icon SHALL be displayed
- **AND** a message "Answer all questions above to determine the project type" SHALL be shown

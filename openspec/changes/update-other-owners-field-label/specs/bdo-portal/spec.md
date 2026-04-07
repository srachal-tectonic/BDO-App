## MODIFIED Requirements

### Requirement: Other Owners Description Field
When the user indicates they are NOT purchasing 100% of the business, the system SHALL display a text field for describing other owners with the following properties:
- Label: "List the other owners of the business post-acquisition, including their ownership percentages."
- Placeholder: "List the other owners and their ownership percentages..."

#### Scenario: Other owners field displays with updated label
- **WHEN** a user selects "No" for the question "Are you purchasing 100% of the business?"
- **THEN** the system SHALL display a textarea field
- **AND** the field label SHALL read "List the other owners of the business post-acquisition, including their ownership percentages."
- **AND** the placeholder text SHALL read "List the other owners and their ownership percentages..."

#### Scenario: Other owners field is hidden when purchasing 100%
- **WHEN** a user selects "Yes" for the question "Are you purchasing 100% of the business?"
- **THEN** the system SHALL NOT display the other owners description field

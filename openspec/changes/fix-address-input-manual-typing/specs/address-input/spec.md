# Address Input Component

## MODIFIED Requirements

### Requirement: Address Input Manual Typing
The AddressInput component MUST save changes when users type manually, not only when selecting from autocomplete suggestions.

#### Scenario: User types manually in address field
Given the AddressInput component is rendered
When the user types text manually in the street address field
Then the onChange callback is invoked with the updated street1 value
And the unsaved changes indicator appears

#### Scenario: User selects from autocomplete dropdown
Given the AddressInput component is rendered
When the user selects an address from the Google Places autocomplete dropdown
Then the onChange callback is invoked with all address fields populated (street1, city, state, zipCode)
And the unsaved changes indicator appears

#### Scenario: User clears the address field
Given the AddressInput component has a value
When the user clears the street address field
Then the onChange callback is invoked with an empty street1 value
And the unsaved changes indicator appears

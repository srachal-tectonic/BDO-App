# Address Input Component

## MODIFIED Requirements

### Requirement: Dropdown Display Behavior
The AddressInput dropdown MUST only appear after user interaction, not on initial page load.

#### Scenario: Page loads with existing address
Given the AddressInput component renders with an existing address value
When the page finishes loading
Then the suggestions dropdown is NOT displayed
And the existing address value is shown in the input field

#### Scenario: User starts typing in address field
Given the AddressInput component is rendered
When the user types 3 or more characters in the input field
Then the suggestions dropdown appears with matching addresses

#### Scenario: User focuses on field with existing value
Given the AddressInput component has an existing address value
When the user clicks or focuses on the input field without typing
Then the suggestions dropdown is NOT displayed

### Requirement: Complete Address Fill on Selection
The AddressInput component MUST fill all address fields (street, city, state, zip) when a place is selected.

#### Scenario: User selects a POI/establishment address
Given the user has typed an address and suggestions are displayed
When the user selects a POI like "JPMorgan Chase Tower"
Then the street address field is populated
And the city field is populated
And the state field is populated
And the zip code field is populated (if available)

#### Scenario: User selects a regular street address
Given the user has typed an address and suggestions are displayed
When the user selects a regular street address
Then all address fields (street, city, state, zip) are populated correctly

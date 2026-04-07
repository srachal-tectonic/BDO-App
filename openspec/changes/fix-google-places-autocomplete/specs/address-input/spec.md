## MODIFIED Requirements

### Requirement: Google Places Autocomplete

The AddressInput component SHALL use Google's native `PlaceAutocompleteElement` web component to provide address autocomplete functionality.

#### Scenario: User types address and sees suggestions

- **WHEN** a user types at least 3 characters in the address input field
- **THEN** Google Places autocomplete suggestions appear in a dropdown below the input
- **AND** the dropdown shows matching addresses with main text and secondary text
- **AND** the dropdown includes Google Maps attribution

#### Scenario: User selects address from suggestions

- **WHEN** a user clicks on an address suggestion in the dropdown
- **THEN** the input field is populated with the selected address
- **AND** the address components (street1, city, state, zipCode) are extracted and saved
- **AND** the onChange callback is triggered with the complete Address object

#### Scenario: Existing address displays on page load

- **WHEN** the AddressInput component loads with an existing address value
- **THEN** the input field displays the street address (street1)
- **AND** the autocomplete dropdown does NOT automatically open

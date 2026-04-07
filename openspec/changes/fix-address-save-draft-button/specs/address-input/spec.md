# Address Input Component

## MODIFIED Requirements

### Requirement: Address Changes Trigger Unsaved Changes Detection
The AddressInput component SHALL notify the parent form of all address modifications so that the dirty state detection can properly identify unsaved changes.

#### Scenario: Google Places selection triggers onChange
- **WHEN** a user selects an address from the Google Places autocomplete dropdown
- **THEN** the component SHALL call the `onChange` callback with the parsed address
- **AND** the address object SHALL contain: street1, street2, city, state, zipCode
- **AND** the Save as Draft button SHALL appear in the parent form

#### Scenario: Manual typing triggers onChange
- **WHEN** a user types directly into the address input field without selecting from the dropdown
- **THEN** the component SHALL call the `onChange` callback with the partial address data
- **AND** the street1 field SHALL contain the typed text
- **AND** existing city, state, zipCode values SHALL be preserved if previously set
- **AND** the Save as Draft button SHALL appear in the parent form

#### Scenario: Address data persists to Firestore
- **WHEN** a user modifies the Business Address or Project Address
- **AND** clicks the Save as Draft button
- **THEN** the address SHALL be saved to Firestore in the loan application document
- **AND** the address SHALL be retrievable when the page is reloaded

#### Scenario: Saved address is prepopulated on page load
- **WHEN** a user navigates to a project with previously saved address data
- **THEN** the Business Address input SHALL display the saved business address
- **AND** the Project Address input SHALL display the saved project address
- **AND** the displayed format SHALL be: "street1, city, state, zipCode"

### Requirement: Address Input Event Handling
The AddressInput component SHALL attach event listeners to the Google PlaceAutocompleteElement's internal input for comprehensive change detection.

#### Scenario: Input event listener attached after initialization
- **WHEN** the Google PlaceAutocompleteElement is successfully initialized
- **THEN** an `input` event listener SHALL be attached to the internal input element
- **AND** the listener SHALL call `onChange` with updated address data on each keystroke

#### Scenario: Event listeners cleaned up on unmount
- **WHEN** the AddressInput component is unmounted
- **THEN** all attached event listeners SHALL be removed
- **AND** no memory leaks SHALL occur

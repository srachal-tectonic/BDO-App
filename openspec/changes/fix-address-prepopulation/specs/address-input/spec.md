# Address Input Component

## MODIFIED Requirements

### Requirement: Address Prepopulation from Firestore
The AddressInput component SHALL display previously saved address data when the component mounts with an existing value.

#### Scenario: Saved address is prepopulated on page load
- **WHEN** a user navigates to a project with previously saved address data
- **THEN** the Business Address input SHALL display the saved business address
- **AND** the Project Address input SHALL display the saved project address
- **AND** the displayed format SHALL be: "street1, city, state, zipCode"
- **AND** the value SHALL remain visible (not flash and disappear)

#### Scenario: PlaceAutocompleteElement receives initial value after initialization
- **WHEN** the Google PlaceAutocompleteElement is successfully initialized
- **AND** the component's `value` prop contains address data
- **THEN** the component SHALL set the internal input's value to the formatted address
- **AND** the value SHALL be set within 500ms of initialization

#### Scenario: Value prop changes after initialization
- **WHEN** the component is already initialized
- **AND** the `value` prop changes (e.g., from parent state update)
- **THEN** the component SHALL update the internal input's value to reflect the new address
- **AND** the update SHALL NOT trigger the onChange callback (to avoid loops)

### Requirement: Shadow DOM Value Synchronization
The AddressInput component SHALL access the PlaceAutocompleteElement's Shadow DOM to synchronize values.

#### Scenario: Shadow DOM input is accessible
- **WHEN** the PlaceAutocompleteElement is initialized
- **THEN** the component SHALL access the internal input via `shadowRoot.querySelector('input')`
- **AND** if shadowRoot is not accessible, the component SHALL log a warning
- **AND** the component SHALL NOT crash if Shadow DOM access fails

#### Scenario: Initial value set does not trigger onChange
- **WHEN** the component sets the initial value programmatically
- **THEN** the component SHALL NOT dispatch input events
- **AND** the component SHALL NOT call the onChange callback
- **AND** the dirty state detection SHALL NOT be triggered

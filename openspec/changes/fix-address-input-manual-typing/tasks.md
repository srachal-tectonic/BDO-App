# Tasks

## Bug Fix
- [x] Replace `PlaceAutocompleteElement` web component with standard HTML input
- [x] Use `google.maps.places.Autocomplete` (legacy API) for address suggestions
- [x] Implement controlled input with React state for immediate value updates
- [x] Add `handleInputChange` that calls `onChange` on every keystroke
- [x] Maintain place selection functionality for autocomplete dropdown

## Validation
- [x] Verify manual typing in Home Address field triggers unsaved changes indicator
- [x] Verify place selection from autocomplete dropdown still works correctly
- [x] Verify address data saves correctly when form is submitted

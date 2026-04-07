# Change: Fix Address Field Prepopulation

## Why

When a user navigates to a project with previously saved address data, the Business Address and Project Address fields briefly show the saved value but then go blank. The address data exists in Firestore and is loaded correctly, but it's not persisted in the Google PlaceAutocompleteElement after initialization.

## Root Cause

The AddressInput component has a race condition:

1. Component mounts with `inputValue` state initialized to `''`
2. The sync `useEffect` runs and sets `inputValue` from the `value` prop (address from Firestore)
3. The placeholder `<input>` briefly shows the correct value
4. Google's `PlaceAutocompleteElement` initializes and replaces the container contents with `innerHTML = ''`
5. The new PlaceAutocompleteElement starts with an empty value
6. There's no code to set the PlaceAutocompleteElement's value from the existing address data

## What Changes

1. **Set initial value on PlaceAutocompleteElement after initialization** - After the element is created and added to the DOM, set its value using the `value` attribute or by finding the internal input
2. **Handle the closed Shadow DOM constraint** - Since PlaceAutocompleteElement uses a closed Shadow DOM, we need to use the element's public API or attributes to set the initial value
3. **Add a useEffect to sync value changes** - When the external `value` prop changes after initialization, update the PlaceAutocompleteElement

## Impact

- **Affected code**: `components/loan-sections/AddressInput.tsx`
- **User impact**: Saved addresses will be correctly displayed when returning to the form
- **No breaking changes**: The component's public API (props) remains unchanged

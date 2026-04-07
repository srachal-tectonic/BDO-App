# Change: Fix Address Input Manual Typing Not Saving

## Why
The Home Address field in Individual Applicants does not save changes or trigger the "unsaved changes" indicator when users type manually. This is because the `AddressInput` component only calls `onChange` when a place is selected from the Google Places autocomplete dropdown (`gmp-placeselect` event). Manual text input is ignored.

## Root Cause
The `AddressInput` component uses Google's `PlaceAutocompleteElement` which only fires a `gmp-placeselect` event when a place is selected from the dropdown suggestions. There is no event listener for manual text input (`input` event), so typing without selecting a suggestion never triggers the `onChange` callback.

## What Changes
Add an `input` event listener to the `PlaceAutocompleteElement` to capture manual typing and update the `street1` field in real-time as the user types.

## Impact
- **Affected code:**
  - `components/loan-sections/AddressInput.tsx` - Add input event listener for manual typing

## Technical Details

The fix involves adding an event listener for the `input` event on the `PlaceAutocompleteElement`:

```typescript
// Listen for manual text input (not just place selection)
pac.addEventListener('input', (event: any) => {
  const inputValue = event.target?.value || pac.value || '';
  onChangeRef.current({
    ...valueRef.current,
    street1: inputValue,
  });
});
```

This ensures that:
1. Manual typing updates the `street1` field immediately
2. The "unsaved changes" indicator appears when the user types
3. Place selection still works and fills all address fields (street, city, state, zip)

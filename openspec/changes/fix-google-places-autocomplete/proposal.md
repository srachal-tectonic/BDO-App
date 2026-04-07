# Change: Fix Google Places Autocomplete for Address Fields

## Why

The Business Address and Project Address fields on Step 3 (Business Applicant section) aren't displaying Google Places autocomplete suggestions when users type. The current implementation uses a custom approach with `AutocompleteSuggestion.fetchAutocompleteSuggestions` API which is not working properly.

The working Replit application uses Google's native `PlaceAutocompleteElement` web component, which:
- Provides built-in search icon, clear button, and styled dropdown
- Handles autocomplete suggestions automatically
- Fires `gmp-placeselect` event when a place is selected
- Includes proper Google Maps attribution

## What Changes

- Replace the custom autocomplete implementation in `AddressInput.tsx` with Google's native `PlaceAutocompleteElement` web component
- Keep the single-field address input design (no separate city/state/zip fields)
- Parse address components from the selected place to populate the Address object (street1, city, state, zipCode)
- Maintain existing styling to match the application design
- Support displaying existing address values when loading saved data

## Impact

- Affected code: `components/loan-sections/AddressInput.tsx`
- User impact: Google Places autocomplete will work properly - users will see address suggestions as they type
- No breaking changes - the component interface (props) remains the same
- All components using AddressInput will automatically benefit from the fix

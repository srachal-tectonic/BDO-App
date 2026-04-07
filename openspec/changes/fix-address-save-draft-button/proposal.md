# Change: Fix Address Fields Not Triggering Save Draft Button

## Why

When users modify the Business Address or Project Address fields on Step 3 (Business Applicant section), the "Save as Draft" button does not appear. This is different from all other form fields, which properly trigger the unsaved changes indicator when modified.

The root cause is that the AddressInput component's `onChange` callback may not be properly triggering Zustand store updates that the dirty detection logic can observe. The dirty detection in `app/bdo/projects/[id]/page.tsx` works by:
1. Comparing `JSON.stringify(applicationData)` with `lastSavedData`
2. When they differ, setting `hasUnsavedChanges` to true

The issue is likely that:
1. The PlaceAutocompleteElement's place selection event isn't consistently calling `onChange`
2. The address data isn't persisting to Firestore because the save is never triggered
3. Prepopulation fails because the data was never saved in the first place

## What Changes

1. **Add debug logging** to trace the data flow from AddressInput → Zustand store → dirty detection
2. **Ensure onChange is called** for both Google Places selection AND manual input
3. **Verify the address object structure** matches what the Zustand store expects
4. **Add manual input change handling** so typing directly in the field also triggers onChange

## Impact

- **Affected code**:
  - `components/loan-sections/AddressInput.tsx` - ensure onChange is called properly
  - Potentially `lib/applicationStore.ts` if there's an issue with how address updates are spread
- **User impact**: Address changes will properly trigger the "Save as Draft" button, allowing users to save their work
- **Data persistence**: Business Address and Project Address will be properly saved to Firestore
- **Prepopulation**: Saved addresses will be correctly displayed when returning to the form

## Root Cause Analysis

The current AddressInput implementation has these potential issues:

1. **Google Places event listener**: The `gmpx-placechange` event only fires when a place is selected from the dropdown, not when the user types manually and leaves the field

2. **No blur/change handler**: Unlike other form inputs that call onChange on every keystroke, the AddressInput only calls onChange when:
   - A Google Places suggestion is selected
   - The fallback input is used (but this is replaced by Google's element)

3. **Input value mismatch**: When the Google PlaceAutocompleteElement replaces the placeholder input, any existing onChange handlers on the original input are lost

## Proposed Solution

1. After the Google PlaceAutocompleteElement is initialized, add an `input` event listener to the internal input element to handle manual typing
2. Add a `blur` event listener to capture the final value when the user leaves the field
3. Ensure the onChange callback is always called with a properly structured Address object
4. Add console logging in development mode to help debug the data flow

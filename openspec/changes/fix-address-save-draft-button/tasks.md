# Tasks: Fix Address Fields Not Triggering Save Draft Button

## Prerequisites
- [x] Identify root cause of address changes not triggering dirty detection
- [x] Understand how other form fields trigger the Save Draft button

## Implementation Tasks

### 1. Add input event listener for manual typing
- [ ] After PlaceAutocompleteElement is initialized, locate the internal input element
- [ ] Add an `input` event listener that calls `onChange` with partial address data (street1)
- [ ] Ensure the listener is properly cleaned up on component unmount

### 2. Add blur event handler for field completion
- [ ] Add a `blur` event listener to capture the final value when user leaves the field
- [ ] Parse any manually entered address text and call `onChange`
- [ ] Handle cases where user types partial address without selecting from dropdown

### 3. Ensure onChange is always called with valid Address structure
- [ ] Verify Address object always has: street1, street2, city, state, zipCode
- [ ] Default missing fields to empty strings
- [ ] Ensure no undefined values are passed to the Zustand store

### 4. Add development logging for debugging
- [ ] Log when onChange is called and with what data
- [ ] Log when Zustand store is updated
- [ ] Remove or gate behind NODE_ENV check for production

### 5. Test the complete flow
- [ ] Verify Business Address changes trigger Save Draft button
- [ ] Verify Project Address changes trigger Save Draft button
- [ ] Verify clicking Save Draft persists the address to Firestore
- [ ] Verify reloading the page prepopulates the saved address
- [ ] Verify manual typing (without selecting suggestion) triggers Save Draft

## Validation
- [ ] Manual QA: Change Business Address → Save Draft button appears
- [ ] Manual QA: Change Project Address → Save Draft button appears
- [ ] Manual QA: Save and reload → addresses are prepopulated
- [ ] Manual QA: Other fields still work correctly (no regression)

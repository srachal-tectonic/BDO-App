# Tasks: Fix Google Places Autocomplete for Address Fields

## 1. Implementation

- [x] 1.1 Replace custom autocomplete implementation with Google's native `PlaceAutocompleteElement` web component
- [x] 1.2 Style the PlaceAutocompleteElement to match the application's input design
- [x] 1.3 Handle `gmp-placeselect` event to extract address components (street1, city, state, zipCode)
- [x] 1.4 Support displaying existing address values when loading saved data
- [x] 1.5 Ensure manual typing triggers onChange callback for unsaved changes indicator

## 2. Verification

- [ ] 2.1 Navigate to Step 3 (Business Applicant) of a loan application
- [ ] 2.2 Type an address in the Business Address field - verify suggestions dropdown appears
- [ ] 2.3 Select an address from dropdown - verify address is populated
- [ ] 2.4 Verify Project Address field has the same working autocomplete
- [ ] 2.5 Verify existing addresses display correctly when page loads
- [ ] 2.6 Verify Seller Info address field works correctly

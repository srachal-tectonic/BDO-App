# Change: Fix Address Input Dropdown Auto-Open and Incomplete Address Fill

## Why
Two issues exist with the AddressInput component:

1. **Dropdown auto-opens on page load**: When loading Step 4 "Individual Applicants", the address dropdown automatically opens for the first applicant if they have an existing address. This is disruptive UX.

2. **Incomplete address fill**: When selecting a place like "JPMorgan Chase Tower", only the street address is filled - city, state, and zip are not populated.

## Root Cause Analysis

### Issue 1: Dropdown Auto-Opening
When the component mounts with an existing address value:
1. `useEffect` syncs `safeValue.street1` to `inputValue`
2. The debounced suggestions fetch runs because `inputValue.length >= 3`
3. Suggestions are fetched and `setShowDropdown(true)` is called
4. The dropdown opens without user interaction

### Issue 2: Incomplete Address Fill
The `includedPrimaryTypes` filter restricts suggestions to `['street_address', 'premise', 'subpremise']`. When selecting a POI/establishment like "JPMorgan Chase Tower":
- The address components may use different type names (e.g., `sublocality` instead of `locality` for city)
- Some POIs may not have all address components in the expected structure
- Need to also check for `sublocality_level_1` and other fallback types

## What Changes

### Fix 1: Prevent dropdown on initial load
- Add a flag to track if the user has interacted with the input
- Only show dropdown after user starts typing (not on mount with existing value)

### Fix 2: Improve address component extraction
- Remove restrictive `includedPrimaryTypes` to allow all address types including establishments
- Add fallback type checks for city (`sublocality`, `sublocality_level_1`, `neighborhood`)
- Add fallback for missing zip codes

## Impact
- **Affected code:**
  - `components/loan-sections/AddressInput.tsx` - Fix both issues

# Tasks

## Fix Dropdown Auto-Opening
- [x] Add `hasUserTyped` flag to track user interaction
- [x] Only fetch suggestions and show dropdown after user has typed
- [x] Prevent suggestions fetch when value is set from external source (initial load)

## Fix Incomplete Address Fill
- [x] Remove `includedPrimaryTypes` restriction to allow all place types including establishments
- [x] Add fallback type checks for city: `sublocality`, `sublocality_level_1`, `neighborhood`, `administrative_area_level_2`
- [x] Add fallback type checks for state if primary not found
- [x] Ensure POI/establishment addresses fill all fields correctly
- [x] Use suggestion.mainText as fallback for street address when no street components found

## Validation
- [x] Verify dropdown does NOT open automatically when loading page with existing address
- [x] Verify dropdown opens when user starts typing
- [x] Verify selecting "JPMorgan Chase Tower" or similar POI fills street, city, state, zip
- [x] Verify selecting regular street addresses still works correctly

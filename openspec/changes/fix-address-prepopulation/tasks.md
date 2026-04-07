# Tasks: Fix Address Field Prepopulation

## Prerequisites
- [x] Identify root cause of address not prepopulating
- [x] Research PlaceAutocompleteElement Shadow DOM access

## Implementation Tasks

### 1. Set initial value after PlaceAutocompleteElement initialization
- [ ] After `autocompleteElement` is appended to container, add logic to set initial value
- [ ] Use `setTimeout` to wait for Shadow DOM to be ready (100ms with 200ms retry)
- [ ] Access internal input via `autocompleteElement.shadowRoot.querySelector('input')`
- [ ] Set `input.value` to `getDisplayValue()` result
- [ ] Do NOT dispatch input event to avoid triggering onChange loop

### 2. Add useEffect to sync value prop changes after initialization
- [ ] Create new useEffect that depends on `[value, isInitialized]`
- [ ] Only run when `isInitialized` is true
- [ ] Access internal input and update value if it differs from expected display value
- [ ] Handle case where autocompleteElementRef is null

### 3. Guard against race conditions
- [ ] Only set value programmatically if user hasn't started typing
- [ ] Use a ref to track whether initial value has been set
- [ ] Skip setting value if input already contains user-typed content

### 4. Add defensive error handling
- [ ] Check if `shadowRoot` exists before accessing
- [ ] Log warning if internal input cannot be found (for debugging)
- [ ] Gracefully handle case where Shadow DOM access fails

## Validation
- [ ] Manual QA: Navigate to project with saved Business Address → address is prepopulated
- [ ] Manual QA: Navigate to project with saved Project Address → address is prepopulated
- [ ] Manual QA: Type new address → onChange fires, Save Draft appears
- [ ] Manual QA: Select from dropdown → address updates correctly
- [ ] Manual QA: Refresh page → addresses remain prepopulated

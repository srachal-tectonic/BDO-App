# Design: Fix Address Field Prepopulation

## Current Architecture

### Initialization Flow (Broken)
```
Component mounts
    → inputValue state = ''
    → useEffect syncs inputValue from value prop
    → Placeholder <input> shows correct address briefly
    → Google PlaceAutocompleteElement initializes
    → containerRef.current.innerHTML = '' (clears container)
    → New PlaceAutocompleteElement added with EMPTY value
    → User sees blank field
```

### Key Discovery

The PlaceAutocompleteElement uses an **open Shadow DOM** (not closed). This means we CAN access the internal input via `shadowRoot.querySelector('input')`, but we need to wait for the element to fully initialize first.

## Solution Design

### Approach: Set Value After Initialization

After the PlaceAutocompleteElement is created and appended to the DOM:

1. Wait for the Shadow DOM to be ready (using a small timeout or polling)
2. Access the internal input via `autocompleteElement.shadowRoot.querySelector('input')`
3. Set the input's value to the current display value from props
4. Do NOT dispatch an input event (to avoid triggering onChange and creating a loop)

```typescript
// After appending autocompleteElement to container
const setInitialValue = () => {
  const initialValue = getDisplayValue();
  if (!initialValue) return;

  const internalInput = autocompleteElement.shadowRoot?.querySelector('input');
  if (internalInput) {
    internalInput.value = initialValue;
    return true;
  }
  return false;
};

// Wait for Shadow DOM to be ready
setTimeout(() => {
  if (!setInitialValue()) {
    // Retry once more if needed
    setTimeout(setInitialValue, 200);
  }
}, 100);
```

### Handle Value Changes After Initialization

Add a separate useEffect that watches for changes to the `value` prop AFTER initialization:

```typescript
useEffect(() => {
  if (!isInitialized || !autocompleteElementRef.current) return;

  const displayVal = getDisplayValue();
  const internalInput = autocompleteElementRef.current.shadowRoot?.querySelector('input');

  if (internalInput && internalInput.value !== displayVal) {
    internalInput.value = displayVal;
  }
}, [value, isInitialized, getDisplayValue]);
```

## Trade-offs

### Option A: Timeout-based initialization (Recommended)
- **Pros**: Simple, reliable, well-documented pattern
- **Cons**: Small delay (100-300ms) before value appears

### Option B: MutationObserver on Shadow DOM
- **Pros**: No arbitrary timeout
- **Cons**: More complex, may have browser compatibility issues

### Option C: Polling until input found
- **Pros**: Guaranteed to find input when ready
- **Cons**: Potentially wasteful, needs max attempts limit

**Decision**: Option A with a fallback retry - simple and proven to work.

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Shadow DOM structure changes | Use defensive checks, log warnings if input not found |
| Race condition with user typing | Only set value if input is empty or matches expected |
| Infinite update loop | Don't dispatch events when setting programmatically |

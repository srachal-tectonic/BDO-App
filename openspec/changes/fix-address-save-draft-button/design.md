# Design: Fix Address Fields Not Triggering Save Draft Button

## Current Architecture

### Data Flow (Working Fields)
```
User types in input
    → onChange handler called
    → updateBusinessApplicant({ fieldName: value })
    → Zustand store updates data.businessApplicant
    → Component re-renders with new applicationData reference
    → Dirty detection useEffect runs
    → JSON.stringify(applicationData) !== lastSavedData
    → setHasUnsavedChanges(true)
    → Save Draft button appears
```

### Data Flow (Address Fields - Broken)
```
User types in Google PlaceAutocompleteElement
    → Google's internal input handles the value
    → User selects from dropdown OR leaves field
    → gmpx-placechange event fires (ONLY on dropdown selection)
    → onChange called with parsed address
    → ... rest of flow works

PROBLEM: If user types manually without selecting from dropdown,
         gmpx-placechange never fires, onChange never called,
         Zustand store never updated, Save Draft button never appears
```

## Key Components

### AddressInput.tsx
- Renders a Google PlaceAutocompleteElement
- Listens for `gmpx-placechange` event for place selection
- **Missing**: Event listener for manual input changes
- **Missing**: Event listener for blur/focus out

### BusinessApplicantSection.tsx
- Uses AddressInput for businessAddress and projectAddress
- Passes `onChange={(addr) => updateBusinessApplicant({ businessAddress: addr })}`
- Relies on AddressInput calling onChange properly

### applicationStore.ts (Zustand)
- `updateBusinessApplicant(updates)` spreads updates into businessApplicant
- Creates new object references, should trigger re-renders
- No known issues here

### app/bdo/projects/[id]/page.tsx
- Subscribes to applicationData via `useApplication()`
- Dirty detection: `JSON.stringify(applicationData) !== lastSavedData`
- Works correctly for other fields

## Solution Design

### Add Manual Input Handling

After the PlaceAutocompleteElement is mounted, we need to:

1. **Find the internal input element** (it's inside Google's component)
2. **Add `input` event listener** for real-time typing
3. **Add `blur` event listener** for when user leaves the field
4. **Call onChange** with the current address data

```typescript
// After element is added to DOM
const input = autocompleteElement.querySelector('input') ||
              containerRef.current?.querySelector('input');

if (input) {
  // Handle manual typing
  input.addEventListener('input', (e) => {
    const value = (e.target as HTMLInputElement).value;
    onChange({
      street1: value.split(',')[0]?.trim() || value,
      street2: valueRef.current?.street2 || '',
      city: valueRef.current?.city || '',
      state: valueRef.current?.state || '',
      zipCode: valueRef.current?.zipCode || '',
    });
  });
}
```

### Preserve Existing Address Data

When user types manually, we should preserve the existing city/state/zip if they were previously set (from a prior Google Places selection). Only update street1 with the typed value.

### Event Cleanup

Ensure all event listeners are properly removed on component unmount to prevent memory leaks.

## Trade-offs

### Option A: Listen to input events (Recommended)
- **Pros**: Real-time updates, matches behavior of other fields
- **Cons**: More frequent Zustand updates, but this is consistent with other fields

### Option B: Only listen to blur events
- **Pros**: Fewer updates, only when user is "done"
- **Cons**: Inconsistent with other fields that update on every keystroke

### Option C: Add a separate "Apply" button for address
- **Pros**: Explicit user action to confirm address
- **Cons**: Different UX from other fields, more clicks for user

**Decision**: Option A - Listen to input events for consistency with other form fields.

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Google's element structure changes | Use multiple selector strategies to find input |
| Performance with frequent updates | Zustand is optimized for frequent updates; debounce if needed |
| Race condition with Google Places event | Use valueRef to always have current data |

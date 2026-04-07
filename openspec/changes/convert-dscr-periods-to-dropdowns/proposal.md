# Convert DSCR Period Fields to Dropdowns

**Change ID:** `convert-dscr-periods-to-dropdowns`
**Status:** Completed
**Author:** Claude
**Date:** 2026-01-07

## Summary

Convert the four Period text input fields in the DSCR (Debt Service Coverage Ratio) section to dropdown selects with predefined year options: 2022, 2023, 2024, 2025, and Interim.

## Motivation

- Standardize period selection across all loan applications
- Reduce data entry errors from free-text input
- Ensure consistent period naming for reporting and analysis
- Simplify user experience with predefined options

## Current Implementation

The DSCR section in `components/loan-sections/FundingStructureSection.tsx` has four Period fields (Period 1-4) implemented as text inputs:

```tsx
<input
  type="text"
  id="period-1"
  placeholder="Enter period"
  className="..."
  disabled={isReadOnly}
/>
```

These fields are currently display-only without data binding to the application store.

## Proposed Implementation

### UI Changes

Replace text inputs with Select dropdowns:

```tsx
<Select value={...} onValueChange={...} disabled={isReadOnly}>
  <SelectTrigger>
    <SelectValue placeholder="Select period" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="2022">2022</SelectItem>
    <SelectItem value="2023">2023</SelectItem>
    <SelectItem value="2024">2024</SelectItem>
    <SelectItem value="2025">2025</SelectItem>
    <SelectItem value="Interim">Interim</SelectItem>
  </SelectContent>
</Select>
```

### Data Model Changes

Add DSCR fields to the application store:

```typescript
interface DSCRData {
  period1: string;
  period2: string;
  period3: string;
  period4: string;
  dscr1: number | null;
  dscr2: number | null;
  dscr3: number | null;
  dscr4: number | null;
}
```

## Impact

### Files to Modify
| File | Change |
|------|--------|
| `components/loan-sections/FundingStructureSection.tsx` | Replace Period text inputs with Select dropdowns, wire up to store |
| `lib/applicationStore.ts` | Add DSCR data structure and update function |
| `lib/schema.ts` | Add DSCR interface if needed |

### No Breaking Changes
- Existing text data can be migrated to dropdown values
- New dropdown values are strings, compatible with existing storage

## Acceptance Criteria

1. Period 1-4 fields display as dropdown selects instead of text inputs
2. Each dropdown has options: 2022, 2023, 2024, 2025, Interim
3. Dropdowns show placeholder "Select period" when empty
4. Selected values persist when navigating away and returning
5. Dropdowns are disabled in read-only mode
6. DSCR numeric fields remain as number inputs
7. TypeScript compiles without errors

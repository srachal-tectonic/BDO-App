# Change: Move Hide Empty Rows Button Below Current Spreads

## Why
The "Hide Empty Rows" / "Show Empty Rows" toggle button is currently positioned at the top of the Sources and Uses card, separate from the "Current Spreads" section. Moving it below the "Current Spreads" card improves the visual hierarchy by keeping the spreads-related controls together and placing the table filter closer to the table it affects.

## What Changes
- Move the "Hide Empty Rows" / "Show Empty Rows" button from the top header area to below the "Current Spreads" card
- The button should appear between the "Current Spreads" card and the Sources & Uses table
- When no workbook exists, the button should still appear above the table (after the "Create Spreads" button area)

## Impact
- Affected specs: sources-uses-matrix
- Affected code:
  - `components/loan-sections/SourcesUsesMatrix.tsx` - Relocate the toggle button in the JSX structure

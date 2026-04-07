# Change: Collapse Empty Sources & Uses Tables and Hide Empty Rows by Default

## Why
When a BDO marks a new spread as primary, only one (or sometimes two) of the three Sources & Uses tables receive data. The remaining empty tables take up screen space and add clutter. Additionally, tables with data still show all 10 rows even if most are empty. The BDO has to manually collapse cards and toggle "Hide Empty Rows" for each table, which is tedious — especially when switching primary spreads.

## What Changes
- **Auto-collapse empty cards**: The 504 and Express `CollapsibleCard` wrappers SHALL start collapsed when their table data is empty, and auto-collapse again whenever data changes leave them empty (e.g., after marking a new primary spread).
- **Auto-expand populated cards**: When a primary spread populates a previously-empty table, its card SHALL auto-expand so the BDO sees the new data immediately.
- **Hide empty rows by default**: The `SourcesUsesMatrix` `hideEmpty` state SHALL default to `true` (currently defaults to `false` unless read-only). Empty rows are hidden on load and after data updates; the BDO can still toggle to show them.

## Impact
- Affected specs: (no existing specs — new delta)
- Affected code:
  - `components/ui/CollapsibleCard.tsx` — add controlled `isExpanded` prop alongside existing `defaultExpanded`
  - `components/loan-sections/SourcesUsesCards.tsx` — compute emptiness per table, pass controlled expanded state to cards, react to data changes
  - `components/loan-sections/SourcesUsesMatrix.tsx` — change `hideEmpty` default from `isReadOnly` to `true`

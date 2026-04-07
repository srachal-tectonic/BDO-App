## 1. CollapsibleCard: Add Controlled Expanded Prop
- [x] 1.1 Add optional `expanded` prop to `CollapsibleCard` that overrides internal state when provided
- [x] 1.2 Use `useEffect` to sync internal state when `expanded` prop changes (controlled mode), while preserving manual toggle behavior via `onToggle` callback

## 2. SourcesUsesCards: Compute Emptiness and Control Collapse
- [x] 2.1 Add `isTableEmpty(sourcesUses)` helper that returns `true` when all row values are zero/undefined
- [x] 2.2 Track expanded state for each card (7a, 504, express) with `useState`, initialized based on whether the table has data
- [x] 2.3 Update expanded state via `useEffect` whenever `sourcesUses7a`, `sourcesUses504`, or `sourcesUsesExpress` change — expand if non-empty, collapse if empty
- [x] 2.4 Pass controlled `expanded` and `onToggle` to each `CollapsibleCard`

## 3. SourcesUsesMatrix: Default Hide Empty Rows
- [x] 3.1 Change `hideEmpty` initial state from `isReadOnly` to `true` so empty rows are hidden by default on all tables
- [x] 3.2 Verify the "Show Empty Rows" / "Hide Empty Rows" toggle still works correctly after the default change

## 4. Manual Verification
- [ ] 4.1 Load a project with no primary spread — confirm all three cards are collapsed
- [ ] 4.2 Mark a spread as primary that populates only 7(a) — confirm 7(a) expands, 504 and Express stay collapsed
- [ ] 4.3 Within the expanded 7(a) table, confirm only rows with values are visible (empty rows hidden)
- [ ] 4.4 Click "Show Empty Rows" toggle — confirm all rows appear; click again to re-hide
- [ ] 4.5 Switch to a different primary spread that populates 504 — confirm 504 auto-expands, and if 7(a) becomes empty it auto-collapses
- [ ] 4.6 Manually collapse an expanded card, then trigger a data update — confirm it re-expands when data arrives

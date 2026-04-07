# Change: Fix Loan Details Type Reset and Mark-as-Primary Performance

## Why
Two issues when marking a spread as primary on the Financials step:

1. **Loan Type not clearing:** When switching from a spread that has 504 data to one that does not, the Loan 2 Type stays stuck on "SBA 504" even though the amount resets to $0. The current `useEffect` only auto-sets the type when `amount > 0` but never clears it when the amount drops to 0.

2. **UI freeze / slow rendering:** Marking a spread as primary triggers 5 sequential Zustand `set()` calls (3 for Sources & Uses tables + 2 for Loan details), each re-rendering all ~15 components subscribed to `useApplication()`. This cascading render storm causes a multi-second freeze.

## What Changes
- **Loan type reset:** When the calculated loan amount drops to $0, clear the loan type back to empty (`''`). This applies to both Loan 1 (7a) and Loan 2 (504).
- **Batched store updates:** Add a single `updateAllSourcesUses` Zustand action that updates all three S&U tables in one `set()` call (replacing 3 separate calls). This reduces the render cascade from 5+ sequential store updates to 2.

## Impact
- Affected specs: loan-details-primary-spread (new)
- Affected code:
  - `lib/applicationStore.ts` — new `updateAllSourcesUses` action
  - `components/loan-sections/FundingStructureSection.tsx` — clear loan types when amounts are 0
  - `components/loan-sections/SourcesUsesCards.tsx` — use `updateAllSourcesUses` in `handleMarkAsPrimary`
  - `app/bdo/projects/[id]/page.tsx` — use `updateAllSourcesUses` in `loadPrimarySpreadData`

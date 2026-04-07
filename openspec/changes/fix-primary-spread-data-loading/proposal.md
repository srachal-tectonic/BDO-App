# Change: Fix Primary Spread Data Loading

## Why

Currently there are two issues with the Primary Spread feature:

1. **Data doesn't refresh when changing Primary**: When a user marks a different spread as Primary, the Sources & Uses tables don't update with the new data. The tables only populate on the first "Mark as Primary" action.

2. **Data doesn't load on page load**: When navigating to the Financials step, if a Primary Spread has already been set, the tables show as blank instead of being populated with the synced data from the Primary Spread.

Users expect that:
- Selecting a new Primary Spread should always refresh all three tables with the latest synced data
- Loading the Financials page should automatically populate tables if a Primary Spread exists

## What Changes

- **Page Load Behavior**: When the project page loads with a `primarySpreadId` set, automatically fetch the synced data from Firebase and populate all three Sources & Uses tables
- **Mark as Primary Refresh**: Ensure that marking a different spread as Primary always fetches fresh data and updates all three tables, even if data was previously populated
- **State Management**: May need to force re-render or clear existing state before populating with new Primary data

## Impact

- Affected code:
  - `app/bdo/projects/[id]/page.tsx` - Load primary spread data on mount
  - `components/loan-sections/SourcesUsesCards.tsx` - Ensure handleMarkAsPrimary always refreshes data
  - `components/loan-sections/FundingStructureSection.tsx` - May need to trigger data load
  - `lib/applicationStore.ts` - May need actions to clear/reset sourcesUses data

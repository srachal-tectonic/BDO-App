# Change: Fix Sources & Uses Table Isolation

## Why

Currently, all three Sources & Uses tables (7(a) Standard, 504, and 7(a) Express) share the same state in the application store. When a user edits a field in one table, the change is reflected in all three tables. This is incorrect behavior - each table should maintain independent data since they represent different loan program structures with different funding sources.

## What Changes

- **Data Model**: Add separate state fields in application store for each table type (`sourcesUses7a`, `sourcesUses504`, `sourcesUsesExpress`)
- **Store Functions**: Add separate update functions for each table type
- **UI Components**: Update `SourcesUsesCards` to pass table-specific state and handlers to each `SourcesUsesMatrix`
- **SourcesUsesMatrix**: Add `tableType` prop to identify which table is being rendered
- **Primary Spread**: Update "Mark as Primary" to populate all three tables with their respective synced data

## Impact

- Affected code:
  - `lib/applicationStore.ts` - Add separate state fields and update functions
  - `lib/schema.ts` - May need to add combined interface for all three tables
  - `components/loan-sections/SourcesUsesCards.tsx` - Pass table-specific props
  - `components/loan-sections/SourcesUsesMatrix.tsx` - Accept tableType prop
  - `components/loan-sections/FundingStructureSection.tsx` - Pass all three states
  - `lib/syncedDataMapper.ts` - Update to map data to specific table types
  - `app/bdo/projects/[id]/page.tsx` - Load/save all three table states

# Change: Fix Sources & Uses Cards Implementation

## Why
The previous implementation incorrectly changed the Sources & Uses tables to be read-only and require Zoho sync to display data. The correct behavior should be:

1. Tables should be **editable** and display data from the application store (like before)
2. Tables should appear even when no Zoho Sheets have been generated/synced
3. When Spreads are generated, the data entered in the tables should be used to prefill the Zoho Sheet
4. The "Sync" button should NOT be in the UI - sync is triggered externally via POST /api/zoho-sheets/sync
5. When sync happens, it should store the synced data in Firebase, but the editable tables remain functional

## What Changes
- **Remove** the read-only `SourcesUsesTable.tsx` component
- **Restore** the editable `SourcesUsesMatrix` component functionality
- **Refactor** `SourcesUsesCards` to render three editable SourcesUsesMatrix components
- **Remove** the Sync button from the UI
- **Keep** the Spreads section (Create Spreads, Regenerate, Open) only in the first card
- Each card should have its own editable table with data from the application store
- The sync API continues to work as before - stores synced data in Firebase when called externally

## Impact
- Affected components:
  - `components/loan-sections/SourcesUsesCards.tsx` - Remove Sync button, use editable tables
  - `components/loan-sections/SourcesUsesTable.tsx` - Remove (not needed)
  - `components/loan-sections/SourcesUsesMatrix.tsx` - Keep and reuse
  - `components/loan-sections/FundingStructureSection.tsx` - May need adjustment for data binding

## Decisions
1. Each of the three cards will have an editable SourcesUsesMatrix
2. Data comes from `applicationStore` (not from Firebase sync data)
3. The first card ("7(a) Standard") includes Spreads management section
4. No Sync button in the UI - sync is external
5. The synced data from Zoho Sheets is stored in Firebase but displayed tables use app store data

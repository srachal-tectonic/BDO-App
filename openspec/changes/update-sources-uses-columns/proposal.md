# Change: Update Sources and Uses Matrix Columns

## Why
The current Sources and Uses matrix columns (Equity, Seller Note, SBA 7(a), SBA 504, CDC) don't align with the business terminology used by T Bank. The column structure needs to be updated to match the expected workflow and include SBA Term tracking per use category.

## What Changes
- **BREAKING**: Rename "Equity" column to "Borrower"
- **BREAKING**: Rename "SBA 7(a)" column to "T Bank Loan"
- **BREAKING**: Replace "SBA 504" and "CDC" columns with single "3rd Party" column
- Add new "SBA Term" column to track loan term per use category
- Move percentage display from header row to dedicated "%" column
- Update data model `SourcesUsesRow` interface to reflect new column structure
- Update Zoho Sheets data mapping to sync with new column names

## Impact
- Affected specs: sources-uses-matrix (new)
- Affected code:
  - `lib/schema.ts` - Update `SourcesUsesRow` interface
  - `components/loan-sections/SourcesUsesMatrix.tsx` - Update table columns and logic
  - `lib/spreadsDataMapper.ts` - Update Zoho Sheets cell mappings
  - `lib/spreadsReverseMapper.ts` - Update sync cell mappings
  - Existing Firestore data will need field name migration

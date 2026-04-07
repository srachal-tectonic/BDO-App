# Change: Remove pre-fill from "1. Project Structure" Zoho sheet

## Why
When creating a new spread, we should not be pre-filling any fields on the "1. Project Structure" sheet. All pre-fill data should go only to "2. Sources and Uses" (and other sheets as appropriate). This reduces duplication and keeps the Project Structure sheet clean for manual BDO input.

## What Changes
- **Remove all pre-fill logic for "1. Project Structure"** sheet from the spread creation workflow
- The `mapProjectStructureData()` function in `lib/spreadsDataMapper.ts` currently writes ~40+ cells to Sheet 1, including:
  - Project Description (B5)
  - Loan Terms - T Bank column (C12-C20): product type, amount, base rate, spread, total rate, term, amortization, payment
  - Borrower Injection (D13)
  - Seller Note Terms (E13-E20): amount, base rate, total rate, term, amortization, payment
  - Sources & Uses matrix (rows 29-44): all 16 use categories across 6 columns
  - Totals row (row 45): T Bank total, Borrower total, Seller Note total, Grand total
- All of the above will be removed from Sheet 1 pre-fill
- **No changes** to "2. Sources and Uses" (Sheet 2) pre-fill — it stays as-is
- **No changes** to other sheet pre-fills (3. Financials, 4. PFS, 5. Collateral, _ProjectMetadata)
- The `SHEET1_USE_CATEGORY_ROWS` constant can be removed as it is only used by Sheet 1 mapping

## Impact
- Affected code: `lib/spreadsDataMapper.ts` (primary change)
- Affected code: `lib/spreadsTemplateConfig.ts` (remove Sheet 1 cell references if present)
- Affected code: `lib/spreadsReverseMapper.ts` (may need to stop reading Sheet 1 S&U data if syncing back)
- The overall cell count written during spread creation will decrease significantly
- No breaking changes to the API or database schema

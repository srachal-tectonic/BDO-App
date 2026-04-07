# Tasks: Update Sources and Uses Matrix Columns

## Phase 1: Update Data Model

### 1.1 Update SourcesUsesRow Interface
- [x] Rename `equity` to `borrower` in `lib/schema.ts`
- [x] Rename `sba7a` to `tBankLoan` in `lib/schema.ts`
- [x] Remove `sba504` and `cdc` fields
- [x] Add `thirdParty` field
- [x] Add `sbaTerm` field (number, optional)

### 1.2 Update SourcesUses Interface
- [x] Update any aggregate fields that reference old column names

## Phase 2: Update UI Component

### 2.1 Update Table Headers
- [x] Change "Equity" header to "Borrower"
- [x] Change "SBA 7(a)" header to "T Bank Loan"
- [x] Remove "SBA 504" and "CDC" headers
- [x] Add "3rd Party" header
- [x] Add "SBA Term" header
- [x] Add "%" column header (move from row to column)

### 2.2 Update Table Body
- [x] Update input fields to use new field names (`borrower`, `tBankLoan`, `thirdParty`)
- [x] Add input fields for "SBA Term" column
- [x] Add calculated "%" column showing row percentage of total
- [x] Update `getCellValue`, `handleFocus`, `handleBlur` for new fields
- [x] Update `getRowTotal` calculation (remove sba504, cdc; add thirdParty)
- [x] Update `getColumnTotal` for new column names
- [x] Update `getColumnPercentage` for new column names

### 2.3 Update Totals Row
- [x] Update column totals for new field names
- [x] Remove totals for removed columns (sba504, cdc)
- [x] Add total for "3rd Party" column
- [x] Handle "SBA Term" column in totals (likely blank or N/A)

### 2.4 Remove Percentage Header Row
- [x] Remove the current percentage row from table header
- [x] Percentages now displayed per-row in "%" column

## Phase 3: Update Zoho Sheets Mapping

### 3.1 Update spreadsDataMapper.ts
- [x] Update cell mappings to use new field names
- [x] Map `borrower` instead of `equity`
- [x] Map `tBankLoan` instead of `sba7a`
- [x] Map `thirdParty` instead of `sba504`/`cdc`
- [x] Add mappings for `sbaTerm` field

### 3.2 Update spreadsReverseMapper.ts
- [x] Update CELL_MAPPINGS with new field paths
- [x] Update path references from `sba7a` to `tBankLoan`
- [x] Update path references from `equity` to `borrower`
- [x] Replace `sba504`/`cdc` paths with `thirdParty`
- [x] Add mappings for `sbaTerm` field

## Phase 4: Testing

### 4.1 Verify UI Changes
- [ ] Test all columns display correctly
- [ ] Test data entry in each column
- [ ] Test row totals calculate correctly
- [ ] Test column totals calculate correctly
- [ ] Test percentage column shows correct values

### 4.2 Verify Zoho Integration
- [ ] Test "Create Spreads" generates sheet with correct column mapping
- [ ] Test sync from Zoho reads data into correct fields

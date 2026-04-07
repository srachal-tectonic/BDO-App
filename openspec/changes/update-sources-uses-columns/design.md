# Design: Update Sources and Uses Matrix Columns

## Context
The Sources and Uses matrix in `SourcesUsesMatrix.tsx` displays funding sources for each use category. The current columns don't match T Bank's terminology and workflow.

### Current Column Structure
| Use Category | Equity | Seller Note | SBA 7(a) | SBA 504 | CDC | Total |

### New Column Structure
| Use Category | T Bank Loan | Borrower | Seller Note | 3rd Party | Total | SBA Term | % |

## Goals / Non-Goals

**Goals:**
- Align column names with T Bank terminology
- Add SBA Term tracking per use category
- Show percentage per row instead of per column
- Simplify by combining SBA 504 and CDC into "3rd Party"

**Non-Goals:**
- Changing the underlying calculation logic
- Adding new use categories
- Changing the Zoho Sheets template structure

## Decisions

### Column Order
The new column order prioritizes the primary funding source (T Bank Loan) first:
1. **Use Category** - Row label
2. **T Bank Loan** - Primary SBA 7(a) funding from T Bank
3. **Borrower** - Equity injection from borrower
4. **Seller Note** - Seller financing
5. **3rd Party** - Other third-party financing (replaces SBA 504 + CDC)
6. **Total** - Row total
7. **SBA Term** - Loan term in months for this use category
8. **%** - Percentage of grand total

### Data Model Changes
```typescript
// Before
interface SourcesUsesRow {
  equity?: number;
  sellerNote?: number;
  sba7a?: number;
  sba504?: number;
  cdc?: number;
}

// After
interface SourcesUsesRow {
  tBankLoan?: number;    // Renamed from sba7a
  borrower?: number;     // Renamed from equity
  sellerNote?: number;   // Unchanged
  thirdParty?: number;   // Replaces sba504 + cdc
  sbaTerm?: number;      // New field (months)
}
```

### Percentage Column Calculation
```typescript
// Per-row percentage of grand total
const getRowPercentage = (category: keyof SourcesUses): string => {
  const grandTotal = getGrandTotal();
  if (grandTotal === 0) return '0%';
  const rowTotal = getRowTotal(category);
  return ((rowTotal / grandTotal) * 100).toFixed(1) + '%';
};
```

### SBA Term Input
- Numeric input field (months)
- Editable per row - each use category can have its own term
- Optional - can be left blank
- Not included in row/column totals
- Read-only in view mode

## Risks / Trade-offs

### Risk: Existing Data Migration
- **Risk**: Existing Firestore documents use old field names
- **Mitigation**: Clean migration - update all code to use new field names. Existing data in old fields will be ignored (no backward compatibility).

## Migration Plan

### Phase 1: Code Changes
1. Update `SourcesUsesRow` interface with new field names
2. Update `SourcesUsesMatrix.tsx` component
3. Update Zoho Sheets mappers

### Phase 2: Zoho Sheets
- No template changes needed - Zoho Sheets template already uses correct column names

### Rollback
- Revert code changes
- Existing Firestore data with old field names remains but is unused

## Decisions Made

1. **SBA Term is editable per row** - Each use category can have its own loan term
2. **No backward compatibility** - Clean migration, old field names will not be supported
3. **Zoho Sheets template is ready** - Already using the correct column structure

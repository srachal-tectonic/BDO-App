# Remove Subject Business Section from Step 1

**Change ID:** `remove-subject-business-section`
**Status:** Completed
**Author:** Claude
**Date:** 2026-01-07

## Summary

Remove the "Subject Business" section completely from Step 1 (Project Overview) of the Loan Application. This section currently collects Business Name, Business Location, Business Website, and Business Description with an AI generation button.

## Motivation

The "Subject Business" section duplicates information that may be collected elsewhere in the application (e.g., Business Applicant or Seller Info sections). Removing it simplifies the Project Overview step and reduces redundant data entry.

## Impact

- **Affected code:**
  - `components/loan-sections/ProjectOverviewSection.tsx` - Remove the Subject Business section UI (lines ~405-487)
  - `components/PQMemoForm.tsx` - Remove the Subject Business display section (lines ~391-418)
  - `lib/schema.ts` - Deprecate/remove `businessName`, `businessLocation`, `businessWebsite`, `businessDescription` fields from `ProjectOverview` interface

## Scope

### In Scope
- Remove the "Subject Business" heading and all four fields (Business Name, Business Location, Business Website, Business Description) from ProjectOverviewSection
- Remove the Separator that precedes the Subject Business section
- Remove the "Subject Business" summary card from PQMemoForm
- Remove or deprecate the associated fields from the ProjectOverview schema

### Out of Scope
- The `SellerInfo` interface has its own `businessName` and `businessDescription` fields - these are NOT affected
- Any data migration for existing projects (fields will simply not be displayed)
- Changes to other sections of the loan application

## Fields Being Removed

| Field | Type | Description |
|-------|------|-------------|
| `businessName` | `string?` | Name of business using loan proceeds or being acquired |
| `businessLocation` | `string?` | Business address or location |
| `businessWebsite` | `string?` | Business website URL |
| `businessDescription` | `string?` | Description with AI generation capability |

## UI Changes

### Before
```
Project Overview Section
├── Project Details (Name, BDO, Industry, NAICS, etc.)
├── Project Description
├── ─── Separator ───
└── Subject Business
    ├── Business Name
    ├── Business Location
    ├── Business Website
    └── Business Description (with AI Generate button)
```

### After
```
Project Overview Section
├── Project Details (Name, BDO, Industry, NAICS, etc.)
└── Project Description
```

## Acceptance Criteria

1. The "Subject Business" heading is no longer visible in Step 1
2. The four fields (Business Name, Location, Website, Description) are no longer visible
3. The "Generate with AI" button associated with Business Description is removed
4. The PQ Memo no longer displays a "Subject Business" card
5. The application compiles without TypeScript errors
6. Existing data in these fields is preserved but not displayed (no data loss)

# Tasks: Remove Subject Business Section

## 1. Update ProjectOverviewSection Component
- [x] 1.1 Remove the `<Separator className="my-6" />` that precedes the Subject Business section
- [x] 1.2 Remove the entire Subject Business `<div>` block containing:
  - "Subject Business" heading
  - Business Name field with label and helper text
  - Business Location field with label
  - Business Website field with label
  - Business Description field with label, AI generate button, helper text, and textarea
- [x] 1.3 Remove the `Separator` import (Sparkles import kept for NAICS suggestion feature)

## 2. Update PQMemoForm Component
- [x] 2.1 Remove the Subject Business conditional block that displays:
  - "Subject Business" section header
  - Business Name display
  - Business Location display
  - Business Website display
  - Business Description display
- [x] 2.2 Remove the `subjectBusinessName`, `subjectBusinessLocation`, `subjectBusinessWebsite`, `subjectBusinessDescription` fields from the DUMMY_DATA object

## 3. Update Schema
- [x] 3.1 Remove `businessName`, `businessLocation`, `businessWebsite`, `businessDescription` fields from the `ProjectOverview` interface in `lib/schema.ts`
- [x] 3.2 Remove corresponding fields from `lib/dummyData.ts`

## 4. Validation
- [x] 4.1 Run TypeScript compilation to verify no type errors (pre-existing errors in pdf-exports and pdf-tools unrelated to this change)
- [x] 4.2 Verify Step 1 (Project Overview) no longer shows Subject Business section
- [x] 4.3 Verify PQ Memo no longer shows Subject Business card
- [x] 4.4 Verify no console errors when loading existing projects that had Subject Business data

## Notes
- The SellerInfo interface has separate `businessName` and `businessDescription` fields that are NOT affected by this change
- Existing data stored in these fields will be preserved in Firestore but will no longer be displayed or editable
- The Sparkles icon import was kept in ProjectOverviewSection.tsx as it's used by the "Suggest NAICS" feature

# Change: Fix Duplicate Header in Borrower Portal Step 1

## Why
On the Borrower Portal step 1 (Business Applicant), the header "Business Applicant" and "Total Ownership Identified" are displayed twice - once in the page's CardHeader and once inside the BusinessApplicantSection component itself. This creates a confusing and redundant UI.

## What Changes
- Remove the duplicate header display to show "Business Applicant" and "Total Ownership Identified" only once
- Option A: Remove the header from BusinessApplicantSection component (preferred - keeps page layout consistent)
- Option B: Remove the conditional CardHeader content when on step 1

## Root Cause
The duplication occurs because:
1. `app/bdo/borrower-portal/[id]/page.tsx` line ~297 displays `BORROWER_STEPS[currentSection - 1]?.title` in CardTitle
2. `app/bdo/borrower-portal/[id]/page.tsx` lines 302-312 conditionally show "Total Ownership Identified" when `currentSection === 1`
3. `components/loan-sections/BusinessApplicantSection.tsx` lines 61-72 have their own header with "Business Applicant" and "Total Ownership Identified"

## Impact
- **Affected files**:
  - `components/loan-sections/BusinessApplicantSection.tsx` - Remove internal header
- **No data model changes**
- **No breaking changes**

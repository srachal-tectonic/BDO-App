# Change: Replace Individual Files with Other Owned Businesses in BDO Portal Step 5

## Why
The BDO Portal's loan application workflow currently has "Individual Files" as Step 5, which duplicates functionality available in Step 8 (File Uploads). Replacing it with "Other Owned Businesses" provides a dedicated step for capturing affiliate business ownership information, which is required for SBA loan applications to understand the full ownership structure of applicants.

## What Changes
- Rename Step 5 from "Individual Files" to "Other Owned Businesses" in BDO Portal
- Replace `IndividualFilesSection` component with `OtherOwnedBusinessesSection` component at Step 5
- Update the step configuration and switch statement in `app/bdo/projects/[id]/page.tsx`
- Remove unused import of `IndividualFilesSection` (if no longer needed elsewhere)

## Impact
- **Primary file**: `app/bdo/projects/[id]/page.tsx`
- **Component used**: `components/loan-sections/OtherOwnedBusinessesSection.tsx` (already exists)
- **No schema changes required** - `OtherOwnedBusinessesSection` already uses existing `otherOwnedBusinesses` data from `applicationStore`
- **No breaking changes** - purely a UI reorganization within the BDO Portal

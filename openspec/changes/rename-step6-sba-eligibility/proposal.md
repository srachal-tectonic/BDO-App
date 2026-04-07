# Change: Rename Step 6 from "Applicant SBA Eligibility" to "SBA Eligibility"

## Why
The current step title "Applicant SBA Eligibility" is unnecessarily verbose. Shortening it to "SBA Eligibility" improves readability in the sidebar while maintaining clarity about the step's purpose.

## What Changes
- Rename Step 6 from "Applicant SBA Eligibility" to "SBA Eligibility" in the BDO Portal
- Update the `LOAN_APPLICATION_STEPS` array in `app/bdo/projects/[id]/page.tsx`

## Impact
- **Primary file**: `app/bdo/projects/[id]/page.tsx`
- **No component changes** - only the step title in the configuration array
- **No breaking changes** - purely a UI label update

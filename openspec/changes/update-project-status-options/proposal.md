# Change: Update Project Status Options with Inline Editing

## Why
The current project stage values (Lead, BDO, Underwriting, Closing, Servicing) do not accurately reflect the actual loan pipeline workflow stages used by the team. Additionally, users cannot change the status directly from the projects table view, requiring them to navigate into each project to make updates.

## What Changes
- **BREAKING**: Replace existing stage values with new status options: "Draft", "Watch List", "Warmer Leads", "Active Lead", "PQ Advance", "PQ More Info", "UW", "Closing", "Adverse Action", "Withdrawn"
- Add inline dropdown selector to the Status column in the projects table/report view
- Update status color coding to reflect new statuses
- Migrate existing projects with old stage values to appropriate new status values

## Impact
- Affected specs: project-management
- Affected code:
  - `types/index.ts` - Project interface stage/status type definition
  - `lib/schema.ts` - ApplicationData status type
  - `app/bdo/projects/page.tsx` - Projects table, status display, color coding, dropdown implementation
  - `services/firestore.ts` - May need status update helper function

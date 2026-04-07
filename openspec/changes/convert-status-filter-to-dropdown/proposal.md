# Change: Convert Status Filter Buttons to Dropdown

## Why
With 10 status options now available, displaying each status as an individual filter button creates a cluttered UI that wraps across multiple lines. A dropdown selector provides a cleaner, more compact interface for filtering projects by status.

## What Changes
- Replace the row of filter buttons with a single Select dropdown component
- Include "All" option as the default selection to show all projects
- Display all 10 status options in the dropdown menu
- Maintain the same filtering functionality

## Impact
- Affected specs: project-management
- Affected code:
  - `app/bdo/projects/page.tsx` - Replace filter buttons with Select dropdown

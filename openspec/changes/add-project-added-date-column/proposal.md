# Change: Add "Added Date" Column to Projects Table

## Why
Users need visibility into when projects were created to better track and manage their pipeline. Currently, the creation date is stored but not displayed in the projects table view.

## What Changes
- Add new "Added Date" column to the Projects table between "Status" and "Actions" columns
- Display the project's `createdAt` timestamp formatted in CST (America/Chicago timezone)
- Show both date and time for precision

## Impact
- Affected specs: project-management
- Affected code:
  - `app/bdo/projects/page.tsx` - Add table header and cell for Added Date column

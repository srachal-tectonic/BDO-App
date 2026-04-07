# Proposal: Add BDO Column to Projects Table

## Summary

Add a new "BDO" column to the `/bdo/projects` table to display the Business Development Officer assigned to each project. The column should be positioned after the "Industry" column.

## Motivation

Currently, the projects table does not show which BDO is responsible for each project. This information is already stored in the `bdoUserName` field of each project and would help users quickly identify project ownership.

## Scope

- **In Scope:**
  - Add a new "BDO" column header to the projects table
  - Display the `bdoUserName` value in each row
  - Position the column after "Industry" and before "Project Total"

- **Out of Scope:**
  - Filtering by BDO
  - Sorting by BDO
  - Making the column clickable/linkable

## Technical Approach

The implementation is straightforward since the `bdoUserName` field already exists on the `Project` type and is loaded from Firestore:

1. Add a new `<TableHead>BDO</TableHead>` element after the Industry column header
2. Add a new `<TableCell>{project.bdoUserName}</TableCell>` element in the corresponding position in each row

## Affected Files

- `app/bdo/projects/page.tsx` - Add column header and cell rendering

## Risks

- **Low:** This is a display-only change with no data model or API modifications
- The `bdoUserName` field is already populated for all projects

## Success Criteria

- The BDO column appears in the projects table after the Industry column
- Each project row displays the correct BDO name
- Build compiles without errors

# Tasks: Add BDO Column to Projects Table

## Phase 1: UI Updates

- [x] **1.1** Add "BDO" column header to the projects table
  - Insert `<TableHead>BDO</TableHead>` after the "Industry" column header
  - Position: after Industry, before Project Total

- [x] **1.2** Add BDO data cell to each project row
  - Insert `<TableCell>{project.bdoUserName}</TableCell>` in the corresponding position
  - Display the BDO name from the project data

## Phase 2: Verification

- [x] **2.1** Verify build compiles without errors

- [ ] **2.2** Manual testing: verify BDO column displays correctly
  - Column appears after Industry
  - BDO names are displayed for each project

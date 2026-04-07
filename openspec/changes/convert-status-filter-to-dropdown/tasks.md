# Tasks: Convert Status Filter Buttons to Dropdown

## 1. Update Filter UI
- [x] 1.1 Remove the existing filter buttons mapping over stages array
- [x] 1.2 Add Select dropdown component for status filtering
- [x] 1.3 Include "All" as the first/default option
- [x] 1.4 Include all PROJECT_STATUSES as selectable options
- [x] 1.5 Style dropdown to match the existing UI aesthetics

## 2. Update State Management
- [x] 2.1 Update filterStage state to work with Select onValueChange
- [x] 2.2 Ensure "All" selection shows all projects (no filtering)

## 3. Testing
- [ ] 3.1 Verify dropdown displays all status options
- [ ] 3.2 Verify filtering works correctly for each status
- [ ] 3.3 Verify "All" option shows all projects

# Tasks: Add "Added Date" Column to Projects Table

## 1. Update Table Structure
- [x] 1.1 Add "Added Date" TableHead between "Status" and "Actions" columns
- [x] 1.2 Add TableCell to display formatted createdAt date

## 2. Implement Date Formatting
- [x] 2.1 Create date formatting function for CST (America/Chicago) timezone
- [x] 2.2 Format date as readable string with date and time (e.g., "Jan 14, 2026 2:30 PM")
- [x] 2.3 Handle cases where createdAt might be undefined or invalid

## 3. Testing
- [ ] 3.1 Verify column displays correctly in table
- [ ] 3.2 Verify timezone conversion is accurate for CST
- [ ] 3.3 Verify date formatting is consistent across all rows

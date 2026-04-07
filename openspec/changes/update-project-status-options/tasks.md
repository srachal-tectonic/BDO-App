# Tasks: Update Project Status Options

## 1. Update Type Definitions
- [x] 1.1 Update `types/index.ts` Project interface to replace stage values with new status options
- [ ] 1.2 Update `lib/schema.ts` ApplicationData status type if needed
- [x] 1.3 Define status type as union: `'Draft' | 'Watch List' | 'Warmer Leads' | 'Active Lead' | 'PQ Advance' | 'PQ More Info' | 'UW' | 'Closing' | 'Adverse Action' | 'Withdrawn'`

## 2. Update Projects Table Display
- [x] 2.1 Update `getStatusColor()` function in `app/bdo/projects/page.tsx` with new status values and appropriate colors
- [x] 2.2 Replace static status badge with Select dropdown component in table cell
- [x] 2.3 Import Select, SelectTrigger, SelectValue, SelectContent, SelectItem components
- [x] 2.4 Style dropdown to match table row aesthetics (compact, inline appearance)

## 3. Implement Status Change Functionality
- [x] 3.1 Create `handleStatusChange(projectId: string, newStatus: string)` function
- [x] 3.2 Call Firestore `updateProject()` to persist status change
- [x] 3.3 Update local state to reflect change immediately (optimistic update)
- [x] 3.4 Add error handling and rollback on failure
- [ ] 3.5 Show toast/notification on successful status change

## 4. Update Filter Buttons
- [x] 4.1 Update stage filter buttons to use new status values
- [ ] 4.2 Consider grouping statuses for filter UI (e.g., "Active" group, "Closed" group)

## 5. Data Migration
- [ ] 5.1 Create migration mapping from old stages to new statuses:
  - Lead → Draft or Watch List
  - BDO → Active Lead
  - Underwriting → UW
  - Closing → Closing
  - Servicing → (consider if needed)
- [ ] 5.2 Document migration strategy for existing projects

## 6. Testing
- [ ] 6.1 Verify dropdown renders correctly in all table rows
- [ ] 6.2 Test status change persists to Firestore
- [ ] 6.3 Test filter buttons work with new status values
- [ ] 6.4 Test color coding displays correctly for all statuses

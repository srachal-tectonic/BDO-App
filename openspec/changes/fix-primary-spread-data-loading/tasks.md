# Tasks: Fix Primary Spread Data Loading

## Phase 1: Investigate Current Behavior

### 1.1 Analyze Current Implementation
- [x] Review `handleMarkAsPrimary` in SourcesUsesCards.tsx
- [x] Check if data is being fetched fresh each time
- [x] Verify update functions are being called with correct data
- [x] Check if state updates are being applied correctly

## Phase 2: Fix Mark as Primary Refresh

### 2.1 Ensure Fresh Data Fetch
- [x] Confirm `getProjectSourcesUses` fetches latest data from Firebase (not cached)
- [x] Ensure all three update functions receive and apply new data

### 2.2 Force State Update
- [x] Update functions properly replace state with new data

## Phase 3: Load Primary Data on Page Mount

### 3.1 Add Load Logic to Project Page
- [x] Import `getProjectSourcesUses`, `mapSyncedDataToStore`, `hasSyncedData`
- [x] Get update functions from `useApplication` hook
- [x] Create `loadPrimarySpreadData` function in project page
- [x] Check if `primarySpreadId` exists on page load
- [x] Fetch synced data from Firebase using `getProjectSourcesUses`
- [x] Map data using `mapSyncedDataToStore` for each table type
- [x] Populate all three tables with mapped data

### 3.2 Integration with loadProject
- [x] Call `loadPrimarySpreadData` after loading project data
- [x] Only load if `primarySpreadId` exists

## Phase 4: Testing

### 4.1 Verify Functionality
- [x] Build compiles successfully
- [ ] Marking Spread A as Primary populates tables
- [ ] Marking Spread B as Primary updates tables with new data
- [ ] Page reload with existing Primary populates tables automatically
- [ ] Tables show correct data for each table type (7a, 504, Express)

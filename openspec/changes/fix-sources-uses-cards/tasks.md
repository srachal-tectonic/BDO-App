# Tasks: Fix Sources & Uses Cards Implementation

## Phase 1: Restore Editable Tables

### 1.1 Update SourcesUsesCards Component
- [x] Remove the Sync button from SpreadsSection
- [x] Remove isSyncing state and handleSyncFromZoho function
- [x] Remove sourcesUsesData state (read-only synced data)
- [x] Import and use SourcesUsesMatrix component for each card
- [x] Pass sourcesUses data from applicationStore to each SourcesUsesMatrix
- [x] Pass updateSourcesUses function to enable editing

### 1.2 Update Data Binding
- [x] Each card should bind to the same sourcesUses data from the store
- [x] All three tables edit the same underlying data (or create separate data keys for each)
- [x] Ensure tables are visible and editable even without synced data

### 1.3 Remove Unused Components
- [x] Delete `components/loan-sections/SourcesUsesTable.tsx` (read-only component no longer needed)

## Phase 2: Update FundingStructureSection

### 2.1 Restore Data Props
- [x] Re-add updateSourcesUses to destructured values from useApplication()
- [x] Pass sourcesUses and updateSourcesUses to SourcesUsesCards

## Phase 3: Verify Spreads Generation

### 3.1 Ensure Prefill Works
- [x] Verify Create Spreads still uses applicationData from the store
- [x] Verify table data is sent to Zoho when generating spreads

## Phase 4: Testing

### 4.1 Verify UI
- [x] Tables appear even without Zoho Sheets generated
- [x] Tables are editable
- [x] No Sync button in the UI
- [x] Spreads section only in first card
- [x] All three cards collapse/expand independently

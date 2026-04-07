# Tasks: Fix Sources & Uses Table Isolation

## Phase 1: Data Model Updates

### 1.1 Update Application Store Schema
- [x] Add `sourcesUses7a: Partial<SourcesUses>` field to `ApplicationData` interface
- [x] Add `sourcesUses504: Partial<SourcesUses>` field to `ApplicationData` interface
- [x] Add `sourcesUsesExpress: Partial<SourcesUses>` field to `ApplicationData` interface
- [x] Keep existing `sourcesUses` for backwards compatibility (deprecated)

### 1.2 Add Store Update Functions
- [x] Add `updateSourcesUses7a(updates: Partial<SourcesUses>)` function
- [x] Add `updateSourcesUses504(updates: Partial<SourcesUses>)` function
- [x] Add `updateSourcesUsesExpress(updates: Partial<SourcesUses>)` function
- [x] Export new functions from `useApplication` hook

### 1.3 Initialize Default State
- [x] Add initial state for `sourcesUses7a` with default values
- [x] Add initial state for `sourcesUses504` with default values
- [x] Add initial state for `sourcesUsesExpress` with default values

## Phase 2: Component Updates

### 2.1 Update SourcesUsesMatrix Props
- [x] Add `tableType: '7a' | '504' | 'express'` prop to `SourcesUsesMatrixProps`
- [x] Update component to use `tableType` for column label logic (e.g., "CDC 504" vs "3rd Party")

### 2.2 Update SourcesUsesCards
- [x] Get all three table states from props (passed from parent)
- [x] Get all three update functions from props (passed from parent)
- [x] Pass `sourcesUses7a` and `updateSourcesUses7a` to 7(a) Standard card
- [x] Pass `sourcesUses504` and `updateSourcesUses504` to 504 card
- [x] Pass `sourcesUsesExpress` and `updateSourcesUsesExpress` to 7(a) Express card
- [x] Pass `tableType` prop to each SourcesUsesMatrix

### 2.3 Update FundingStructureSection
- [x] Get all three table states from application store
- [x] Get all three update functions from application store
- [x] Pass all three states and update functions to `SourcesUsesCards`
- [x] Update total calculation to use `sourcesUses7a`

## Phase 3: Data Mapping Updates

### 3.1 Update syncedDataMapper
- [x] `mapSyncedDataToStore` already supports specific table type parameter
- [x] Ensure 7(a) data maps correctly to `sourcesUses7a`
- [x] Ensure 504 data maps correctly (with `cdc504` → `thirdParty`)
- [x] Ensure Express data maps correctly to `sourcesUsesExpress`

### 3.2 Update Mark as Primary Handler
- [x] Update `handleMarkAsPrimary` in `SourcesUsesCards` to populate all three tables
- [x] Call `updateSourcesUses7a` with 7(a) mapped data
- [x] Call `updateSourcesUses504` with 504 mapped data
- [x] Call `updateSourcesUsesExpress` with Express mapped data

## Phase 4: Data Persistence

### 4.1 Update Dummy Data
- [x] Add `sourcesUses7a` to dummy data
- [x] Add `sourcesUses504` to dummy data
- [x] Add `sourcesUsesExpress` to dummy data

## Phase 5: Testing

### 5.1 Verify Functionality
- [x] Build compiles successfully
- [ ] Editing 7(a) table does NOT affect 504 or Express tables
- [ ] Editing 504 table does NOT affect 7(a) or Express tables
- [ ] Editing Express table does NOT affect 7(a) or 504 tables
- [ ] "Mark as Primary" populates all three tables independently
- [ ] Data persists correctly on page reload

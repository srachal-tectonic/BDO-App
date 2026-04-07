# Tasks: Add Fee Configurations Section

## 1. Data Model
- [x] 1.1 Define `FeeConfiguration` TypeScript interface with fields: id, feeName, amount, includesRealEstate, description, active
- [x] 1.2 Add `feeConfigurations` array to `AdminSettings` interface
- [x] 1.3 Add `FeeNameType` type with allowed fee name values

## 2. State Management
- [x] 2.1 Add state for fee configurations list
- [x] 2.2 Add state for modal visibility (add/edit)
- [x] 2.3 Add state for currently editing fee configuration
- [x] 2.4 Update `loadSettings()` to load fee configurations
- [x] 2.5 Ensure fee configurations are included in `saveSettings()`

## 3. UI Components - Table
- [x] 3.1 Create Fee Configurations section container after WSJ Prime Rate section
- [x] 3.2 Add section label and description
- [x] 3.3 Create table with columns: Fee Name, Amount, Includes Real Estate, Description, Active, Actions
- [x] 3.4 Render fee configurations rows with data
- [x] 3.5 Add "Add Fee Configuration" button above the table

## 4. UI Components - Modal Form
- [x] 4.1 Create modal dialog component for add/edit fee configuration
- [x] 4.2 Add "Fee Name" dropdown with options: Good Faith Deposit, SBA Guarantee Fee, Packaging Fee, Appraisal Fee, Environmental Fee, Title Insurance, Legal Fees
- [x] 4.3 Add "Amount" number input field
- [x] 4.4 Add "Condition: Includes Real Estate?" dropdown with Yes/No options
- [x] 4.5 Add "Description" text input field
- [x] 4.6 Add "Active" toggle switch (Yes/No)
- [x] 4.7 Add Save and Cancel buttons to modal

## 5. CRUD Operations
- [x] 5.1 Implement add fee configuration handler
- [x] 5.2 Implement edit fee configuration handler
- [x] 5.3 Implement delete fee configuration handler (with confirmation)
- [x] 5.4 Add edit button to each table row
- [x] 5.5 Add delete button to each table row

## 6. Validation
- [x] 6.1 Validate required fields before save (Fee Name, Amount required)
- [x] 6.2 Validate amount is a positive number
- [x] 6.3 Display validation errors in modal

## 7. Testing
- [ ] 7.1 Manually test add new fee configuration
- [ ] 7.2 Manually test edit existing fee configuration
- [ ] 7.3 Manually test delete fee configuration
- [ ] 7.4 Verify data persists to Firebase
- [ ] 7.5 Verify data loads correctly on page refresh

# Tasks: Convert DSCR Period Fields to Dropdowns

## 1. Add DSCR Data to Application Store
- [x] 1.1 Add DSCR interface to `lib/schema.ts` with period and dscr value fields
- [x] 1.2 Add `dscr` field to application data in `lib/applicationStore.ts`
- [x] 1.3 Add `updateDSCR` function to the store

## 2. Update FundingStructureSection Component
- [x] 2.1 Import Select components from `@/components/ui/select`
- [x] 2.2 Import `updateDSCR` from application store
- [x] 2.3 Define period options constant: `['2022', '2023', '2024', '2025', 'Interim']`

## 3. Replace Period Text Inputs with Dropdowns
- [x] 3.1 Replace Period 1 text input with Select dropdown
- [x] 3.2 Replace Period 2 text input with Select dropdown
- [x] 3.3 Replace Period 3 text input with Select dropdown
- [x] 3.4 Replace Period 4 text input with Select dropdown
- [x] 3.5 Wire each dropdown to store with value and onValueChange

## 4. Wire DSCR Number Inputs to Store
- [x] 4.1 Add value and onChange to DSCR 1 input
- [x] 4.2 Add value and onChange to DSCR 2 input
- [x] 4.3 Add value and onChange to DSCR 3 input
- [x] 4.4 Add value and onChange to DSCR 4 input

## 5. Validation
- [x] 5.1 Run TypeScript compilation to verify no errors
- [ ] 5.2 Test selecting periods from dropdowns
- [ ] 5.3 Test persistence of selected values
- [ ] 5.4 Test read-only mode disables dropdowns
- [ ] 5.5 Test DSCR numeric values save correctly

## Notes
- Used existing Select component pattern from shadcn/ui
- Period options are static: 2022, 2023, 2024, 2025, Interim
- Maintained visual consistency with other form fields in the section

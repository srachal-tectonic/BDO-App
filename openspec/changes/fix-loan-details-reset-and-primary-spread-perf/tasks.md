## 1. Add Batched Store Action
- [x] 1.1 Add `updateAllSourcesUses` action to `lib/applicationStore.ts` that accepts `{ sourcesUses7a, sourcesUses504, sourcesUsesExpress }` and updates all three in a single `set()` call
- [x] 1.2 Export the new action from the `ApplicationStore` interface

## 2. Use Batched Action in Mark-as-Primary Flows
- [x] 2.1 In `SourcesUsesCards.tsx` `handleMarkAsPrimary`, replace three separate `updateSourcesUses*()` calls with a single `updateAllSourcesUses()` call
- [x] 2.2 In `app/bdo/projects/[id]/page.tsx` `loadPrimarySpreadData`, replace three separate `updateSourcesUses*()` calls with a single `updateAllSourcesUses()` call

## 3. Fix Loan Type Reset
- [x] 3.1 In `FundingStructureSection.tsx`, update the useEffect to clear Loan 1 type to `''` when `loan1Total === 0`
- [x] 3.2 In `FundingStructureSection.tsx`, update the useEffect to clear Loan 2 type to `''` when `loan2Total === 0`

## 4. Manual Verification
- [ ] 4.1 Mark a spread with both 7(a) and 504 data as primary — confirm both Loan 1 and Loan 2 populate with correct types and amounts
- [ ] 4.2 Switch to a spread that has only 7(a) data — confirm Loan 2 Type clears to "Select Loan Type" and Loan 2 Amount resets to $0
- [ ] 4.3 Switch back to the spread with both tables — confirm both Loan 1 and Loan 2 repopulate
- [ ] 4.4 Verify marking a spread as primary no longer causes a multi-second freeze
- [ ] 4.5 Manually set a loan type, then mark a spread with data — confirm the manual type is preserved (not overwritten)

## 1. Update BDO Portal Step Configuration
- [x] 1.1 Add import for `OtherOwnedBusinessesSection` in `app/bdo/projects/[id]/page.tsx`
- [x] 1.2 Update `LOAN_APPLICATION_STEPS` array to change Step 5 title from "Individual Files" to "Other Owned Businesses"
- [x] 1.3 Update `renderSectionContent()` switch statement case 5 to render `<OtherOwnedBusinessesSection />` instead of `<IndividualFilesSection />`
- [x] 1.4 Remove `IndividualFilesSection` import if no longer used in this file

## 2. Verification
- [x] 2.1 Verify the application builds without errors (note: pre-existing type error in admin page is unrelated)
- [ ] 2.2 Verify Step 5 displays "Other Owned Businesses" in the sidebar
- [ ] 2.3 Verify the OtherOwnedBusinessesSection component renders correctly when Step 5 is selected
- [ ] 2.4 Verify data entry in the Other Owned Businesses section saves correctly

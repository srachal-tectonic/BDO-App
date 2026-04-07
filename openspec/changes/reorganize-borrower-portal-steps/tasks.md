# Tasks: Reorganize Borrower Portal Steps

## 1. Update BORROWER_STEPS Configuration
- [x] 1.1 Update `BORROWER_STEPS` array in `app/bdo/borrower-portal/[id]/page.tsx` to reflect new 8-step structure
- [x] 1.2 Update step count references (e.g., `currentSection < 7` → `currentSection < 8`)

## 2. Create Personal Financial Statements Section
- [x] 2.1 Create `components/loan-sections/PersonalFinancialStatementsSection.tsx`
- [ ] 2.2 Display list of all individual applicants with their financial fields:
  - Net Worth
  - Post-Close Liquidity
  - Required Income from Business
  - Equity Injection Amount
- [ ] 2.3 Allow inline editing of financial fields for each applicant
- [ ] 2.4 Show summary totals across all applicants

## 3. Create Other Owned Businesses Section
- [x] 3.1 Create `components/loan-sections/OtherOwnedBusinessesSection.tsx`
- [ ] 3.2 Determine data structure for affiliate/other business information
- [ ] 3.3 Implement form for adding/editing other owned businesses
- [ ] 3.4 Connect to application store for persistence

## 4. Create Combined Files Section
- [x] 4.1 Create `components/loan-sections/CombinedFilesSection.tsx`
- [x] 4.2 Include Business Files uploads:
  - Federal Business Tax Returns
  - Financial Statements (Business)
  - Other Business Documents
- [x] 4.3 Include Individual Files uploads:
  - Personal Federal Tax Returns
  - Personal Financial Statements
  - Resume
  - Other Individual Files
- [x] 4.4 Organize with clear section headers to distinguish business vs individual files

## 5. Update Borrower Portal Page
- [x] 5.1 Import new section components
- [x] 5.2 Update `renderSectionContent()` switch statement for new step mapping:
  - Case 1: BusinessApplicantSection
  - Case 2: IndividualApplicantsSection
  - Case 3: PersonalFinancialStatementsSection
  - Case 4: OtherOwnedBusinessesSection
  - Case 5: SBAEligibilitySection
  - Case 6: SellerInfoSection
  - Case 7: CombinedFilesSection
  - Case 8: BusinessQuestionnaireSection
- [ ] 5.3 Test navigation between all 8 steps
- [ ] 5.4 Verify auto-save functionality works with new steps

## 6. Testing & Verification
- [ ] 6.1 Verify all existing data is accessible in new step structure
- [ ] 6.2 Test that no data is lost during step reorganization
- [ ] 6.3 Verify mobile responsiveness of new sections
- [ ] 6.4 Test save/load cycle with new step structure

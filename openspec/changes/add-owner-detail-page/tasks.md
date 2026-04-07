# Tasks: Add Owner Detail Page

## 1. Update Schema
- [x] 1.1 Add `estimatedCreditScore` field to IndividualApplicant
- [x] 1.2 Add `creditScoreExplanation` field to IndividualApplicant
- [x] 1.3 Add `planToBeOnSite` field to IndividualApplicant

## 2. Create CurrencyInput Component
- [x] 2.1 Create `components/ui/currency-input.tsx`
- [x] 2.2 Implement $ prefix display
- [x] 2.3 Support number formatting with commas
- [x] 2.4 Handle decimal/integer modes

## 3. Create Owner Detail Page
- [x] 3.1 Create directory `app/bdo/projects/[id]/individual/[applicantId]/`
- [x] 3.2 Create `page.tsx` with 'use client' directive
- [x] 3.3 Add imports (useRouter, useParams, useApplication, icons, components)
- [x] 3.4 Add state management (loading, saving, copied link, learn more panel)
- [x] 3.5 Add data fetching with getLoanApplication service
- [x] 3.6 Add auto-save with debounced timeout (cleanup on unmount)

## 4. Implement Page Header
- [x] 4.1 Add back navigation button
- [x] 4.2 Add breadcrumb navigation
- [x] 4.3 Add owner name heading
- [x] 4.4 Add Send Link button with mailto functionality
- [x] 4.5 Add Copy Link button with clipboard functionality

## 5. Implement Personal Information Section
- [x] 5.1 Add First Name and Last Name inputs
- [x] 5.2 Add SSN input with PasswordToggle
- [x] 5.3 Add Estimated Credit Score select with learn more
- [x] 5.4 Add conditional Credit Score Explanation textarea
- [x] 5.5 Add Phone and Email inputs
- [x] 5.6 Add Home Address with AddressInput component

## 6. Implement Project & Business Involvement Section
- [x] 6.1 Add Project Role select with conditional logic
- [x] 6.2 Add Ownership % input (disabled for non-owners)
- [x] 6.3 Add Ownership Type select (disabled for non-owners)
- [x] 6.4 Add conditional Indirect Ownership Description textarea
- [x] 6.5 Add Role in Business Operations select
- [x] 6.6 Add Travel Time to Business select (disabled for passive)
- [x] 6.7 Add Experience select (disabled for passive)
- [x] 6.8 Add Years of Experience select (disabled for passive)
- [x] 6.9 Add conditional Business Role Description textarea
- [x] 6.10 Add conditional Plan to be On-Site textarea

## 7. Implement Personal Financials Section
- [x] 7.1 Add Net Worth currency input with learn more
- [x] 7.2 Add Post-Close Liquidity currency input with learn more
- [x] 7.3 Add Required Income from Business currency input with learn more
- [x] 7.4 Add Equity Injection Amount currency input with learn more

## 8. Implement Footer Actions
- [x] 8.1 Add "Done - Back to All Owners" button
- [x] 8.2 Ensure navigation returns to project page Individual Applicants section

## 9. Update IndividualApplicantsSection Navigation
- [x] 9.1 Update handleOpenDetail to use correct route `/bdo/projects/${projectId}/individual/${applicantId}`

## 10. Testing and Validation
- [ ] 10.1 Verify page loads with correct applicant data
- [ ] 10.2 Verify all form fields save correctly
- [ ] 10.3 Verify conditional fields show/hide appropriately
- [ ] 10.4 Verify auto-save works with debounce
- [ ] 10.5 Verify Send Link and Copy Link functionality
- [ ] 10.6 Verify back navigation returns to correct section
- [ ] 10.7 Verify timeout cleanup on unmount (no memory leaks)

## Notes
- Remove Header and BorrowerPortalStepper components (not needed for BDO view)
- Use existing BDOLayout for consistent styling
- Adapt @tanstack/react-query patterns to useState/useEffect
- Use existing Firestore services instead of apiRequest
- Add proper TypeScript types throughout
- Ensure all learn more content is preserved from Replit code

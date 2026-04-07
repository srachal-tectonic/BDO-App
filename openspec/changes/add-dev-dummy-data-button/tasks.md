# Implementation Tasks

## 1. Dummy Data Generator
- [x] 1.1 Create `lib/dummyData.ts` with sample loan application data
- [x] 1.2 Include realistic data for all form sections:
  - Project Overview (name, description, NAICS, BDO info)
  - Funding Structure (loan amounts, sources/uses)
  - Business Applicant (legal name, EIN, address, entity type)
  - Individual Applicants (principals with ownership %)
  - SBA Eligibility flags
  - Seller Info (for acquisitions)
- [x] 1.3 Export a function to populate the Zustand store with dummy data

## 2. UI Button
- [x] 2.1 Add "Fill with Dummy Data" button to project page
- [x] 2.2 Only render button when `process.env.NODE_ENV === 'development'`
- [x] 2.3 Style button distinctly (e.g., orange/warning color) to indicate dev-only
- [x] 2.4 Add confirmation or visual feedback when data is populated

## 3. Testing
- [ ] 3.1 Verify button appears only on localhost
- [ ] 3.2 Verify button does not appear in production build
- [ ] 3.3 Test that all form sections are populated correctly
- [ ] 3.4 Test Zoho Sheets generation with dummy data

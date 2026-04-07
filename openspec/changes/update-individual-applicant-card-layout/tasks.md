# Tasks

## Schema Updates
- [x] Add `middleName` field to IndividualApplicant interface in `lib/schema.ts`
- [x] Add `suffix` field to IndividualApplicant interface in `lib/schema.ts`

## Application Store Updates
- [x] Update `handleAddApplicant` in IndividualApplicantsSection to initialize new fields

## Personal Information Section Updates
- [x] Add Middle Name input field after First Name
- [x] Add Suffix input field after Last Name
- [x] Add Date of Birth input field (date picker or formatted input)
- [x] Replace Credit Score numeric input with dropdown select
  - Options: "750+", "700-749", "650-699", "600-649", "Below 600"
- [x] Reorder fields: First Name, Middle Name, Last Name, Suffix, SSN, DOB, Phone, Email, Home Address, Credit Score

## Project & Business Involvement Section Updates
- [x] Add Title input field
- [x] Add Indirect Ownership Description textarea field (conditionally shown when ownershipType is "indirect")
- [x] Add "Describe your role in the business and how your experience qualifies you for it" textarea field (use `businessRoleDescription` field from schema)
- [x] Add Plan to be On-Site dropdown field
  - Options: "Yes", "No"
- [x] Reorder fields per specification: Project Role, Ownership %, Ownership Type, Title, Indirect Ownership Description, Role in Business Operations, Travel Time, Relevant Experience, Years of Experience, Role Description textarea, Plan to be On-Site

## Remove Personal Financials Section
- [x] Remove entire "Personal Financials" section (Net Worth, Post-Close Liquidity, Required Income from Business, Equity Injection Amount fields)

## Testing & Validation
- [x] Verify all new fields save correctly to application state
- [x] Verify Credit Score dropdown values map correctly
- [x] Verify Indirect Ownership Description only shows when ownership type is "indirect"
- [x] Test form with multiple applicants
- [x] Verify layout is responsive on mobile devices

# Change: Add "Please explain" text areas to SBA Eligibility questions

## Why

Currently, the SBA Eligibility step (Step 5) in the Borrower Portal only collects Yes/No answers for each eligibility question. When a borrower answers "Yes" to any question (e.g., bankruptcy, criminal conviction, tax liens), there is no way for them to provide additional context or explanation. Loan officers need this additional information to properly assess applications and understand the circumstances behind affirmative answers.

## What Changes

- Add a conditional text area field labeled "Please explain" under each of the 7 SBA eligibility questions
- The text area should appear when the borrower selects "Yes" for any question
- The explanation text should be stored in the application data alongside the Yes/No answers
- The explanations should be visible to BDOs reviewing the application

## Impact

- Affected specs: `borrower-portal` (SBA Eligibility section)
- Affected code:
  - `components/loan-sections/SBAEligibilitySection.tsx` - Add conditional text areas
  - `lib/schema.ts` - Update SBAEligibility interface to include explanation fields
  - `lib/applicationStore.ts` - Handle storing/retrieving explanation data

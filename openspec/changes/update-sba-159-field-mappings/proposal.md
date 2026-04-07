# Change: Update SBA Form 159 PDF Field Mappings

## Why
When borrowers upload SBA Form 159 (Fee Disclosure and Compensation Agreement) through the Borrower Portal, the system only maps 7 out of 47 fillable fields. This happens because the current field mappings use generic field names (e.g., "Applicant Name", "Fee Amount") that don't match the actual PDF form field names. The PDF uses specific internal field names that need to be mapped correctly.

## What Changes
- Update `/lib/pdf-extraction/sba-159-mapping.ts` to include all 47 fillable fields from the SBA Form 159 PDF
- Add pattern-based matching for fields that may have multiple naming conventions
- Add field mappings for all sections:
  - **Loan Type Selection**: 7(a) Loan and 504 Loan checkboxes
  - **Loan Information**: SBA Loan Name, Loan Number (10-digit), Location ID
  - **Lender Information**: SBA Lender Legal Name
  - **Agent Information**: Services Performed by (Name of Agent), Agent Contact Person, Agent Address
  - **Type of Agent Checkboxes**: SBA Lender, Independent Loan Packager, Referral Agent/Broker, Consultant, Accountant, Third Party Lender, Other
  - **Service Fees Table**: 5 service types x 2 payment sources (Applicant/SBA Lender) = 10 fields plus "Other" description
  - **Compensation Totals**: Total paid by Applicant, Total paid by SBA Lender
  - **Itemization Checkbox**: Supporting documentation attached indicator
  - **504 Loan Section**: CDC referral fee checkbox, Amount of Fee, TPL Name, TPL Address
  - **Signature Blocks**: 3 parties (Applicant, Agent, SBA Lender) x 4 fields each (Signature, Date, Print Name, Title) = 12 fields
- Update field detection signatures to improve form type recognition
- Add appropriate value transforms (currency, date, boolean) for each field type
- Create new `feeDisclosure` data structure to store all extracted fee-related data

## Impact
- Affected specs: `borrower-upload-extraction`
- Affected code:
  - `lib/pdf-extraction/sba-159-mapping.ts` - Complete rewrite of field mappings
  - `lib/pdf-extraction/types.ts` - May need new app sections for fee disclosure data
  - `types/index.ts` - Add `FeeDisclosure159` interface if not present
- Data model changes:
  - Expand `feeDisclosure` section in loan application to store all Form 159 fields
  - Add support for service fee breakdown (loan packaging, financial statement, broker, consultant, other)
  - Add signature tracking fields for each party

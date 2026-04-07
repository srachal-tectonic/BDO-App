# Design: Update SBA Form 159 PDF Field Mappings

## Context

The SBA Form 159 (Fee Disclosure and Compensation Agreement) is a 4-page PDF form used for 7(a) and 504 loan programs. When borrowers upload completed forms, the system needs to extract all fillable fields and map them to the loan application data model.

**Current State**: Only 7 of 47 fields are being mapped due to mismatched field names.

**Target State**: All 47 fillable fields mapped with appropriate transforms and confidence scores.

## Goals / Non-Goals

### Goals
- Map all 47 fillable fields from SBA Form 159
- Support both exact and pattern-based field name matching
- Correctly transform values (currency, dates, booleans)
- Maintain high confidence scores for mapped fields
- Store data in a structured format suitable for review and application

### Non-Goals
- Signature image extraction (signatures are captured as text fields for names)
- OCR of non-fillable form content
- Validation of business rules (e.g., fee limits)
- Auto-approval of extracted data

## Decisions

### Decision: Field Name Discovery Approach
**Choice**: Extract actual field names from the PDF using pdf-lib at runtime and log them for mapping creation.

**Rationale**: PDF forms use internal field names that may differ from visible labels. We need the exact field names to create accurate mappings.

**Alternatives**:
- Use pattern matching only (rejected: too imprecise)
- Manual inspection with PDF editor (accepted as supplementary approach)

### Decision: Data Structure for Fee Information
**Choice**: Create a flat structure under `feeDisclosure` section with clear field naming.

```typescript
interface FeeDisclosure159 {
  // Loan Type
  loanType7a: boolean;
  loanType504: boolean;

  // Loan Info
  sbaLoanName: string;
  sbaLoanNumber: string;
  sbaLocationId: string;

  // Lender Info
  sbaLenderLegalName: string;

  // Agent Info
  agentName: string;
  agentContactPerson: string;
  agentAddress: string;

  // Agent Type (checkboxes)
  agentTypeSbaLender: boolean;
  agentTypeIndependentPackager: boolean;
  agentTypeReferralBroker: boolean;
  agentTypeConsultant: boolean;
  agentTypeAccountant: boolean;
  agentTypeThirdPartyLender: boolean;
  agentTypeOther: boolean;
  agentTypeOtherDescription: string;

  // Service Fees - Applicant Paid
  loanPackagingFeeApplicant: number;
  financialStatementFeeApplicant: number;
  brokerReferralFeeApplicant: number;
  consultantFeeApplicant: number;
  otherFeeApplicant: number;
  otherFeeDescription: string;

  // Service Fees - SBA Lender Paid
  loanPackagingFeeLender: number;
  financialStatementFeeLender: number;
  brokerReferralFeeLender: number;
  consultantFeeLender: number;
  otherFeeLender: number;

  // Totals
  totalCompensationApplicant: number;
  totalCompensationLender: number;
  itemizationAttached: boolean;

  // 504 Loan Only
  cdcReferralFeeReceived: boolean;
  cdcReferralFeeAmount: number;
  tplName: string;
  tplAddress: string;

  // Applicant Signature Block
  applicantSignatureDate: string;
  applicantPrintName: string;
  applicantTitle: string;

  // Agent Signature Block
  agentSignatureDate: string;
  agentPrintName: string;
  agentTitle: string;

  // SBA Lender Signature Block
  lenderSignatureDate: string;
  lenderPrintName: string;
  lenderTitle: string;
}
```

**Rationale**: Flat structure is easier to map, query, and display in review UI. Nested objects add complexity without benefit for this form.

### Decision: Pattern Matching Strategy
**Choice**: Use both exact match and regex patterns for each field.

```typescript
{
  pdfFieldName: 'SBA Loan Name',
  pdfFieldPattern: /sba.*loan.*name|loan.*name/i,
  appSection: 'feeDisclosure',
  appFieldPath: 'sbaLoanName',
  confidence: 0.9,
}
```

**Rationale**: Different PDF versions or generators may produce slightly different field names. Pattern matching provides fallback while exact match maintains high confidence.

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| PDF field names change in future form versions | Fields won't map | Use pattern matching as fallback; monitor extraction success rates |
| Multiple fields match same pattern | Wrong data mapped | Order patterns from most specific to least specific |
| Performance impact from regex matching | Slower extraction | Patterns are compiled once; impact negligible |
| Empty fields reduce confidence too much | Valid empty fields rejected | Adjust confidence calculation for optional fields |

## Migration Plan

1. **Phase 1**: Deploy updated mappings alongside existing
2. **Phase 2**: Test with real uploaded Form 159 PDFs
3. **Phase 3**: Monitor mapped field counts in extraction results
4. **Rollback**: Revert to previous mapping file if issues detected

No data migration needed - this only affects new extractions.

## Open Questions

1. **Q**: Should we store original PDF field names in extraction record for debugging?
   **A**: Yes, already stored in `pdfFieldName` field.

2. **Q**: What happens when same field has different names in different PDF versions?
   **A**: Pattern matching handles this; first match wins.

3. **Q**: Should signature fields be extracted (they're typically empty or contain "[SIGNATURE]")?
   **A**: Yes, extract them - useful to verify form was signed. Map to printName and title fields.

# SBA Form 159 - Extracted PDF Field Names

This document lists all 47 fillable fields extracted from `SBA_Form_159_-_Fee_Disclosure_Form (1).pdf`.

## Checkbox Fields (11)

| # | PDF Field Name | Mapped To |
|---|----------------|-----------|
| 1 | `7a loan` | `feeDisclosure.loanType7a` |
| 2 | `504 loan` | `feeDisclosure.loanType504` |
| 3 | `SBA Lender` | `feeDisclosure.agentTypeSbaLender` |
| 4 | `Independent Loan Packager` | `feeDisclosure.agentTypeIndependentPackager` |
| 5 | `Referral AgentBroker` | `feeDisclosure.agentTypeReferralBroker` |
| 6 | `Consultant` | `feeDisclosure.agentTypeConsultant` |
| 7 | `Accountant preparing financial` | `feeDisclosure.agentTypeAccountant` |
| 8 | `Third Party Lender TPL` | `feeDisclosure.agentTypeThirdPartyLender` |
| 9 | `Other` | `feeDisclosure.agentTypeOther` |
| 10 | `Itemization and supporting documentation is attached` | `feeDisclosure.itemizationAttached` |
| 11 | `CDC received referral fee from a TPL` | `feeDisclosure.cdcReceivedReferralFee` |

## Text Fields (33)

### Loan Information
| # | PDF Field Name | Mapped To |
|---|----------------|-----------|
| 1 | `SBA Loan Name` | `feeDisclosure.sbaLoanName` |
| 2 | `SBA Loan Number 10 digit number` | `feeDisclosure.sbaLoanNumber` |
| 3 | `SBA Location ID 67 digit number` | `feeDisclosure.sbaLocationId` |

### Lender Information
| # | PDF Field Name | Mapped To |
|---|----------------|-----------|
| 4 | `SBA Lender Legal Name` | `feeDisclosure.sbaLenderLegalName` |

### Agent Information
| # | PDF Field Name | Mapped To |
|---|----------------|-----------|
| 5 | `Services Performed by Name of Agent` | `feeDisclosure.agentName` |
| 6 | `Agent Contact Person` | `feeDisclosure.agentContactPerson` |
| 7 | `Agent Address` | `feeDisclosure.agentAddress` |
| 8 | `other type of agent` | `feeDisclosure.agentTypeOtherDescription` |

### Service Fees - Applicant Paid
| # | PDF Field Name | Mapped To | Transform |
|---|----------------|-----------|-----------|
| 9 | `Amount Paid by ApplicantLoan packaging` | `feeDisclosure.loanPackagingFeeApplicant` | currency |
| 10 | `Amount Paid by ApplicantFinancial statement preparation for loan application` | `feeDisclosure.financialStatementFeeApplicant` | currency |
| 11 | `Amount Paid by ApplicantBroker or Referral services` | `feeDisclosure.brokerReferralFeeApplicant` | currency |
| 12 | `Amount Paid by ApplicantConsultant services` | `feeDisclosure.consultantFeeApplicant` | currency |
| 13 | `Amount Paid by ApplicantOther` | `feeDisclosure.otherFeeApplicant` | currency |

### Service Fees - SBA Lender Paid
| # | PDF Field Name | Mapped To | Transform |
|---|----------------|-----------|-----------|
| 14 | `Amount Paid by SBA LenderLoan packaging` | `feeDisclosure.loanPackagingFeeLender` | currency |
| 15 | `Amount Paid by SBA LenderFinancial statement preparation for loan application` | `feeDisclosure.financialStatementFeeLender` | currency |
| 16 | `Amount Paid by SBA LenderBroker or Referral services` | `feeDisclosure.brokerReferralFeeLender` | currency |
| 17 | `Amount Paid by SBA LenderConsultant services` | `feeDisclosure.consultantFeeLender` | currency |
| 18 | `Amount Paid by SBA LenderOther` | `feeDisclosure.otherFeeLender` | currency |

### Other Service & Totals
| # | PDF Field Name | Mapped To | Transform |
|---|----------------|-----------|-----------|
| 19 | `Other_2` | `feeDisclosure.otherServiceDescription` | - |
| 20 | `Applicant` | `feeDisclosure.totalCompensationApplicant` | currency |
| 21 | `SBA Lender_2` | `feeDisclosure.totalCompensationLender` | currency |

### 504 Loan Only
| # | PDF Field Name | Mapped To | Transform |
|---|----------------|-----------|-----------|
| 22 | `Amount of Fee` | `feeDisclosure.cdcReferralFeeAmount` | currency |
| 23 | `TPL Name` | `feeDisclosure.tplName` | - |
| 24 | `TPL Address` | `feeDisclosure.tplAddress` | - |

### Applicant Signature Block
| # | PDF Field Name | Mapped To | Transform |
|---|----------------|-----------|-----------|
| 25 | `Date 1 mm/dd/yyyy` | `feeDisclosure.applicantSignatureDate` | date |
| 26 | `Print Name` | `feeDisclosure.applicantPrintName` | - |
| 27 | `Title` | `feeDisclosure.applicantTitle` | - |

### Agent Signature Block
| # | PDF Field Name | Mapped To | Transform |
|---|----------------|-----------|-----------|
| 28 | `Date 2 mm/dd/yyyy` | `feeDisclosure.agentSignatureDate` | date |
| 29 | `Print Name_2` | `feeDisclosure.agentPrintName` | - |
| 30 | `Title_2` | `feeDisclosure.agentTitle` | - |

### SBA Lender Signature Block
| # | PDF Field Name | Mapped To | Transform |
|---|----------------|-----------|-----------|
| 31 | `Date 3 mm/dd/yyyy` | `feeDisclosure.lenderSignatureDate` | date |
| 32 | `Print Name_3` | `feeDisclosure.lenderPrintName` | - |
| 33 | `Title_3` | `feeDisclosure.lenderTitle` | - |

## Signature Fields (3)

| # | PDF Field Name | Mapped To |
|---|----------------|-----------|
| 1 | `Signature of Authorized Representative of Applicant` | `feeDisclosure.applicantSignature` |
| 2 | `Signature of Authorized Representative of Agent` | `feeDisclosure.agentSignature` |
| 3 | `Signature of Authorized Representative of SBA Lender` | `feeDisclosure.lenderSignature` |

---

## Summary

| Category | Count |
|----------|-------|
| Checkbox fields | 11 |
| Text fields | 33 |
| Signature fields | 3 |
| **Total** | **47** |

All fields map to the `feeDisclosure` section in the loan application data model.

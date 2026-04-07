import { SbaFormMapping } from './types';

/**
 * SBA Form 159 - Fee Disclosure Form and Compensation Agreement
 * For use with 7(a) and 504 Loan Programs
 *
 * This mapping covers all 47 fillable fields in the PDF form.
 * Field names extracted from: SBA_Form_159_-_Fee_Disclosure_Form (1).pdf
 *
 * Field Categories:
 * - Loan Type Selection (2 checkboxes)
 * - Loan Information (3 text fields)
 * - Lender Information (1 text field)
 * - Agent Information (3 text fields)
 * - Type of Agent (7 checkboxes + 1 text for "Other")
 * - Service Fees Table (10 amount fields + 1 description)
 * - Compensation Totals (2 text fields)
 * - Itemization (1 checkbox)
 * - 504 Loan Only (1 checkbox + 3 text fields)
 * - Signature Blocks (3 signatures + 9 text fields for dates/names/titles)
 */
export const sba159Mapping: SbaFormMapping = {
  formId: 'sba-159',
  formName: 'SBA Form 159 - Fee Disclosure Form',
  formNumber: '159',
  fieldSignatures: [
    'FEE DISCLOSURE',
    'COMPENSATION AGREEMENT',
    'SBA Form 159',
    'Total Compensation',
    'Type of Agent',
    'Amount Paid by Applicant',
    'Amount Paid by SBA Lender',
    'Loan packaging',
    'Referral AgentBroker',
    'Third Party Lender TPL',
  ],
  mappings: [
    // ============================================
    // LOAN TYPE SELECTION (2 checkboxes)
    // ============================================
    {
      pdfFieldName: '7a loan',
      appSection: 'feeDisclosure',
      appFieldPath: 'loanType7a',
      transform: 'boolean',
      confidence: 0.95,
      label: '7(a) Loan',
    },
    {
      pdfFieldName: '504 loan',
      appSection: 'feeDisclosure',
      appFieldPath: 'loanType504',
      transform: 'boolean',
      confidence: 0.95,
      label: '504 Loan',
    },

    // ============================================
    // LOAN INFORMATION (3 text fields)
    // ============================================
    {
      pdfFieldName: 'SBA Loan Name',
      appSection: 'feeDisclosure',
      appFieldPath: 'sbaLoanName',
      confidence: 0.95,
      label: 'SBA Loan Name',
    },
    {
      pdfFieldName: 'SBA Loan Number 10 digit number',
      pdfFieldPattern: /sba.*loan.*number/i,
      appSection: 'feeDisclosure',
      appFieldPath: 'sbaLoanNumber',
      confidence: 0.95,
      label: 'SBA Loan Number',
    },
    {
      pdfFieldName: 'SBA Location ID 67 digit number',
      pdfFieldPattern: /sba.*location.*id/i,
      appSection: 'feeDisclosure',
      appFieldPath: 'sbaLocationId',
      confidence: 0.95,
      label: 'SBA Location ID',
    },

    // ============================================
    // LENDER INFORMATION (1 text field)
    // ============================================
    {
      pdfFieldName: 'SBA Lender Legal Name',
      pdfFieldPattern: /sba.*lender.*legal.*name/i,
      appSection: 'feeDisclosure',
      appFieldPath: 'sbaLenderLegalName',
      confidence: 0.95,
      label: 'SBA Lender Legal Name',
    },

    // ============================================
    // AGENT INFORMATION (3 text fields)
    // ============================================
    {
      pdfFieldName: 'Services Performed by Name of Agent',
      pdfFieldPattern: /services.*performed.*agent|name.*of.*agent/i,
      appSection: 'feeDisclosure',
      appFieldPath: 'agentName',
      confidence: 0.95,
      label: 'Agent Name',
    },
    {
      pdfFieldName: 'Agent Contact Person',
      pdfFieldPattern: /agent.*contact/i,
      appSection: 'feeDisclosure',
      appFieldPath: 'agentContactPerson',
      confidence: 0.95,
      label: 'Agent Contact Person',
    },
    {
      pdfFieldName: 'Agent Address',
      pdfFieldPattern: /agent.*address/i,
      appSection: 'feeDisclosure',
      appFieldPath: 'agentAddress',
      confidence: 0.95,
      label: 'Agent Address',
    },

    // ============================================
    // TYPE OF AGENT (7 checkboxes + 1 text)
    // ============================================
    {
      pdfFieldName: 'SBA Lender',
      appSection: 'feeDisclosure',
      appFieldPath: 'agentTypeSbaLender',
      transform: 'boolean',
      confidence: 0.9,
      label: 'Agent Type: SBA Lender',
    },
    {
      pdfFieldName: 'Independent Loan Packager',
      pdfFieldPattern: /independent.*loan.*packager/i,
      appSection: 'feeDisclosure',
      appFieldPath: 'agentTypeIndependentPackager',
      transform: 'boolean',
      confidence: 0.95,
      label: 'Agent Type: Independent Loan Packager',
    },
    {
      pdfFieldName: 'Referral AgentBroker',
      pdfFieldPattern: /referral.*agent|broker/i,
      appSection: 'feeDisclosure',
      appFieldPath: 'agentTypeReferralBroker',
      transform: 'boolean',
      confidence: 0.95,
      label: 'Agent Type: Referral Agent/Broker',
    },
    {
      pdfFieldName: 'Consultant',
      appSection: 'feeDisclosure',
      appFieldPath: 'agentTypeConsultant',
      transform: 'boolean',
      confidence: 0.95,
      label: 'Agent Type: Consultant',
    },
    {
      pdfFieldName: 'Accountant preparing financial',
      pdfFieldPattern: /accountant.*preparing|accountant.*financial/i,
      appSection: 'feeDisclosure',
      appFieldPath: 'agentTypeAccountant',
      transform: 'boolean',
      confidence: 0.95,
      label: 'Agent Type: Accountant',
    },
    {
      pdfFieldName: 'Third Party Lender TPL',
      pdfFieldPattern: /third.*party.*lender|tpl/i,
      appSection: 'feeDisclosure',
      appFieldPath: 'agentTypeThirdPartyLender',
      transform: 'boolean',
      confidence: 0.95,
      label: 'Agent Type: Third Party Lender',
    },
    {
      pdfFieldName: 'Other',
      appSection: 'feeDisclosure',
      appFieldPath: 'agentTypeOther',
      transform: 'boolean',
      confidence: 0.85,
      label: 'Agent Type: Other',
    },
    {
      pdfFieldName: 'other type of agent',
      pdfFieldPattern: /other.*type.*agent/i,
      appSection: 'feeDisclosure',
      appFieldPath: 'agentTypeOtherDescription',
      confidence: 0.95,
      label: 'Agent Type: Other Description',
    },

    // ============================================
    // SERVICE FEES - APPLICANT PAID (5 fields)
    // ============================================
    {
      pdfFieldName: 'Amount Paid by ApplicantLoan packaging',
      pdfFieldPattern: /amount.*paid.*applicant.*loan.*packaging/i,
      appSection: 'feeDisclosure',
      appFieldPath: 'loanPackagingFeeApplicant',
      transform: 'currency',
      confidence: 0.95,
      label: 'Loan Packaging Fee (Applicant)',
    },
    {
      pdfFieldName: 'Amount Paid by ApplicantFinancial statement preparation for loan application',
      pdfFieldPattern: /amount.*paid.*applicant.*financial.*statement/i,
      appSection: 'feeDisclosure',
      appFieldPath: 'financialStatementFeeApplicant',
      transform: 'currency',
      confidence: 0.95,
      label: 'Financial Statement Fee (Applicant)',
    },
    {
      pdfFieldName: 'Amount Paid by ApplicantBroker or Referral services',
      pdfFieldPattern: /amount.*paid.*applicant.*broker|amount.*paid.*applicant.*referral/i,
      appSection: 'feeDisclosure',
      appFieldPath: 'brokerReferralFeeApplicant',
      transform: 'currency',
      confidence: 0.95,
      label: 'Broker/Referral Fee (Applicant)',
    },
    {
      pdfFieldName: 'Amount Paid by ApplicantConsultant services',
      pdfFieldPattern: /amount.*paid.*applicant.*consultant/i,
      appSection: 'feeDisclosure',
      appFieldPath: 'consultantFeeApplicant',
      transform: 'currency',
      confidence: 0.95,
      label: 'Consultant Fee (Applicant)',
    },
    {
      pdfFieldName: 'Amount Paid by ApplicantOther',
      pdfFieldPattern: /amount.*paid.*applicant.*other/i,
      appSection: 'feeDisclosure',
      appFieldPath: 'otherFeeApplicant',
      transform: 'currency',
      confidence: 0.95,
      label: 'Other Fee (Applicant)',
    },

    // ============================================
    // SERVICE FEES - SBA LENDER PAID (5 fields)
    // ============================================
    {
      pdfFieldName: 'Amount Paid by SBA LenderLoan packaging',
      pdfFieldPattern: /amount.*paid.*sba.*lender.*loan.*packaging/i,
      appSection: 'feeDisclosure',
      appFieldPath: 'loanPackagingFeeLender',
      transform: 'currency',
      confidence: 0.95,
      label: 'Loan Packaging Fee (SBA Lender)',
    },
    {
      pdfFieldName: 'Amount Paid by SBA LenderFinancial statement preparation for loan application',
      pdfFieldPattern: /amount.*paid.*sba.*lender.*financial.*statement/i,
      appSection: 'feeDisclosure',
      appFieldPath: 'financialStatementFeeLender',
      transform: 'currency',
      confidence: 0.95,
      label: 'Financial Statement Fee (SBA Lender)',
    },
    {
      pdfFieldName: 'Amount Paid by SBA LenderBroker or Referral services',
      pdfFieldPattern: /amount.*paid.*sba.*lender.*broker|amount.*paid.*sba.*lender.*referral/i,
      appSection: 'feeDisclosure',
      appFieldPath: 'brokerReferralFeeLender',
      transform: 'currency',
      confidence: 0.95,
      label: 'Broker/Referral Fee (SBA Lender)',
    },
    {
      pdfFieldName: 'Amount Paid by SBA LenderConsultant services',
      pdfFieldPattern: /amount.*paid.*sba.*lender.*consultant/i,
      appSection: 'feeDisclosure',
      appFieldPath: 'consultantFeeLender',
      transform: 'currency',
      confidence: 0.95,
      label: 'Consultant Fee (SBA Lender)',
    },
    {
      pdfFieldName: 'Amount Paid by SBA LenderOther',
      pdfFieldPattern: /amount.*paid.*sba.*lender.*other/i,
      appSection: 'feeDisclosure',
      appFieldPath: 'otherFeeLender',
      transform: 'currency',
      confidence: 0.95,
      label: 'Other Fee (SBA Lender)',
    },

    // ============================================
    // OTHER SERVICE DESCRIPTION (1 field)
    // ============================================
    {
      pdfFieldName: 'Other_2',
      appSection: 'feeDisclosure',
      appFieldPath: 'otherServiceDescription',
      confidence: 0.9,
      label: 'Other Service Description',
    },

    // ============================================
    // COMPENSATION TOTALS (2 fields)
    // ============================================
    {
      pdfFieldName: 'Applicant',
      appSection: 'feeDisclosure',
      appFieldPath: 'totalCompensationApplicant',
      transform: 'currency',
      confidence: 0.9,
      label: 'Total Compensation (Applicant)',
    },
    {
      pdfFieldName: 'SBA Lender_2',
      appSection: 'feeDisclosure',
      appFieldPath: 'totalCompensationLender',
      transform: 'currency',
      confidence: 0.9,
      label: 'Total Compensation (SBA Lender)',
    },

    // ============================================
    // ITEMIZATION CHECKBOX (1 field)
    // ============================================
    {
      pdfFieldName: 'Itemization and supporting documentation is attached',
      pdfFieldPattern: /itemization.*supporting.*documentation/i,
      appSection: 'feeDisclosure',
      appFieldPath: 'itemizationAttached',
      transform: 'boolean',
      confidence: 0.95,
      label: 'Itemization Attached',
    },

    // ============================================
    // 504 LOAN ONLY SECTION (4 fields)
    // ============================================
    {
      pdfFieldName: 'CDC received referral fee from a TPL',
      pdfFieldPattern: /cdc.*received.*referral.*fee/i,
      appSection: 'feeDisclosure',
      appFieldPath: 'cdcReceivedReferralFee',
      transform: 'boolean',
      confidence: 0.95,
      label: 'CDC Received Referral Fee',
    },
    {
      pdfFieldName: 'Amount of Fee',
      pdfFieldPattern: /amount.*of.*fee/i,
      appSection: 'feeDisclosure',
      appFieldPath: 'cdcReferralFeeAmount',
      transform: 'currency',
      confidence: 0.95,
      label: 'CDC Referral Fee Amount',
    },
    {
      pdfFieldName: 'TPL Name',
      pdfFieldPattern: /tpl.*name/i,
      appSection: 'feeDisclosure',
      appFieldPath: 'tplName',
      confidence: 0.95,
      label: 'Third Party Lender Name',
    },
    {
      pdfFieldName: 'TPL Address',
      pdfFieldPattern: /tpl.*address/i,
      appSection: 'feeDisclosure',
      appFieldPath: 'tplAddress',
      confidence: 0.95,
      label: 'Third Party Lender Address',
    },

    // ============================================
    // APPLICANT SIGNATURE BLOCK (4 fields)
    // ============================================
    {
      pdfFieldName: 'Signature of Authorized Representative of Applicant',
      pdfFieldPattern: /signature.*authorized.*representative.*applicant/i,
      appSection: 'feeDisclosure',
      appFieldPath: 'applicantSignature',
      confidence: 0.9,
      label: 'Applicant Signature',
    },
    {
      pdfFieldName: 'Date 1 mm/dd/yyyy',
      appSection: 'feeDisclosure',
      appFieldPath: 'applicantSignatureDate',
      transform: 'date',
      confidence: 0.95,
      label: 'Applicant Signature Date',
    },
    {
      pdfFieldName: 'Print Name',
      appSection: 'feeDisclosure',
      appFieldPath: 'applicantPrintName',
      confidence: 0.9,
      label: 'Applicant Print Name',
    },
    {
      pdfFieldName: 'Title',
      appSection: 'feeDisclosure',
      appFieldPath: 'applicantTitle',
      confidence: 0.9,
      label: 'Applicant Title',
    },

    // ============================================
    // AGENT SIGNATURE BLOCK (4 fields)
    // ============================================
    {
      pdfFieldName: 'Signature of Authorized Representative of Agent',
      pdfFieldPattern: /signature.*authorized.*representative.*agent/i,
      appSection: 'feeDisclosure',
      appFieldPath: 'agentSignature',
      confidence: 0.9,
      label: 'Agent Signature',
    },
    {
      pdfFieldName: 'Date 2 mm/dd/yyyy',
      appSection: 'feeDisclosure',
      appFieldPath: 'agentSignatureDate',
      transform: 'date',
      confidence: 0.95,
      label: 'Agent Signature Date',
    },
    {
      pdfFieldName: 'Print Name_2',
      appSection: 'feeDisclosure',
      appFieldPath: 'agentPrintName',
      confidence: 0.9,
      label: 'Agent Print Name',
    },
    {
      pdfFieldName: 'Title_2',
      appSection: 'feeDisclosure',
      appFieldPath: 'agentTitle',
      confidence: 0.9,
      label: 'Agent Title',
    },

    // ============================================
    // SBA LENDER SIGNATURE BLOCK (4 fields)
    // ============================================
    {
      pdfFieldName: 'Signature of Authorized Representative of SBA Lender',
      pdfFieldPattern: /signature.*authorized.*representative.*sba.*lender/i,
      appSection: 'feeDisclosure',
      appFieldPath: 'lenderSignature',
      confidence: 0.9,
      label: 'SBA Lender Signature',
    },
    {
      pdfFieldName: 'Date 3 mm/dd/yyyy',
      appSection: 'feeDisclosure',
      appFieldPath: 'lenderSignatureDate',
      transform: 'date',
      confidence: 0.95,
      label: 'SBA Lender Signature Date',
    },
    {
      pdfFieldName: 'Print Name_3',
      appSection: 'feeDisclosure',
      appFieldPath: 'lenderPrintName',
      confidence: 0.9,
      label: 'SBA Lender Print Name',
    },
    {
      pdfFieldName: 'Title_3',
      appSection: 'feeDisclosure',
      appFieldPath: 'lenderTitle',
      confidence: 0.9,
      label: 'SBA Lender Title',
    },
  ],
};

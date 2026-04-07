import { SbaFormMapping } from './types';

/**
 * SBA Form 1919 - Borrower Information Form
 * This form collects basic business and borrower information
 */
export const sba1919Mapping: SbaFormMapping = {
  formId: 'sba-1919',
  formName: 'SBA Form 1919 - Borrower Information Form',
  formNumber: '1919',
  fieldSignatures: [
    'Business Legal Name',
    'DBA',
    'Business TIN',
    'DUNS Number',
    'Primary Contact',
    'Business Phone',
    'Number of Employees',
  ],
  mappings: [
    // Business Information
    {
      pdfFieldName: 'Business Legal Name',
      appSection: 'businessApplicant',
      appFieldPath: 'legalName',
      confidence: 0.95,
      label: 'Business Legal Name',
    },
    {
      pdfFieldName: 'DBA',
      appSection: 'businessApplicant',
      appFieldPath: 'dbaName',
      confidence: 0.95,
      label: 'DBA Name',
    },
    {
      pdfFieldName: 'Business TIN',
      appSection: 'businessApplicant',
      appFieldPath: 'ein',
      transform: 'ein',
      confidence: 0.95,
      label: 'EIN/Tax ID',
    },
    {
      pdfFieldName: 'EIN',
      appSection: 'businessApplicant',
      appFieldPath: 'ein',
      transform: 'ein',
      confidence: 0.95,
      label: 'EIN/Tax ID',
    },
    {
      pdfFieldName: 'DUNS Number',
      appSection: 'businessApplicant',
      appFieldPath: 'dunsNumber',
      confidence: 0.9,
      label: 'DUNS Number',
    },
    {
      pdfFieldName: 'Primary Contact',
      appSection: 'businessApplicant',
      appFieldPath: 'primaryContact',
      confidence: 0.85,
      label: 'Primary Contact',
    },
    {
      pdfFieldName: 'Business Phone',
      appSection: 'businessApplicant',
      appFieldPath: 'phone',
      transform: 'phone',
      confidence: 0.9,
      label: 'Business Phone',
    },
    {
      pdfFieldName: 'Business Fax',
      appSection: 'businessApplicant',
      appFieldPath: 'fax',
      transform: 'phone',
      confidence: 0.85,
      label: 'Business Fax',
    },
    {
      pdfFieldName: 'Business Email',
      appSection: 'businessApplicant',
      appFieldPath: 'email',
      confidence: 0.9,
      label: 'Business Email',
    },
    {
      pdfFieldName: 'Number of Employees',
      appSection: 'businessApplicant',
      appFieldPath: 'numberOfEmployees',
      confidence: 0.9,
      label: 'Number of Employees',
    },
    // Address fields
    {
      pdfFieldName: 'Street Address',
      appSection: 'businessApplicant',
      appFieldPath: 'address.street1',
      confidence: 0.9,
      label: 'Street Address',
    },
    {
      pdfFieldName: 'City',
      appSection: 'businessApplicant',
      appFieldPath: 'address.city',
      confidence: 0.95,
      label: 'City',
    },
    {
      pdfFieldName: 'State',
      appSection: 'businessApplicant',
      appFieldPath: 'address.state',
      transform: 'uppercase',
      confidence: 0.95,
      label: 'State',
    },
    {
      pdfFieldName: 'Zip Code',
      appSection: 'businessApplicant',
      appFieldPath: 'address.zipCode',
      confidence: 0.95,
      label: 'ZIP Code',
    },
    {
      pdfFieldName: 'ZIP',
      appSection: 'businessApplicant',
      appFieldPath: 'address.zipCode',
      confidence: 0.95,
      label: 'ZIP Code',
    },
    // Business type
    {
      pdfFieldName: 'Type of Business',
      appSection: 'businessApplicant',
      appFieldPath: 'businessType',
      confidence: 0.85,
      label: 'Type of Business',
    },
    {
      pdfFieldName: 'Date Business Established',
      appSection: 'businessApplicant',
      appFieldPath: 'dateEstablished',
      transform: 'date',
      confidence: 0.9,
      label: 'Date Established',
    },
    {
      pdfFieldName: 'NAICS Code',
      appSection: 'businessApplicant',
      appFieldPath: 'naicsCode',
      confidence: 0.95,
      label: 'NAICS Code',
    },
    // Loan information
    {
      pdfFieldName: 'Loan Amount Requested',
      appSection: 'fundingStructure',
      appFieldPath: 'loanAmountRequested',
      transform: 'currency',
      confidence: 0.9,
      label: 'Loan Amount Requested',
    },
    {
      pdfFieldName: 'Loan Purpose',
      appSection: 'fundingStructure',
      appFieldPath: 'loanPurpose',
      confidence: 0.85,
      label: 'Loan Purpose',
    },
  ],
};

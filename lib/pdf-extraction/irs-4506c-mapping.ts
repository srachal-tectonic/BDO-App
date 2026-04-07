import { SbaFormMapping } from './types';

/**
 * IRS Form 4506-C - IVES Request for Transcript of Tax Return
 * This form is used to request tax transcripts from the IRS
 */
export const irs4506cMapping: SbaFormMapping = {
  formId: 'irs-4506c',
  formName: 'IRS Form 4506-C - Request for Transcript of Tax Return',
  formNumber: '4506-C',
  fieldSignatures: [
    '4506-C',
    'IVES Request',
    'Transcript of Tax Return',
    'Tax form number',
    'Return Transcript',
    'Account Transcript',
    'Taxpayer name',
  ],
  mappings: [
    // Taxpayer Information (Line 1a-1b)
    {
      pdfFieldName: 'Name shown on tax return',
      appSection: 'individualApplicants',
      appFieldPath: 'owners[0].fullName',
      confidence: 0.85,
      label: 'Taxpayer Name',
    },
    {
      pdfFieldName: '1a Name',
      appSection: 'individualApplicants',
      appFieldPath: 'owners[0].fullName',
      confidence: 0.85,
      label: 'Taxpayer Name (1a)',
    },
    {
      pdfFieldName: '1b Name',
      appSection: 'individualApplicants',
      appFieldPath: 'owners[0].spouseName',
      confidence: 0.8,
      label: 'Spouse Name (1b)',
    },
    // SSN/EIN (Line 2a-2b)
    {
      pdfFieldName: 'Social security number',
      appSection: 'individualApplicants',
      appFieldPath: 'owners[0].ssn',
      transform: 'ssn',
      confidence: 0.95,
      label: 'Social Security Number',
    },
    {
      pdfFieldName: '2a SSN',
      appSection: 'individualApplicants',
      appFieldPath: 'owners[0].ssn',
      transform: 'ssn',
      confidence: 0.95,
      label: 'SSN (2a)',
    },
    {
      pdfFieldName: '2b SSN',
      appSection: 'individualApplicants',
      appFieldPath: 'owners[0].spouseSsn',
      transform: 'ssn',
      confidence: 0.9,
      label: 'Spouse SSN (2b)',
    },
    {
      pdfFieldName: 'Employer identification number',
      appSection: 'businessApplicant',
      appFieldPath: 'ein',
      transform: 'ein',
      confidence: 0.95,
      label: 'EIN',
    },
    // Address (Line 3)
    {
      pdfFieldName: 'Current address',
      appSection: 'individualApplicants',
      appFieldPath: 'owners[0].address.street1',
      confidence: 0.8,
      label: 'Current Address',
    },
    {
      pdfFieldName: '3 Address',
      appSection: 'individualApplicants',
      appFieldPath: 'owners[0].address.street1',
      confidence: 0.8,
      label: 'Address (Line 3)',
    },
    {
      pdfFieldName: 'City',
      appSection: 'individualApplicants',
      appFieldPath: 'owners[0].address.city',
      confidence: 0.9,
      label: 'City',
    },
    {
      pdfFieldName: 'State',
      appSection: 'individualApplicants',
      appFieldPath: 'owners[0].address.state',
      transform: 'uppercase',
      confidence: 0.9,
      label: 'State',
    },
    {
      pdfFieldName: 'ZIP code',
      appSection: 'individualApplicants',
      appFieldPath: 'owners[0].address.zipCode',
      confidence: 0.9,
      label: 'ZIP Code',
    },
    // Previous address (Line 4)
    {
      pdfFieldName: 'Previous address',
      appSection: 'individualApplicants',
      appFieldPath: 'owners[0].previousAddress.street1',
      confidence: 0.75,
      label: 'Previous Address',
    },
    // Tax years (Line 9)
    {
      pdfFieldName: 'Tax year ending',
      appSection: 'taxInformation',
      appFieldPath: 'taxYearsRequested',
      confidence: 0.85,
      label: 'Tax Year Ending',
    },
    {
      pdfFieldName: '9 Year',
      appSection: 'taxInformation',
      appFieldPath: 'taxYearsRequested',
      confidence: 0.85,
      label: 'Tax Year (Line 9)',
    },
  ],
};

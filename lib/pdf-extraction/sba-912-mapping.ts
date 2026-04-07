import { SbaFormMapping } from './types';

/**
 * SBA Form 912 - Statement of Personal History
 * This form collects background/criminal history information
 */
export const sba912Mapping: SbaFormMapping = {
  formId: 'sba-912',
  formName: 'SBA Form 912 - Statement of Personal History',
  formNumber: '912',
  fieldSignatures: [
    'STATEMENT OF PERSONAL HISTORY',
    'Have you ever been arrested',
    'criminal offense',
    'felony',
    'probation',
    'parole',
    'SBA Form 912',
  ],
  mappings: [
    // Personal Information
    {
      pdfFieldName: 'Name',
      appSection: 'individualApplicants',
      appFieldPath: 'owners[0].fullName',
      confidence: 0.9,
      label: 'Full Name',
    },
    {
      pdfFieldName: 'First Name',
      appSection: 'individualApplicants',
      appFieldPath: 'owners[0].firstName',
      confidence: 0.95,
      label: 'First Name',
    },
    {
      pdfFieldName: 'Middle Name',
      appSection: 'individualApplicants',
      appFieldPath: 'owners[0].middleName',
      confidence: 0.9,
      label: 'Middle Name',
    },
    {
      pdfFieldName: 'Last Name',
      appSection: 'individualApplicants',
      appFieldPath: 'owners[0].lastName',
      confidence: 0.95,
      label: 'Last Name',
    },
    {
      pdfFieldName: 'Social Security Number',
      appSection: 'individualApplicants',
      appFieldPath: 'owners[0].ssn',
      transform: 'ssn',
      confidence: 0.95,
      label: 'Social Security Number',
    },
    {
      pdfFieldName: 'SSN',
      appSection: 'individualApplicants',
      appFieldPath: 'owners[0].ssn',
      transform: 'ssn',
      confidence: 0.95,
      label: 'Social Security Number',
    },
    {
      pdfFieldName: 'Date of Birth',
      appSection: 'individualApplicants',
      appFieldPath: 'owners[0].dateOfBirth',
      transform: 'date',
      confidence: 0.95,
      label: 'Date of Birth',
    },
    {
      pdfFieldName: 'Place of Birth',
      appSection: 'individualApplicants',
      appFieldPath: 'owners[0].placeOfBirth',
      confidence: 0.85,
      label: 'Place of Birth',
    },
    {
      pdfFieldName: 'U.S. Citizen',
      appSection: 'individualApplicants',
      appFieldPath: 'owners[0].usCitizen',
      transform: 'boolean',
      confidence: 0.9,
      label: 'U.S. Citizen',
    },
    // Address
    {
      pdfFieldName: 'Present Residence Address',
      appSection: 'individualApplicants',
      appFieldPath: 'owners[0].address.street1',
      confidence: 0.85,
      label: 'Present Address',
    },
    {
      pdfFieldName: 'Home Address',
      appSection: 'individualApplicants',
      appFieldPath: 'owners[0].address.street1',
      confidence: 0.85,
      label: 'Home Address',
    },
    // Criminal history questions (these are typically Yes/No checkboxes)
    {
      pdfFieldName: 'Question 1',
      appSection: 'sbaEligibility',
      appFieldPath: 'criminalHistory.question1',
      transform: 'boolean',
      confidence: 0.85,
      label: 'Criminal History Q1',
    },
    {
      pdfFieldName: 'Question 2',
      appSection: 'sbaEligibility',
      appFieldPath: 'criminalHistory.question2',
      transform: 'boolean',
      confidence: 0.85,
      label: 'Criminal History Q2',
    },
    {
      pdfFieldName: 'Question 3',
      appSection: 'sbaEligibility',
      appFieldPath: 'criminalHistory.question3',
      transform: 'boolean',
      confidence: 0.85,
      label: 'Criminal History Q3',
    },
    // Business association
    {
      pdfFieldName: 'Name of Business',
      appSection: 'businessApplicant',
      appFieldPath: 'businessName',
      confidence: 0.85,
      label: 'Business Name',
    },
    {
      pdfFieldName: 'Title/Position',
      appSection: 'individualApplicants',
      appFieldPath: 'owners[0].title',
      confidence: 0.85,
      label: 'Title/Position',
    },
    {
      pdfFieldName: 'Percentage of Ownership',
      appSection: 'individualApplicants',
      appFieldPath: 'owners[0].ownershipPercentage',
      transform: 'percentage',
      confidence: 0.9,
      label: 'Ownership Percentage',
    },
  ],
};

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import { AppSection } from '@/types';

// Helper to verify auth token
async function verifyAuthToken(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken.uid;
  } catch (error) {
    console.error('[PDF Import] Token verification failed:', error);
    return null;
  }
}

// Application field definitions for PDF mapping
const APP_FIELDS: Record<string, AppSection> = {
  projectOverview: {
    label: 'Project Overview',
    fields: [
      { path: 'projectName', label: 'Project Name', type: 'text' },
      { path: 'projectDescription', label: 'Project Description', type: 'text' },
      { path: 'projectType', label: 'Project Type', type: 'text' },
      { path: 'acquisitionType', label: 'Acquisition Type', type: 'text' },
      { path: 'loanPurpose', label: 'Loan Purpose', type: 'text' },
    ],
  },
  fundingStructure: {
    label: 'Funding Structure',
    fields: [
      { path: 'totalLoanAmount', label: 'Total Loan Amount', type: 'currency' },
      { path: 'sbaLoanAmount', label: 'SBA Loan Amount', type: 'currency' },
      { path: 'conventionalLoanAmount', label: 'Conventional Loan Amount', type: 'currency' },
      { path: 'sellerNote', label: 'Seller Note', type: 'currency' },
      { path: 'buyerEquity', label: 'Buyer Equity', type: 'currency' },
      { path: 'interestRate', label: 'Interest Rate', type: 'number' },
      { path: 'loanTerm', label: 'Loan Term (months)', type: 'number' },
    ],
  },
  businessApplicant: {
    label: 'Business Applicant',
    fields: [
      { path: 'businessName', label: 'Business Name', type: 'text' },
      { path: 'legalName', label: 'Legal Name', type: 'text' },
      { path: 'dbaName', label: 'DBA Name', type: 'text' },
      { path: 'ein', label: 'EIN', type: 'text' },
      { path: 'entityType', label: 'Entity Type', type: 'text' },
      { path: 'stateOfFormation', label: 'State of Formation', type: 'text' },
      { path: 'dateFormed', label: 'Date Formed', type: 'date' },
      { path: 'naicsCode', label: 'NAICS Code', type: 'text' },
      { path: 'businessDescription', label: 'Business Description', type: 'text' },
      { path: 'numberOfEmployees', label: 'Number of Employees', type: 'number' },
      { path: 'annualRevenue', label: 'Annual Revenue', type: 'currency' },
      { path: 'address.street1', label: 'Street Address', type: 'text' },
      { path: 'address.street2', label: 'Street Address 2', type: 'text' },
      { path: 'address.city', label: 'City', type: 'text' },
      { path: 'address.state', label: 'State', type: 'text' },
      { path: 'address.zipCode', label: 'ZIP Code', type: 'text' },
      { path: 'phone', label: 'Phone', type: 'tel' },
      { path: 'email', label: 'Email', type: 'email' },
      { path: 'website', label: 'Website', type: 'text' },
    ],
  },
  individualApplicants: {
    label: 'Individual Applicants',
    fields: [
      { path: 'owners[0].name', label: 'Owner 1 Name', type: 'text' },
      { path: 'owners[0].title', label: 'Owner 1 Title', type: 'text' },
      { path: 'owners[0].ownershipPercent', label: 'Owner 1 Ownership %', type: 'number' },
      { path: 'owners[0].ssn', label: 'Owner 1 SSN', type: 'text' },
      { path: 'owners[0].dateOfBirth', label: 'Owner 1 Date of Birth', type: 'date' },
      { path: 'owners[0].email', label: 'Owner 1 Email', type: 'email' },
      { path: 'owners[0].phone', label: 'Owner 1 Phone', type: 'tel' },
      { path: 'owners[0].address.street1', label: 'Owner 1 Street', type: 'text' },
      { path: 'owners[0].address.city', label: 'Owner 1 City', type: 'text' },
      { path: 'owners[0].address.state', label: 'Owner 1 State', type: 'text' },
      { path: 'owners[0].address.zipCode', label: 'Owner 1 ZIP', type: 'text' },
      { path: 'owners[1].name', label: 'Owner 2 Name', type: 'text' },
      { path: 'owners[1].title', label: 'Owner 2 Title', type: 'text' },
      { path: 'owners[1].ownershipPercent', label: 'Owner 2 Ownership %', type: 'number' },
      { path: 'owners[1].ssn', label: 'Owner 2 SSN', type: 'text' },
      { path: 'owners[1].dateOfBirth', label: 'Owner 2 Date of Birth', type: 'date' },
    ],
  },
  sbaEligibility: {
    label: 'SBA Eligibility',
    fields: [
      { path: 'isUSCitizen', label: 'US Citizen', type: 'checkbox' },
      { path: 'isPermanentResident', label: 'Permanent Resident', type: 'checkbox' },
      { path: 'hasPriorDefault', label: 'Prior Default', type: 'checkbox' },
      { path: 'hasCriminalHistory', label: 'Criminal History', type: 'checkbox' },
      { path: 'isDebarred', label: 'Debarred', type: 'checkbox' },
      { path: 'hasOutstandingJudgments', label: 'Outstanding Judgments', type: 'checkbox' },
      { path: 'isPresentlyIndicted', label: 'Presently Indicted', type: 'checkbox' },
    ],
  },
  sellerInfo: {
    label: 'Seller Information',
    fields: [
      { path: 'sellerName', label: 'Seller Name', type: 'text' },
      { path: 'sellerEntityType', label: 'Seller Entity Type', type: 'text' },
      { path: 'sellerEin', label: 'Seller EIN', type: 'text' },
      { path: 'sellerAddress.street1', label: 'Seller Street', type: 'text' },
      { path: 'sellerAddress.city', label: 'Seller City', type: 'text' },
      { path: 'sellerAddress.state', label: 'Seller State', type: 'text' },
      { path: 'sellerAddress.zipCode', label: 'Seller ZIP', type: 'text' },
      { path: 'sellerPhone', label: 'Seller Phone', type: 'tel' },
      { path: 'sellerEmail', label: 'Seller Email', type: 'email' },
      { path: 'askingPrice', label: 'Asking Price', type: 'currency' },
      { path: 'relationshipToSeller', label: 'Relationship to Seller', type: 'text' },
    ],
  },
  businessQuestionnaire: {
    label: 'Business Questionnaire',
    fields: [
      { path: 'businessStartDate', label: 'Business Start Date', type: 'date' },
      { path: 'yearsInBusiness', label: 'Years in Business', type: 'number' },
      { path: 'franchiseName', label: 'Franchise Name', type: 'text' },
      { path: 'isFranchise', label: 'Is Franchise', type: 'checkbox' },
      { path: 'industryExperience', label: 'Industry Experience (years)', type: 'number' },
      { path: 'managementExperience', label: 'Management Experience (years)', type: 'number' },
    ],
  },
};

/**
 * GET /api/pdf-imports/app-fields
 * Returns the application field definitions for PDF mapping
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await verifyAuthToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(APP_FIELDS);
  } catch (error) {
    console.error('[PDF Import] Error getting app fields:', error);
    return NextResponse.json({ error: 'Failed to get app fields' }, { status: 500 });
  }
}

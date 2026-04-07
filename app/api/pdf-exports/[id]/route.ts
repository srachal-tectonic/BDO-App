import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { checkCsrf } from '@/lib/csrf';

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
    console.error('[PDF Export] Token verification failed:', error);
    return null;
  }
}

// Form templates configuration
const FORM_TEMPLATES: Record<string, { title: string; description: string }> = {
  'sba-1919': { title: 'SBA Form 1919', description: 'Borrower Information Form' },
  'sba-1920': { title: 'SBA Form 1920', description: "Lender's Application for Guaranty" },
  'sba-413': { title: 'SBA Form 413', description: 'Personal Financial Statement' },
  'sba-912': { title: 'SBA Form 912', description: 'Statement of Personal History' },
  'irs-4506t': { title: 'IRS Form 4506-T', description: 'Request for Transcript of Tax Return' },
  'business-questionnaire': { title: 'Business Questionnaire', description: 'Business Information Form' },
  'sources-uses': { title: 'Sources & Uses', description: 'Sources and Uses of Funds Statement' },
};

/**
 * POST /api/pdf-exports/[id]
 * Generate a PDF export (blank or pre-filled) for a project
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // CSRF protection
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  try {
    const userId = await verifyAuthToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    const body = await request.json();
    const { formType, mode } = body;

    if (!formType || !mode) {
      return NextResponse.json(
        { error: 'Missing required fields: formType, mode' },
        { status: 400 }
      );
    }

    if (!['blank', 'prefilled'].includes(mode)) {
      return NextResponse.json(
        { error: 'Invalid mode. Must be "blank" or "prefilled"' },
        { status: 400 }
      );
    }

    const formConfig = FORM_TEMPLATES[formType];
    if (!formConfig) {
      return NextResponse.json(
        { error: `Unknown form type: ${formType}` },
        { status: 400 }
      );
    }

    // Get loan application data if prefilled mode
    let applicationData: Record<string, unknown> = {};
    if (mode === 'prefilled') {
      const loanAppRef = adminDb.collection('loanApplications').doc(projectId);
      const loanAppSnap = await loanAppRef.get();
      if (loanAppSnap.exists) {
        applicationData = loanAppSnap.data() || {};
      }
    }

    // Generate PDF
    const pdfBytes = await generateFormPdf(formType, formConfig, applicationData, mode);

    // Return PDF as download
    return new NextResponse(new Uint8Array(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${formType}-${mode}-${Date.now()}.pdf"`,
        'Content-Length': pdfBytes.length.toString(),
      },
    });
  } catch (error) {
    console.error('[PDF Export] Error generating PDF:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}

/**
 * Generate a fillable PDF form
 */
async function generateFormPdf(
  formType: string,
  formConfig: { title: string; description: string },
  data: Record<string, unknown>,
  mode: 'blank' | 'prefilled'
): Promise<Uint8Array> {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();
  const form = pdfDoc.getForm();

  // Add a page
  const page = pdfDoc.addPage([612, 792]); // Letter size
  const { width, height } = page.getSize();

  // Embed fonts
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Draw header
  page.drawText(formConfig.title, {
    x: 50,
    y: height - 50,
    size: 18,
    font: helveticaBold,
    color: rgb(0, 0, 0),
  });

  page.drawText(formConfig.description, {
    x: 50,
    y: height - 75,
    size: 12,
    font: helvetica,
    color: rgb(0.3, 0.3, 0.3),
  });

  // Draw form fields based on form type
  let yPosition = height - 120;
  const fieldHeight = 25;
  const fieldSpacing = 35;

  const fields = getFormFields(formType);

  for (const field of fields) {
    if (yPosition < 100) {
      // Add new page if running out of space
      const newPage = pdfDoc.addPage([612, 792]);
      yPosition = newPage.getSize().height - 50;
    }

    // Draw field label
    page.drawText(field.label + ':', {
      x: 50,
      y: yPosition,
      size: 10,
      font: helvetica,
      color: rgb(0, 0, 0),
    });

    // Create text field
    const textField = form.createTextField(field.name);
    textField.addToPage(page, {
      x: 200,
      y: yPosition - 5,
      width: 350,
      height: fieldHeight,
      borderWidth: 1,
      borderColor: rgb(0.7, 0.7, 0.7),
    });

    // Pre-fill if mode is prefilled and data exists
    if (mode === 'prefilled') {
      const value = getNestedValue(data, field.dataPath);
      if (value !== null && value !== undefined) {
        textField.setText(String(value));
      }
    }

    yPosition -= fieldSpacing;
  }

  // Add footer
  page.drawText(`Generated: ${new Date().toLocaleDateString()}`, {
    x: 50,
    y: 30,
    size: 8,
    font: helvetica,
    color: rgb(0.5, 0.5, 0.5),
  });

  page.drawText('SBA Loan Prequalifier - PDF Export', {
    x: width - 200,
    y: 30,
    size: 8,
    font: helvetica,
    color: rgb(0.5, 0.5, 0.5),
  });

  return pdfDoc.save();
}

/**
 * Get form field definitions for a form type
 */
function getFormFields(formType: string): Array<{ name: string; label: string; dataPath: string }> {
  const fieldSets: Record<string, Array<{ name: string; label: string; dataPath: string }>> = {
    'sba-1919': [
      { name: 'business_name', label: 'Business Name', dataPath: 'businessApplicant.businessName' },
      { name: 'legal_name', label: 'Legal Name', dataPath: 'businessApplicant.legalName' },
      { name: 'dba_name', label: 'DBA Name', dataPath: 'businessApplicant.dbaName' },
      { name: 'ein', label: 'EIN', dataPath: 'businessApplicant.ein' },
      { name: 'business_address', label: 'Business Address', dataPath: 'businessApplicant.address.street1' },
      { name: 'city', label: 'City', dataPath: 'businessApplicant.address.city' },
      { name: 'state', label: 'State', dataPath: 'businessApplicant.address.state' },
      { name: 'zip', label: 'ZIP Code', dataPath: 'businessApplicant.address.zipCode' },
      { name: 'phone', label: 'Phone', dataPath: 'businessApplicant.phone' },
      { name: 'email', label: 'Email', dataPath: 'businessApplicant.email' },
      { name: 'loan_amount', label: 'Loan Amount Requested', dataPath: 'fundingStructure.totalLoanAmount' },
      { name: 'loan_purpose', label: 'Loan Purpose', dataPath: 'projectOverview.loanPurpose' },
    ],
    'sba-1920': [
      { name: 'lender_name', label: 'Lender Name', dataPath: '' },
      { name: 'borrower_name', label: 'Borrower Name', dataPath: 'businessApplicant.businessName' },
      { name: 'loan_amount', label: 'Loan Amount', dataPath: 'fundingStructure.totalLoanAmount' },
      { name: 'interest_rate', label: 'Interest Rate', dataPath: 'fundingStructure.interestRate' },
      { name: 'loan_term', label: 'Loan Term', dataPath: 'fundingStructure.loanTerm' },
    ],
    'sba-413': [
      { name: 'applicant_name', label: 'Applicant Name', dataPath: 'individualApplicants.owners[0].name' },
      { name: 'home_address', label: 'Home Address', dataPath: 'individualApplicants.owners[0].address.street1' },
      { name: 'city', label: 'City', dataPath: 'individualApplicants.owners[0].address.city' },
      { name: 'state', label: 'State', dataPath: 'individualApplicants.owners[0].address.state' },
      { name: 'zip', label: 'ZIP', dataPath: 'individualApplicants.owners[0].address.zipCode' },
      { name: 'business_name', label: 'Business Name', dataPath: 'businessApplicant.businessName' },
    ],
    'sba-912': [
      { name: 'applicant_name', label: 'Full Name', dataPath: 'individualApplicants.owners[0].name' },
      { name: 'ssn', label: 'Social Security Number', dataPath: 'individualApplicants.owners[0].ssn' },
      { name: 'dob', label: 'Date of Birth', dataPath: 'individualApplicants.owners[0].dateOfBirth' },
      { name: 'citizenship', label: 'Citizenship', dataPath: 'sbaEligibility.isUSCitizen' },
    ],
    'irs-4506t': [
      { name: 'taxpayer_name', label: 'Taxpayer Name', dataPath: 'businessApplicant.legalName' },
      { name: 'ssn_ein', label: 'SSN or EIN', dataPath: 'businessApplicant.ein' },
      { name: 'address', label: 'Current Address', dataPath: 'businessApplicant.address.street1' },
      { name: 'city_state_zip', label: 'City, State, ZIP', dataPath: '' },
    ],
    'business-questionnaire': [
      { name: 'business_name', label: 'Business Name', dataPath: 'businessApplicant.businessName' },
      { name: 'years_in_business', label: 'Years in Business', dataPath: 'businessQuestionnaire.yearsInBusiness' },
      { name: 'industry', label: 'Industry', dataPath: 'businessApplicant.naicsCode' },
      { name: 'employees', label: 'Number of Employees', dataPath: 'businessApplicant.numberOfEmployees' },
      { name: 'annual_revenue', label: 'Annual Revenue', dataPath: 'businessApplicant.annualRevenue' },
    ],
    'sources-uses': [
      { name: 'total_project_cost', label: 'Total Project Cost', dataPath: 'fundingStructure.totalLoanAmount' },
      { name: 'sba_loan', label: 'SBA Loan', dataPath: 'fundingStructure.sbaLoanAmount' },
      { name: 'conventional_loan', label: 'Conventional Loan', dataPath: 'fundingStructure.conventionalLoanAmount' },
      { name: 'seller_note', label: 'Seller Note', dataPath: 'fundingStructure.sellerNote' },
      { name: 'buyer_equity', label: 'Buyer Equity', dataPath: 'fundingStructure.buyerEquity' },
    ],
  };

  return fieldSets[formType] || [];
}

/**
 * Get a nested value from an object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  if (!path) return null;

  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return null;

    // Handle array notation like owners[0]
    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const arrayName = arrayMatch[1];
      const index = parseInt(arrayMatch[2], 10);
      current = (current as Record<string, unknown>)[arrayName];
      if (Array.isArray(current)) {
        current = current[index];
      } else {
        return null;
      }
    } else {
      current = (current as Record<string, unknown>)[part];
    }
  }

  return current;
}

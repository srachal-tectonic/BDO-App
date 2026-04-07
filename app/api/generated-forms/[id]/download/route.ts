import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { Timestamp } from '@/lib/firebaseAdmin';
import { readFile } from 'fs/promises';
import path from 'path';
import { evaluateRule, generateQuestionnairePdf, type QuestionnaireRule, type QuestionnaireResponse } from '@/lib/questionnairePdf';

// Mapping of form names to their PDF template files
const PDF_TEMPLATE_MAP: Record<string, string> = {
  'SBA Form 1919 - Borrower Information Form': 'SBA_Form_1919_-_Borrower_Information_Form.pdf',
  'SBA Form 413 - Personal Financial Statement': 'SBAForm413.pdf',
  'SBA Form 912 - Statement of Personal History': 'SBA-912-508.pdf',
  'IRS Form 4506-C - Request for Transcript of Tax Return': 'f4506c.pdf',
  'SBA Form 159 - Fee Disclosure Form': 'SBA Form 159_2.10.22-508_0.pdf',
};

/**
 * Generate Business Questionnaire PDF dynamically based on project data
 */
async function generateBusinessQuestionnairePdf(projectId: string): Promise<Uint8Array> {
  // Load project data
  const projectDoc = await adminDb.collection('projects').doc(projectId).get();
  if (!projectDoc.exists) {
    throw new Error('Project not found');
  }
  const projectData = projectDoc.data();
  const projectName = projectData?.projectName || 'Unknown Project';

  // Load loan application data
  const loanAppDoc = await adminDb.collection('loanApplications').doc(projectId).get();
  const loanAppData = loanAppDoc.exists ? loanAppDoc.data() : null;

  // Extract fields needed for rule evaluation
  const projectOverview = loanAppData?.projectOverview || {};
  const selectedPurposes: string[] = Array.isArray(projectOverview.primaryProjectPurpose)
    ? projectOverview.primaryProjectPurpose
    : [];
  const naicsCode: string = projectOverview.naicsCode || '';
  const businessStage: string = projectOverview.classification?.businessStage || '';

  // Load questionnaire rules from admin settings
  const adminSettingsDoc = await adminDb.collection('adminSettings').doc('config').get();
  const allRules: QuestionnaireRule[] = adminSettingsDoc.exists
    ? (adminSettingsDoc.data()?.questionnaireRules || [])
    : [];

  // Filter rules based on project data
  const applicableRules = allRules
    .filter(rule => evaluateRule(rule, selectedPurposes, naicsCode, businessStage))
    .sort((a, b) => {
      const categoryOrder: Record<string, number> = { 'Business Overview': 0, 'Project Purpose': 1, 'Industry': 2 };
      const catDiff = (categoryOrder[a.mainCategory] ?? 9) - (categoryOrder[b.mainCategory] ?? 9);
      if (catDiff !== 0) return catDiff;
      if (a.purposeKey !== b.purposeKey) return (a.purposeKey || '').localeCompare(b.purposeKey || '');
      return (a.questionOrder ?? a.order) - (b.questionOrder ?? b.order);
    });

  // Load existing questionnaire responses for this project
  const responsesSnapshot = await adminDb.collection('questionnaireResponses')
    .where('projectId', '==', projectId)
    .get();
  const responses: QuestionnaireResponse[] = responsesSnapshot.docs.map((doc: any) => ({
    id: doc.id,
    ...doc.data(),
  } as QuestionnaireResponse));

  // Build the primary purpose string for the PDF header
  const primaryProjectPurpose = Array.isArray(projectOverview.primaryProjectPurpose)
    ? projectOverview.primaryProjectPurpose.join(', ')
    : projectOverview.primaryProjectPurpose || '';

  return generateQuestionnairePdf(projectName, applicableRules, responses, primaryProjectPurpose);
}

/**
 * GET /api/generated-forms/[id]/download
 * Download a generated form as a PDF
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: formId } = await params;

    if (!formId) {
      return NextResponse.json({ error: 'Form ID required' }, { status: 400 });
    }

    // Fetch the form from database
    const formDoc = await adminDb.collection('generatedForms').doc(formId).get();

    if (!formDoc.exists) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    const formData = formDoc.data();
    const formName = formData?.formName || 'Unknown Form';
    const projectId = formData?.projectId;

    // Update form status to 'downloaded' and record timestamp
    const currentStatus = formData?.status;
    const updates: Record<string, unknown> = {
      downloadedAt: Timestamp.now(),
    };
    if (currentStatus === 'pending') {
      updates.status = 'downloaded';
    }
    await adminDb.collection('generatedForms').doc(formId).update(updates);

    // Handle Business Questionnaire - dynamically generated PDF
    if (formName === 'Business Questionnaire') {
      if (!projectId) {
        return NextResponse.json({ error: 'Project ID not found for this form' }, { status: 400 });
      }

      const pdfBytes = await generateBusinessQuestionnairePdf(projectId);

      return new NextResponse(new Uint8Array(pdfBytes), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="Business_Questionnaire.pdf"',
          'Content-Length': pdfBytes.length.toString(),
        },
      });
    }

    // Handle standard forms - serve static PDF templates
    const pdfFileName = PDF_TEMPLATE_MAP[formName];

    if (!pdfFileName) {
      console.error(`[Generated Forms Download] No template mapping for form: ${formName}`);
      return NextResponse.json(
        { error: `No PDF template found for form type: ${formName}` },
        { status: 404 }
      );
    }

    // Construct the path to the PDF file in the public folder
    const pdfPath = path.join(process.cwd(), 'public', 'pdfs', pdfFileName);

    // Read the PDF file from disk
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await readFile(pdfPath);
    } catch (fileError) {
      console.error(`[Generated Forms Download] Failed to read PDF file: ${pdfPath}`, fileError);
      return NextResponse.json(
        { error: `PDF template file not found: ${pdfFileName}` },
        { status: 404 }
      );
    }

    // Create a safe filename for the download
    const safeFileName = formName.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_');

    // Return the PDF
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeFileName}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('[Generated Forms Download] Error:', error);
    return NextResponse.json(
      { error: 'Failed to download form' },
      { status: 500 }
    );
  }
}

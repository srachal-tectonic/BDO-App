import { NextRequest, NextResponse } from 'next/server';
import { adminDb, Timestamp } from '@/lib/firebaseAdmin';
import { readFile } from 'fs/promises';
import path from 'path';

// Mapping of form names to their PDF template files
const PDF_TEMPLATE_MAP: Record<string, string> = {
  'SBA Form 1919 - Borrower Information Form': 'SBA_Form_1919_-_Borrower_Information_Form.pdf',
  'SBA Form 413 - Personal Financial Statement': 'SBAForm413.pdf',
  'SBA Form 912 - Statement of Personal History': 'SBA-912-508.pdf',
  'IRS Form 4506-C - Request for Transcript of Tax Return': 'f4506c.pdf',
  'SBA Form 159 - Fee Disclosure Form': 'SBA Form 159_2.10.22-508_0.pdf',
};

/**
 * GET /api/forms/[token]/download/[formId]
 * Download a form PDF (public access via token)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; formId: string }> }
) {
  try {
    const { token, formId } = await params;

    if (!token || !formId) {
      return NextResponse.json({ error: 'Token and form ID required' }, { status: 400 });
    }

    // Validate the token first
    const tokenDoc = await adminDb.collection('formPortalTokens').doc(token).get();

    if (!tokenDoc.exists) {
      return NextResponse.json({ error: 'Invalid link' }, { status: 404 });
    }

    const tokenData = tokenDoc.data();

    if (tokenData?.isRevoked) {
      return NextResponse.json({ error: 'Link has been revoked' }, { status: 403 });
    }

    const expiresAt = tokenData?.expiresAt?.toDate ? tokenData.expiresAt.toDate() : new Date(tokenData?.expiresAt);
    if (new Date() > expiresAt) {
      return NextResponse.json({ error: 'Link has expired' }, { status: 403 });
    }

    const projectId = tokenData?.projectId;

    // Fetch the form from database
    const formDoc = await adminDb.collection('generatedForms').doc(formId).get();

    if (!formDoc.exists) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    const formData = formDoc.data();

    // Verify form belongs to the project associated with this token
    if (formData?.projectId !== projectId) {
      return NextResponse.json({ error: 'Unauthorized access to form' }, { status: 403 });
    }

    const formName = formData?.formName || 'Unknown Form';

    // Look up the PDF template filename
    const pdfFileName = PDF_TEMPLATE_MAP[formName];

    if (!pdfFileName) {
      console.error(`[Forms Portal Download] No template mapping for form: ${formName}`);
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
      console.error(`[Forms Portal Download] Failed to read PDF file: ${pdfPath}`, fileError);
      return NextResponse.json(
        { error: `PDF template file not found: ${pdfFileName}` },
        { status: 404 }
      );
    }

    // Update form status to 'downloaded' and record timestamp
    const currentStatus = formData?.status;
    const updates: Record<string, unknown> = {
      downloadedAt: Timestamp.now(),
    };

    if (currentStatus === 'pending') {
      updates.status = 'downloaded';
    }

    await adminDb.collection('generatedForms').doc(formId).update(updates);

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
    console.error('[Forms Portal Download] Error:', error);
    return NextResponse.json(
      { error: 'Failed to download form' },
      { status: 500 }
    );
  }
}

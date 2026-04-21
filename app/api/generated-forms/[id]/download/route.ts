import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { logAuditEvent } from '@/lib/auditLog';
import { getCollection, COLLECTIONS } from '@/lib/cosmosdb';
import { appendActiveSections } from '@/lib/pdf-extraction/envelope-section-generators';

// Must match the FORM_TEMPLATES in services/firestore.ts
const FORM_FILES: Record<string, { fileName: string; contentType: string }> = {
  'blank-individual-applicant': {
    fileName: 'Blanks_Individual_Applicant.pdf',
    contentType: 'application/pdf',
  },
  'blank-business-applicant': {
    fileName: 'blank_Business_Applicant_Project_Information.pdf',
    contentType: 'application/pdf',
  },
  'blank-business-questionnaire': {
    fileName: 'Blanks_Business_Questionnaire.pdf',
    contentType: 'application/pdf',
  },
  'individual-pfi-worksheet': {
    fileName: 'Individual_Applicant_Personal_Financial_Information 6.xlsx',
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  },
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: formId } = await params;

    const form = FORM_FILES[formId];
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    const filePath = path.join(process.cwd(), 'pdfs', form.fileName);

    let fileBuffer: Buffer;
    try {
      fileBuffer = await readFile(filePath);
    } catch {
      return NextResponse.json(
        { error: `Template file not found: ${form.fileName}` },
        { status: 404 }
      );
    }

    // Business Applicant envelope is project-aware: when ?projectId=... is
    // provided we append fillable sections matching the selected purposes,
    // mirroring the Project Information sub-tab's visibility logic.
    let outputBytes: Uint8Array = new Uint8Array(fileBuffer);
    let outputFileName = form.fileName;

    if (formId === 'blank-business-applicant') {
      const projectId = request.nextUrl.searchParams.get('projectId');
      if (projectId) {
        try {
          const col = await getCollection(COLLECTIONS.LOAN_APPLICATIONS);
          const doc = await col.findOne({ projectId });
          const primary: string =
            typeof doc?.projectOverview?.primaryProjectPurpose === 'string'
              ? doc.projectOverview.primaryProjectPurpose
              : '';
          const secondary: string[] = Array.isArray(doc?.projectOverview?.secondaryProjectPurposes)
            ? doc.projectOverview.secondaryProjectPurposes
            : [];
          outputBytes = await appendActiveSections(outputBytes, { primary, secondary });
          outputFileName = outputFileName.replace(/\.pdf$/, `_${projectId}.pdf`);
        } catch (err) {
          console.error('[Generated Forms Download] Failed to append sections:', err);
          // Fall back to the blank template on generation failure.
        }
      }
    }

    // Audit: form template downloaded
    logAuditEvent({
      action: 'file_downloaded',
      category: 'file',
      resourceType: 'file',
      resourceId: formId,
      summary: `Downloaded form template "${form.fileName}"`,
      metadata: { fileName: form.fileName, formId },
    }).catch(() => {});

    return new NextResponse(Buffer.from(outputBytes), {
      status: 200,
      headers: {
        'Content-Type': form.contentType,
        'Content-Disposition': `attachment; filename="${outputFileName}"`,
        'Content-Length': String(outputBytes.byteLength),
      },
    });
  } catch (error) {
    console.error('[Generated Forms Download] Error:', error);
    return NextResponse.json({ error: 'Failed to download form' }, { status: 500 });
  }
}

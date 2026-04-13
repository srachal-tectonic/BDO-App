import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

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
  'individual-pfi-worksheet': {
    fileName: 'Individual_Applicant_Personal_Financial_Information 6.xlsx',
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  },
};

export async function GET(
  _request: NextRequest,
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

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': form.contentType,
        'Content-Disposition': `attachment; filename="${form.fileName}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('[Generated Forms Download] Error:', error);
    return NextResponse.json({ error: 'Failed to download form' }, { status: 500 });
  }
}

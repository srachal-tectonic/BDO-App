import { NextRequest, NextResponse } from 'next/server';
import { getCollection, COLLECTIONS } from '@/lib/cosmosdb';
import {
  extractEnvelopePdfFields,
  applyEnvelopeFieldsToData,
  ENVELOPE_FIELD_MAP,
} from '@/lib/pdf-extraction/envelope-pdf';
import { logAuditEvent } from '@/lib/auditLog';

/**
 * POST /api/projects/:id/envelope-pdf/apply-individual
 *
 * Accepts a filled "Blanks_Individual_Applicant.pdf" envelope (base64) plus
 * the id of the target individual applicant on the project. The PDF's fields
 * are hard-coded to the `ia0_*` / `oob0_*` prefix (the template doesn't know
 * which applicant row it will populate), so here we rewrite those prefixes to
 * match the target applicant's 0-based index inside
 * `loanApplication.individualApplicants` before running the standard envelope
 * merge. That lets us reuse ENVELOPE_FIELD_MAP instead of duplicating it.
 *
 * Request body: { pdfData: string (base64), individualApplicantId: string, fileName?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json().catch(() => ({}));
    const { pdfData, individualApplicantId, fileName } = body || {};

    if (!pdfData || typeof pdfData !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: pdfData (base64-encoded PDF)' },
        { status: 400 },
      );
    }
    if (!individualApplicantId || typeof individualApplicantId !== 'string') {
      return NextResponse.json(
        { error: 'individualApplicantId is required — pick an individual before importing.' },
        { status: 400 },
      );
    }

    let pdfBytes: Buffer;
    try {
      pdfBytes = Buffer.from(pdfData, 'base64');
    } catch {
      return NextResponse.json({ error: 'Invalid base64 PDF payload' }, { status: 400 });
    }

    const loanAppCol = await getCollection(COLLECTIONS.LOAN_APPLICATIONS);
    const existingDoc = (await loanAppCol.findOne({ projectId })) || {};
    const { _id, ...existingData } = existingDoc as any;

    const applicants: any[] = Array.isArray(existingData.individualApplicants)
      ? existingData.individualApplicants
      : [];
    const targetIndex = applicants.findIndex((a) => a?.id === individualApplicantId);
    if (targetIndex < 0) {
      return NextResponse.json(
        { error: 'Selected individual applicant was not found on this project. Save the applicant before importing.' },
        { status: 404 },
      );
    }

    let extractedFields: Record<string, any>;
    try {
      extractedFields = await extractEnvelopePdfFields(pdfBytes);
    } catch (err: any) {
      console.error('[Individual Envelope PDF] extraction failed:', err);
      return NextResponse.json(
        { error: `Failed to parse PDF form fields: ${err?.message ?? 'unknown error'}` },
        { status: 400 },
      );
    }

    // Rewrite ia0_ / oob0_ → ia{idx}_ / oob{idx}_. The template is locked to
    // applicant 0; the target slot depends on who the BDO clicked Import on.
    // Only rewrite when the target isn't already 0 — otherwise we'd clobber
    // ourselves with an identity swap that drops the originals.
    const rewritten: Record<string, any> = {};
    for (const [k, v] of Object.entries(extractedFields)) {
      let newKey = k;
      if (targetIndex !== 0) {
        if (k.startsWith('ia0_')) newKey = `ia${targetIndex}_${k.slice('ia0_'.length)}`;
        else if (k.startsWith('oob0_')) newKey = `oob${targetIndex}_${k.slice('oob0_'.length)}`;
      }
      rewritten[newKey] = v;
    }

    const mergedData = applyEnvelopeFieldsToData(existingData, rewritten);

    // Counts
    const extractedFieldCount = Object.keys(extractedFields).length;
    const nonEmptyFieldCount = Object.values(extractedFields).filter(
      (v) => v !== '' && v !== null && v !== undefined,
    ).length;
    let mappedFieldCount = 0;
    let appliedFieldCount = 0;
    for (const [name, value] of Object.entries(rewritten)) {
      if (ENVELOPE_FIELD_MAP[name]) {
        mappedFieldCount++;
        if (value !== '' && value !== null && value !== undefined) {
          appliedFieldCount++;
        }
      }
    }

    await loanAppCol.updateOne(
      { projectId },
      {
        $set: {
          ...mergedData,
          projectId,
          updatedAt: new Date().toISOString(),
        },
      },
      { upsert: true },
    );

    const { _id: _ignored, ...returnedDoc } = (await loanAppCol.findOne({ projectId })) as any;

    logAuditEvent({
      action: 'pdf_data_imported',
      category: 'loan_application',
      projectId,
      resourceType: 'individualApplicant',
      resourceId: individualApplicantId,
      summary: `Imported individual applicant PDF (${appliedFieldCount} fields for index ${targetIndex})`,
      metadata: {
        source: 'individual_envelope_pdf',
        fileName,
        individualApplicantId,
        targetIndex,
        extractedFieldCount,
        nonEmptyFieldCount,
        mappedFieldCount,
        appliedFieldCount,
      },
    }).catch(() => {});

    return NextResponse.json({
      loanApplication: returnedDoc,
      individualApplicantId,
      targetIndex,
      fieldsImported: appliedFieldCount,
      extractedFieldCount,
      nonEmptyFieldCount,
      mappedFieldCount,
    });
  } catch (error: any) {
    console.error('[Individual Envelope PDF] apply failed:', error);
    return NextResponse.json(
      { error: error?.message ?? 'Internal error' },
      { status: 500 },
    );
  }
}

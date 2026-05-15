import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, PDFTextField } from 'pdf-lib';
import { getCollection, COLLECTIONS } from '@/lib/cosmosdb';
import { logAuditEvent } from '@/lib/auditLog';

/**
 * POST /api/projects/:id/questionnaire-pdf/apply
 *
 * Accepts a filled Business Questionnaire PDF (base64-encoded) produced by
 * `generateQuestionnairePdf` (lib/questionnairePdf.ts). The questionnaire
 * generator names each text field `q_{ruleId}` where ruleId is the admin
 * questionnaire rule ID. This route extracts those fields and upserts each
 * non-empty value as a document in the `questionnaireResponses` collection,
 * keyed by `{projectId}_{ruleId}`.
 *
 * This is intentionally a separate endpoint from `envelope-pdf/apply` because
 * the questionnaire PDF's field naming and target collection are unrelated to
 * the Business Applicant envelope's `ba_* / ia*_* / oob*_*` schema.
 *
 * Response counts:
 *   extractedFieldCount  total AcroForm fields in the PDF (any prefix)
 *   questionFieldCount   those whose name starts with "q_"
 *   nonEmptyFieldCount   q_* fields with a non-empty value
 *   appliedFieldCount    those actually upserted into questionnaireResponses
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { pdfData, fileName } = body || {};

    if (!pdfData || typeof pdfData !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: pdfData (base64-encoded PDF)' },
        { status: 400 }
      );
    }

    let pdfBytes: Buffer;
    try {
      pdfBytes = Buffer.from(pdfData, 'base64');
    } catch {
      return NextResponse.json({ error: 'Invalid base64 PDF payload' }, { status: 400 });
    }

    let pdfDoc: PDFDocument;
    try {
      pdfDoc = await PDFDocument.load(pdfBytes);
    } catch (err: any) {
      return NextResponse.json(
        { error: `Failed to parse PDF: ${err?.message ?? 'unknown error'}` },
        { status: 400 }
      );
    }

    const form = pdfDoc.getForm();
    const fields = form.getFields();
    const extractedFieldCount = fields.length;

    let questionFieldCount = 0;
    let nonEmptyFieldCount = 0;
    let appliedFieldCount = 0;

    const responsesCol = await getCollection(COLLECTIONS.QUESTIONNAIRE_RESPONSES);
    const now = new Date().toISOString();

    for (const field of fields) {
      const name = field.getName();
      if (!name.startsWith('q_')) continue;
      questionFieldCount++;

      const ruleId = name.slice(2);
      if (!ruleId) continue;

      let value = '';
      if (field instanceof PDFTextField) {
        value = field.getText() || '';
      }
      if (!value || !value.trim()) continue;
      nonEmptyFieldCount++;

      const docId = `${projectId}_${ruleId}`;
      await responsesCol.updateOne(
        { id: docId },
        {
          $set: {
            id: docId,
            projectId,
            ruleId,
            content: value,
            updatedAt: now,
          },
        },
        { upsert: true }
      );
      appliedFieldCount++;
    }

    if (appliedFieldCount === 0) {
      const sample = fields
        .slice(0, 15)
        .map((f) => {
          let v: any = '';
          if (f instanceof PDFTextField) v = f.getText() || '';
          return `  ${f.getName()} = ${JSON.stringify(v).slice(0, 60)}`;
        })
        .join('\n');
      console.warn(
        `[Questionnaire PDF] No responses applied for project ${projectId}.\n` +
        `  extracted: ${extractedFieldCount}\n` +
        `  q_* fields: ${questionFieldCount}\n` +
        `  non-empty: ${nonEmptyFieldCount}\n` +
        `First 15 fields:\n${sample}`
      );
    }

    logAuditEvent({
      action: 'pdf_data_imported',
      category: 'loan_application',
      projectId,
      resourceType: 'questionnaireResponses',
      resourceId: projectId,
      summary: `Imported questionnaire PDF: ${appliedFieldCount} responses applied (${extractedFieldCount} extracted, ${questionFieldCount} q_* fields, ${nonEmptyFieldCount} non-empty)`,
      metadata: { fileName, extractedFieldCount, questionFieldCount, nonEmptyFieldCount, appliedFieldCount },
    }).catch(() => {});

    return NextResponse.json({
      extractedFieldCount,
      // The BorrowerFormsSection UI reads `mappedFieldCount` / `appliedFieldCount`
      // so reuse those names. "Mapped" here means "named q_*".
      mappedFieldCount: questionFieldCount,
      nonEmptyFieldCount,
      appliedFieldCount,
    });
  } catch (error: any) {
    console.error('[Questionnaire PDF] apply failed:', error);
    return NextResponse.json({ error: error?.message ?? 'Internal error' }, { status: 500 });
  }
}

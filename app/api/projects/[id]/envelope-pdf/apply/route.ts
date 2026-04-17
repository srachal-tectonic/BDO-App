import { NextRequest, NextResponse } from 'next/server';
import { getCollection, COLLECTIONS } from '@/lib/cosmosdb';
import {
  extractEnvelopePdfFields,
  applyEnvelopeFieldsToData,
  ENVELOPE_FIELD_MAP,
} from '@/lib/pdf-extraction/envelope-pdf';
import { logAuditEvent } from '@/lib/auditLog';

/**
 * POST /api/projects/:id/envelope-pdf/apply
 *
 * Accepts a filled "Business Applicant / Project Information" envelope PDF
 * (base64-encoded), extracts the AcroForm fields, and merges them into the
 * project's loan-application document using the ENVELOPE_FIELD_MAP convention.
 *
 * Persistence target: `loanApplications` collection in Cosmos DB, keyed by
 * `{ projectId }`. The doc stores `businessApplicant`, `individualApplicants`,
 * `projectOverview`, `sellerInfo`, `sbaEligibility`, `personalFinancialStatements`,
 * and `otherOwnedBusinesses` as ROOT fields (not nested under `data`).
 *
 * Request body: { fileName?: string, pdfData: string (base64) }
 * Response:
 *   {
 *     loanApplication,
 *     extractedFieldCount,       // total AcroForm fields pulled from the PDF
 *     nonEmptyFieldCount,        // those with a non-empty value
 *     mappedFieldCount,          // those that actually matched an ENVELOPE_FIELD_MAP entry
 *     appliedFieldCount,         // intersection — non-empty AND mapped (the real "applied" count)
 *   }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { pdfData } = body || {};

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

    let extractedFields: Record<string, any>;
    try {
      extractedFields = await extractEnvelopePdfFields(pdfBytes);
    } catch (err: any) {
      console.error('[Envelope PDF] extraction failed:', err);
      return NextResponse.json(
        { error: `Failed to parse PDF form fields: ${err?.message ?? 'unknown error'}` },
        { status: 400 }
      );
    }

    // Load existing loan application (flat shape, root-level sections)
    const loanAppCol = await getCollection(COLLECTIONS.LOAN_APPLICATIONS);
    const existingDoc = (await loanAppCol.findOne({ projectId })) || {};

    // Strip Mongo metadata before running the merge so it isn't duplicated back
    const { _id, ...existingData } = existingDoc as any;

    // applyEnvelopeFieldsToData writes to `data.businessApplicant`, `data.individualApplicants`, etc.
    // where `data` is just the parameter name — so passing the flat loan-application doc
    // yields a merged object with the same root-level section shape.
    const mergedData = applyEnvelopeFieldsToData(existingData, extractedFields);

    // Compute counts
    const extractedFieldCount = Object.keys(extractedFields).length;
    const nonEmptyFieldCount = Object.values(extractedFields).filter(
      (v) => v !== '' && v !== null && v !== undefined
    ).length;
    let mappedFieldCount = 0;
    let appliedFieldCount = 0;
    for (const [name, value] of Object.entries(extractedFields)) {
      if (ENVELOPE_FIELD_MAP[name]) {
        mappedFieldCount++;
        if (value !== '' && value !== null && value !== undefined) {
          appliedFieldCount++;
        }
      }
    }

    if (appliedFieldCount === 0) {
      // Sample the first 15 fields with their actual values + JS type so we can
      // see whether the PDF has flattened/empty /V entries or something stranger.
      const sample = Object.entries(extractedFields)
        .slice(0, 15)
        .map(([k, v]) => {
          const t = typeof v;
          const repr = v === '' ? "''" : v === null ? 'null' : v === undefined ? 'undefined' : t === 'boolean' ? String(v) : JSON.stringify(v).slice(0, 40);
          return `  ${k} [${t}] = ${repr}`;
        })
        .join('\n');
      console.warn(
        `[Envelope PDF] No mapped fields applied.\n` +
        `  extracted: ${extractedFieldCount}\n` +
        `  non-empty: ${nonEmptyFieldCount}\n` +
        `  mapped:    ${mappedFieldCount}\n` +
        `  applied:   ${appliedFieldCount}\n` +
        `First 15 fields (name [jsType] = value):\n${sample}\n` +
        `If all values are '' this usually means the PDF was filled in a viewer that did NOT persist /V entries ` +
        `(e.g. Chrome/Edge "Save as PDF", Apple Preview export, browser print-to-PDF). ` +
        `Open the file in Acrobat Reader DC, fill it there, and "Save" (not "Save As PDF/Print"). ` +
        `Acrobat is the only reliably round-trip-safe AcroForm filler.`
      );
    }

    // Upsert merged doc back to loanApplications (flat shape, keyed by projectId)
    await loanAppCol.updateOne(
      { projectId },
      {
        $set: {
          ...mergedData,
          projectId,
          updatedAt: new Date().toISOString(),
        },
      },
      { upsert: true }
    );

    const { _id: _ignored, ...returnedDoc } = (await loanAppCol.findOne({ projectId })) as any;

    // Audit: PDF data imported
    logAuditEvent({
      action: 'pdf_data_imported',
      category: 'loan_application',
      projectId,
      resourceType: 'loanApplication',
      resourceId: projectId,
      summary: `Imported envelope PDF: ${appliedFieldCount} fields applied (${extractedFieldCount} extracted, ${nonEmptyFieldCount} non-empty, ${mappedFieldCount} mapped)`,
      metadata: { fileName: body.fileName, extractedFieldCount, nonEmptyFieldCount, mappedFieldCount, appliedFieldCount },
    }).catch(() => {});

    return NextResponse.json({
      loanApplication: returnedDoc,
      extractedFieldCount,
      nonEmptyFieldCount,
      mappedFieldCount,
      appliedFieldCount,
    });
  } catch (error: any) {
    console.error('[Envelope PDF] apply failed:', error);
    return NextResponse.json({ error: error?.message ?? 'Internal error' }, { status: 500 });
  }
}

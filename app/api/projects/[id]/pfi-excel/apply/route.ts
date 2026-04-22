import { NextRequest, NextResponse } from 'next/server';
import { getCollection, COLLECTIONS } from '@/lib/cosmosdb';
import { parsePfiExcel } from '@/lib/parsePfiExcel';
import { logAuditEvent } from '@/lib/auditLog';

/**
 * POST /api/projects/:id/pfi-excel/apply
 *
 * Accepts a filled "Individual Applicant — Personal Financial Information"
 * xlsx template, parses it, and stores the resulting Personal Financial
 * Statement under the selected individual applicant in the project's
 * loan-application document.
 *
 * Form fields:
 *   - file: the xlsx file
 *   - individualApplicantId: which applicant's PFS slot to populate
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await params;
    const formData = await request.formData();

    const file = formData.get('file') as File | null;
    const individualApplicantId = (formData.get('individualApplicantId') as string | null)?.trim();

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!individualApplicantId) {
      return NextResponse.json(
        { error: 'individualApplicantId is required — pick an Individual from the dropdown before importing.' },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let parsed;
    try {
      parsed = parsePfiExcel(buffer);
    } catch (parseErr: any) {
      return NextResponse.json(
        { error: `Failed to parse spreadsheet: ${parseErr?.message ?? 'unknown error'}` },
        { status: 422 },
      );
    }

    const loanAppCol = await getCollection(COLLECTIONS.LOAN_APPLICATIONS);
    const existingDoc = (await loanAppCol.findOne({ projectId })) || {};
    const { _id, ...existingData } = existingDoc as any;

    // Verify the applicant exists on this project before writing.
    const applicants: any[] = Array.isArray(existingData.individualApplicants)
      ? existingData.individualApplicants
      : [];
    const applicant = applicants.find((a) => a?.id === individualApplicantId);
    if (!applicant) {
      return NextResponse.json(
        {
          error:
            'Selected individual applicant was not found on this project. Save the applicant before importing the PFI worksheet.',
        },
        { status: 404 },
      );
    }

    // Populate the applicant's display name if the PFS didn't supply one.
    const mergedPfs = {
      ...parsed.pfs,
      name: parsed.pfs.name
        || [applicant.firstName, applicant.lastName].filter(Boolean).join(' ').trim(),
    };

    const existingPfsMap =
      (existingData.personalFinancialStatements as Record<string, unknown>) || {};

    const mergedDoc = {
      ...existingData,
      projectId,
      personalFinancialStatements: {
        ...existingPfsMap,
        [individualApplicantId]: mergedPfs,
      },
      updatedAt: new Date().toISOString(),
    };

    await loanAppCol.updateOne(
      { projectId },
      { $set: mergedDoc },
      { upsert: true },
    );

    const { _id: _ignored, ...returnedDoc } = (await loanAppCol.findOne({ projectId })) as any;

    logAuditEvent({
      action: 'pdf_data_imported',
      category: 'loan_application',
      projectId,
      resourceType: 'personalFinancialStatement',
      resourceId: individualApplicantId,
      summary: `Imported PFI Excel for ${mergedPfs.name || individualApplicantId} (${parsed.populatedFieldCount} fields)`,
      metadata: {
        source: 'pfi_excel',
        fileName: file.name,
        individualApplicantId,
        populatedFieldCount: parsed.populatedFieldCount,
      },
    }).catch(() => {});

    return NextResponse.json({
      loanApplication: returnedDoc,
      individualApplicantId,
      populatedFieldCount: parsed.populatedFieldCount,
    });
  } catch (error: any) {
    console.error('[PFI Excel] apply failed:', error);
    return NextResponse.json(
      { error: error?.message ?? 'Internal error' },
      { status: 500 },
    );
  }
}

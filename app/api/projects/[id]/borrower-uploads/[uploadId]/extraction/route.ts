import { NextRequest, NextResponse } from 'next/server';
import { adminDb, Timestamp } from '@/lib/firebaseAdmin';
import { ExtractionRecord, ExtractedFieldValue, ExtractedFieldStatus } from '@/types';

/**
 * GET /api/projects/[id]/borrower-uploads/[uploadId]/extraction
 * Get extraction data for a borrower upload
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; uploadId: string }> }
) {
  try {
    const { id: projectId, uploadId } = await params;

    if (!projectId || !uploadId) {
      return NextResponse.json(
        { error: 'Project ID and Upload ID required' },
        { status: 400 }
      );
    }

    // Get the upload record to find the extraction ID
    const uploadRef = adminDb
      .collection('projects')
      .doc(projectId)
      .collection('borrowerUploads')
      .doc(uploadId);

    const uploadDoc = await uploadRef.get();

    if (!uploadDoc.exists) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 });
    }

    const uploadData = uploadDoc.data();
    const extractionId = uploadData?.extractionId;

    if (!extractionId) {
      return NextResponse.json({
        extraction: null,
        message: 'No extraction available for this upload',
      });
    }

    // Get the extraction record
    const extractionRef = adminDb
      .collection('projects')
      .doc(projectId)
      .collection('borrowerUploads')
      .doc(uploadId)
      .collection('extractions')
      .doc(extractionId);

    const extractionDoc = await extractionRef.get();

    if (!extractionDoc.exists) {
      return NextResponse.json({
        extraction: null,
        message: 'Extraction record not found',
      });
    }

    const extractionData = extractionDoc.data();

    const extraction: ExtractionRecord = {
      id: extractionDoc.id,
      uploadId: extractionData?.uploadId,
      projectId: extractionData?.projectId,
      formType: extractionData?.formType,
      extractedAt: extractionData?.extractedAt?.toDate?.() || new Date(),
      status: extractionData?.status,
      fields: extractionData?.fields || [],
      totalFields: extractionData?.totalFields || 0,
      mappedFields: extractionData?.mappedFields || 0,
      filledFields: extractionData?.filledFields || 0,
      averageConfidence: extractionData?.averageConfidence || 0,
      possibleIssues: extractionData?.possibleIssues || [],
      reviewedBy: extractionData?.reviewedBy,
      reviewedByName: extractionData?.reviewedByName,
      reviewedAt: extractionData?.reviewedAt?.toDate?.(),
      appliedBy: extractionData?.appliedBy,
      appliedByName: extractionData?.appliedByName,
      appliedAt: extractionData?.appliedAt?.toDate?.(),
      error: extractionData?.error,
    };

    return NextResponse.json({ extraction });
  } catch (error) {
    console.error('[Extraction GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get extraction data' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/projects/[id]/borrower-uploads/[uploadId]/extraction
 * Update extraction field statuses (approve/reject/edit)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; uploadId: string }> }
) {
  try {
    const { id: projectId, uploadId } = await params;

    if (!projectId || !uploadId) {
      return NextResponse.json(
        { error: 'Project ID and Upload ID required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { extractionId, fieldUpdates, reviewedBy, reviewedByName } = body;

    if (!extractionId) {
      return NextResponse.json(
        { error: 'Extraction ID required' },
        { status: 400 }
      );
    }

    // Get the extraction record
    const extractionRef = adminDb
      .collection('projects')
      .doc(projectId)
      .collection('borrowerUploads')
      .doc(uploadId)
      .collection('extractions')
      .doc(extractionId);

    const extractionDoc = await extractionRef.get();

    if (!extractionDoc.exists) {
      return NextResponse.json(
        { error: 'Extraction not found' },
        { status: 404 }
      );
    }

    const extractionData = extractionDoc.data();
    let fields: ExtractedFieldValue[] = extractionData?.fields || [];

    // Apply field updates
    if (fieldUpdates && Array.isArray(fieldUpdates)) {
      for (const update of fieldUpdates) {
        const { pdfFieldName, status, editedValue } = update;

        const fieldIndex = fields.findIndex(
          (f) => f.pdfFieldName === pdfFieldName
        );

        if (fieldIndex !== -1) {
          fields[fieldIndex] = {
            ...fields[fieldIndex],
            status: status as ExtractedFieldStatus,
            ...(editedValue !== undefined && { editedValue }),
          };
        }
      }
    }

    // Check if all mapped fields have been reviewed
    const mappedFields = fields.filter((f) => f.mappedSection && f.mappedPath);
    const reviewedFields = mappedFields.filter(
      (f) => f.status !== 'pending'
    );
    const allReviewed = mappedFields.length > 0 && reviewedFields.length === mappedFields.length;

    // Update extraction record
    const updates: Record<string, unknown> = {
      fields,
    };

    if (reviewedBy && reviewedByName) {
      updates.reviewedBy = reviewedBy;
      updates.reviewedByName = reviewedByName;
      updates.reviewedAt = Timestamp.now();
    }

    if (allReviewed) {
      updates.status = 'reviewed';

      // Update upload status too
      const uploadRef = adminDb
        .collection('projects')
        .doc(projectId)
        .collection('borrowerUploads')
        .doc(uploadId);

      await uploadRef.update({
        extractionStatus: 'reviewed',
      });
    }

    await extractionRef.update(updates);

    return NextResponse.json({
      success: true,
      status: allReviewed ? 'reviewed' : 'extracted',
      fieldsUpdated: fieldUpdates?.length || 0,
    });
  } catch (error) {
    console.error('[Extraction PATCH] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update extraction' },
      { status: 500 }
    );
  }
}

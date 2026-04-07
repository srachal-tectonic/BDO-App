import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminStorage, Timestamp } from '@/lib/firebaseAdmin';
import { extractPdfFields } from '@/lib/pdf-extraction';
import { ExtractionStatus, ExtractedFieldStatus } from '@/types';

/**
 * POST /api/projects/[id]/borrower-uploads/[uploadId]/extract
 * Trigger PDF extraction for a borrower upload
 */
export async function POST(
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

    // Get the upload record
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
    const storagePath = uploadData?.storagePath;
    const mimeType = uploadData?.mimeType;

    // Only process PDF files
    if (mimeType !== 'application/pdf') {
      await uploadRef.update({
        extractionStatus: 'not_applicable' as ExtractionStatus,
      });
      return NextResponse.json({
        success: false,
        error: 'File is not a PDF',
        extractionStatus: 'not_applicable',
      });
    }

    // Update status to extracting
    await uploadRef.update({
      extractionStatus: 'extracting' as ExtractionStatus,
    });

    // Get the file from cloud storage
    const bucket = adminStorage.bucket();
    const file = bucket.file(storagePath);

    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      await uploadRef.update({
        extractionStatus: 'failed' as ExtractionStatus,
      });
      return NextResponse.json(
        { error: 'File not found in storage' },
        { status: 404 }
      );
    }

    // Download the file
    const [fileBuffer] = await file.download();

    // Extract fields from PDF
    const extractionResult = await extractPdfFields(fileBuffer);

    if (!extractionResult.success) {
      await uploadRef.update({
        extractionStatus: 'failed' as ExtractionStatus,
      });

      // Create a failed extraction record
      const extractionRef = await adminDb
        .collection('projects')
        .doc(projectId)
        .collection('borrowerUploads')
        .doc(uploadId)
        .collection('extractions')
        .add({
          uploadId,
          projectId,
          formType: null,
          extractedAt: Timestamp.now(),
          status: 'failed' as ExtractionStatus,
          fields: [],
          totalFields: 0,
          mappedFields: 0,
          averageConfidence: 0,
          error: extractionResult.error,
        });

      await uploadRef.update({
        extractionId: extractionRef.id,
      });

      return NextResponse.json({
        success: false,
        error: extractionResult.error,
        extractionStatus: 'failed',
      });
    }

    // Convert extraction result to storage format
    const extractedFields = extractionResult.fields.map((field) => ({
      pdfFieldName: field.pdfFieldName,
      rawValue: field.rawValue,
      mappedSection: field.mappedSection || null,
      mappedPath: field.mappedPath || null,
      mappedLabel: field.mappedLabel || null,
      transformedValue: field.transformedValue ?? field.rawValue,
      confidence: field.confidence,
      status: 'pending' as ExtractedFieldStatus,
    }));

    // Create extraction record
    const extractionRef = await adminDb
      .collection('projects')
      .doc(projectId)
      .collection('borrowerUploads')
      .doc(uploadId)
      .collection('extractions')
      .add({
        uploadId,
        projectId,
        formType: extractionResult.formType,
        formName: extractionResult.formName,
        extractedAt: Timestamp.now(),
        status: 'extracted' as ExtractionStatus,
        fields: extractedFields,
        totalFields: extractionResult.totalFields,
        mappedFields: extractionResult.mappedFields,
        filledFields: extractionResult.filledFields,
        averageConfidence: extractionResult.averageConfidence,
        possibleIssues: extractionResult.possibleIssues,
      });

    // Update upload with extraction status and reference
    await uploadRef.update({
      extractionStatus: 'extracted' as ExtractionStatus,
      detectedFormType: extractionResult.formType,
      extractionId: extractionRef.id,
    });

    return NextResponse.json({
      success: true,
      extractionId: extractionRef.id,
      formType: extractionResult.formType,
      formName: extractionResult.formName,
      totalFields: extractionResult.totalFields,
      mappedFields: extractionResult.mappedFields,
      filledFields: extractionResult.filledFields,
      averageConfidence: extractionResult.averageConfidence,
      possibleIssues: extractionResult.possibleIssues,
      extractionStatus: 'extracted',
    });
  } catch (error) {
    console.error('[PDF Extraction] Error:', error);
    return NextResponse.json(
      { error: 'Failed to extract PDF data' },
      { status: 500 }
    );
  }
}

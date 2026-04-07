import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminStorage } from '@/lib/firebaseAdmin';

/**
 * GET /api/projects/[id]/borrower-uploads
 * Get all borrower uploads for a project (BDO admin view)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    // Verify adminDb is initialized
    if (!adminDb) {
      console.error('[Borrower Uploads GET] adminDb is not initialized');
      return NextResponse.json(
        { error: 'Database not initialized', details: 'Admin SDK not properly configured' },
        { status: 500 }
      );
    }

    // Get all uploads from the borrowerUploads subcollection
    const uploadsSnapshot = await adminDb
      .collection('projects')
      .doc(projectId)
      .collection('borrowerUploads')
      .orderBy('uploadedAt', 'desc')
      .get();

    const uploads = uploadsSnapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        filename: data.filename,
        originalName: data.originalName,
        uploadedAt: data.uploadedAt?.toDate?.()?.toISOString() || data.uploadedAt,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        relatedFormId: data.relatedFormId,
        extractionStatus: data.extractionStatus,
        detectedFormType: data.detectedFormType,
        extractionId: data.extractionId,
      };
    });

    return NextResponse.json({ uploads });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorCode = (error as { code?: string })?.code;
    console.error('[Borrower Uploads GET] Error:', {
      message: errorMessage,
      code: errorCode,
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Always include details for debugging
    return NextResponse.json(
      {
        error: 'Failed to get borrower uploads',
        details: errorMessage,
        code: errorCode,
      },
      { status: 500 }
    );
  }
}

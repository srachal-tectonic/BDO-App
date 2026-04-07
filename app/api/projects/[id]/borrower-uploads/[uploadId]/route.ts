import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminStorage } from '@/lib/firebaseAdmin';

/**
 * DELETE /api/projects/[id]/borrower-uploads/[uploadId]
 * Delete a borrower upload and its associated file from storage
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; uploadId: string }> }
) {
  try {
    const { id: projectId, uploadId } = await params;

    if (!projectId || !uploadId) {
      return NextResponse.json({ error: 'Project ID and Upload ID required' }, { status: 400 });
    }

    if (!adminDb) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
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

    // Delete the file from cloud storage if it exists
    if (uploadData?.filename && adminStorage) {
      try {
        const bucket = adminStorage.bucket();
        const file = bucket.file(uploadData.filename);
        const [exists] = await file.exists();
        if (exists) {
          await file.delete();
        }
      } catch (storageError) {
        console.error('[Borrower Upload DELETE] Error deleting file from storage:', storageError);
        // Continue with database deletion even if storage deletion fails
      }
    }

    // Delete associated extraction record if it exists
    if (uploadData?.extractionId) {
      try {
        await adminDb.collection('extractions').doc(uploadData.extractionId).delete();
      } catch (extractionError) {
        console.error('[Borrower Upload DELETE] Error deleting extraction:', extractionError);
      }
    }

    // Delete the questionnaire response if it exists
    try {
      const responseDoc = await adminDb.collection('questionnaireResponses').doc(`${projectId}_${uploadId}`).get();
      if (responseDoc.exists) {
        await adminDb.collection('questionnaireResponses').doc(`${projectId}_${uploadId}`).delete();
      }
    } catch (responseError) {
      console.error('[Borrower Upload DELETE] Error deleting questionnaire response:', responseError);
    }

    // Delete the upload record from database
    await uploadRef.delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Borrower Upload DELETE] Error:', errorMessage);
    return NextResponse.json(
      { error: 'Failed to delete upload', details: errorMessage },
      { status: 500 }
    );
  }
}

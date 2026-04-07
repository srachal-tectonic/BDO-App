import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminStorage } from '@/lib/firebaseAdmin';

/**
 * GET /api/projects/[id]/borrower-uploads/[uploadId]/download
 * Download a borrower uploaded file (BDO admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; uploadId: string }> }
) {
  try {
    const { id: projectId, uploadId } = await params;

    if (!projectId || !uploadId) {
      return NextResponse.json({ error: 'Project ID and Upload ID required' }, { status: 400 });
    }

    // Get the upload record
    const uploadDoc = await adminDb
      .collection('projects')
      .doc(projectId)
      .collection('borrowerUploads')
      .doc(uploadId)
      .get();

    if (!uploadDoc.exists) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 });
    }

    const uploadData = uploadDoc.data();
    const storagePath = uploadData?.storagePath;
    const originalName = uploadData?.originalName || 'download';
    const mimeType = uploadData?.mimeType || 'application/octet-stream';

    if (!storagePath) {
      return NextResponse.json({ error: 'File path not found' }, { status: 404 });
    }

    // Get the file from cloud storage
    const bucket = adminStorage.bucket();
    const file = bucket.file(storagePath);

    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      return NextResponse.json({ error: 'File not found in storage' }, { status: 404 });
    }

    // Download the file
    const [fileBuffer] = await file.download();

    // Return the file
    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${originalName}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('[Borrower Upload Download] Error:', error);
    return NextResponse.json({ error: 'Failed to download file' }, { status: 500 });
  }
}

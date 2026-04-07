import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, unauthorizedResponse } from '@/lib/apiAuth';
import { checkCsrf } from '@/lib/csrf';
import { adminDb, adminStorage, Timestamp } from '@/lib/firebaseAdmin';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_TYPES = ['video/webm', 'video/mp4'];

/**
 * POST /api/video-messages
 * Upload a video message for a loan application project
 */
export async function POST(request: NextRequest) {
  // CSRF check
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  // Auth check
  const authResult = await verifyAuth(request);
  if (!authResult.authenticated || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const loanAppId = formData.get('loanAppId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!loanAppId) {
      return NextResponse.json({ error: 'loanAppId is required' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Allowed: ${ALLOWED_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    // Verify the project exists
    const projectDoc = await adminDb.collection('projects').doc(loanAppId).get();
    if (!projectDoc.exists) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Read file into buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to cloud storage
    const timestamp = Date.now();
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `video-messages/${loanAppId}/${timestamp}_${sanitizedFilename}`;
    const bucket = adminStorage.bucket();
    const fileRef = bucket.file(storagePath);

    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type,
        metadata: {
          uploadedBy: authResult.user.uid,
          projectId: loanAppId,
        },
      },
    });

    // Create database record
    const videoMessageData = {
      filename: sanitizedFilename,
      originalName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      storagePath,
      uploadedBy: authResult.user.uid,
      uploadedAt: Timestamp.now(),
    };

    const docRef = await adminDb
      .collection('projects')
      .doc(loanAppId)
      .collection('videoMessages')
      .add(videoMessageData);

    return NextResponse.json({
      fileId: docRef.id,
      filename: sanitizedFilename,
      sizeBytes: file.size,
      mimeType: file.type,
      storagePath,
    });
  } catch (error) {
    console.error('[Video Messages] Upload error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to upload video message', details: message },
      { status: 500 }
    );
  }
}

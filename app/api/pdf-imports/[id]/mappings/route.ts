import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';
import { PdfFieldMapping } from '@/types';
import { checkCsrf } from '@/lib/csrf';

// Helper to verify auth token
async function verifyAuthToken(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken.uid;
  } catch (error) {
    console.error('[PDF Import] Token verification failed:', error);
    return null;
  }
}

/**
 * PUT /api/pdf-imports/[id]/mappings
 * Save field mappings for a PDF import session
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // CSRF protection
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  try {
    const userId = await verifyAuthToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const body = await request.json();
    const { mappings } = body;

    if (!mappings || !Array.isArray(mappings)) {
      return NextResponse.json(
        { error: 'Missing required field: mappings (array)' },
        { status: 400 }
      );
    }

    // Check if session exists
    const docRef = adminDb.collection('pdfImportSessions').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Import session not found' }, { status: 404 });
    }

    // Update the session with mappings
    await docRef.update({
      appliedMappings: mappings as PdfFieldMapping[],
      status: 'mapped',
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Mappings saved successfully',
      mappingCount: mappings.length,
    });
  } catch (error) {
    console.error('[PDF Import] Error saving mappings:', error);
    return NextResponse.json({ error: 'Failed to save mappings' }, { status: 500 });
  }
}

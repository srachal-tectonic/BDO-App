import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';
import { PdfImportSession } from '@/types';

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
 * GET /api/projects/[id]/pdf-imports
 * Returns all PDF import sessions for a project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await verifyAuthToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    try {
      const snapshot = await adminDb
        .collection('pdfImportSessions')
        .where('projectId', '==', projectId)
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();

      const sessions: PdfImportSession[] = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as PdfImportSession[];

      return NextResponse.json(sessions);
    } catch (queryError: any) {
      // Handle missing index error gracefully - return empty array
      if (queryError?.code === 9 || queryError?.message?.includes('index')) {
        console.warn('[PDF Import] Database index not yet created, returning empty array');
        return NextResponse.json([]);
      }
      throw queryError;
    }
  } catch (error) {
    console.error('[PDF Import] Error getting sessions:', error);
    return NextResponse.json({ error: 'Failed to get import sessions' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, Timestamp } from '@/lib/firebaseAdmin';

/**
 * GET /api/forms/[token]
 * Validate portal token and return project info + forms list
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    // Validate the token
    const tokenDoc = await adminDb.collection('formPortalTokens').doc(token).get();

    if (!tokenDoc.exists) {
      return NextResponse.json(
        { error: 'Invalid link', message: 'This link is invalid or has expired. Please contact your loan officer for a new link.' },
        { status: 404 }
      );
    }

    const tokenData = tokenDoc.data();

    // Check if token is revoked
    if (tokenData?.isRevoked) {
      return NextResponse.json(
        { error: 'Link revoked', message: 'This link has been revoked. Please contact your loan officer for a new link.' },
        { status: 403 }
      );
    }

    // Check if token is expired
    const expiresAt = tokenData?.expiresAt?.toDate ? tokenData.expiresAt.toDate() : new Date(tokenData?.expiresAt);
    if (new Date() > expiresAt) {
      return NextResponse.json(
        { error: 'Link expired', message: 'This link has expired. Please contact your loan officer for a new link.' },
        { status: 403 }
      );
    }

    const projectId = tokenData?.projectId;

    // Get project information
    const projectDoc = await adminDb.collection('projects').doc(projectId).get();
    if (!projectDoc.exists) {
      return NextResponse.json(
        { error: 'Project not found', message: 'The associated project could not be found.' },
        { status: 404 }
      );
    }

    const projectData = projectDoc.data();

    // Get generated forms for this project
    const formsSnapshot = await adminDb
      .collection('generatedForms')
      .where('projectId', '==', projectId)
      .orderBy('generatedAt', 'desc')
      .get();

    const forms = formsSnapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        formName: data.formName,
        status: data.status,
        generatedAt: data.generatedAt?.toDate?.() || data.generatedAt,
        downloadedAt: data.downloadedAt?.toDate?.() || data.downloadedAt,
      };
    });

    return NextResponse.json({
      projectId,
      projectName: projectData?.projectName || 'Loan Application',
      businessName: projectData?.businessName || '',
      bdoName: projectData?.bdoUserName || '',
      forms,
    });
  } catch (error) {
    console.error('[Forms Portal API] Error:', error);
    return NextResponse.json(
      { error: 'Server error', message: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}

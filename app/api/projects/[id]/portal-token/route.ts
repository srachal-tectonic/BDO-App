import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

/**
 * Portal Token Management API Route
 * POST /api/projects/[id]/portal-token - Create or regenerate portal token
 * GET /api/projects/[id]/portal-token - Get current portal token
 * DELETE /api/projects/[id]/portal-token - Revoke portal token
 */

/**
 * Generate a cryptographically secure URL-safe token
 */
function generateSecureToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let token = '';
  const randomValues = new Uint8Array(32);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomValues);
  } else {
    for (let i = 0; i < 32; i++) {
      randomValues[i] = Math.floor(Math.random() * 256);
    }
  }
  for (let i = 0; i < 32; i++) {
    token += chars[randomValues[i] % chars.length];
  }
  return token;
}

/**
 * GET /api/projects/[id]/portal-token
 * Get the current portal token for a project
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

    // Get project to find current token
    const projectDoc = await adminDb.collection('projects').doc(projectId).get();

    if (!projectDoc.exists) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const projectData = projectDoc.data();
    const currentToken = projectData?.formPortalToken;

    if (!currentToken) {
      return NextResponse.json({ token: null, hasToken: false });
    }

    // Validate the token is still valid
    const tokenDoc = await adminDb.collection('formPortalTokens').doc(currentToken).get();

    if (!tokenDoc.exists) {
      return NextResponse.json({ token: null, hasToken: false });
    }

    const tokenData = tokenDoc.data();
    const expiresAt = tokenData?.expiresAt?.toDate ? tokenData.expiresAt.toDate() : new Date(tokenData?.expiresAt);
    const isExpired = new Date() > expiresAt;
    const isRevoked = tokenData?.isRevoked;

    return NextResponse.json({
      token: currentToken,
      hasToken: true,
      isExpired,
      isRevoked,
      expiresAt: expiresAt.toISOString(),
      createdAt: tokenData?.createdAt?.toDate?.()?.toISOString() || null,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorCode = (error as { code?: string })?.code;
    console.error('[Portal Token GET] Error:', {
      message: errorMessage,
      code: errorCode,
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Always include details for debugging
    return NextResponse.json(
      {
        error: 'Failed to get portal token',
        details: errorMessage,
        code: errorCode,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/portal-token
 * Create or regenerate portal token for a project
 */
export async function POST(
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
      console.error('[Portal Token POST] adminDb is not initialized');
      return NextResponse.json(
        { error: 'Database not initialized', details: 'Admin SDK not properly configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { createdBy, createdByName, expirationDays = 30 } = body;

    if (!createdBy || !createdByName) {
      return NextResponse.json({ error: 'Creator information required' }, { status: 400 });
    }

    console.log('[Portal Token POST] Starting token creation for project:', projectId);

    // Get project to check if it exists and get current token
    const projectDoc = await adminDb.collection('projects').doc(projectId).get();

    if (!projectDoc.exists) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const projectData = projectDoc.data();
    const existingToken = projectData?.formPortalToken;

    // Generate new token
    const token = generateSecureToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expirationDays * 24 * 60 * 60 * 1000);

    // Use batch for atomic operations
    const batch = adminDb.batch();

    // Revoke existing token if it exists in the database
    if (existingToken) {
      const existingTokenRef = adminDb.collection('formPortalTokens').doc(existingToken);
      const existingTokenDoc = await existingTokenRef.get();
      if (existingTokenDoc.exists) {
        batch.update(existingTokenRef, { isRevoked: true });
        console.log('[Portal Token POST] Will revoke existing token:', existingToken.substring(0, 8) + '...');
      } else {
        console.log('[Portal Token POST] Existing token not found in database, skipping revocation');
      }
    }

    // Create new token document
    const tokenRef = adminDb.collection('formPortalTokens').doc(token);
    batch.set(tokenRef, {
      token,
      projectId,
      createdAt: now,
      expiresAt: expiresAt,
      createdBy,
      createdByName,
      isRevoked: false,
    });

    // Update project with new token reference
    const projectRef = adminDb.collection('projects').doc(projectId);
    batch.update(projectRef, {
      formPortalToken: token,
      formPortalTokenCreatedAt: now,
      updatedAt: now,
    });

    // Commit all operations atomically
    console.log('[Portal Token POST] Committing batch...');
    await batch.commit();

    console.log('[Portal Token POST] Token created successfully:', {
      projectId,
      tokenPrefix: token.substring(0, 8) + '...',
    });

    return NextResponse.json({
      token,
      expiresAt: expiresAt.toISOString(),
      createdAt: now.toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorCode = (error as { code?: string })?.code;

    console.error('[Portal Token POST] Error:', {
      message: errorMessage,
      code: errorCode,
      stack: errorStack,
    });

    // Always include details for debugging (can be removed in production)
    return NextResponse.json(
      {
        error: 'Failed to create portal token',
        details: errorMessage,
        code: errorCode,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]/portal-token
 * Revoke the current portal token
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    // Get project to find current token
    const projectDoc = await adminDb.collection('projects').doc(projectId).get();

    if (!projectDoc.exists) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const projectData = projectDoc.data();
    const currentToken = projectData?.formPortalToken;

    if (!currentToken) {
      return NextResponse.json({ message: 'No token to revoke' });
    }

    // Use batch for atomic operations
    const batch = adminDb.batch();

    // Revoke the token
    const tokenRef = adminDb.collection('formPortalTokens').doc(currentToken);
    batch.update(tokenRef, { isRevoked: true });

    // Clear token reference from project
    const projectRef = adminDb.collection('projects').doc(projectId);
    batch.update(projectRef, {
      formPortalToken: null,
      updatedAt: new Date(),
    });

    // Commit atomically
    await batch.commit();

    console.log('[Portal Token DELETE] Token revoked successfully:', { projectId });

    return NextResponse.json({ message: 'Token revoked successfully' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Portal Token DELETE] Error:', {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: 'Failed to revoke portal token',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

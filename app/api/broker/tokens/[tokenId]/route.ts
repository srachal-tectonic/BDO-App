/**
 * Individual Broker Token Management API Route
 * DELETE /api/broker/tokens/[tokenId] - Revoke/delete a token
 * PATCH /api/broker/tokens/[tokenId] - Update token (revoke)
 *
 * PROTECTED: Requires authentication (BDO only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, unauthorizedResponse } from '@/lib/apiAuth';
import { adminDb } from '@/lib/firebaseAdmin';
import { checkCsrf } from '@/lib/csrf';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  // CSRF protection
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  // Verify authentication
  const authResult = await verifyAuth(request);
  if (!authResult.authenticated || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const { tokenId } = await params;

    if (!tokenId) {
      return NextResponse.json({ error: 'Token ID is required' }, { status: 400 });
    }

    // Get the token
    const tokenDoc = await adminDb.collection('brokerTokens').doc(tokenId).get();
    if (!tokenDoc.exists) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    const tokenData = tokenDoc.data();

    // Verify the user owns the project this token belongs to
    const projectDoc = await adminDb.collection('projects').doc(tokenData?.projectId).get();
    if (!projectDoc.exists) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const projectData = projectDoc.data();
    if (projectData?.bdoUserId !== authResult.user.uid) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete the token
    await adminDb.collection('brokerTokens').doc(tokenId).delete();

    return NextResponse.json({ success: true, message: 'Token deleted' });
  } catch (error) {
    console.error('Error deleting broker token:', error);
    return NextResponse.json(
      { error: 'Failed to delete broker token' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  // CSRF protection
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  // Verify authentication
  const authResult = await verifyAuth(request);
  if (!authResult.authenticated || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const { tokenId } = await params;
    const body = await request.json();

    if (!tokenId) {
      return NextResponse.json({ error: 'Token ID is required' }, { status: 400 });
    }

    // Get the token
    const tokenDoc = await adminDb.collection('brokerTokens').doc(tokenId).get();
    if (!tokenDoc.exists) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    const tokenData = tokenDoc.data();

    // Verify the user owns the project this token belongs to
    const projectDoc = await adminDb.collection('projects').doc(tokenData?.projectId).get();
    if (!projectDoc.exists) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const projectData = projectDoc.data();
    if (projectData?.bdoUserId !== authResult.user.uid) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Only allow updating specific fields
    const allowedUpdates: Record<string, any> = {};

    if (typeof body.isRevoked === 'boolean') {
      allowedUpdates.isRevoked = body.isRevoked;
    }

    if (body.brokerEmail !== undefined) {
      allowedUpdates.brokerEmail = body.brokerEmail || null;
    }

    if (body.brokerName !== undefined) {
      allowedUpdates.brokerName = body.brokerName || null;
    }

    if (Object.keys(allowedUpdates).length === 0) {
      return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 });
    }

    // Update the token
    await adminDb.collection('brokerTokens').doc(tokenId).update(allowedUpdates);

    return NextResponse.json({
      success: true,
      message: 'Token updated',
      updates: allowedUpdates,
    });
  } catch (error) {
    console.error('Error updating broker token:', error);
    return NextResponse.json(
      { error: 'Failed to update broker token' },
      { status: 500 }
    );
  }
}

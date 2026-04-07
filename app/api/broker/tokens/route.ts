/**
 * Broker Token Management API Route
 * POST /api/broker/tokens - Create new broker token
 * GET /api/broker/tokens - List tokens for a project
 *
 * PROTECTED: Requires authentication (BDO only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, unauthorizedResponse } from '@/lib/apiAuth';
import { adminDb } from '@/lib/firebaseAdmin';
import { BrokerToken } from '@/types';
import { checkCsrf } from '@/lib/csrf';

// Generate a cryptographically secure token
const generateToken = (): string => {
  return crypto.randomUUID().replace(/-/g, '');
};

export async function POST(request: NextRequest) {
  // CSRF protection
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  // Verify authentication
  const authResult = await verifyAuth(request);
  if (!authResult.authenticated || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const body = await request.json();
    const { projectId, expiresInDays = 30, brokerEmail, brokerName } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Verify project exists and user has access
    const projectDoc = await adminDb.collection('projects').doc(projectId).get();
    if (!projectDoc.exists) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const projectData = projectDoc.data();
    if (projectData?.bdoUserId !== authResult.user.uid) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get user display name
    const userDoc = await adminDb.collection('users').doc(authResult.user.uid).get();
    const userName = userDoc.exists ? userDoc.data()?.displayName || authResult.user.email : authResult.user.email;

    // Generate token
    const token = generateToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000);

    const tokenData: Omit<BrokerToken, 'id'> = {
      projectId,
      createdAt: now,
      expiresAt,
      createdBy: authResult.user.uid,
      createdByName: userName || 'Unknown',
      isRevoked: false,
      uploadCount: 0,
      ...(brokerEmail ? { brokerEmail } : {}),
      ...(brokerName ? { brokerName } : {}),
    };

    // Save token to database
    await adminDb.collection('brokerTokens').doc(token).set(tokenData);

    // Generate magic link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const magicLink = `${baseUrl}/broker/${token}`;

    return NextResponse.json({
      success: true,
      token,
      expiresAt: expiresAt.toISOString(),
      magicLink,
    });
  } catch (error) {
    console.error('Error creating broker token:', error);
    return NextResponse.json(
      { error: 'Failed to create broker token' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Verify authentication
  const authResult = await verifyAuth(request);
  if (!authResult.authenticated || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Verify project exists and user has access
    const projectDoc = await adminDb.collection('projects').doc(projectId).get();
    if (!projectDoc.exists) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const projectData = projectDoc.data();
    if (projectData?.bdoUserId !== authResult.user.uid) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get all tokens for the project
    const tokensSnapshot = await adminDb
      .collection('brokerTokens')
      .where('projectId', '==', projectId)
      .orderBy('createdAt', 'desc')
      .get();

    const tokens: (BrokerToken & { magicLink: string; isExpired: boolean })[] = [];
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const now = new Date();

    tokensSnapshot.forEach((doc: any) => {
      const data = doc.data();
      const expiresAt = data.expiresAt?.toDate?.() || new Date(data.expiresAt);

      tokens.push({
        id: doc.id,
        projectId: data.projectId,
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
        expiresAt,
        createdBy: data.createdBy,
        createdByName: data.createdByName,
        isRevoked: data.isRevoked,
        brokerEmail: data.brokerEmail,
        brokerName: data.brokerName,
        lastAccessedAt: data.lastAccessedAt?.toDate?.() || undefined,
        uploadCount: data.uploadCount || 0,
        magicLink: `${baseUrl}/broker/${doc.id}`,
        isExpired: expiresAt < now,
      });
    });

    return NextResponse.json({ tokens });
  } catch (error) {
    console.error('Error listing broker tokens:', error);
    return NextResponse.json(
      { error: 'Failed to list broker tokens' },
      { status: 500 }
    );
  }
}

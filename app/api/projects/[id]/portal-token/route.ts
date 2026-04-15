import { NextRequest, NextResponse } from 'next/server';
import { getCollection, COLLECTIONS } from '@/lib/cosmosdb';

/**
 * Portal Token Management API Route (Azure Cosmos DB MongoDB API)
 *   GET    /api/projects/[id]/portal-token — Get current portal token
 *   POST   /api/projects/[id]/portal-token — Create or regenerate portal token
 *   DELETE /api/projects/[id]/portal-token — Revoke portal token
 *
 * Collections:
 *   projects       — stores `formPortalToken`, `formPortalTokenCreatedAt` on the project doc
 *   portalTokens   — one document per token (`token`, `projectId`, `createdAt`, `expiresAt`, `isRevoked`, ...)
 */

/**
 * Generate a cryptographically secure URL-safe token (32 chars).
 */
function generateSecureToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let token = '';
  const randomValues = new Uint8Array(32);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomValues);
  } else {
    for (let i = 0; i < 32; i++) randomValues[i] = Math.floor(Math.random() * 256);
  }
  for (let i = 0; i < 32; i++) token += chars[randomValues[i] % chars.length];
  return token;
}

function toDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    const projectsCol = await getCollection(COLLECTIONS.PROJECTS);
    const project = await projectsCol.findOne({ id: projectId });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const currentToken = (project as any).formPortalToken;
    if (!currentToken) {
      return NextResponse.json({ token: null, hasToken: false });
    }

    const tokensCol = await getCollection(COLLECTIONS.PORTAL_TOKENS);
    const tokenDoc = await tokensCol.findOne({ token: currentToken });
    if (!tokenDoc) {
      return NextResponse.json({ token: null, hasToken: false });
    }

    const expiresAtDate = toDate((tokenDoc as any).expiresAt);
    const createdAtDate = toDate((tokenDoc as any).createdAt);
    const isExpired = expiresAtDate ? new Date() > expiresAtDate : false;
    const isRevoked = !!(tokenDoc as any).isRevoked;

    return NextResponse.json({
      token: currentToken,
      hasToken: true,
      isExpired,
      isRevoked,
      expiresAt: expiresAtDate ? expiresAtDate.toISOString() : null,
      createdAt: createdAtDate ? createdAtDate.toISOString() : null,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorCode = (error as { code?: string })?.code;
    console.error('[Portal Token GET] Error:', { message: errorMessage, code: errorCode });
    return NextResponse.json(
      { error: 'Failed to get portal token', details: errorMessage, code: errorCode },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST — create or regenerate
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    const body = await request.json();
    const { createdBy, createdByName, expirationDays = 30 } = body || {};
    if (!createdBy || !createdByName) {
      return NextResponse.json({ error: 'Creator information required' }, { status: 400 });
    }

    const projectsCol = await getCollection(COLLECTIONS.PROJECTS);
    const tokensCol = await getCollection(COLLECTIONS.PORTAL_TOKENS);

    const project = await projectsCol.findOne({ id: projectId });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const existingToken = (project as any).formPortalToken;
    const token = generateSecureToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expirationDays * 24 * 60 * 60 * 1000);

    // Revoke existing token (best-effort; Cosmos DB Mongo API has no multi-doc transactions).
    if (existingToken) {
      await tokensCol
        .updateOne({ token: existingToken }, { $set: { isRevoked: true, updatedAt: now.toISOString() } })
        .catch((err: any) => console.warn('[Portal Token POST] Could not revoke existing:', err?.message ?? err));
    }

    await tokensCol.insertOne({
      token,
      projectId,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      createdBy,
      createdByName,
      isRevoked: false,
    });

    await projectsCol.updateOne(
      { id: projectId },
      {
        $set: {
          formPortalToken: token,
          formPortalTokenCreatedAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
      }
    );

    return NextResponse.json({
      token,
      expiresAt: expiresAt.toISOString(),
      createdAt: now.toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorCode = (error as { code?: string })?.code;
    console.error('[Portal Token POST] Error:', { message: errorMessage, code: errorCode });
    return NextResponse.json(
      { error: 'Failed to create portal token', details: errorMessage, code: errorCode },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE — revoke
// ---------------------------------------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    const projectsCol = await getCollection(COLLECTIONS.PROJECTS);
    const tokensCol = await getCollection(COLLECTIONS.PORTAL_TOKENS);

    const project = await projectsCol.findOne({ id: projectId });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const currentToken = (project as any).formPortalToken;
    if (!currentToken) {
      return NextResponse.json({ message: 'No token to revoke' });
    }

    await tokensCol.updateOne({ token: currentToken }, { $set: { isRevoked: true, updatedAt: new Date().toISOString() } });
    await projectsCol.updateOne(
      { id: projectId },
      { $set: { formPortalToken: null, updatedAt: new Date().toISOString() } }
    );

    return NextResponse.json({ message: 'Token revoked successfully' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Portal Token DELETE] Error:', { message: errorMessage });
    return NextResponse.json({ error: 'Failed to revoke portal token', details: errorMessage }, { status: 500 });
  }
}

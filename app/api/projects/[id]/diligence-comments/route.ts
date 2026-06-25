import { NextRequest, NextResponse } from 'next/server';
import { getCollection, COLLECTIONS } from '@/lib/cosmosdb';
import { verifyAuth, unauthorizedResponse } from '@/lib/apiAuth';
import { logAuditEvent } from '@/lib/auditLog';
import type { DiligenceRiskComment } from '@/lib/diligenceRiskComments';

// GET /api/projects/:id/diligence-comments
// Returns every per-section "Risk to the bank" comment for the project,
// oldest-first so threads read top-to-bottom.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated || !auth.user) return unauthorizedResponse(auth.error);

  try {
    const { id: projectId } = await params;
    const col = await getCollection(COLLECTIONS.DILIGENCE_COMMENTS);
    const comments = await col
      .find({ projectId }, { projection: { _id: 0 } })
      .sort({ createdAt: 1 })
      .toArray();
    return NextResponse.json(comments);
  } catch (error: any) {
    console.error('Error fetching diligence comments:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/projects/:id/diligence-comments
// Body: { sectionKey: string, content: string }
// The author is taken from the verified Entra ID principal — never the client.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated || !auth.user) return unauthorizedResponse(auth.error);

  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const sectionKey = typeof body?.sectionKey === 'string' ? body.sectionKey.trim() : '';
    const content = typeof body?.content === 'string' ? body.content.trim() : '';

    if (!sectionKey) {
      return NextResponse.json({ error: 'sectionKey is required' }, { status: 400 });
    }
    if (!content) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    const id = `ddc-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const authorName =
      auth.user.displayName || auth.user.email || 'Unknown User';

    const comment: DiligenceRiskComment = {
      id,
      projectId,
      sectionKey,
      authorId: auth.user.uid,
      authorName,
      content,
      createdAt: new Date().toISOString(),
    };

    const col = await getCollection(COLLECTIONS.DILIGENCE_COMMENTS);
    await col.insertOne({ ...comment, _id: id } as any);

    const snippet = content.substring(0, 100);
    logAuditEvent({
      action: 'diligence_comment_created',
      category: 'note',
      userId: auth.user.uid,
      userName: authorName,
      projectId,
      resourceType: 'diligence_comment',
      resourceId: id,
      summary: `Added Risk-to-the-bank comment: "${snippet}${snippet.length >= 100 ? '...' : ''}"`,
      metadata: { sectionKey },
    }).catch(() => {});

    return NextResponse.json(comment, { status: 201 });
  } catch (error: any) {
    console.error('Error creating diligence comment:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

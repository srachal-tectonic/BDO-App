import { NextRequest, NextResponse } from 'next/server';
import { getCollection, COLLECTIONS } from '@/lib/cosmosdb';
import { verifyAuth, unauthorizedResponse } from '@/lib/apiAuth';
import { logAuditEvent } from '@/lib/auditLog';
import type { DiligenceRiskComment } from '@/lib/diligenceRiskComments';

// Verify the Entra ID principal and load the comment. Used by both PATCH and
// DELETE; the author-only restriction is applied by the caller (PATCH) since
// deletes are allowed for any authenticated BDO user.
async function loadComment(
  request: NextRequest,
  projectId: string,
  commentId: string,
) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated || !auth.user) {
    return { error: unauthorizedResponse(auth.error) };
  }

  const col = await getCollection(COLLECTIONS.DILIGENCE_COMMENTS);
  const existing = (await col.findOne({ id: commentId, projectId })) as
    | (DiligenceRiskComment & { _id?: unknown })
    | null;

  if (!existing) {
    return { error: NextResponse.json({ error: 'Comment not found' }, { status: 404 }) };
  }

  return { user: auth.user, col, existing };
}

// Editing is restricted to the comment's author.
async function loadOwnComment(
  request: NextRequest,
  projectId: string,
  commentId: string,
) {
  const loaded = await loadComment(request, projectId, commentId);
  if ('error' in loaded) return loaded;
  if (loaded.existing.authorId !== loaded.user.uid) {
    return {
      error: NextResponse.json(
        { error: 'You can only edit your own comments' },
        { status: 403 },
      ),
    };
  }
  return loaded;
}

// PATCH /api/projects/:id/diligence-comments/:commentId  — body: { content }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  try {
    const { id: projectId, commentId } = await params;
    const loaded = await loadOwnComment(request, projectId, commentId);
    if ('error' in loaded) return loaded.error;
    const { user, col, existing } = loaded;

    const body = await request.json();
    const content = typeof body?.content === 'string' ? body.content.trim() : '';
    if (!content) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    const updatedAt = new Date().toISOString();
    await col.updateOne({ id: commentId, projectId }, { $set: { content, updatedAt } });

    const updated: DiligenceRiskComment = { ...existing, content, updatedAt };
    delete (updated as any)._id;

    logAuditEvent({
      action: 'diligence_comment_updated',
      category: 'note',
      userId: user.uid,
      userName: existing.authorName,
      projectId,
      resourceType: 'diligence_comment',
      resourceId: commentId,
      summary: `Edited Risk-to-the-bank comment`,
      metadata: { sectionKey: existing.sectionKey },
    }).catch(() => {});

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating diligence comment:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/projects/:id/diligence-comments/:commentId
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  try {
    const { id: projectId, commentId } = await params;
    const loaded = await loadComment(request, projectId, commentId);
    if ('error' in loaded) return loaded.error;
    const { user, col, existing } = loaded;

    await col.deleteOne({ id: commentId, projectId });

    logAuditEvent({
      action: 'diligence_comment_deleted',
      category: 'note',
      userId: user.uid,
      userName: existing.authorName,
      projectId,
      resourceType: 'diligence_comment',
      resourceId: commentId,
      summary: `Deleted Risk-to-the-bank comment`,
      metadata: { sectionKey: existing.sectionKey },
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Error deleting diligence comment:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

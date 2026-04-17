import { NextRequest, NextResponse } from 'next/server';
import { getCollection, COLLECTIONS } from '@/lib/cosmosdb';
import { logAuditEvent } from '@/lib/auditLog';

// GET /api/projects/:id/notes
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const col = await getCollection(COLLECTIONS.NOTES);

    const notes = await col
      .find({ projectId })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(notes);
  } catch (error: any) {
    console.error('Error fetching notes:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/projects/:id/notes
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const id = `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const note = {
      ...body,
      id,
      _id: id,
      projectId,
      createdAt: now,
      updatedAt: now,
    };

    const col = await getCollection(COLLECTIONS.NOTES);
    await col.insertOne(note);

    // Audit: note created
    const contentSnippet = (body.content || body.text || '').substring(0, 100);
    logAuditEvent({
      action: 'note_created',
      category: 'note',
      userId: body.createdBy,
      userName: body.createdByName,
      projectId,
      resourceType: 'note',
      resourceId: id,
      summary: `Added note: "${contentSnippet}${contentSnippet.length >= 100 ? '...' : ''}"`,
      metadata: { tags: body.tags },
    }).catch(() => {});

    return NextResponse.json(note, { status: 201 });
  } catch (error: any) {
    console.error('Error creating note:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

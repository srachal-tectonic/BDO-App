import { NextRequest, NextResponse } from 'next/server';
import { getCollection, COLLECTIONS } from '@/lib/cosmosdb';
import { logAuditEvent } from '@/lib/auditLog';
import { diffObjects } from '@/lib/auditDiff';
import { FIELD_LABELS } from '@/lib/fieldLabels';

// GET /api/projects/:id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const col = await getCollection(COLLECTIONS.PROJECTS);
    const project = await col.findOne({ id });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    return NextResponse.json(project);
  } catch (error: any) {
    console.error('Error fetching project:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/projects/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updates = await request.json();
    const col = await getCollection(COLLECTIONS.PROJECTS);

    // Fetch current state for diff
    const existing = await col.findOne({ id });

    const result = await col.findOneAndUpdate(
      { id },
      { $set: { ...updates, updatedAt: new Date().toISOString() } },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Audit: project updated with field-level diffs
    if (existing) {
      const { _id, ...oldData } = existing as any;
      const changes = diffObjects(oldData, updates, FIELD_LABELS);

      if (changes.length > 0) {
        // Detect stage change specifically
        const stageChange = changes.find(c => c.field === 'stage');
        if (stageChange) {
          logAuditEvent({
            action: 'status_changed',
            category: 'project',
            userId: updates.bdoUserId || (existing as any).bdoUserId,
            userName: updates.bdoUserName || (existing as any).bdoUserName,
            projectId: id,
            resourceType: 'project',
            resourceId: id,
            summary: `Project stage changed from "${stageChange.oldValue}" to "${stageChange.newValue}"`,
            changes: [stageChange],
          }).catch(() => {});
        }

        logAuditEvent({
          action: 'project_updated',
          category: 'project',
          userId: updates.bdoUserId || (existing as any).bdoUserId,
          userName: updates.bdoUserName || (existing as any).bdoUserName,
          projectId: id,
          resourceType: 'project',
          resourceId: id,
          summary: `Updated ${changes.length} field(s): ${changes.map(c => c.label).join(', ')}`,
          changes,
        }).catch(() => {});
      }
    }

    return NextResponse.json(result.value);
  } catch (error: any) {
    console.error('Error updating project:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/projects/:id — soft delete
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const col = await getCollection(COLLECTIONS.PROJECTS);

    const result = await col.findOneAndUpdate(
      { id },
      { $set: { deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Audit: project deleted
    logAuditEvent({
      action: 'project_deleted',
      category: 'project',
      projectId: id,
      resourceType: 'project',
      resourceId: id,
      summary: `Deleted project "${(result.value as any).projectName || (result.value as any).businessName || id}"`,
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

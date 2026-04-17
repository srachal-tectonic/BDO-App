import { NextRequest, NextResponse } from 'next/server';
import { getCollection, COLLECTIONS } from '@/lib/cosmosdb';
import { logAuditEvent } from '@/lib/auditLog';

// GET /api/projects — list all projects
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const stage = searchParams.get('stage');
    const includeDeleted = searchParams.get('includeDeleted') === 'true';
    const limit = parseInt(searchParams.get('limit') || '500');

    const col = await getCollection(COLLECTIONS.PROJECTS);

    const filter: Record<string, any> = {};
    if (userId) filter.bdoUserId = userId;
    if (stage) filter.stage = stage;
    if (!includeDeleted) {
      filter.$or = [{ deletedAt: { $exists: false } }, { deletedAt: null }];
    }

    const projects = await col
      .find(filter)
      .sort({ updatedAt: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json(projects);
  } catch (error: any) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/projects — create a new project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const id = `proj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const project = {
      ...body,
      id,
      _id: id,
      createdAt: now,
      updatedAt: now,
    };

    const col = await getCollection(COLLECTIONS.PROJECTS);
    await col.insertOne(project);

    // Audit: project created
    logAuditEvent({
      action: 'project_created',
      category: 'project',
      userId: body.bdoUserId,
      userName: body.bdoUserName,
      projectId: id,
      resourceType: 'project',
      resourceId: id,
      summary: `Created project "${body.projectName || body.businessName || id}"`,
      metadata: {
        projectName: body.projectName,
        businessName: body.businessName,
        loanAmount: body.loanAmount,
        stage: body.stage,
      },
    }).catch(() => {});

    return NextResponse.json(project, { status: 201 });
  } catch (error: any) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

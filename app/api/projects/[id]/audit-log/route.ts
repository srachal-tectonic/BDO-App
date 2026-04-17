import { NextRequest, NextResponse } from 'next/server';
import { getCollection, COLLECTIONS } from '@/lib/cosmosdb';

/**
 * GET /api/projects/:id/audit-log
 * Returns paginated audit log entries for a specific project.
 *
 * Query params:
 *   page     - Page number (default: 1)
 *   limit    - Items per page (default: 50, max: 200)
 *   category - Filter by category (auth, project, loan_application, file, financial, admin, portal, note)
 *   userId   - Filter by user ID
 *   action   - Filter by action type
 *   from     - ISO date string, entries after this time
 *   to       - ISO date string, entries before this time
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const category = searchParams.get('category');
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const col = await getCollection(COLLECTIONS.AUDIT_LOGS);

    const filter: Record<string, any> = { projectId };
    if (category) filter.category = category;
    if (userId) filter.userId = userId;
    if (action) filter.action = action;
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = from;
      if (to) filter.timestamp.$lte = to;
    }

    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      col.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).toArray(),
      col.countDocuments(filter),
    ]);

    // Strip MongoDB _id
    const items = entries.map(({ _id, ...rest }) => rest);

    return NextResponse.json({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('[Audit Log API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

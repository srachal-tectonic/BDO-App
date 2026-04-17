import { NextRequest, NextResponse } from 'next/server';
import { getCollection, COLLECTIONS } from '@/lib/cosmosdb';

/**
 * GET /api/audit-log
 * Global audit log endpoint for admin use. Returns paginated audit entries
 * across all projects.
 *
 * Query params:
 *   page      - Page number (default: 1)
 *   limit     - Items per page (default: 50, max: 200)
 *   projectId - Filter by project ID
 *   category  - Filter by category
 *   userId    - Filter by user ID
 *   action    - Filter by action type
 *   from      - ISO date string, entries after this time
 *   to        - ISO date string, entries before this time
 *   search    - Text search across summary field
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const projectId = searchParams.get('projectId');
    const category = searchParams.get('category');
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const search = searchParams.get('search');

    const col = await getCollection(COLLECTIONS.AUDIT_LOGS);

    const filter: Record<string, any> = {};
    if (projectId) filter.projectId = projectId;
    if (category) filter.category = category;
    if (userId) filter.userId = userId;
    if (action) filter.action = action;
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = from;
      if (to) filter.timestamp.$lte = to;
    }
    if (search) {
      filter.summary = { $regex: search, $options: 'i' };
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
    console.error('[Global Audit Log API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

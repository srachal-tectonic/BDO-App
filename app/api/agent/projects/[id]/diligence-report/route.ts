import { NextRequest, NextResponse } from 'next/server';
import { getCollection, COLLECTIONS } from '@/lib/cosmosdb';
import { checkRateLimit, rateLimitExceededResponse, RATE_LIMITS } from '@/lib/rateLimit';
import { verifyAgentKey, withoutMongoId } from '@/lib/agentAuth';

export const runtime = 'nodejs';

// GET /api/agent/projects/[id]/diligence-report — the latest generated
// due-diligence report (markdown text + metadata), if one exists.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = verifyAgentKey(request);
  if (authError) return authError;

  const rate = checkRateLimit('foundry-agent', 'agent-api', RATE_LIMITS.standard);
  if (!rate.allowed) return rateLimitExceededResponse(rate);

  const { id: projectId } = await params;

  try {
    const col = await getCollection(COLLECTIONS.DUE_DILIGENCE_REPORTS);
    const doc = await col.findOne({ projectId });
    if (!doc) {
      return NextResponse.json({ error: 'No diligence report has been generated for this project' }, { status: 404 });
    }
    return NextResponse.json(withoutMongoId(doc as any));
  } catch (err: any) {
    console.error('[agent/diligence-report] Failed:', err);
    return NextResponse.json({ error: 'Failed to load diligence report' }, { status: 500 });
  }
}

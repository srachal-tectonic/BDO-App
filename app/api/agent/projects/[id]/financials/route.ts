import { NextRequest, NextResponse } from 'next/server';
import { getCollection, COLLECTIONS } from '@/lib/cosmosdb';
import { checkRateLimit, rateLimitExceededResponse, RATE_LIMITS } from '@/lib/rateLimit';
import { verifyAgentKey } from '@/lib/agentAuth';

export const runtime = 'nodejs';

// GET /api/agent/projects/[id]/financials — parsed financial spreads for the
// project, newest first. Same data as the BDO financials view (parsed values
// only; the uploaded workbook itself lives in SharePoint).
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
    const col = await getCollection(COLLECTIONS.FINANCIAL_SPREADS);
    const spreads = await col.find({ projectId }).sort({ uploadedAt: -1 }).toArray();
    return NextResponse.json(
      spreads.map(({ _id, ...rest }: any) => ({ id: _id.toString(), ...rest }))
    );
  } catch (err: any) {
    console.error('[agent/financials] Failed:', err);
    return NextResponse.json({ error: 'Failed to load financial spreads' }, { status: 500 });
  }
}

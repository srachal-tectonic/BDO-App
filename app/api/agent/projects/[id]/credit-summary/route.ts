import { NextRequest, NextResponse } from 'next/server';
import { getCollection, COLLECTIONS } from '@/lib/cosmosdb';
import { checkRateLimit, rateLimitExceededResponse, RATE_LIMITS } from '@/lib/rateLimit';
import { verifyAgentKey } from '@/lib/agentAuth';

export const runtime = 'nodejs';

// GET /api/agent/projects/[id]/credit-summary — credit-pull history for the
// project with only underwriting-relevant fields. Identity hashes, raw report
// references, and authorization internals are never exposed to the agent.
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
    const col = await getCollection(COLLECTIONS.CREDIT_PULLS);
    const rows = await col.find({ projectId }).sort({ pulledAt: -1 }).toArray();
    return NextResponse.json(
      rows.map((r: any) => ({
        pullId: r.id,
        applicantId: r.applicantId ?? null,
        bureau: r.bureau ?? null,
        pulledAt: r.pulledAt ?? null,
        reportDate: r.reportDate ?? null,
        success: r.success === true,
        isHit: r.isHit === true,
        score: typeof r.score === 'number' ? r.score : null,
        scoreModel: r.scoreModel ?? null,
        ofacStatus: r.ofacStatus ?? null,
        parsedSummary: r.parsedSummary ?? null,
        errorCode: r.errorCode ?? null,
      }))
    );
  } catch (err: any) {
    console.error('[agent/credit-summary] Failed:', err);
    return NextResponse.json({ error: 'Failed to load credit summary' }, { status: 500 });
  }
}

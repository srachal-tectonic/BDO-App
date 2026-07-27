import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, rateLimitExceededResponse, RATE_LIMITS } from '@/lib/rateLimit';
import { verifyAgentKey } from '@/lib/agentAuth';
import { searchSop } from '@/lib/sopSearch';

export const runtime = 'nodejs';

// GET /api/agent/sop-search?query= — semantic search over the ingested SBA
// SOP 50 10 text. Returns the most relevant passages with their section
// breadcrumbs so the agent can cite SOP locations.
export async function GET(request: NextRequest) {
  const authError = verifyAgentKey(request);
  if (authError) return authError;

  const rate = checkRateLimit('foundry-agent', 'agent-api', RATE_LIMITS.standard);
  if (!rate.allowed) return rateLimitExceededResponse(rate);

  const query = (request.nextUrl.searchParams.get('query') || '').trim();
  if (!query) {
    return NextResponse.json({ error: 'query is required' }, { status: 400 });
  }

  try {
    const results = await searchSop(query);
    if (results.length === 0) {
      return NextResponse.json({
        results: [],
        note: 'No SOP content has been ingested yet. Run POST /api/agent/sop-ingest first.',
      });
    }
    return NextResponse.json({ results });
  } catch (err: any) {
    console.error('[agent/sop-search] Failed:', err);
    return NextResponse.json({ error: 'SOP search failed' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getCollection, COLLECTIONS } from '@/lib/cosmosdb';
import { checkRateLimit, rateLimitExceededResponse, RATE_LIMITS } from '@/lib/rateLimit';
import { verifyAgentKey } from '@/lib/agentAuth';

export const runtime = 'nodejs';

// GET /api/agent/projects?search=<text> — find projects by name so the agent
// can resolve "the CSRV deal" to a projectId before calling the per-project
// endpoints. Returns a compact list, newest first.
export async function GET(request: NextRequest) {
  const authError = verifyAgentKey(request);
  if (authError) return authError;

  const rate = checkRateLimit('foundry-agent', 'agent-api', RATE_LIMITS.standard);
  if (!rate.allowed) return rateLimitExceededResponse(rate);

  const search = (request.nextUrl.searchParams.get('search') || '').trim();

  try {
    const col = await getCollection(COLLECTIONS.PROJECTS);
    const filter: Record<string, unknown> = search
      ? {
          $or: [
            { projectName: { $regex: search, $options: 'i' } },
            { businessName: { $regex: search, $options: 'i' } },
            { id: search },
          ],
        }
      : {};
    const docs = await col.find(filter).sort({ updatedAt: -1 }).limit(25).toArray();

    return NextResponse.json(
      docs.map((p: any) => ({
        projectId: p.id,
        projectName: p.projectName || null,
        businessName: p.businessName || null,
        stage: p.stage || null,
        status: p.status || null,
        loanAmount: typeof p.loanAmount === 'number' ? p.loanAmount : null,
        bdoUserName: p.bdoUserName || null,
        updatedAt: p.updatedAt ?? null,
      }))
    );
  } catch (err: any) {
    console.error('[agent/projects] Search failed:', err);
    return NextResponse.json({ error: 'Failed to search projects' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getCollection, COLLECTIONS } from '@/lib/cosmosdb';
import { checkRateLimit, rateLimitExceededResponse, RATE_LIMITS } from '@/lib/rateLimit';
import { verifyAgentKey } from '@/lib/agentAuth';
import { extractApplicationFields, loadApplicationData } from '@/lib/diligenceShared';

export const runtime = 'nodejs';

// GET /api/agent/projects/[id]/summary — one-call project overview for the
// agent: core project record, the same normalized application fields the DD
// prompt uses, and flags for which other agent resources exist.
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
    const { loanApp, project } = await loadApplicationData(projectId);
    if (!loanApp && !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const fields = extractApplicationFields(loanApp, project);

    const [ddCol, spreadsCol, pullsCol, uploadsCol] = await Promise.all([
      getCollection(COLLECTIONS.DUE_DILIGENCE_REPORTS),
      getCollection(COLLECTIONS.FINANCIAL_SPREADS),
      getCollection(COLLECTIONS.CREDIT_PULLS),
      getCollection(COLLECTIONS.BORROWER_UPLOADS),
    ]);
    const [ddReport, spreadCount, pullCount, uploadCount] = await Promise.all([
      ddCol.findOne({ projectId }, { projection: { generatedAt: 1, status: 1 } }),
      spreadsCol.countDocuments({ projectId }),
      pullsCol.countDocuments({ projectId }),
      uploadsCol.countDocuments({ projectId }),
    ]);

    return NextResponse.json({
      projectId,
      projectName: project?.projectName ?? null,
      businessName: project?.businessName ?? null,
      stage: project?.stage ?? null,
      status: project?.status ?? null,
      bdoUserName: project?.bdoUserName ?? null,
      createdAt: project?.createdAt ?? null,
      updatedAt: project?.updatedAt ?? null,
      application: fields,
      resources: {
        diligenceReport: ddReport
          ? { exists: true, status: (ddReport as any).status ?? 'completed', generatedAt: (ddReport as any).generatedAt ?? null }
          : { exists: false },
        financialSpreads: spreadCount,
        creditPulls: pullCount,
        borrowerUploads: uploadCount,
      },
    });
  } catch (err: any) {
    console.error('[agent/summary] Failed:', err);
    return NextResponse.json({ error: 'Failed to load project summary' }, { status: 500 });
  }
}

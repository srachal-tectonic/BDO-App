import { NextRequest, NextResponse } from 'next/server';
import { getCollection, COLLECTIONS } from '@/lib/cosmosdb';
import { checkRateLimit, rateLimitExceededResponse, RATE_LIMITS } from '@/lib/rateLimit';
import { verifyAgentKey } from '@/lib/agentAuth';

export const runtime = 'nodejs';

// GET /api/agent/projects/[id]/uploads — borrower/broker document uploads for
// the project (metadata + extraction status only; file bytes stay in
// SharePoint). Queries Cosmos directly — the legacy BDO route for this list
// still sits on the non-functional Firebase stub.
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
    const col = await getCollection(COLLECTIONS.BORROWER_UPLOADS);
    const docs = await col.find({ projectId }).sort({ uploadedAt: -1 }).toArray();
    return NextResponse.json(
      docs.map((u: any) => ({
        uploadId: u.id ?? u._id?.toString() ?? null,
        fileName: u.originalName || u.filename || null,
        uploadedAt: u.uploadedAt ?? null,
        fileSize: typeof u.fileSize === 'number' ? u.fileSize : null,
        mimeType: u.mimeType ?? null,
        detectedFormType: u.detectedFormType ?? null,
        extractionStatus: u.extractionStatus ?? null,
      }))
    );
  } catch (err: any) {
    console.error('[agent/uploads] Failed:', err);
    return NextResponse.json({ error: 'Failed to load uploads' }, { status: 500 });
  }
}

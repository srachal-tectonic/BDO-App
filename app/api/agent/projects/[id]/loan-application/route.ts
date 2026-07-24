import { NextRequest, NextResponse } from 'next/server';
import { getCollection, COLLECTIONS } from '@/lib/cosmosdb';
import { checkRateLimit, rateLimitExceededResponse, RATE_LIMITS } from '@/lib/rateLimit';
import { verifyAgentKey, withoutMongoId } from '@/lib/agentAuth';

export const runtime = 'nodejs';

/** Replace a full SSN with its last 4 digits ("xxx-xx-1234" form). */
function redactSsn(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  return digits.length >= 4 ? `xxx-xx-${digits.slice(-4)}` : 'xxx-xx-****';
}

// GET /api/agent/projects/[id]/loan-application — the saved loan application
// with PII minimized for the agent: full SSNs and dates of birth are redacted
// (the agent never needs them; underwriting math and eligibility don't either).
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
    const col = await getCollection(COLLECTIONS.LOAN_APPLICATIONS);
    const doc = await col.findOne({ projectId });
    if (!doc) {
      return NextResponse.json({ error: 'No saved loan application for this project' }, { status: 404 });
    }

    const app: any = withoutMongoId(doc as any);
    if (Array.isArray(app.individualApplicants)) {
      app.individualApplicants = app.individualApplicants.map((a: any) => ({
        ...a,
        ssn: redactSsn(a?.ssn),
        dateOfBirth: a?.dateOfBirth ? '(redacted)' : null,
      }));
    }

    return NextResponse.json(app);
  } catch (err: any) {
    console.error('[agent/loan-application] Failed:', err);
    return NextResponse.json({ error: 'Failed to load loan application' }, { status: 500 });
  }
}

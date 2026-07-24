// Machine auth for the Foundry-agent API (/api/agent/*).
//
// These routes are called by the Microsoft Foundry Agent Service OpenAPI tool,
// which cannot perform an Azure Easy Auth login — the same situation as the
// Zoho webhook. They are gated by a shared secret sent in the
// `x-agent-api-key` header instead, and must be listed in the App Service
// Easy Auth `excludedPaths` (per slot) to be reachable at all.
//
// The key is stored in the AGENT_API_KEY env var on the app side and in a
// Foundry project connection on the agent side. All agent routes are
// READ-ONLY by design.
import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';

export const AGENT_KEY_HEADER = 'x-agent-api-key';

/** Constant-time secret comparison that tolerates length mismatches. */
function secretMatches(provided: string | null): boolean {
  const expected = process.env.AGENT_API_KEY || '';
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Verify the agent shared secret. Returns null when authorized, or a ready
 * 401/503 response to return as-is. Unconfigured AGENT_API_KEY fails closed.
 */
export function verifyAgentKey(request: NextRequest): NextResponse | null {
  if (!process.env.AGENT_API_KEY) {
    return NextResponse.json(
      { error: 'Agent API is not configured on the server (AGENT_API_KEY unset).' },
      { status: 503 }
    );
  }
  if (!secretMatches(request.headers.get(AGENT_KEY_HEADER))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

/** Strip Mongo's _id from a document before returning it to the agent. */
export function withoutMongoId<T extends Record<string, any>>(doc: T): Omit<T, '_id'> {
  const { _id, ...rest } = doc;
  return rest;
}

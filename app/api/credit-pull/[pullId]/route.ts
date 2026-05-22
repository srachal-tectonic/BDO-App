/**
 * GET /api/credit-pull/:pullId — fetch a single historical pull row.
 * Matches the Replit endpoint's shape (uuid validation + 404 when missing).
 */

import { NextRequest, NextResponse } from 'next/server';

import { verifyAuth, unauthorizedResponse } from '@/lib/apiAuth';
import { getCollection, COLLECTIONS } from '@/lib/cosmosdb';
import type { CreditPullRow } from '@/lib/creditPullTypes';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pullId: string }> },
) {
  const authResult = await verifyAuth(request);
  if (!authResult.authenticated || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  const { pullId } = await params;
  if (!UUID_RE.test(pullId)) {
    return NextResponse.json({ error: 'invalid_pull_id' }, { status: 400 });
  }

  try {
    const col = await getCollection(COLLECTIONS.CREDIT_PULLS);
    const doc = await col.findOne({ id: pullId });
    if (!doc) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    const { _id, ...rest } = doc as any;
    return NextResponse.json(rest as CreditPullRow);
  } catch (err: any) {
    console.error(`[CreditPull] fetch error name=${err?.name} message=${err?.message}`);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

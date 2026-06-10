/**
 * GET /api/credit-pull/authorization?name=...  (or ?firstName=...&lastName=...)
 *
 * Returns whether a Soft Credit Pull authorization is on file for an individual
 * applicant, matched by normalized name (see `lib/nameKey.ts`). The Soft Credit
 * Pull button calls this on mount and stays disabled until `authorized` is true.
 *
 * Auth: BDO staff only (same gate as the rest of /api/credit-pull).
 */

import { NextRequest, NextResponse } from 'next/server';

import { verifyAuth, unauthorizedResponse } from '@/lib/apiAuth';
import { getCollection, COLLECTIONS } from '@/lib/cosmosdb';
import { nameKey, nameKeyFromFull, dobKey } from '@/lib/nameKey';
import type { CreditPullAuthorization } from '@/lib/creditPullAuthTypes';

export async function GET(request: NextRequest) {
  const authResult = await verifyAuth(request);
  if (!authResult.authenticated || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  const { searchParams } = new URL(request.url);
  const firstName = searchParams.get('firstName') || '';
  const lastName = searchParams.get('lastName') || '';
  const name = searchParams.get('name') || '';
  const dob = searchParams.get('dob') || '';

  const key = firstName || lastName ? nameKey(firstName, lastName) : nameKeyFromFull(name);
  const dKey = dobKey(dob);
  if (!key || !dKey) {
    // Match requires BOTH name and DOB; missing/unparseable either → not authorized.
    return NextResponse.json({ authorized: false });
  }

  try {
    const col = await getCollection<CreditPullAuthorization>(COLLECTIONS.CREDIT_PULL_AUTHORIZATIONS);
    const match = await col
      .find({ nameKey: key, dobKey: dKey })
      .sort({ receivedAt: -1 })
      .limit(1)
      .next();

    if (!match) return NextResponse.json({ authorized: false });
    return NextResponse.json({
      authorized: true,
      authorizedAt: match.receivedAt,
      source: match.source,
    });
  } catch (err: any) {
    console.error(`[CreditPullAuth] lookup error name=${err?.name} message=${err?.message}`);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

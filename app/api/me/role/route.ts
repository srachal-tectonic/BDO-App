import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, unauthorizedResponse } from '@/lib/apiAuth';
import { getCollection, COLLECTIONS } from '@/lib/cosmosdb';

const CONFIG_ID = 'config';

// Resolve the logged-in user's effective role using the User Directory
// (admin-settings.bdoDirectory) as the source of truth.
//
// Response shape:
//   { role: 'Admin' | 'BDO' | null, source: 'directory' | 'default' | 'directory-empty' | 'no-email' | 'error' }
//
// `role: null` means "do not override" — the client should keep whatever
// role the auth context already resolved (Entra claim or dev bypass).
// This happens when the directory has not been set up yet or when we cannot
// reliably identify the caller (no email).
export async function GET(request: NextRequest) {
  const authResult = await verifyAuth(request);
  if (!authResult.authenticated || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  const userEmail = (authResult.user.email || '').toLowerCase().trim();
  if (!userEmail) {
    return NextResponse.json({ role: null, source: 'no-email' });
  }

  try {
    const col = await getCollection(COLLECTIONS.ADMIN_SETTINGS);
    const doc = await col.findOne({ id: CONFIG_ID });
    const directory: Array<{ email?: string | null; role?: string }> | undefined =
      doc?.bdoDirectory;

    if (!Array.isArray(directory) || directory.length === 0) {
      return NextResponse.json({ role: null, source: 'directory-empty' });
    }

    const entry = directory.find(
      (u) => (u.email || '').toLowerCase().trim() === userEmail,
    );

    if (entry && entry.role === 'Admin') {
      return NextResponse.json({ role: 'Admin', source: 'directory' });
    }

    return NextResponse.json({
      role: 'BDO',
      source: entry ? 'directory' : 'default',
    });
  } catch (err: any) {
    console.error('[/api/me/role] Failed:', err);
    return NextResponse.json(
      { role: null, source: 'error', message: err?.message || 'unknown' },
      { status: 500 },
    );
  }
}

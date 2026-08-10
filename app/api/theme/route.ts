import { NextRequest, NextResponse } from 'next/server';
import { gzipSync } from 'zlib';
import { getCollection, COLLECTIONS } from '@/lib/cosmosdb';

const CONFIG_ID = 'config';

// GET /api/theme — slim public endpoint returning ONLY themeSettings.
//
// The login page loads the theme before the user is authenticated, so this
// route must sit outside Azure Easy Auth (excludedPaths). Because it is
// anonymous, it must never expose any other field of the admin-settings
// document — the full doc (aiPrompts, bdoDirectory, questionnaireRules, …)
// stays behind auth on /api/admin-settings.
export async function GET(request: NextRequest) {
  try {
    const col = await getCollection(COLLECTIONS.ADMIN_SETTINGS);
    const doc = await col.findOne(
      { id: CONFIG_ID },
      { projection: { themeSettings: 1 } }
    );
    const body = JSON.stringify({ themeSettings: doc?.themeSettings ?? null });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      // Theme changes are rare; a short browser cache avoids re-fetching on
      // every navigation. localStorage already smooths over any staleness.
      'Cache-Control': 'public, max-age=300',
      'Vary': 'Accept-Encoding',
    };

    // The Next server gzips page HTML but not route-handler responses, so
    // compress here when the client supports it.
    if (request.headers.get('accept-encoding')?.includes('gzip')) {
      headers['Content-Encoding'] = 'gzip';
      return new NextResponse(new Uint8Array(gzipSync(body)), { headers });
    }
    return new NextResponse(body, { headers });
  } catch (error: unknown) {
    console.error('Error fetching theme settings:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

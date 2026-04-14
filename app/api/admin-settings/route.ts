import { NextRequest, NextResponse } from 'next/server';
import { getCollection, COLLECTIONS } from '@/lib/cosmosdb';

const CONFIG_ID = 'config';

// GET /api/admin-settings — return the singleton settings document, or null
export async function GET() {
  try {
    const col = await getCollection(COLLECTIONS.ADMIN_SETTINGS);
    const doc = await col.findOne({ id: CONFIG_ID });
    return NextResponse.json(doc ?? null);
  } catch (error: any) {
    console.error('Error fetching admin settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/admin-settings — upsert the singleton settings document
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const now = new Date().toISOString();
    const col = await getCollection(COLLECTIONS.ADMIN_SETTINGS);

    const doc = {
      ...body,
      id: CONFIG_ID,
      _id: CONFIG_ID,
      updatedAt: now,
    };

    await col.replaceOne({ id: CONFIG_ID }, doc, { upsert: true });
    return NextResponse.json(doc);
  } catch (error: any) {
    console.error('Error saving admin settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

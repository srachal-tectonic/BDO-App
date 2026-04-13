import { NextRequest, NextResponse } from 'next/server';
import { getCollection, COLLECTIONS } from '@/lib/cosmosdb';

// GET /api/projects/:id/financials
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const col = await getCollection(COLLECTIONS.FINANCIAL_SPREADS);
    const spreads = await col.find({ projectId }).sort({ uploadedAt: -1 }).toArray();

    return NextResponse.json(spreads.map(({ _id, ...rest }) => ({ id: _id.toString(), ...rest })));
  } catch (error) {
    console.error('[Financials API] Error:', error);
    return NextResponse.json([], { status: 200 });
  }
}

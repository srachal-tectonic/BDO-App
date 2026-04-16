import { NextRequest, NextResponse } from 'next/server';
import { getCollection, COLLECTIONS } from '@/lib/cosmosdb';
import { parseFinancialSpreadsheet } from '@/lib/parseSpreadsheet';
import { ObjectId } from 'mongodb';

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

// POST /api/projects/:id/financials — upload + parse a spreadsheet
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const formData = await request.formData();

    const file = formData.get('file') as File | null;
    const versionLabel = formData.get('versionLabel') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!versionLabel?.trim()) {
      return NextResponse.json({ error: 'Version label is required' }, { status: 400 });
    }

    // Read file into buffer and parse
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let parsed;
    try {
      parsed = parseFinancialSpreadsheet(buffer);
    } catch (parseErr: any) {
      return NextResponse.json(
        { error: `Failed to parse spreadsheet: ${parseErr.message}` },
        { status: 422 }
      );
    }

    const doc = {
      projectId,
      versionLabel: versionLabel.trim(),
      fileName: file.name,
      isActive: false,
      uploadedAt: new Date().toISOString(),
      periodData: parsed.periods,
      financingSources: parsed.financingSources,
      sourcesUses: parsed.sourcesUses,
      sourcesUsesHeaders: parsed.sourcesUsesHeaders,
    };

    const col = await getCollection(COLLECTIONS.FINANCIAL_SPREADS);
    const result = await col.insertOne(doc as any);

    return NextResponse.json({
      id: result.insertedId.toString(),
      ...doc,
    });
  } catch (error: any) {
    console.error('[Financials API POST] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/:id/financials?spreadId=xxx
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const spreadId = request.nextUrl.searchParams.get('spreadId');

    if (!spreadId) {
      return NextResponse.json({ error: 'spreadId is required' }, { status: 400 });
    }

    const col = await getCollection(COLLECTIONS.FINANCIAL_SPREADS);
    await col.deleteOne({ _id: new ObjectId(spreadId), projectId });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Financials API DELETE] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/:id/financials — toggle isActive
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { spreadId, isActive } = await request.json();

    if (!spreadId) {
      return NextResponse.json({ error: 'spreadId is required' }, { status: 400 });
    }

    const col = await getCollection(COLLECTIONS.FINANCIAL_SPREADS);

    // If activating, deactivate all others first
    if (isActive) {
      await col.updateMany({ projectId }, { $set: { isActive: false } });
    }

    await col.updateOne(
      { _id: new ObjectId(spreadId), projectId },
      { $set: { isActive: !!isActive } }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Financials API PATCH] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

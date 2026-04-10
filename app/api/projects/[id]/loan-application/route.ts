import { NextRequest, NextResponse } from 'next/server';
import { getCollection, COLLECTIONS } from '@/lib/cosmosdb';

// GET /api/projects/:id/loan-application
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const col = await getCollection(COLLECTIONS.LOAN_APPLICATIONS);
    const doc = await col.findOne({ projectId });

    if (!doc) {
      return NextResponse.json(null);
    }
    // Strip MongoDB metadata
    const { _id, ...appData } = doc;
    return NextResponse.json(appData);
  } catch (error: any) {
    console.error('Error fetching loan application:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/projects/:id/loan-application
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const applicationData = await request.json();
    const col = await getCollection(COLLECTIONS.LOAN_APPLICATIONS);

    await col.updateOne(
      { projectId },
      {
        $set: {
          ...applicationData,
          projectId,
          updatedAt: new Date().toISOString(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving loan application:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getCollection, COLLECTIONS } from '@/lib/cosmosdb';

/**
 * GET /api/projects/:id/questionnaire-responses
 *
 * Returns saved questionnaire responses for a project as an array of
 * `{ id, projectId, ruleId, content, updatedAt }`. Backs the Business
 * Questionnaire tab's read view; the dev shim in lib/db.ts always returned
 * empty so imports never showed up. Persistence target:
 * `questionnaireResponses` collection in Cosmos DB, doc id `{projectId}_{ruleId}`.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const col = await getCollection(COLLECTIONS.QUESTIONNAIRE_RESPONSES);
    const docs = await col.find({ projectId }).toArray();
    const responses = docs.map((d: any) => {
      const { _id, ...rest } = d;
      return rest;
    });
    return NextResponse.json({ responses });
  } catch (error: any) {
    console.error('[Questionnaire Responses] GET failed:', error);
    return NextResponse.json({ error: error?.message ?? 'Internal error' }, { status: 500 });
  }
}

/**
 * POST /api/projects/:id/questionnaire-responses
 *
 * Upserts a single questionnaire answer typed directly in the BDO app
 * (Loan Application > Business Questionnaire and PDF Forms > Edit
 * Questionnaire tabs). Body: `{ ruleId: string, content: string }`.
 * Persists to the `questionnaireResponses` collection, doc id
 * `{projectId}_{ruleId}` — the same shape read by GET and written by the
 * questionnaire-pdf/apply import route.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json().catch(() => null);
    const ruleId = typeof body?.ruleId === 'string' ? body.ruleId.trim() : '';
    const content = typeof body?.content === 'string' ? body.content : '';

    if (!ruleId) {
      return NextResponse.json({ error: 'ruleId is required' }, { status: 400 });
    }

    const docId = `${projectId}_${ruleId}`;
    const now = new Date().toISOString();
    const col = await getCollection(COLLECTIONS.QUESTIONNAIRE_RESPONSES);
    await col.updateOne(
      { id: docId },
      {
        $set: {
          id: docId,
          projectId,
          ruleId,
          content,
          updatedAt: now,
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ id: docId, projectId, ruleId, content, updatedAt: now });
  } catch (error: any) {
    console.error('[Questionnaire Responses] POST failed:', error);
    return NextResponse.json({ error: error?.message ?? 'Internal error' }, { status: 500 });
  }
}

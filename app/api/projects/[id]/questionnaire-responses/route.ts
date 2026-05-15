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

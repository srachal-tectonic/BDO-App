import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, unauthorizedResponse } from '@/lib/apiAuth';
import { getCollection, COLLECTIONS } from '@/lib/cosmosdb';
import { checkCsrf } from '@/lib/csrf';
import type { OcrTestResult } from '@/types';

/**
 * Admin OCR Test — single result
 * GET    /api/ocr-test/:id — full result including extracted fields + raw JSON.
 * DELETE /api/ocr-test/:id — remove a result from the history.
 * PROTECTED: Requires authentication.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await verifyAuth(request);
  if (!authResult.authenticated || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid result id' }, { status: 400 });
  }

  try {
    const col = await getCollection(COLLECTIONS.OCR_TEST_RESULTS);
    const doc = await col.findOne({ id });
    if (!doc) {
      return NextResponse.json({ error: 'Result not found' }, { status: 404 });
    }
    const { _id, ...rest } = doc as any;
    return NextResponse.json(rest as OcrTestResult);
  } catch (error) {
    console.error('[OcrTest] Error fetching result:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch OCR test result',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const authResult = await verifyAuth(request);
  if (!authResult.authenticated || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid result id' }, { status: 400 });
  }

  try {
    const col = await getCollection(COLLECTIONS.OCR_TEST_RESULTS);
    const result = await col.deleteOne({ id });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Result not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[OcrTest] Error deleting result:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete OCR test result',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

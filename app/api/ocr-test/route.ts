import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getCollection, COLLECTIONS } from '@/lib/cosmosdb';
import { verifyAuth, unauthorizedResponse } from '@/lib/apiAuth';
import { checkRateLimit, rateLimitExceededResponse, addRateLimitHeaders, RATE_LIMITS } from '@/lib/rateLimit';
import { validateFile, isDangerousExtension, FILE_SIZE_LIMITS } from '@/lib/fileValidation';
import { logAuditEvent, getClientIp } from '@/lib/auditLog';
import { checkCsrf } from '@/lib/csrf';
import {
  analyzeDocument,
  isDocumentIntelligenceConfigured,
  getConfiguredModelId,
  type DiAnalyzeResult,
  type DiField,
} from '@/lib/documentIntelligence';
import type { OcrTestResult, OcrTestFieldValue } from '@/types';

/**
 * Admin OCR Test API
 * POST /api/ocr-test — upload a document, analyze it with the configured
 *   Azure Document Intelligence custom model, persist metadata + result.
 *   The file bytes are never stored — they only pass through memory to DI.
 * GET  /api/ocr-test — list prior runs (metadata only, no heavy payloads).
 * PROTECTED: Requires authentication.
 */

// File types the DI custom extraction model accepts (subset of ALLOWED_FILE_TYPES)
const OCR_ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff'];

// Keep stored documents well under the Cosmos (Mongo API) 16MB doc cap.
const MAX_RAW_RESULT_JSON_BYTES = 8 * 1024 * 1024;

/**
 * Normalize a DI custom-model field into a display-friendly value:
 * prefer the type-specific value* property, fall back to the raw content span.
 */
function normalizeField(field: DiField): OcrTestFieldValue {
  const valueKey = Object.keys(field).find((k) => k.startsWith('value'));
  const rawValue = valueKey ? (field as Record<string, unknown>)[valueKey] : undefined;
  let value: OcrTestFieldValue['value'] = null;
  if (typeof rawValue === 'string' || typeof rawValue === 'number' || typeof rawValue === 'boolean') {
    value = rawValue;
  } else if (rawValue != null) {
    value = JSON.stringify(rawValue);
  } else if (typeof field.content === 'string') {
    value = field.content;
  }
  return {
    type: field.type,
    value,
    content: field.content,
    confidence: field.confidence,
  };
}

function buildExtracted(analyzeResult: DiAnalyzeResult): {
  extracted: NonNullable<OcrTestResult['extracted']>;
  fieldCount: number;
  docType?: string;
  docConfidence?: number;
} {
  const doc = analyzeResult.documents?.[0];
  const fields: Record<string, OcrTestFieldValue> = {};
  if (doc?.fields) {
    for (const [name, field] of Object.entries(doc.fields)) {
      fields[name] = normalizeField(field);
    }
  }
  return {
    extracted: { content: analyzeResult.content ?? '', fields },
    fieldCount: Object.keys(fields).length,
    docType: doc?.docType,
    docConfidence: doc?.confidence,
  };
}

export async function POST(request: NextRequest) {
  // CSRF protection
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  // Verify authentication
  const authResult = await verifyAuth(request);
  if (!authResult.authenticated || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  // Rate limit — DI analyze is a billable call, keep it tight
  const rateLimitResult = checkRateLimit(authResult.user.uid, 'ocr-test/analyze', RATE_LIMITS.ai);
  if (!rateLimitResult.allowed) {
    return rateLimitExceededResponse(rateLimitResult);
  }

  if (!isDocumentIntelligenceConfigured()) {
    return NextResponse.json(
      {
        error:
          'Azure Document Intelligence is not configured. Set AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT, AZURE_DOCUMENT_INTELLIGENCE_KEY, and AZURE_DOCUMENT_INTELLIGENCE_MODEL_ID.',
      },
      { status: 503 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (isDangerousExtension(file.name)) {
      return NextResponse.json(
        { error: 'File type not allowed for security reasons' },
        { status: 400 }
      );
    }

    const validationResult = validateFile(file, {
      maxSize: FILE_SIZE_LIMITS.document,
      allowedTypes: OCR_ALLOWED_TYPES,
    });
    if (!validationResult.valid) {
      return NextResponse.json({ error: validationResult.error }, { status: 400 });
    }

    const fileName = validationResult.sanitizedFileName || file.name;
    const modelId = getConfiguredModelId();

    // File bytes stay in memory only — sent to DI, never persisted.
    const fileBuffer = await file.arrayBuffer();

    console.log(`[OcrTest] Analyzing "${fileName}" (${file.size} bytes) with model "${modelId}"`);

    const baseDoc = {
      id: randomUUID(),
      fileName,
      fileSize: file.size,
      mimeType: file.type,
      modelId,
      createdAt: new Date().toISOString(),
      uploadedBy: {
        uid: authResult.user.uid,
        email: authResult.user.email || undefined,
      },
    };

    const started = Date.now();
    let analyzeResult: DiAnalyzeResult;
    try {
      analyzeResult = await analyzeDocument(fileBuffer, file.type);
    } catch (analyzeError) {
      const message = analyzeError instanceof Error ? analyzeError.message : 'Unknown analysis error';
      const failedDoc: OcrTestResult = {
        ...baseDoc,
        status: 'failed',
        error: message,
        durationMs: Date.now() - started,
      };
      const col = await getCollection(COLLECTIONS.OCR_TEST_RESULTS);
      await col.insertOne(failedDoc as any);
      console.error(`[OcrTest] Analysis failed for "${fileName}": ${message}`);
      return addRateLimitHeaders(
        NextResponse.json({ error: message, result: failedDoc }, { status: 502 }),
        rateLimitResult
      );
    }

    const { extracted, fieldCount, docType, docConfidence } = buildExtracted(analyzeResult);

    // Guard against oversized raw payloads (Cosmos doc cap is 16MB)
    let rawResult: unknown = analyzeResult;
    let rawTruncated = false;
    if (JSON.stringify(analyzeResult).length > MAX_RAW_RESULT_JSON_BYTES) {
      rawResult = undefined;
      rawTruncated = true;
    }

    const doc: OcrTestResult = {
      ...baseDoc,
      status: 'succeeded',
      durationMs: Date.now() - started,
      fieldCount,
      docType,
      docConfidence,
      extracted,
      rawResult,
      rawTruncated,
    };

    const col = await getCollection(COLLECTIONS.OCR_TEST_RESULTS);
    await col.insertOne(doc as any);

    await logAuditEvent({
      action: 'file_uploaded',
      category: 'admin',
      userId: authResult.user.uid,
      userEmail: authResult.user.email || undefined,
      resourceType: 'ocrTestResult',
      resourceId: doc.id,
      summary: `OCR test analyze: "${fileName}" (${fieldCount} fields, ${doc.durationMs}ms)`,
      metadata: { fileName, fileSize: file.size, modelId, fieldCount, docType },
      ipAddress: getClientIp(request.headers),
      userAgent: request.headers.get('user-agent') || undefined,
    });

    // Echo the extracted view so the UI can show the detail immediately, but
    // leave rawResult out of the response — the client fetches it on toggle.
    const { rawResult: _raw, ...resultWithoutRaw } = doc;

    return addRateLimitHeaders(
      NextResponse.json({ success: true, result: resultWithoutRaw }),
      rateLimitResult
    );
  } catch (error) {
    console.error('[OcrTest] Error processing upload:', error);
    return NextResponse.json(
      {
        error: 'Failed to process OCR test upload',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const authResult = await verifyAuth(request);
  if (!authResult.authenticated || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  const rateLimitResult = checkRateLimit(authResult.user.uid, 'ocr-test/list', RATE_LIMITS.standard);
  if (!rateLimitResult.allowed) {
    return rateLimitExceededResponse(rateLimitResult);
  }

  try {
    const col = await getCollection(COLLECTIONS.OCR_TEST_RESULTS);
    const results = await col
      .find({}, { projection: { _id: 0, rawResult: 0, extracted: 0 } })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    return addRateLimitHeaders(
      NextResponse.json({ results, configured: isDocumentIntelligenceConfigured() }),
      rateLimitResult
    );
  } catch (error) {
    console.error('[OcrTest] Error listing results:', error);
    return NextResponse.json(
      {
        error: 'Failed to list OCR test results',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

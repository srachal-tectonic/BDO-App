/**
 * Azure Document Intelligence client
 *
 * Calls the DI REST API directly (no SDK), mirroring how lib/sharepoint.ts
 * talks to the Graph API. Used by the admin "OCR Test" tab to analyze
 * uploaded documents with the custom-trained extraction model.
 *
 * Flow: POST the document (JSON body with base64Source — the shape the v4
 * "documentintelligence" API expects; raw binary bodies are rejected with a
 * generic 400 InvalidRequest) to the analyze endpoint (returns 202 +
 * Operation-Location header), then poll that URL until the operation
 * succeeds or fails.
 */

const API_VERSION = '2024-11-30';

interface DocumentIntelligenceConfig {
  endpoint: string;
  key: string;
  modelId: string;
}

/** A field as returned by a custom extraction model (value* props vary by type) */
export interface DiField {
  type: string;
  content?: string;
  confidence?: number;
  [key: string]: unknown;
}

export interface DiAnalyzeResult {
  apiVersion?: string;
  modelId?: string;
  content: string;
  documents?: Array<{
    docType: string;
    confidence: number;
    fields: Record<string, DiField>;
  }>;
  pages?: unknown[];
  [key: string]: unknown;
}

function getDocumentIntelligenceConfig(): DocumentIntelligenceConfig {
  const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
  const key = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;
  const modelId = process.env.AZURE_DOCUMENT_INTELLIGENCE_MODEL_ID;

  if (!endpoint || !key || !modelId) {
    throw new Error(
      'Azure Document Intelligence not configured. Set AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT, AZURE_DOCUMENT_INTELLIGENCE_KEY, and AZURE_DOCUMENT_INTELLIGENCE_MODEL_ID environment variables.'
    );
  }

  return { endpoint: endpoint.replace(/\/+$/, ''), key, modelId };
}

export function isDocumentIntelligenceConfigured(): boolean {
  return !!(
    process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT &&
    process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY &&
    process.env.AZURE_DOCUMENT_INTELLIGENCE_MODEL_ID
  );
}

export function getConfiguredModelId(): string {
  return getDocumentIntelligenceConfig().modelId;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * DI buries the actionable failure reason in error.innererror (sometimes
 * nested more than one level) — flatten the whole chain into one string.
 */
interface DiError {
  code?: string;
  message?: string;
  innererror?: DiError;
}

function formatDiError(error: DiError): string {
  const parts: string[] = [];
  let current: DiError | undefined = error;
  while (current) {
    const part = [current.code, current.message].filter(Boolean).join(' — ');
    if (part && !parts.includes(part)) parts.push(part);
    current = current.innererror;
  }
  return parts.join(' | ') || 'No error details provided.';
}

/**
 * Analyze a document with the configured custom model. Submits the raw bytes
 * and long-polls the operation until it completes.
 *
 * @throws on missing config, submit failure, analysis failure, or timeout.
 */
export async function analyzeDocument(
  fileBuffer: ArrayBuffer,
  contentType: string,
  options?: { pollIntervalMs?: number; timeoutMs?: number }
): Promise<DiAnalyzeResult> {
  const { endpoint, key, modelId } = getDocumentIntelligenceConfig();
  const pollIntervalMs = options?.pollIntervalMs ?? 2000;
  const timeoutMs = options?.timeoutMs ?? 120_000;

  const analyzeUrl = `${endpoint}/documentintelligence/documentModels/${encodeURIComponent(modelId)}:analyze?api-version=${API_VERSION}`;

  console.log(`[DocumentIntelligence] Submitting document (${fileBuffer.byteLength} bytes, ${contentType}) to model "${modelId}"`);
  const submitResponse = await fetch(analyzeUrl, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ base64Source: Buffer.from(fileBuffer).toString('base64') }),
  });

  if (submitResponse.status !== 202) {
    const errorText = await submitResponse.text().catch(() => '');
    let message = `Document Intelligence analyze request failed (HTTP ${submitResponse.status})`;
    try {
      const parsed = JSON.parse(errorText);
      if (parsed?.error) message = `${message}: ${formatDiError(parsed.error)}`;
    } catch {
      if (errorText) message = `${message}: ${errorText.slice(0, 500)}`;
    }
    throw new Error(message);
  }

  const operationLocation = submitResponse.headers.get('operation-location');
  if (!operationLocation) {
    throw new Error('Document Intelligence did not return an Operation-Location header.');
  }

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await sleep(pollIntervalMs);

    const pollResponse = await fetch(operationLocation, {
      headers: { 'Ocp-Apim-Subscription-Key': key },
    });

    if (!pollResponse.ok) {
      throw new Error(`Document Intelligence poll failed (HTTP ${pollResponse.status})`);
    }

    const operation = await pollResponse.json();

    if (operation.status === 'succeeded') {
      console.log('[DocumentIntelligence] Analysis succeeded');
      if (!operation.analyzeResult) {
        throw new Error('Document Intelligence returned succeeded with no analyzeResult.');
      }
      return operation.analyzeResult as DiAnalyzeResult;
    }

    if (operation.status === 'failed') {
      const details = formatDiError(operation.error ?? {});
      console.error(`[DocumentIntelligence] Analysis failed: ${details}`);
      throw new Error(`Document Intelligence analysis failed: ${details}`);
    }
    // 'notStarted' | 'running' — keep polling
  }

  throw new Error(`Document Intelligence analysis timed out after ${Math.round(timeoutMs / 1000)}s.`);
}

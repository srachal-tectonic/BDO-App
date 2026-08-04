import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { ResponseStreamEvent } from 'openai/resources/responses/responses';
import { verifyAuth, unauthorizedResponse } from '@/lib/apiAuth';
import { checkRateLimit, rateLimitExceededResponse, RATE_LIMITS } from '@/lib/rateLimit';
import { checkCsrf } from '@/lib/csrf';
import { NDJSON_HEADERS } from '@/lib/diligenceShared';
import { loadSpreadForReview, buildSpreadsReviewPrompt } from '@/lib/spreadsReviewShared';

export const runtime = 'nodejs';
export const maxDuration = 300;

const MAX_OUTPUT_TOKENS = 32000;

const SYSTEM_INSTRUCTIONS =
  'You are a commercial credit analyst at an SBA lender writing an internal ' +
  'credit review of a financial spread, a routine part of loan underwriting. ' +
  'The business named in the request is a loan applicant that provided these ' +
  'financial statements in its loan application. Write the complete review as ' +
  'instructed.';

let _client: OpenAI | null = null;
function getAzureClient(): OpenAI {
  if (!_client) {
    const endpoint = (process.env.AZURE_OPENAI_ENDPOINT || '').replace(/\/+$/, '');
    _client = new OpenAI({
      baseURL: `${endpoint}/openai/v1/`,
      apiKey: process.env.AZURE_OPENAI_API_KEY,
    });
  }
  return _client;
}

// POST /api/internal-spreads-review — generate a credit review of a project's
// financial spread with the internal Azure OpenAI (Foundry) spreads-review
// deployment. Same display-only ndjson streaming contract as
// /api/internal-dd-test (no web search, so no "search" events):
//   {"type":"reset"}
//   {"type":"phase","phase":"thinking|writing"}
//   {"type":"text","text":"..."}
//   {"type":"done","reviewText":"...","model":"...","generatedAt":"...","versionLabel":"...","fileName":"..."}
//   {"type":"error","error":"...","fatal":true|false}
// Body: { projectId: string, spreadId?: string } — spreadId omitted reviews the
// active spread, falling back to the most recently uploaded one.
export async function POST(request: NextRequest) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const authResult = await verifyAuth(request);
  if (!authResult.authenticated || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  const rateLimitResult = checkRateLimit(
    authResult.user.uid,
    'internal-spreads-review',
    RATE_LIMITS.ai
  );
  if (!rateLimitResult.allowed) {
    return rateLimitExceededResponse(rateLimitResult);
  }

  // The spreads review uses its own Foundry deployment so its model and
  // content-filter policy can be tuned independently of the DD test's;
  // AZURE_OPENAI_DEPLOYMENT is the fallback until the dedicated one is set up.
  const deployment =
    process.env.AZURE_OPENAI_SPREADS_DEPLOYMENT || process.env.AZURE_OPENAI_DEPLOYMENT;
  const missingEnv = [
    !process.env.AZURE_OPENAI_ENDPOINT && 'AZURE_OPENAI_ENDPOINT',
    !process.env.AZURE_OPENAI_API_KEY && 'AZURE_OPENAI_API_KEY',
    !deployment && 'AZURE_OPENAI_SPREADS_DEPLOYMENT',
  ].filter(Boolean);
  if (missingEnv.length) {
    return NextResponse.json(
      { error: `Azure OpenAI is not configured on the server. Missing: ${missingEnv.join(', ')}.` },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const projectId = String(body?.projectId || '').trim();
  const spreadId = String(body?.spreadId || '').trim() || undefined;
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  let spread;
  try {
    spread = await loadSpreadForReview(projectId, spreadId);
  } catch (err: any) {
    console.error('[internal-spreads-review] Failed to load spread:', err);
    return NextResponse.json(
      { error: `Failed to load spread data: ${err?.message || 'unknown'}` },
      { status: 500 }
    );
  }

  if (!spread) {
    return NextResponse.json(
      {
        error: spreadId
          ? 'The selected spread was not found for this project.'
          : 'No financial spreads found for this project. Upload a spread on the Financials section first.',
      },
      { status: 400 }
    );
  }

  const finalPrompt = await buildSpreadsReviewPrompt(projectId, spread);

  const encoder = new TextEncoder();
  const abort = new AbortController();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const emit = (evt: Record<string, unknown>) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(evt) + '\n'));
        } catch {
          // Controller already closed (client gone).
          closed = true;
        }
      };
      const close = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      void (async () => {
        try {
          emit({ type: 'reset' });
          emit({ type: 'phase', phase: 'thinking' });

          const client = getAzureClient();
          const aiStream = await client.responses.create(
            {
              model: deployment as string,
              instructions: SYSTEM_INSTRUCTIONS,
              input: finalPrompt,
              max_output_tokens: MAX_OUTPUT_TOKENS,
              stream: true,
            },
            { signal: abort.signal }
          );

          let reviewText = '';
          let writing = false;
          let incompleteReason: string | null = null;

          for await (const event of aiStream as AsyncIterable<ResponseStreamEvent>) {
            switch (event.type) {
              case 'response.output_text.delta':
                if (!writing) {
                  writing = true;
                  emit({ type: 'phase', phase: 'writing' });
                }
                reviewText += event.delta;
                emit({ type: 'text', text: event.delta });
                break;
              case 'response.incomplete':
                incompleteReason = event.response.incomplete_details?.reason ?? 'unknown';
                console.warn(
                  `[internal-spreads-review] Response for project ${projectId} incomplete: ${incompleteReason}`
                );
                break;
              case 'response.failed': {
                const message =
                  event.response.error?.message || 'Azure OpenAI reported a failed response.';
                throw new Error(message);
              }
              case 'error':
                throw new Error(event.message || 'Azure OpenAI stream error');
              default:
                break;
            }
          }

          if (!reviewText.trim()) {
            emit({
              type: 'error',
              error: 'The Azure OpenAI model returned an empty review.',
              fatal: true,
            });
            close();
            return;
          }

          if (incompleteReason === 'content_filter') {
            emit({
              type: 'error',
              error:
                "Azure's content filter stopped the response before it finished, so the " +
                'review is incomplete. If this keeps happening, review the content-filter ' +
                'configuration on the Azure OpenAI deployment (Foundry → Guardrails/Safety).',
              fatal: false,
            });
          } else if (incompleteReason) {
            emit({
              type: 'error',
              error:
                'The review reached the maximum length and may be incomplete. ' +
                'Try regenerating, or contact support if this persists.',
              fatal: false,
            });
          }

          emit({
            type: 'done',
            reviewText,
            model: deployment,
            generatedAt: new Date().toISOString(),
            versionLabel: spread.versionLabel,
            fileName: spread.fileName,
          });
          close();
        } catch (err: any) {
          if (abort.signal.aborted) {
            // Client disconnected — nothing to report to.
            close();
            return;
          }
          console.error('[internal-spreads-review] Generation error:', err);
          emit({
            type: 'error',
            error: err?.message || 'Failed to generate spreads review',
            fatal: true,
          });
          close();
        }
      })();
    },
    cancel() {
      // Client disconnected. Display-only flow: abort the Azure call outright.
      abort.abort();
    },
  });

  return new Response(stream, { headers: NDJSON_HEADERS });
}

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { ResponseStreamEvent } from 'openai/resources/responses/responses';
import { verifyAuth, unauthorizedResponse } from '@/lib/apiAuth';
import { checkRateLimit, rateLimitExceededResponse, RATE_LIMITS } from '@/lib/rateLimit';
import { checkCsrf } from '@/lib/csrf';
import {
  extractApplicationFields,
  loadApplicationData,
  getMissingRequiredFields,
  buildDiligencePrompt,
  NDJSON_HEADERS,
} from '@/lib/diligenceShared';

export const runtime = 'nodejs';
// Web research can take 2-4 minutes — keep the function alive long enough.
export const maxDuration = 300;

const MAX_OUTPUT_TOKENS = 32000;

// GPT models refuse PII-heavy investigation prompts without knowing the
// caller's legitimate role (Claude's DD route needs no equivalent). This is
// sent as the Responses API `instructions` (system) message; the report prompt
// itself stays byte-identical to the Claude route's.
const SYSTEM_INSTRUCTIONS =
  'You are a commercial credit analyst at an SBA lender preparing an internal ' +
  'pre-qualification due-diligence report, a routine part of loan underwriting. ' +
  'The business and individuals named in the request are loan applicants who ' +
  'provided this information in their loan application and consented to standard ' +
  'lender due diligence, including public-records and web research. Write the ' +
  'complete report as instructed.';

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

// POST /api/internal-dd-test — generate a due-diligence report with the
// internal Azure OpenAI (Foundry) deployment instead of Anthropic. Same prompt
// composition as /api/diligence-report, same ndjson event stream:
//   {"type":"reset"}
//   {"type":"phase","phase":"thinking|researching|writing"}
//   {"type":"search","query":"..."}
//   {"type":"text","text":"..."}
//   {"type":"done","reportText":"...","model":"...","generatedAt":"..."}
//   {"type":"error","error":"...","fatal":true|false}
// Unlike the Claude route this is display-only: generation runs inside the
// request (no job registry), nothing is persisted, and a client disconnect
// aborts the Azure call.
export async function POST(request: NextRequest) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const authResult = await verifyAuth(request);
  if (!authResult.authenticated || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  const rateLimitResult = checkRateLimit(
    authResult.user.uid,
    'internal-dd-test',
    RATE_LIMITS.ai
  );
  if (!rateLimitResult.allowed) {
    return rateLimitExceededResponse(rateLimitResult);
  }

  const missingEnv = [
    !process.env.AZURE_OPENAI_ENDPOINT && 'AZURE_OPENAI_ENDPOINT',
    !process.env.AZURE_OPENAI_API_KEY && 'AZURE_OPENAI_API_KEY',
    !process.env.AZURE_OPENAI_DEPLOYMENT && 'AZURE_OPENAI_DEPLOYMENT',
  ].filter(Boolean);
  if (missingEnv.length) {
    return NextResponse.json(
      { error: `Azure OpenAI is not configured on the server. Missing: ${missingEnv.join(', ')}.` },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const projectId = String(body?.projectId || '').trim();
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  let loanApp: any = null;
  let project: any = null;
  try {
    ({ loanApp, project } = await loadApplicationData(projectId));
  } catch (err: any) {
    console.error('[internal-dd-test] Failed to load application data:', err);
    return NextResponse.json(
      { error: `Failed to load application data: ${err?.message || 'unknown'}` },
      { status: 500 }
    );
  }

  if (!loanApp && !project) {
    return NextResponse.json(
      { error: 'No saved application found for this project. Save the loan application before generating a diligence report.' },
      { status: 400 }
    );
  }

  const fields = extractApplicationFields(loanApp, project);

  const missing = getMissingRequiredFields(fields);
  if (missing.length) {
    return NextResponse.json(
      { error: `The saved application is missing required fields: ${missing.join(', ')}. Save the project after filling these in.` },
      { status: 400 }
    );
  }

  const finalPrompt = await buildDiligencePrompt(loanApp, fields);
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT as string;

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
              model: deployment,
              instructions: SYSTEM_INSTRUCTIONS,
              input: finalPrompt,
              tools: [{ type: 'web_search' }],
              max_output_tokens: MAX_OUTPUT_TOKENS,
              stream: true,
            },
            { signal: abort.signal }
          );

          let reportText = '';
          // Held in an object so TS doesn't over-narrow the closure-mutated value.
          const phaseState: { current: 'thinking' | 'researching' | 'writing' } = {
            current: 'thinking',
          };
          let incompleteReason: string | null = null;
          // Queries are often only populated on output_item.done — dedupe so a
          // query surfaced on both `added` and `done` is emitted once.
          const emittedQueries = new Set<string>();

          const setPhase = (phase: 'thinking' | 'researching' | 'writing') => {
            if (phaseState.current === phase) return;
            phaseState.current = phase;
            emit({ type: 'phase', phase });
          };

          const emitSearchQueries = (item: any) => {
            if (item?.type !== 'web_search_call') return;
            const action = item.action;
            if (!action || action.type !== 'search') return;
            const queries: string[] = Array.isArray(action.queries) && action.queries.length
              ? action.queries
              : typeof action.query === 'string' && action.query.trim()
              ? [action.query]
              : [];
            for (const query of queries) {
              const key = `${item.id}:${query}`;
              if (emittedQueries.has(key)) continue;
              emittedQueries.add(key);
              emit({ type: 'search', query });
            }
          };

          for await (const event of aiStream as AsyncIterable<ResponseStreamEvent>) {
            switch (event.type) {
              case 'response.output_item.added':
                if (event.item.type === 'reasoning') {
                  if (phaseState.current !== 'writing') setPhase('thinking');
                } else if (event.item.type === 'web_search_call') {
                  setPhase('researching');
                  emitSearchQueries(event.item);
                }
                break;
              case 'response.output_item.done':
                emitSearchQueries(event.item);
                break;
              case 'response.web_search_call.in_progress':
              case 'response.web_search_call.searching':
                setPhase('researching');
                break;
              case 'response.output_text.delta':
                setPhase('writing');
                reportText += event.delta;
                emit({ type: 'text', text: event.delta });
                break;
              case 'response.incomplete':
                // The response ended early: 'max_output_tokens' (analog of
                // Claude's stop_reason === 'max_tokens') or 'content_filter'
                // (Azure's content filter cut it off). Non-fatal — whatever
                // partial text arrived is still delivered below.
                incompleteReason = event.response.incomplete_details?.reason ?? 'unknown';
                console.warn(
                  `[internal-dd-test] Response for project ${projectId} incomplete: ${incompleteReason}`
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

          if (!reportText.trim()) {
            emit({
              type: 'error',
              error: 'The Azure OpenAI model returned an empty report.',
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
                'report is incomplete. If this keeps happening, review the content-filter ' +
                'configuration on the Azure OpenAI deployment (Foundry → Guardrails/Safety).',
              fatal: false,
            });
          } else if (incompleteReason) {
            emit({
              type: 'error',
              error:
                'The report reached the maximum length and may be incomplete. ' +
                'Try regenerating, or contact support if this persists.',
              fatal: false,
            });
          }

          emit({
            type: 'done',
            reportText,
            model: deployment,
            generatedAt: new Date().toISOString(),
            legalName: fields.legalName,
            industry: fields.industry,
            naicsCode: fields.naicsCode,
            primaryProjectPurpose: fields.primaryProjectPurpose,
          });
          close();
        } catch (err: any) {
          if (abort.signal.aborted) {
            // Client disconnected — nothing to report to.
            close();
            return;
          }
          console.error('[internal-dd-test] Generation error:', err);
          emit({
            type: 'error',
            error: err?.message || 'Failed to generate diligence report',
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

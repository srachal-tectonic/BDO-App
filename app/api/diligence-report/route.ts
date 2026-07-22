import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getCollection, COLLECTIONS } from '@/lib/cosmosdb';
import { verifyAuth, unauthorizedResponse } from '@/lib/apiAuth';
import { checkRateLimit, rateLimitExceededResponse, RATE_LIMITS } from '@/lib/rateLimit';
import { checkCsrf } from '@/lib/csrf';
import { logAuditEvent } from '@/lib/auditLog';
import {
  extractApplicationFields,
  loadApplicationData,
  getMissingRequiredFields,
  buildDiligencePrompt,
  NDJSON_HEADERS,
} from '@/lib/diligenceShared';
import {
  isGenerating,
  getJobSnapshot,
  createJob,
  emit,
  finishJob,
  subscribe,
  type DiligenceJobEvent,
} from '@/lib/diligenceJobs';

export const runtime = 'nodejs';
// Web research can take 2-4 minutes — keep the function alive long enough.
export const maxDuration = 300;

const CLAUDE_MODEL = 'claude-sonnet-4-6';
const WEB_SEARCH_MAX_USES = 5;

let _client: Anthropic | null = null;
function getAnthropicClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}


interface DiligenceReportDoc {
  id: string;
  projectId: string;
  reportText: string;
  model: string;
  generatedAt: string;
  generatedBy: string;
  legalName: string;
  industry: string;
  naicsCode: string;
  primaryProjectPurpose: string;
  // Generation lifecycle — older docs without these are treated as 'completed'.
  status?: 'generating' | 'completed' | 'failed';
  phase?: string | null;
  updatedAt?: string;
  error?: string;
}


// Stream that subscribes to a running job: replays its history then streams live
// events. Cancelling the response (client navigated away) only unsubscribes —
// it never stops the underlying job, which keeps running and persists itself.
function makeSubscriptionStream(projectId: string): Response {
  const encoder = new TextEncoder();
  let unsub: (() => void) | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const onEvent = (evt: DiligenceJobEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(evt) + '\n'));
        } catch {
          // Controller already closed.
        }
        if (evt.type === 'done' || (evt.type === 'error' && evt.fatal)) {
          closed = true;
          try {
            controller.close();
          } catch {
            // already closed
          }
          if (unsub) unsub();
        }
      };
      // Tell reconnecting viewers to clear any partial state before the replay,
      // so the full history rebuilds the report without duplication.
      try {
        controller.enqueue(encoder.encode(JSON.stringify({ type: 'reset' }) + '\n'));
      } catch {
        // ignore
      }
      unsub = subscribe(projectId, onEvent);
      if (!unsub) {
        // Job vanished between the caller's check and here — nothing to stream.
        try {
          controller.close();
        } catch {
          // ignore
        }
        return;
      }
      // A terminal event may have arrived during the synchronous replay above.
      if (closed && unsub) unsub();
    },
    cancel() {
      // Client disconnected. Detach this viewer but leave the job running.
      if (unsub) unsub();
    },
  });

  return new Response(stream, { headers: NDJSON_HEADERS });
}

// One-shot ndjson stream emitting a fixed set of events, then closing. Used to
// hand a reconnecting client the finished report (or an "interrupted" notice)
// when there is no live in-memory job to subscribe to.
function makeStaticStream(events: DiligenceJobEvent[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const evt of events) {
        controller.enqueue(encoder.encode(JSON.stringify(evt) + '\n'));
      }
      controller.close();
    },
  });
  return new Response(stream, { headers: NDJSON_HEADERS });
}

// GET /api/diligence-report?projectId=X — return latest report or null
export async function GET(request: NextRequest) {
  const authResult = await verifyAuth(request);
  if (!authResult.authenticated || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  const projectId = request.nextUrl.searchParams.get('projectId');
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  try {
    const col = await getCollection<DiligenceReportDoc>(COLLECTIONS.DUE_DILIGENCE_REPORTS);
    const doc = await col.findOne({ projectId });

    // Prefer the live in-memory snapshot when a generation is actively running
    // on this instance — it is fresher than the throttled Cosmos partial.
    const snapshot = getJobSnapshot(projectId);
    if (snapshot && snapshot.status === 'generating') {
      const { _id, ...rest } = (doc ?? {}) as any;
      return NextResponse.json({
        ...rest,
        projectId,
        reportText: snapshot.reportText,
        status: 'generating',
        phase: snapshot.phase,
      });
    }

    if (!doc) return NextResponse.json(null);
    const { _id, ...rest } = doc as any;
    // Older reports predate the status field but are fully generated.
    if (!rest.status) rest.status = 'completed';
    return NextResponse.json(rest);
  } catch (error: any) {
    console.error('Error fetching diligence report:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/diligence-report — start (or attach to) a background generation.
// Generation runs detached from this request, so the client may disconnect and
// reconnect freely. The response is an ndjson event stream:
//   {"type":"reset"}                                  // clear partial state
//   {"type":"phase","phase":"thinking|researching|writing"}
//   {"type":"search","query":"..."}
//   {"type":"text","text":"..."}
//   {"type":"done","reportText":"...","model":"...","generatedAt":"..."}
//   {"type":"error","error":"...","fatal":true|false}
//
// Body: { projectId, subscribe? }. With subscribe:true the request only attaches
// to an existing job (or replays the finished report) and never starts a new
// generation — used by clients reconnecting after a refresh/navigation.
export async function POST(request: NextRequest) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const authResult = await verifyAuth(request);
  if (!authResult.authenticated || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  const body = await request.json().catch(() => ({}));
  const projectId = String(body?.projectId || '').trim();
  const subscribeOnly = body?.subscribe === true;
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  // If a generation is already running for this project (on this instance),
  // just attach to it — whether the caller wanted to start one or reconnect.
  // This also prevents accidental duplicate generations from double-clicks.
  if (isGenerating(projectId)) {
    return makeSubscriptionStream(projectId);
  }

  // Reconnect path: nothing running here, so never kick off an expensive new
  // generation. Replay the finished report, or report that it was interrupted.
  if (subscribeOnly) {
    try {
      const col = await getCollection<DiligenceReportDoc>(COLLECTIONS.DUE_DILIGENCE_REPORTS);
      const existing = await col.findOne({ projectId });
      if (existing && (existing.status ?? 'completed') === 'completed') {
        return makeStaticStream([
          {
            type: 'done',
            reportText: existing.reportText,
            model: existing.model,
            generatedAt: existing.generatedAt,
            legalName: existing.legalName,
            industry: existing.industry,
            naicsCode: existing.naicsCode,
            primaryProjectPurpose: existing.primaryProjectPurpose,
          },
        ]);
      }
    } catch (err) {
      console.warn('[diligence-report] subscribe-only lookup failed:', err);
    }
    return makeStaticStream([
      {
        type: 'error',
        error:
          'The previous generation was interrupted (the server may have restarted). Click Regenerate to finish it.',
        fatal: true,
      },
    ]);
  }

  // --- New generation path ---
  const rateLimitResult = checkRateLimit(
    authResult.user.uid,
    'diligence-report',
    RATE_LIMITS.ai
  );
  if (!rateLimitResult.allowed) {
    return rateLimitExceededResponse(rateLimitResult);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not configured on the server.' },
      { status: 500 }
    );
  }

  // Load the persisted loan application + project records.
  let loanApp: any = null;
  let project: any = null;
  try {
    ({ loanApp, project } = await loadApplicationData(projectId));
  } catch (err: any) {
    console.error('[diligence-report] Failed to load application data:', err);
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

  // Compose the final prompt (admin overrides + appendices + data block).
  const finalPrompt = await buildDiligencePrompt(loanApp, fields);
  const legalName = fields.legalName;
  const industry = fields.industry;
  const naicsCode = fields.naicsCode;
  const primaryProjectPurpose = fields.primaryProjectPurpose;

  const userId = authResult.user.uid;

  // Register the job, then kick off generation DETACHED from this request. The
  // floating promise keeps running on the Node event loop after the client
  // disconnects — we deliberately do not await it, nor tie Claude's stream to
  // request.signal, so navigating away cannot abort it. Re-check isGenerating
  // immediately before createJob to close the tiny double-start race window.
  if (isGenerating(projectId)) {
    return makeSubscriptionStream(projectId);
  }
  createJob(projectId);
  void runDiligenceGeneration({
    projectId,
    finalPrompt,
    userId,
    legalName,
    industry,
    naicsCode,
    primaryProjectPurpose,
  });

  return makeSubscriptionStream(projectId);
}

interface GenerationParams {
  projectId: string;
  finalPrompt: string;
  userId: string;
  legalName: string;
  industry: string;
  naicsCode: string;
  primaryProjectPurpose: string;
}

// The actual Claude generation. Runs detached from any HTTP request: it emits
// progress events into the job registry (consumed by live viewers and the GET
// snapshot) and persists ONLY the finished report to Cosmos. Partial progress
// is intentionally kept in memory so a mid-generation failure never clobbers a
// previously completed report (important for the Regenerate flow).
async function runDiligenceGeneration(params: GenerationParams): Promise<void> {
  const {
    projectId,
    finalPrompt,
    userId,
    legalName,
    industry,
    naicsCode,
    primaryProjectPurpose,
  } = params;

  try {
    emit(projectId, { type: 'phase', phase: 'thinking' });

    const anthropic = getAnthropicClient();
    const claudeStream = anthropic.messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: 32000,
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: WEB_SEARCH_MAX_USES,
        } as any,
      ],
      messages: [{ role: 'user', content: finalPrompt }],
    });

    let reportText = '';
    let lastPhase: 'thinking' | 'researching' | 'writing' = 'thinking';
    // Track partial JSON for tool_use input deltas so we can extract the
    // search query as soon as it's complete.
    const toolInputBuffers = new Map<number, string>();
    const toolNamesByIndex = new Map<number, string>();

    for await (const event of claudeStream) {
      if (event.type === 'content_block_start') {
        const block: any = event.content_block;
        if (block?.type === 'tool_use') {
          toolNamesByIndex.set(event.index, block.name);
          toolInputBuffers.set(event.index, '');
          if (block.name === 'web_search' && lastPhase !== 'researching') {
            lastPhase = 'researching';
            emit(projectId, { type: 'phase', phase: 'researching' });
          }
          // Some providers include the full input on block start.
          if (block.input && typeof block.input === 'object' && typeof block.input.query === 'string') {
            emit(projectId, { type: 'search', query: block.input.query });
          }
        } else if (block?.type === 'text') {
          if (lastPhase !== 'writing') {
            lastPhase = 'writing';
            emit(projectId, { type: 'phase', phase: 'writing' });
          }
        }
      } else if (event.type === 'content_block_delta') {
        const delta: any = event.delta;
        if (delta?.type === 'text_delta' && typeof delta.text === 'string') {
          reportText += delta.text;
          emit(projectId, { type: 'text', text: delta.text });
        } else if (delta?.type === 'input_json_delta' && typeof delta.partial_json === 'string') {
          const buf = (toolInputBuffers.get(event.index) || '') + delta.partial_json;
          toolInputBuffers.set(event.index, buf);
        }
      } else if (event.type === 'content_block_stop') {
        const toolName = toolNamesByIndex.get(event.index);
        const buf = toolInputBuffers.get(event.index);
        if (toolName === 'web_search' && buf) {
          try {
            const parsed = JSON.parse(buf);
            if (typeof parsed?.query === 'string' && parsed.query.trim()) {
              emit(projectId, { type: 'search', query: parsed.query });
            }
          } catch {
            // Partial/invalid JSON — ignore.
          }
        }
        toolInputBuffers.delete(event.index);
        toolNamesByIndex.delete(event.index);
      }
    }

    const finalMessage = await claudeStream.finalMessage();

    if (!reportText.trim()) {
      emit(projectId, { type: 'error', error: 'Claude returned an empty report.', fatal: true });
      finishJob(projectId, 'failed');
      return;
    }

    // Detect a response truncated by the output-token cap. `stop_reason` is
    // 'end_turn' on a clean finish; 'max_tokens' means Claude ran out of budget
    // mid-report. Surface this as a non-fatal warning so a cut-off report no
    // longer passes through silently as a normal "done" (the symptom that the
    // report appeared to stop early). Non-fatal: the partial text is still kept.
    if (finalMessage.stop_reason === 'max_tokens') {
      console.warn(
        `[diligence-report] Report for project ${projectId} hit the max_tokens cap ` +
          `(${finalMessage.usage?.output_tokens ?? '?'} output tokens) and was truncated.`
      );
      emit(projectId, {
        type: 'error',
        error:
          'The report reached the maximum length and may be incomplete. ' +
          'Try regenerating, or contact support if this persists.',
        fatal: false,
      });
    }

    const generatedAt = new Date().toISOString();
    const doc: DiligenceReportDoc = {
      id: projectId,
      projectId,
      reportText,
      model: CLAUDE_MODEL,
      generatedAt,
      generatedBy: userId,
      legalName,
      industry,
      naicsCode,
      primaryProjectPurpose,
      status: 'completed',
      phase: null,
      updatedAt: generatedAt,
    };

    try {
      const col = await getCollection<DiligenceReportDoc>(COLLECTIONS.DUE_DILIGENCE_REPORTS);
      await col.replaceOne(
        { projectId },
        { ...doc, _id: projectId } as any,
        { upsert: true }
      );
    } catch (persistErr: any) {
      console.error('[diligence-report] Failed to persist report:', persistErr);
      // Surface persistence failure but still deliver the text (non-fatal).
      emit(projectId, {
        type: 'error',
        error: `Report generated but could not be saved: ${persistErr?.message || 'unknown error'}`,
        fatal: false,
      });
    }

    // A completed (re)generation invalidates the per-section "Risk to the bank"
    // comments: their positional `risk-N` keys no longer line up with the new
    // report, so a stale comment would otherwise resurface under the wrong (or
    // every) section. Wipe them here — the panel warns the user before
    // regenerating whenever comments exist. Non-fatal on failure.
    try {
      const commentsCol = await getCollection(COLLECTIONS.DILIGENCE_COMMENTS);
      const del = await commentsCol.deleteMany({ projectId });
      if (del?.deletedCount) {
        logAuditEvent({
          action: 'diligence_comment_deleted',
          category: 'note',
          userId,
          projectId,
          resourceType: 'diligence_comment',
          resourceId: projectId,
          summary: `Cleared ${del.deletedCount} Risk-to-the-bank comment(s) on report regeneration`,
          metadata: { bulk: true, deletedCount: del.deletedCount, reason: 'report_regenerated' },
        }).catch(() => {});
      }
    } catch (wipeErr) {
      console.error('[diligence-report] Failed to clear comments on regeneration:', wipeErr);
    }

    emit(projectId, {
      type: 'done',
      reportText,
      model: CLAUDE_MODEL,
      generatedAt,
      legalName,
      industry,
      naicsCode,
      primaryProjectPurpose,
    });
    finishJob(projectId, 'completed');
  } catch (err: any) {
    console.error('[diligence-report] Generation error:', err);
    emit(projectId, {
      type: 'error',
      error: err?.message || 'Failed to generate diligence report',
      fatal: true,
    });
    finishJob(projectId, 'failed');
  }
}

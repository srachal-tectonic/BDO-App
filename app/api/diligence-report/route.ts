import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getCollection, COLLECTIONS } from '@/lib/cosmosdb';
import { verifyAuth, unauthorizedResponse } from '@/lib/apiAuth';
import { checkRateLimit, rateLimitExceededResponse, RATE_LIMITS } from '@/lib/rateLimit';
import { checkCsrf } from '@/lib/csrf';
import { logAuditEvent } from '@/lib/auditLog';
import { DEFAULT_DILIGENCE_CORE_PROMPT } from '@/lib/diligencePrompts';
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

const ADMIN_SETTINGS_CONFIG_ID = 'config';
// Legacy single-prompt id, kept as a fallback so admins who customized the
// prompt before the Core/Appendix split don't lose their work until they save
// the new DD Prompts tab.
const LEGACY_DUE_DILIGENCE_PROMPT_ID = 'due-diligence-report';

interface ExtractedFields {
  legalName: string;
  dba: string;
  entityType: string;
  stateOfFormation: string;
  ein: string;
  businessAddress: string;
  projectAddress: string;
  websiteUrl: string;
  industry: string;
  naicsCode: string;
  primaryProjectPurpose: string;
  secondaryProjectPurposes: string;
  loanAmount: string;
  useOfProceeds: string;
  projectDescription: string;
  yearsInOperation: string;
  businessStage: string;
  ownerNames: string;
}

function s(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
  return '';
}

function formatAddress(addr: any): string {
  if (!addr || typeof addr !== 'object') return '';
  const street = [s(addr.street1), s(addr.street2)].filter(Boolean).join(' ');
  const cityStateZip = [s(addr.city), s(addr.state), s(addr.zipCode)].filter(Boolean).join(', ').replace(/, ([A-Z]{2}), /, ', $1 ');
  return [street, cityStateZip].filter(Boolean).join(', ');
}

function formatCurrency(n: unknown): string {
  if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) return '';
  return `$${n.toLocaleString('en-US')}`;
}

function extractApplicationFields(loanApp: any, project: any): ExtractedFields {
  const ba = loanApp?.businessApplicant ?? {};
  const po = loanApp?.projectOverview ?? {};

  // Legal name — fall back to project.businessName if the loan app field is empty.
  const legalName = s(ba.legalName) || s(project?.businessName);

  // Address — schema has `address` (full Address) plus optional `businessAddress` / `projectAddress`.
  const businessAddress =
    formatAddress(ba.businessAddress) || formatAddress(ba.address);
  const projectAddress = formatAddress(ba.projectAddress);

  // Industry / NAICS — projectOverview is canonical, businessApplicant is fallback.
  const industry = s(po.industry) || s(ba.industryType);
  const naicsCode = s(po.naicsCode) || s(ba.naicsCode);

  // Purposes — primaryProjectPurpose may be string or string[].
  const primaryRaw = po.primaryProjectPurpose;
  const primaryProjectPurpose = Array.isArray(primaryRaw)
    ? primaryRaw.filter(Boolean).join(', ')
    : s(primaryRaw);
  const secondaryProjectPurposes = Array.isArray(po.secondaryProjectPurposes)
    ? po.secondaryProjectPurposes.filter(Boolean).join(', ')
    : '';

  // Loan amount — try the SBA-program-specific tables, then legacy.
  const loanAmountNum =
    (typeof loanApp?.sourcesUses7a?.loanAmount === 'number' && loanApp.sourcesUses7a.loanAmount) ||
    (typeof loanApp?.sourcesUses504?.loanAmount === 'number' && loanApp.sourcesUses504.loanAmount) ||
    (typeof loanApp?.sourcesUsesExpress?.loanAmount === 'number' && loanApp.sourcesUsesExpress.loanAmount) ||
    (typeof loanApp?.sourcesUses?.loanAmount === 'number' && loanApp.sourcesUses.loanAmount) ||
    (typeof loanApp?.loan1?.loanAmount === 'number' && loanApp.loan1.loanAmount) ||
    (typeof loanApp?.loan1?.amount === 'number' && loanApp.loan1.amount) ||
    (typeof project?.loanAmount === 'number' && project.loanAmount) ||
    0;
  const loanAmount = formatCurrency(loanAmountNum);

  // Use of proceeds — itemize the legacy SourcesUses fields with non-zero amounts.
  const su = loanApp?.sourcesUses7a ?? loanApp?.sourcesUses ?? {};
  const usesParts: string[] = [];
  const pushUse = (label: string, n: unknown) => {
    if (typeof n === 'number' && n > 0) usesParts.push(`${label}: ${formatCurrency(n)}`);
  };
  pushUse('Purchase Price', su.purchasePrice);
  pushUse('Working Capital', su.workingCapital);
  pushUse('Closing Costs', su.closingCosts);
  pushUse('Contingency', su.contingency);
  pushUse('Other Uses', su.otherUses);
  const useOfProceeds = usesParts.join('; ');

  // Years in operation / startup vs existing.
  const yearsInOpRaw = ba.yearsInOperation;
  const yearsInOperation =
    typeof yearsInOpRaw === 'number' && yearsInOpRaw > 0
      ? `${yearsInOpRaw} year${yearsInOpRaw === 1 ? '' : 's'}`
      : s(ba.yearEstablished)
      ? `Established ${s(ba.yearEstablished)}`
      : '';

  const stage = s(po.classification?.businessStage);
  const isStartup = po.riskAssessment?.isStartup === true;
  const businessStage = stage
    ? stage.charAt(0).toUpperCase() + stage.slice(1)
    : isStartup
    ? 'Startup'
    : '';

  // Owners — full name + ownership %.
  const owners: string[] = Array.isArray(loanApp?.individualApplicants)
    ? loanApp.individualApplicants
        .map((a: any) => {
          const name = [s(a?.firstName), s(a?.lastName)].filter(Boolean).join(' ');
          if (!name) return '';
          const pct = typeof a?.ownershipPercentage === 'number' ? `${a.ownershipPercentage}%` : '';
          return pct ? `${name} (${pct})` : name;
        })
        .filter(Boolean)
    : [];
  const ownerNames = owners.join(', ');

  return {
    legalName,
    dba: s(ba.dba) || s(ba.dbaName),
    entityType: s(ba.entityType),
    stateOfFormation: s(ba.stateOfFormation),
    ein: s(ba.ein),
    businessAddress,
    projectAddress,
    websiteUrl: s(ba.website),
    industry,
    naicsCode,
    primaryProjectPurpose,
    secondaryProjectPurposes,
    loanAmount,
    useOfProceeds,
    projectDescription: s(po.projectDescription) || s(po.goodFitSummary) || s(po.bdoComments),
    yearsInOperation,
    businessStage,
    ownerNames,
  };
}

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

const NDJSON_HEADERS = {
  'Content-Type': 'application/x-ndjson; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  'X-Accel-Buffering': 'no',
};

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
    const [loanCol, projCol] = await Promise.all([
      getCollection(COLLECTIONS.LOAN_APPLICATIONS),
      getCollection(COLLECTIONS.PROJECTS),
    ]);
    [loanApp, project] = await Promise.all([
      loanCol.findOne({ projectId }),
      projCol.findOne({ id: projectId }),
    ]);
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

  if (!fields.legalName || !fields.industry || !fields.naicsCode || !fields.primaryProjectPurpose) {
    const missing: string[] = [];
    if (!fields.legalName) missing.push('Legal Name');
    if (!fields.industry) missing.push('Industry');
    if (!fields.naicsCode) missing.push('NAICS Code');
    if (!fields.primaryProjectPurpose) missing.push('Primary Project Purpose');
    return NextResponse.json(
      { error: `The saved application is missing required fields: ${missing.join(', ')}. Save the project after filling these in.` },
      { status: 400 }
    );
  }

  // Resolve the Core prompt + Purpose Appendices from admin settings, falling
  // back to the legacy single-prompt entry, and finally to the built-in
  // default. Per the DD Prompts admin tab: empty appendices are skipped.
  let coreTemplate = DEFAULT_DILIGENCE_CORE_PROMPT;
  let appendices: Record<string, string> = {};
  try {
    const adminCol = await getCollection(COLLECTIONS.ADMIN_SETTINGS);
    const adminDoc = await adminCol.findOne({ id: ADMIN_SETTINGS_CONFIG_ID });
    const settings: any = adminDoc ?? {};

    const coreOverride = typeof settings.diligenceCorePrompt === 'string' ? settings.diligenceCorePrompt.trim() : '';
    if (coreOverride) {
      coreTemplate = coreOverride;
    } else {
      // Migration fallback: read the old aiPrompts[id=due-diligence-report]
      // entry until the admin saves the new DD Prompts tab.
      const legacy = settings.aiPrompts?.find((p: any) => p?.id === LEGACY_DUE_DILIGENCE_PROMPT_ID);
      if (legacy?.prompt && typeof legacy.prompt === 'string' && legacy.prompt.trim()) {
        coreTemplate = legacy.prompt;
      }
    }

    if (settings.diligencePurposeAppendices && typeof settings.diligencePurposeAppendices === 'object') {
      appendices = settings.diligencePurposeAppendices;
    }
  } catch (err) {
    console.warn('[diligence-report] Failed to load admin prompt overrides, using defaults:', err);
  }

  // Build the ordered, deduped list of selected purposes (primary + secondary).
  const primaryRaw = (loanApp?.projectOverview?.primaryProjectPurpose ?? null) as string | string[] | null;
  const secondaryRaw = (loanApp?.projectOverview?.secondaryProjectPurposes ?? []) as string[];
  const selectedPurposes: string[] = [];
  const seen = new Set<string>();
  const pushPurpose = (raw: unknown) => {
    if (typeof raw !== 'string') return;
    const trimmed = raw.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    selectedPurposes.push(trimmed);
  };
  if (Array.isArray(primaryRaw)) {
    primaryRaw.forEach(pushPurpose);
  } else {
    pushPurpose(primaryRaw);
  }
  if (Array.isArray(secondaryRaw)) {
    secondaryRaw.forEach(pushPurpose);
  }

  const appendixSections: string[] = [];
  for (const purpose of selectedPurposes) {
    const text = typeof appendices[purpose] === 'string' ? appendices[purpose].trim() : '';
    if (!text) continue;
    appendixSections.push(`## Appendix: ${purpose}\n\n${text}`);
  }

  const composedTemplate = appendixSections.length
    ? `${coreTemplate}\n\n${appendixSections.join('\n\n')}`
    : coreTemplate;

  // Substitute every supported placeholder against the composed template.
  let renderedPrompt = composedTemplate;
  for (const [key, value] of Object.entries(fields)) {
    const re = new RegExp(`\\{${key}\\}`, 'g');
    renderedPrompt = renderedPrompt.replace(re, value || 'Not provided');
  }

  // Always append a structured data block so Claude has the full context even
  // if the admin's custom prompt template doesn't reference every placeholder.
  const dataBlock = [
    '',
    '---',
    '',
    '## Loan Application Data',
    '',
    `- Legal Name: ${fields.legalName}`,
    `- DBA: ${fields.dba}`,
    `- Entity Type: ${fields.entityType}`,
    `- State of Formation: ${fields.stateOfFormation}`,
    `- EIN: ${fields.ein}`,
    `- Business Address: ${fields.businessAddress}`,
    `- Project Address: ${fields.projectAddress}`,
    `- Website: ${fields.websiteUrl}`,
    `- Industry: ${fields.industry}`,
    `- NAICS Code: ${fields.naicsCode}`,
    `- Primary Project Purpose: ${fields.primaryProjectPurpose}`,
    `- Secondary Project Purposes: ${fields.secondaryProjectPurposes}`,
    `- Loan Amount Requested: ${fields.loanAmount}`,
    `- Use of Proceeds: ${fields.useOfProceeds}`,
    `- Project Description: ${fields.projectDescription}`,
    `- Years in Operation: ${fields.yearsInOperation}`,
    `- Business Stage: ${fields.businessStage}`,
    `- Owners: ${fields.ownerNames}`,
    '',
  ].join('\n');

  const finalPrompt = renderedPrompt + dataBlock;
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
      max_tokens: 8000,
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

    await claudeStream.finalMessage();

    if (!reportText.trim()) {
      emit(projectId, { type: 'error', error: 'Claude returned an empty report.', fatal: true });
      finishJob(projectId, 'failed');
      return;
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

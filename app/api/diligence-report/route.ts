import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getCollection, COLLECTIONS } from '@/lib/cosmosdb';
import { verifyAuth, unauthorizedResponse } from '@/lib/apiAuth';
import { checkRateLimit, rateLimitExceededResponse, RATE_LIMITS } from '@/lib/rateLimit';
import { checkCsrf } from '@/lib/csrf';

export const runtime = 'nodejs';
// Web research can take 2-4 minutes — keep the function alive long enough.
export const maxDuration = 300;

const CLAUDE_MODEL = 'claude-sonnet-4-6';
const WEB_SEARCH_MAX_USES = 5;

const ADMIN_SETTINGS_CONFIG_ID = 'config';
const DUE_DILIGENCE_PROMPT_ID = 'due-diligence-report';

const DEFAULT_PROMPT = `You are an SBA loan due diligence analyst. Research the applicant using public web sources and produce a structured markdown report for the lender.

Applicant:
- Legal Name: {legalName}
- Industry: {industry}
- NAICS Code: {naicsCode}
- Primary Project Purpose: {primaryProjectPurpose}

Use the web_search tool to verify:
1. Entity status (registered, active, in good standing where discoverable)
2. Industry context and outlook for this NAICS code
3. Local market conditions for the applicant's geography
4. Online reputation (reviews, news, complaints, lawsuits)
5. Known risk factors (regulatory actions, sanctions lists, OFAC, bankruptcies)

Output a markdown report with these sections (use H2 headings):
- Executive Summary
- Entity Verification
- Industry & Market Context
- Online Reputation
- Risk Factors
- Open Questions for Underwriting
- Sources (bulleted list of URLs you cited)

Be concise. Cite specific URLs inline as markdown links. If a fact cannot be verified, say so explicitly rather than guessing.`;

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
    if (!doc) return NextResponse.json(null);
    const { _id, ...rest } = doc as any;
    return NextResponse.json(rest);
  } catch (error: any) {
    console.error('Error fetching diligence report:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/diligence-report — stream a new report from Claude with web search.
// Streams newline-delimited JSON events:
//   {"type":"phase","phase":"thinking|researching|writing"}
//   {"type":"search","query":"..."}
//   {"type":"text","text":"..."}
//   {"type":"done","reportText":"...","model":"...","generatedAt":"..."}
//   {"type":"error","error":"..."}
export async function POST(request: NextRequest) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const authResult = await verifyAuth(request);
  if (!authResult.authenticated || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

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

  const body = await request.json().catch(() => ({}));
  const projectId = String(body?.projectId || '').trim();
  const legalName = String(body?.legalName || '').trim();
  const industry = String(body?.industry || '').trim();
  const naicsCode = String(body?.naicsCode || '').trim();
  const primaryProjectPurpose = String(body?.primaryProjectPurpose || '').trim();

  const missing: string[] = [];
  if (!projectId) missing.push('projectId');
  if (!legalName) missing.push('legalName');
  if (!industry) missing.push('industry');
  if (!naicsCode) missing.push('naicsCode');
  if (!primaryProjectPurpose) missing.push('primaryProjectPurpose');
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing required fields: ${missing.join(', ')}` },
      { status: 400 }
    );
  }

  // Resolve the prompt template — admin override or default.
  let promptTemplate = DEFAULT_PROMPT;
  try {
    const adminCol = await getCollection(COLLECTIONS.ADMIN_SETTINGS);
    const adminDoc = await adminCol.findOne({ id: ADMIN_SETTINGS_CONFIG_ID });
    const override = (adminDoc as any)?.aiPrompts?.find((p: any) => p?.id === DUE_DILIGENCE_PROMPT_ID);
    if (override?.prompt && typeof override.prompt === 'string' && override.prompt.trim()) {
      promptTemplate = override.prompt;
    }
  } catch (err) {
    console.warn('[diligence-report] Failed to load admin prompt override, using default:', err);
  }

  const finalPrompt = promptTemplate
    .replace(/\{legalName\}/g, legalName)
    .replace(/\{industry\}/g, industry)
    .replace(/\{naicsCode\}/g, naicsCode)
    .replace(/\{primaryProjectPurpose\}/g, primaryProjectPurpose);

  const encoder = new TextEncoder();
  const userId = authResult.user.uid;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
      };

      try {
        send({ type: 'phase', phase: 'thinking' });

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
                send({ type: 'phase', phase: 'researching' });
              }
              // Some providers include the full input on block start.
              if (block.input && typeof block.input === 'object' && typeof block.input.query === 'string') {
                send({ type: 'search', query: block.input.query });
              }
            } else if (block?.type === 'text') {
              if (lastPhase !== 'writing') {
                lastPhase = 'writing';
                send({ type: 'phase', phase: 'writing' });
              }
            }
          } else if (event.type === 'content_block_delta') {
            const delta: any = event.delta;
            if (delta?.type === 'text_delta' && typeof delta.text === 'string') {
              reportText += delta.text;
              send({ type: 'text', text: delta.text });
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
                  send({ type: 'search', query: parsed.query });
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
          send({ type: 'error', error: 'Claude returned an empty report.' });
          controller.close();
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
          // Surface persistence failure to the client but still emit the text.
          send({
            type: 'error',
            error: `Report generated but could not be saved: ${persistErr?.message || 'unknown error'}`,
          });
        }

        send({
          type: 'done',
          reportText,
          model: CLAUDE_MODEL,
          generatedAt,
        });
        controller.close();
      } catch (err: any) {
        console.error('[diligence-report] Stream error:', err);
        try {
          send({ type: 'error', error: err?.message || 'Failed to generate diligence report' });
        } catch {
          // Controller may already be closed.
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}

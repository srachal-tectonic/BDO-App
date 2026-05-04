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
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
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

  // Substitute every supported placeholder.
  let renderedPrompt = promptTemplate;
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
          legalName,
          industry,
          naicsCode,
          primaryProjectPurpose,
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

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { ResponseStreamEvent } from 'openai/resources/responses/responses';
import * as XLSX from 'xlsx';
import { verifyAuth, unauthorizedResponse } from '@/lib/apiAuth';
import { checkRateLimit, rateLimitExceededResponse, RATE_LIMITS } from '@/lib/rateLimit';
import { checkCsrf } from '@/lib/csrf';
import { NDJSON_HEADERS } from '@/lib/diligenceShared';

export const runtime = 'nodejs';
// Agent runs (document reading + code-interpreter docx generation) can take
// a few minutes.
export const maxDuration = 300;

const MAX_OUTPUT_TOKENS = 32000;
const MAX_PDF_BYTES = 25 * 1024 * 1024;
const MAX_EXCEL_BYTES = 15 * 1024 * 1024;
// The workbook is inlined into the prompt as CSV — cap it so a huge model
// spreadsheet can't blow past the deployment's context window.
const MAX_EXCEL_CSV_CHARS = 150_000;

const AGENT_NAME = process.env.SBA_PRESCREEN_AGENT_NAME || 'sba-prequal-quick-screen';

function getFoundryConfig(): { baseURL: string; apiKey: string } {
  // Foundry PROJECT endpoint, e.g.
  // https://<resource>.services.ai.azure.com/api/projects/<project>
  // (agents live at project scope — the plain AZURE_OPENAI_ENDPOINT can't run them).
  const endpoint = (process.env.AZURE_AI_PROJECT_ENDPOINT || '').replace(/\/+$/, '');
  return {
    baseURL: `${endpoint}/openai/v1/`,
    apiKey: process.env.AZURE_AI_PROJECT_API_KEY || process.env.AZURE_OPENAI_API_KEY || '',
  };
}

let _client: OpenAI | null = null;
function getFoundryClient(): OpenAI {
  if (!_client) {
    const { baseURL, apiKey } = getFoundryConfig();
    _client = new OpenAI({ baseURL, apiKey });
  }
  return _client;
}

function workbookToCsvSections(buffer: Buffer): { csv: string; truncated: boolean } {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sections: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
    if (!csv.trim()) continue;
    sections.push(`--- Worksheet: ${sheetName} ---\n${csv.trim()}`);
  }
  const full = sections.join('\n\n');
  if (full.length <= MAX_EXCEL_CSV_CHARS) return { csv: full, truncated: false };
  return { csv: full.slice(0, MAX_EXCEL_CSV_CHARS), truncated: true };
}

interface ContainerFileRef {
  containerId: string;
  fileId: string;
  filename: string;
}

// Files the agent generates with Code Interpreter live in its sandbox
// container; the response only carries a citation (container_id + file_id).
// Fetch the actual bytes from the container-files endpoint. Raw fetch rather
// than an SDK helper so both Azure auth header styles can be sent.
async function downloadContainerFile(ref: ContainerFileRef): Promise<Buffer> {
  const { baseURL, apiKey } = getFoundryConfig();
  const url = `${baseURL}containers/${encodeURIComponent(ref.containerId)}/files/${encodeURIComponent(ref.fileId)}/content`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'api-key': apiKey,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `Failed to download the generated document (HTTP ${res.status}): ${body.slice(0, 300)}`
    );
  }
  return Buffer.from(await res.arrayBuffer());
}

// POST /api/sba-prescreen — run the Foundry "sba-prequal-quick-screen" agent
// over an uploaded PDF + Excel workbook. Multipart form fields: `pdf`, `excel`.
// The agent generates the quick-screen .docx itself (Code Interpreter); this
// route captures the container-file citation from the response, downloads the
// bytes, and streams them to the client. ndjson event stream:
//   {"type":"reset"}
//   {"type":"phase","phase":"thinking|researching|writing"}
//   {"type":"text","text":"..."}                      ← the agent's commentary
//   {"type":"file","filename":"...","data":"<base64>"} ← the generated .docx
//   {"type":"done","reportText":"...","model":"...","generatedAt":"...","hasDocument":true|false}
//   {"type":"error","error":"...","fatal":true|false}
// Display-only: neither the uploads nor the output are persisted anywhere.
export async function POST(request: NextRequest) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const authResult = await verifyAuth(request);
  if (!authResult.authenticated || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  const rateLimitResult = checkRateLimit(
    authResult.user.uid,
    'sba-prescreen',
    RATE_LIMITS.ai
  );
  if (!rateLimitResult.allowed) {
    return rateLimitExceededResponse(rateLimitResult);
  }

  const hasKey = !!(process.env.AZURE_AI_PROJECT_API_KEY || process.env.AZURE_OPENAI_API_KEY);
  const missingEnv = [
    !process.env.AZURE_AI_PROJECT_ENDPOINT && 'AZURE_AI_PROJECT_ENDPOINT',
    !hasKey && 'AZURE_AI_PROJECT_API_KEY (or AZURE_OPENAI_API_KEY)',
  ].filter(Boolean);
  if (missingEnv.length) {
    return NextResponse.json(
      { error: `The Foundry agent is not configured on the server. Missing: ${missingEnv.join(', ')}.` },
      { status: 500 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart form data.' }, { status: 400 });
  }

  const pdfFile = formData.get('pdf');
  const excelFile = formData.get('excel');
  if (!(pdfFile instanceof File) || !(excelFile instanceof File)) {
    return NextResponse.json(
      { error: 'Both a PDF (`pdf`) and an Excel workbook (`excel`) are required.' },
      { status: 400 }
    );
  }
  if (!/\.pdf$/i.test(pdfFile.name)) {
    return NextResponse.json({ error: 'The first document must be a .pdf file.' }, { status: 400 });
  }
  if (!/\.(xlsx|xls|xlsm)$/i.test(excelFile.name)) {
    return NextResponse.json(
      { error: 'The second document must be an Excel workbook (.xlsx, .xls, or .xlsm).' },
      { status: 400 }
    );
  }
  if (pdfFile.size > MAX_PDF_BYTES) {
    return NextResponse.json(
      { error: `PDF exceeds the ${Math.round(MAX_PDF_BYTES / (1024 * 1024))}MB limit.` },
      { status: 400 }
    );
  }
  if (excelFile.size > MAX_EXCEL_BYTES) {
    return NextResponse.json(
      { error: `Excel workbook exceeds the ${Math.round(MAX_EXCEL_BYTES / (1024 * 1024))}MB limit.` },
      { status: 400 }
    );
  }

  const pdfBase64 = Buffer.from(await pdfFile.arrayBuffer()).toString('base64');

  let excelCsv: { csv: string; truncated: boolean };
  try {
    excelCsv = workbookToCsvSections(Buffer.from(await excelFile.arrayBuffer()));
  } catch (err: any) {
    console.error('[sba-prescreen] Failed to parse Excel workbook:', err);
    return NextResponse.json(
      { error: `Could not read the Excel workbook: ${err?.message || 'unknown error'}` },
      { status: 400 }
    );
  }
  if (!excelCsv.csv.trim()) {
    return NextResponse.json(
      { error: 'The Excel workbook appears to be empty.' },
      { status: 400 }
    );
  }

  const promptText = [
    'Run the SBA pre-qualification quick screen on the two attached documents.',
    '',
    `Document 1 — PDF: "${pdfFile.name}" (attached as a file).`,
    `Document 2 — Excel workbook: "${excelFile.name}". Its full contents follow as CSV, one section per worksheet.` +
      (excelCsv.truncated
        ? ' NOTE: the workbook was truncated to fit; flag in the output that it may be incomplete.'
        : ''),
    '',
    excelCsv.csv,
    '',
    'Generate the completed quick-screen document as a .docx file and attach it to your ' +
      'response as a downloadable file. Keep your text reply to a brief summary of the result.',
  ].join('\n');

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

          const client = getFoundryClient();
          // agent_reference routes the request to the Foundry agent's @latest
          // version; model/instructions/tools come from the agent definition
          // (see docs/FOUNDRY-AGENT-FIX-MOVING-FORWARD.md — do NOT use the
          // deprecated `agent` field). The SDK types don't know the field, so
          // the body is cast.
          const aiStream = (await client.responses.create(
            {
              agent_reference: { type: 'agent_reference', name: AGENT_NAME },
              input: [
                {
                  role: 'user',
                  content: [
                    { type: 'input_text', text: promptText },
                    {
                      type: 'input_file',
                      filename: pdfFile.name,
                      file_data: `data:application/pdf;base64,${pdfBase64}`,
                    },
                  ],
                },
              ],
              max_output_tokens: MAX_OUTPUT_TOKENS,
              stream: true,
            } as any,
            { signal: abort.signal }
          )) as unknown as AsyncIterable<ResponseStreamEvent>;

          let reportText = '';
          let model = AGENT_NAME;
          let incompleteReason: string | null = null;
          const containerFiles: ContainerFileRef[] = [];
          const seenFileIds = new Set<string>();
          const phaseState: { current: 'thinking' | 'researching' | 'writing' } = {
            current: 'thinking',
          };
          const setPhase = (phase: 'thinking' | 'researching' | 'writing') => {
            if (phaseState.current === phase) return;
            phaseState.current = phase;
            emit({ type: 'phase', phase });
          };

          const addAnnotation = (ann: any) => {
            if (!ann || ann.type !== 'container_file_citation') return;
            const fileId = ann.file_id;
            const containerId = ann.container_id;
            if (!fileId || !containerId || seenFileIds.has(fileId)) return;
            seenFileIds.add(fileId);
            containerFiles.push({
              containerId,
              fileId,
              filename: ann.filename || 'prescreen.docx',
            });
          };

          for await (const event of aiStream) {
            switch (event.type) {
              case 'response.output_item.added':
                if (event.item.type === 'reasoning') {
                  if (phaseState.current !== 'writing') setPhase('thinking');
                } else if (
                  event.item.type === 'web_search_call' ||
                  event.item.type === 'code_interpreter_call'
                ) {
                  setPhase('researching');
                }
                break;
              case 'response.output_text.delta':
                setPhase('writing');
                reportText += event.delta;
                emit({ type: 'text', text: event.delta });
                break;
              case 'response.output_text.annotation.added':
                addAnnotation((event as any).annotation);
                break;
              case 'response.completed': {
                const response: any = event.response;
                if (response?.model) model = response.model;
                // Belt-and-suspenders: some annotations only appear on the
                // final response object, not as annotation.added events.
                for (const item of response?.output ?? []) {
                  if (item?.type !== 'message') continue;
                  for (const part of item.content ?? []) {
                    for (const ann of part?.annotations ?? []) addAnnotation(ann);
                  }
                }
                break;
              }
              case 'response.incomplete':
                incompleteReason = event.response.incomplete_details?.reason ?? 'unknown';
                console.warn(`[sba-prescreen] Response incomplete: ${incompleteReason}`);
                break;
              case 'response.failed': {
                const message =
                  event.response.error?.message || 'The Foundry agent reported a failed response.';
                throw new Error(message);
              }
              case 'error':
                throw new Error(event.message || 'Foundry agent stream error');
              default:
                break;
            }
          }

          if (incompleteReason === 'content_filter') {
            emit({
              type: 'error',
              error:
                "Azure's content filter stopped the response before it finished. If this keeps " +
                'happening, review the content-filter configuration on the Foundry resource ' +
                '(Operate → Compliance → Guardrails).',
              fatal: false,
            });
          } else if (incompleteReason) {
            emit({
              type: 'error',
              error: 'The response reached the maximum length and may be incomplete. Try again.',
              fatal: false,
            });
          }

          // Prefer the .docx the agent attached; fall back to the only file if
          // the citation lacks a filename.
          const docxRef =
            containerFiles.find((f) => /\.docx$/i.test(f.filename)) ||
            (containerFiles.length === 1 ? containerFiles[0] : undefined);

          let hasDocument = false;
          if (docxRef) {
            try {
              const bytes = await downloadContainerFile(docxRef);
              hasDocument = true;
              emit({
                type: 'file',
                filename: /\.docx$/i.test(docxRef.filename)
                  ? docxRef.filename
                  : `${docxRef.filename}.docx`,
                data: bytes.toString('base64'),
              });
            } catch (err: any) {
              console.error('[sba-prescreen] Container file download failed:', err);
              emit({
                type: 'error',
                error: err?.message || 'Failed to download the generated document from the agent.',
                fatal: false,
              });
            }
          } else if (reportText.trim()) {
            emit({
              type: 'error',
              error:
                'The agent finished without attaching a .docx file. Check that the agent has ' +
                'Code Interpreter enabled and instructions to save its output as a Word document. ' +
                'Its text response is shown below.',
              fatal: false,
            });
          }

          if (!reportText.trim() && !hasDocument) {
            emit({
              type: 'error',
              error: 'The agent returned an empty response.',
              fatal: true,
            });
            close();
            return;
          }

          emit({
            type: 'done',
            reportText,
            model,
            generatedAt: new Date().toISOString(),
            pdfName: pdfFile.name,
            excelName: excelFile.name,
            excelTruncated: excelCsv.truncated,
            hasDocument,
          });
          close();
        } catch (err: any) {
          if (abort.signal.aborted) {
            close();
            return;
          }
          console.error('[sba-prescreen] Agent run error:', err);
          emit({
            type: 'error',
            error: err?.message || 'Failed to run the SBA prescreen agent',
            fatal: true,
          });
          close();
        }
      })();
    },
    cancel() {
      // Client disconnected. Display-only flow: abort the agent call outright.
      abort.abort();
    },
  });

  return new Response(stream, { headers: NDJSON_HEADERS });
}

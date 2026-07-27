import { NextRequest, NextResponse } from 'next/server';
import { verifyAgentKey } from '@/lib/agentAuth';
import { ingestSop } from '@/lib/sopIngest';

export const runtime = 'nodejs';
// Parsing + embedding ~500 chunks takes a couple of minutes.
export const maxDuration = 300;

// POST /api/agent/sop-ingest — (re)ingest the SBA SOP 50 10 .docx into the
// sopChunks collection. Maintenance endpoint: multipart upload with a `file`
// field, gated by the agent API key. Replaces all previously ingested chunks.
// Deliberately NOT listed in docs/agent-openapi.json — the agent never calls
// this; it exists for operators (curl) when a new SOP edition ships.
export async function POST(request: NextRequest) {
  const authError = verifyAgentKey(request);
  if (authError) return authError;

  if (!process.env.AZURE_OPENAI_ENDPOINT || !process.env.AZURE_OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'Azure OpenAI is not configured (AZURE_OPENAI_ENDPOINT / AZURE_OPENAI_API_KEY).' },
      { status: 500 }
    );
  }

  let file: File | null = null;
  try {
    const form = await request.formData();
    file = form.get('file') as File | null;
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data with a `file` field.' }, { status: 400 });
  }
  if (!file) {
    return NextResponse.json({ error: 'No file provided (field name: file).' }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith('.docx')) {
    return NextResponse.json({ error: 'Expected a .docx file.' }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const started = Date.now();
    const result = await ingestSop(buffer, file.name);
    console.log(
      `[agent/sop-ingest] Ingested ${result.chunks} chunks (${result.sections} sections) from ${file.name} in ${Math.round((Date.now() - started) / 1000)}s`
    );
    return NextResponse.json({ ok: true, ...result, sourceName: file.name });
  } catch (err: any) {
    console.error('[agent/sop-ingest] Failed:', err);
    return NextResponse.json({ error: err?.message || 'Ingestion failed' }, { status: 500 });
  }
}

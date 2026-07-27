// SOP 50 10 ingestion: parse the official .docx, chunk it by heading
// structure, embed each chunk with the Azure OpenAI embedding deployment, and
// store everything in Cosmos. Consumed by POST /api/agent/sop-ingest; the
// chunks power GET /api/agent/sop-search (see lib/sopSearch.ts).
//
// Parsing uses pizzip + fast-xml-parser (both existing deps): a .docx is a
// zip whose word/document.xml holds paragraphs (<w:p>) with optional heading
// styles (<w:pStyle w:val="Heading1|2|3">). Headings build a breadcrumb like
// "Section A > Chapter 3 > B. Personal Resources" that each chunk carries so
// the agent can cite SOP locations.
import PizZip from 'pizzip';
import { XMLParser } from 'fast-xml-parser';
import { getCollection, COLLECTIONS } from '@/lib/cosmosdb';
import { embedTexts } from '@/lib/sopSearch';

// Target chunk size in characters (~700-800 tokens). Paragraphs are packed
// into chunks up to this size; a heading change always starts a new chunk.
const CHUNK_TARGET_CHARS = 3200;
// Paragraphs shorter than this merge forward rather than standing alone.
const MIN_CHUNK_CHARS = 400;

interface ParsedParagraph {
  headingLevel: number | null; // 1-4 when the paragraph is a styled heading
  text: string;
}

export interface SopChunkDoc {
  id: string;
  order: number;
  section: string;
  text: string;
  embedding: number[];
  sourceName: string;
  ingestedAt: string;
}

/** Recursively collect the text of every w:t node under a parsed subtree. */
function collectText(node: any): string {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(collectText).join('');
  if (typeof node !== 'object') return '';
  let out = '';
  for (const [key, value] of Object.entries(node)) {
    if (key === 'w:t') {
      // w:t may be a string, {#text, @_xml:space}, or an array of either.
      const items = Array.isArray(value) ? value : [value];
      for (const item of items) {
        if (typeof item === 'string' || typeof item === 'number') out += item;
        else if (item && typeof item === 'object') out += (item as any)['#text'] ?? '';
      }
    } else if (key === 'w:tab') {
      out += ' ';
    } else if (!key.startsWith('@_')) {
      out += collectText(value);
    }
  }
  return out;
}

function headingLevelOf(p: any): number | null {
  const style = p?.['w:pPr']?.['w:pStyle']?.['@_w:val'];
  if (typeof style !== 'string') return null;
  // SOP 50 10 8 uses Heading1 (sections), Heading2 (chapters), Heading3
  // (topics), Heading4 (lettered subsections) — deeper levels are list decor.
  const m = style.match(/^Heading([1-4])$/i);
  return m ? Number(m[1]) : null;
}

export function parseSopDocx(buffer: Buffer): ParsedParagraph[] {
  const zip = new PizZip(buffer);
  const docXml = zip.file('word/document.xml')?.asText();
  if (!docXml) {
    throw new Error('Not a valid .docx file (word/document.xml missing).');
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    // Do NOT trim text nodes — Word splits sentences across runs and the
    // inter-word spaces live at run boundaries; trimming glues words together.
    trimValues: false,
    // Keep every paragraph, run, and text node; we walk them manually.
    isArray: (name) => name === 'w:p' || name === 'w:r' || name === 'w:t',
  });
  const doc = parser.parse(docXml);
  const body = doc?.['w:document']?.['w:body'];
  if (!body) throw new Error('Unexpected .docx structure (w:body missing).');

  const paragraphs: any[] = Array.isArray(body['w:p']) ? body['w:p'] : [];
  const out: ParsedParagraph[] = [];
  for (const p of paragraphs) {
    const text = collectText(p).replace(/\s+/g, ' ').trim();
    if (!text) continue;
    out.push({ headingLevel: headingLevelOf(p), text });
  }
  return out;
}

/** Pack parsed paragraphs into section-labeled chunks. */
export function chunkParagraphs(paragraphs: ParsedParagraph[]): Array<{ section: string; text: string }> {
  const chunks: Array<{ section: string; text: string }> = [];
  const breadcrumb: string[] = [];
  let current = '';

  const sectionLabel = () => breadcrumb.filter(Boolean).join(' > ') || 'SOP 50 10';

  const flush = () => {
    const text = current.trim();
    if (text.length >= MIN_CHUNK_CHARS) {
      chunks.push({ section: sectionLabel(), text });
      current = '';
    } else if (text) {
      // Too small to stand alone — keep accumulating unless nothing follows.
      current = text;
    }
  };

  for (const p of paragraphs) {
    if (p.headingLevel !== null) {
      // Force-flush whatever is pending (even small) before the section changes.
      if (current.trim()) {
        chunks.push({ section: sectionLabel(), text: current.trim() });
        current = '';
      }
      breadcrumb.length = p.headingLevel - 1;
      breadcrumb[p.headingLevel - 1] = p.text;
      continue;
    }
    current = current ? `${current}\n${p.text}` : p.text;
    if (current.length >= CHUNK_TARGET_CHARS) flush();
  }
  if (current.trim()) {
    chunks.push({ section: sectionLabel(), text: current.trim() });
  }
  return chunks;
}

/**
 * Full ingestion: parse + chunk + embed + replace the Cosmos collection
 * contents. Returns counts for the caller to report.
 */
export async function ingestSop(buffer: Buffer, sourceName: string): Promise<{ chunks: number; sections: number }> {
  const paragraphs = parseSopDocx(buffer);
  const chunks = chunkParagraphs(paragraphs);
  if (chunks.length === 0) {
    throw new Error('No text chunks were produced from the document.');
  }

  const embeddings = await embedTexts(chunks.map((c) => c.text));

  const ingestedAt = new Date().toISOString();
  const docs: SopChunkDoc[] = chunks.map((c, i) => ({
    id: `sop-${i}`,
    order: i,
    section: c.section,
    text: c.text,
    embedding: embeddings[i],
    sourceName,
    ingestedAt,
  }));

  const col = await getCollection(COLLECTIONS.SOP_CHUNKS);
  await col.deleteMany({});
  // Insert in batches to stay under Cosmos request-size limits.
  for (let i = 0; i < docs.length; i += 50) {
    await col.insertMany(docs.slice(i, i + 50) as any);
  }

  return { chunks: docs.length, sections: new Set(chunks.map((c) => c.section)).size };
}

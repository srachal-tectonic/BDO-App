// Semantic search over the ingested SOP 50 10 chunks (see lib/sopIngest.ts).
// Embeds the query with the Azure OpenAI embedding deployment and ranks the
// stored chunks by cosine similarity. Chunk vectors are cached in memory per
// instance (they only change on re-ingestion).
import OpenAI from 'openai';
import { getCollection, COLLECTIONS } from '@/lib/cosmosdb';

const EMBEDDING_BATCH_SIZE = 64;
const CACHE_TTL_MS = 10 * 60 * 1000;

function embeddingDeployment(): string {
  return process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || 'text-embedding-3-small';
}

let _client: OpenAI | null = null;
function getEmbeddingClient(): OpenAI {
  if (!_client) {
    const endpoint = (process.env.AZURE_OPENAI_ENDPOINT || '').replace(/\/+$/, '');
    _client = new OpenAI({
      baseURL: `${endpoint}/openai/v1/`,
      apiKey: process.env.AZURE_OPENAI_API_KEY,
    });
  }
  return _client;
}

/** Embed a batch of texts (used by both ingestion and query time). */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const client = getEmbeddingClient();
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBEDDING_BATCH_SIZE);
    const res = await client.embeddings.create({
      model: embeddingDeployment(),
      input: batch,
    });
    // API returns items with an index — order them explicitly.
    const sorted = [...res.data].sort((a, b) => a.index - b.index);
    out.push(...sorted.map((d) => d.embedding as number[]));
  }
  return out;
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

interface CachedChunk {
  section: string;
  text: string;
  order: number;
  embedding: number[];
}

let _cache: { chunks: CachedChunk[]; loadedAt: number } | null = null;

async function loadChunks(): Promise<CachedChunk[]> {
  if (_cache && Date.now() - _cache.loadedAt < CACHE_TTL_MS) {
    return _cache.chunks;
  }
  const col = await getCollection(COLLECTIONS.SOP_CHUNKS);
  const docs = await col
    .find({}, { projection: { section: 1, text: 1, order: 1, embedding: 1 } })
    .sort({ order: 1 })
    .toArray();
  const chunks = docs.map((d: any) => ({
    section: d.section,
    text: d.text,
    order: d.order,
    embedding: d.embedding,
  }));
  _cache = { chunks, loadedAt: Date.now() };
  return chunks;
}

export interface SopSearchResult {
  section: string;
  text: string;
  score: number;
}

/**
 * Search the SOP for a query. Returns the top-K chunks with their section
 * breadcrumbs, or an empty array when nothing has been ingested yet.
 */
export async function searchSop(query: string, topK = 6): Promise<SopSearchResult[]> {
  const chunks = await loadChunks();
  if (chunks.length === 0) return [];

  const [queryEmbedding] = await embedTexts([query]);
  return chunks
    .map((c) => ({ section: c.section, text: c.text, score: cosine(queryEmbedding, c.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((r) => ({ ...r, score: Math.round(r.score * 1000) / 1000 }));
}

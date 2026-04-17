import { MongoClient, Db, Collection } from 'mongodb';

// Connection string from Azure Portal > Cosmos DB > Connection strings
const connectionString = process.env.COSMOS_CONNECTION_STRING || '';
const databaseName = process.env.COSMOS_DATABASE || 'bdo-app';

// Lazy-initialized singleton
let _client: MongoClient | null = null;
let _db: Db | null = null;
let _connectPromise: Promise<MongoClient> | null = null;

async function getClient(): Promise<MongoClient> {
  if (_client) return _client;

  if (!_connectPromise) {
    if (!connectionString) {
      throw new Error(
        'Cosmos DB not configured. Set COSMOS_CONNECTION_STRING environment variable.'
      );
    }
    _connectPromise = new MongoClient(connectionString, {
      retryWrites: false,
      // Cosmos DB MongoDB API settings
      tlsAllowInvalidCertificates: false,
    }).connect().then(client => {
      _client = client;
      return client;
    }).catch(err => {
      _connectPromise = null;
      throw err;
    });
  }

  return _connectPromise;
}

export async function getDatabase(): Promise<Db> {
  if (!_db) {
    const client = await getClient();
    _db = client.db(databaseName);
  }
  return _db;
}

export async function getCollection<T extends Record<string, any> = any>(name: string): Promise<Collection<T>> {
  await ensureIndexes(name);
  const db = await getDatabase();
  return db.collection<T>(name);
}

// Ensure indexes exist for sort/query fields (runs once per collection)
const _indexedCollections = new Set<string>();
async function ensureIndexes(collectionName: string): Promise<void> {
  if (_indexedCollections.has(collectionName)) return;
  _indexedCollections.add(collectionName);

  const db = await getDatabase();
  const col = db.collection(collectionName);

  try {
    // Create indexes needed for our queries — Cosmos DB requires them for sort operations
    if (collectionName === 'projects') {
      await col.createIndex({ updatedAt: -1 }).catch(() => {});
      await col.createIndex({ bdoUserId: 1, updatedAt: -1 }).catch(() => {});
      await col.createIndex({ stage: 1, updatedAt: -1 }).catch(() => {});
    } else if (collectionName === 'notes' || collectionName === 'borrowerUploads') {
      await col.createIndex({ projectId: 1, createdAt: -1 }).catch(() => {});
    } else if (collectionName === 'generatedForms') {
      await col.createIndex({ projectId: 1, generatedAt: -1 }).catch(() => {});
    } else if (collectionName === 'portalTokens') {
      await col.createIndex({ projectId: 1, createdAt: -1 }).catch(() => {});
    } else if (collectionName === 'financialSpreads') {
      await col.createIndex({ projectId: 1, uploadedAt: -1 }).catch(() => {});
    } else if (collectionName === 'auditLogs') {
      await col.createIndex({ projectId: 1, timestamp: -1 }).catch(() => {});
      await col.createIndex({ userId: 1, timestamp: -1 }).catch(() => {});
      await col.createIndex({ action: 1, timestamp: -1 }).catch(() => {});
      await col.createIndex({ category: 1, timestamp: -1 }).catch(() => {});
      await col.createIndex({ timestamp: -1 }).catch(() => {});
    }
  } catch (e) {
    // Index creation may fail if it already exists — that's fine
    console.warn(`Index creation for ${collectionName}:`, e);
  }
}

// Collection names
export const COLLECTIONS = {
  PROJECTS: 'projects',
  LOAN_APPLICATIONS: 'loanApplications',
  NOTES: 'notes',
  GENERATED_FORMS: 'generatedForms',
  BORROWER_UPLOADS: 'borrowerUploads',
  PORTAL_TOKENS: 'portalTokens',
  PDF_TEMPLATES: 'pdfTemplates',
  PDF_IMPORT_SESSIONS: 'pdfImportSessions',
  SOURCES_USES: 'sourcesUses',
  EXTRACTION_RECORDS: 'extractionRecords',
  FINANCIAL_SPREADS: 'financialSpreads',
  ADMIN_SETTINGS: 'adminSettings',
  AUDIT_LOGS: 'auditLogs',
} as const;

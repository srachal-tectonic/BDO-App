import { getCollection, COLLECTIONS } from '@/lib/cosmosdb';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AuditAction =
  | 'user_login' | 'user_logout' | 'login_failed'
  | 'file_uploaded' | 'file_downloaded' | 'file_deleted'
  | 'project_created' | 'project_updated' | 'project_deleted' | 'project_restored'
  | 'status_changed'
  | 'loan_application_updated'
  | 'applicant_added' | 'applicant_removed'
  | 'pdf_data_imported' | 'borrower_upload_applied'
  | 'spread_uploaded' | 'spread_activated' | 'spread_deactivated' | 'spread_deleted'
  | 'note_created'
  | 'portal_token_created' | 'portal_token_revoked'
  | 'broker_token_created' | 'broker_token_revoked' | 'broker_upload'
  | 'admin_settings_updated'
  | 'questionnaire_rule_created' | 'questionnaire_rule_updated' | 'questionnaire_rule_deleted'
  | 'pdf_template_created' | 'pdf_template_updated' | 'pdf_template_deleted'
  | 'borrower_portal_accessed'
  | 'sensitive_data_accessed' | 'security_event';

export type AuditCategory =
  | 'auth' | 'project' | 'loan_application' | 'file'
  | 'financial' | 'admin' | 'portal' | 'note';

export interface FieldChange {
  field: string;       // dot-path e.g. "businessApplicant.legalName"
  label: string;       // human-readable e.g. "Business Legal Name"
  oldValue: unknown;
  newValue: unknown;
}

export interface AuditEvent {
  action: AuditAction;
  category: AuditCategory;
  userId?: string;
  userEmail?: string;
  userName?: string;
  projectId?: string;
  resourceType?: string;
  resourceId?: string;
  summary: string;
  changes?: FieldChange[];
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogEntry extends AuditEvent {
  id: string;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getClientIp(headers: Headers): string | undefined {
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp;
  const cfIp = headers.get('cf-connecting-ip');
  if (cfIp) return cfIp;
  return undefined;
}

function generateId(): string {
  return `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Mask sensitive values so they appear as e.g. "***1234" in audit logs.
 */
export function maskSensitive(value: unknown, type: 'ssn' | 'token' = 'ssn'): string {
  if (value == null || typeof value !== 'string') return '***';
  if (type === 'ssn' && value.length >= 4) {
    return `***${value.slice(-4)}`;
  }
  if (type === 'token' && value.length >= 8) {
    return `${value.slice(0, 8)}...`;
  }
  return '***';
}

// ---------------------------------------------------------------------------
// Core logging function — writes to Cosmos DB (fire-and-forget)
// ---------------------------------------------------------------------------

export async function logAuditEvent(event: AuditEvent): Promise<void> {
  const entry: AuditLogEntry = {
    ...event,
    id: generateId(),
    timestamp: new Date().toISOString(),
  };

  // Always log to console for dev visibility
  console.log('[Audit]', entry.action, entry.category, entry.resourceId ?? entry.projectId ?? '', entry.summary);

  try {
    const col = await getCollection(COLLECTIONS.AUDIT_LOGS);
    await col.insertOne({ ...entry, _id: entry.id } as any);
  } catch (err) {
    // Never let audit logging break the calling operation
    console.error('[Audit] Failed to persist audit event:', err instanceof Error ? err.message : err);
  }
}

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------

export async function logFileUpload(
  userId: string | undefined,
  userEmail: string | undefined,
  projectId: string,
  fileName: string,
  fileSize: number,
  success: boolean,
  ipAddress?: string,
  userAgent?: string,
  errorMessage?: string,
): Promise<void> {
  await logAuditEvent({
    action: 'file_uploaded',
    category: 'file',
    userId,
    userEmail,
    projectId,
    resourceType: 'file',
    resourceId: projectId,
    summary: success ? `Uploaded file "${fileName}" (${formatFileSize(fileSize)})` : `Failed to upload "${fileName}"`,
    metadata: { fileName, fileSize, success, errorMessage },
    ipAddress,
    userAgent,
  });
}

export async function logBrokerUpload(
  brokerToken: string,
  projectId: string,
  fileName: string,
  fileSize: number,
  success: boolean,
  ipAddress?: string,
  userAgent?: string,
  errorMessage?: string,
): Promise<void> {
  await logAuditEvent({
    action: 'broker_upload',
    category: 'file',
    projectId,
    resourceType: 'file',
    resourceId: projectId,
    summary: success ? `Broker uploaded "${fileName}" (${formatFileSize(fileSize)})` : `Broker failed to upload "${fileName}"`,
    metadata: { tokenPrefix: maskSensitive(brokerToken, 'token'), fileName, fileSize, success, errorMessage },
    ipAddress,
    userAgent,
  });
}

export async function logBrokerTokenCreated(
  userId: string,
  userEmail: string,
  projectId: string,
  tokenId: string,
  expiresAt: Date,
  ipAddress?: string,
): Promise<void> {
  await logAuditEvent({
    action: 'broker_token_created',
    category: 'portal',
    userId,
    userEmail,
    projectId,
    resourceType: 'broker_token',
    resourceId: tokenId,
    summary: `Created broker token expiring ${expiresAt.toISOString()}`,
    metadata: { expiresAt: expiresAt.toISOString() },
    ipAddress,
  });
}

export async function logBrokerTokenRevoked(
  userId: string,
  userEmail: string,
  tokenId: string,
  ipAddress?: string,
): Promise<void> {
  await logAuditEvent({
    action: 'broker_token_revoked',
    category: 'portal',
    userId,
    userEmail,
    resourceType: 'broker_token',
    resourceId: tokenId,
    summary: `Revoked broker token`,
    ipAddress,
  });
}

export async function logQuestionnaireRuleChange(
  action: 'questionnaire_rule_created' | 'questionnaire_rule_updated' | 'questionnaire_rule_deleted',
  userId: string,
  userEmail: string,
  ruleId: string,
  questionnaireId: string,
  ipAddress?: string,
): Promise<void> {
  const verb = action.replace('questionnaire_rule_', '');
  await logAuditEvent({
    action,
    category: 'admin',
    userId,
    userEmail,
    resourceType: 'questionnaire_rule',
    resourceId: ruleId,
    summary: `${verb.charAt(0).toUpperCase() + verb.slice(1)} questionnaire rule`,
    metadata: { questionnaireId },
    ipAddress,
  });
}

export async function logSecurityEvent(
  eventType: string,
  description: string,
  ipAddress?: string,
  userAgent?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await logAuditEvent({
    action: 'security_event',
    category: 'auth',
    resourceType: 'system',
    resourceId: 'security',
    summary: `${eventType}: ${description}`,
    metadata: { eventType, ...metadata },
    ipAddress,
    userAgent,
  });
}

export async function logSensitiveDataAccess(
  userId: string,
  userEmail: string,
  dataType: 'ssn' | 'financial' | 'tax_return' | 'credit_score',
  resourceId: string,
  ipAddress?: string,
): Promise<void> {
  await logAuditEvent({
    action: 'sensitive_data_accessed',
    category: 'loan_application',
    userId,
    userEmail,
    resourceType: 'loan_application',
    resourceId,
    summary: `Accessed sensitive data: ${dataType}`,
    metadata: { dataType },
    ipAddress,
  });
}

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

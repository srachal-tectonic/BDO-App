// TODO: Implement with Azure logging (Application Insights, Azure Monitor, or Cosmos DB)

export type AuditAction =
  | 'user_login' | 'user_logout' | 'file_upload' | 'file_download' | 'file_delete'
  | 'loan_application_created' | 'loan_application_updated' | 'loan_application_submitted'
  | 'questionnaire_rule_created' | 'questionnaire_rule_updated' | 'questionnaire_rule_deleted'
  | 'broker_token_created' | 'broker_token_revoked' | 'broker_upload'
  | 'sensitive_data_accessed' | 'admin_action' | 'permission_change' | 'api_error' | 'security_event';

export type ResourceType =
  | 'user' | 'project' | 'file' | 'loan_application' | 'questionnaire_rule'
  | 'questionnaire_response' | 'broker_token' | 'api_endpoint' | 'system';

export interface AuditEvent {
  action: AuditAction;
  userId?: string;
  userEmail?: string;
  resourceType: ResourceType;
  resourceId: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  success: boolean;
  errorMessage?: string;
}

export function getClientIp(headers: Headers): string | undefined {
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp;
  const cfIp = headers.get('cf-connecting-ip');
  if (cfIp) return cfIp;
  return undefined;
}

export async function logAuditEvent(event: AuditEvent): Promise<void> {
  // TODO: Implement with Azure Application Insights or Cosmos DB
  console.log('[Audit]', event.action, event.resourceType, event.resourceId);
}

export async function logFileUpload(userId: string | undefined, userEmail: string | undefined, projectId: string, fileName: string, fileSize: number, success: boolean, ipAddress?: string, userAgent?: string, errorMessage?: string): Promise<void> {
  await logAuditEvent({ action: 'file_upload', userId, userEmail, resourceType: 'file', resourceId: projectId, ipAddress, userAgent, metadata: { fileName, fileSize }, success, errorMessage });
}

export async function logBrokerUpload(brokerToken: string, projectId: string, fileName: string, fileSize: number, success: boolean, ipAddress?: string, userAgent?: string, errorMessage?: string): Promise<void> {
  await logAuditEvent({ action: 'broker_upload', resourceType: 'file', resourceId: projectId, ipAddress, userAgent, metadata: { tokenPrefix: brokerToken.substring(0, 8), fileName, fileSize }, success, errorMessage });
}

export async function logBrokerTokenCreated(userId: string, userEmail: string, projectId: string, tokenId: string, expiresAt: Date, ipAddress?: string): Promise<void> {
  await logAuditEvent({ action: 'broker_token_created', userId, userEmail, resourceType: 'broker_token', resourceId: tokenId, ipAddress, metadata: { projectId, expiresAt: expiresAt.toISOString() }, success: true });
}

export async function logBrokerTokenRevoked(userId: string, userEmail: string, tokenId: string, ipAddress?: string): Promise<void> {
  await logAuditEvent({ action: 'broker_token_revoked', userId, userEmail, resourceType: 'broker_token', resourceId: tokenId, ipAddress, success: true });
}

export async function logQuestionnaireRuleChange(action: 'questionnaire_rule_created' | 'questionnaire_rule_updated' | 'questionnaire_rule_deleted', userId: string, userEmail: string, ruleId: string, questionnaireId: string, ipAddress?: string): Promise<void> {
  await logAuditEvent({ action, userId, userEmail, resourceType: 'questionnaire_rule', resourceId: ruleId, ipAddress, metadata: { questionnaireId }, success: true });
}

export async function logSecurityEvent(eventType: string, description: string, ipAddress?: string, userAgent?: string, metadata?: Record<string, unknown>): Promise<void> {
  await logAuditEvent({ action: 'security_event', resourceType: 'system', resourceId: 'security', ipAddress, userAgent, metadata: { eventType, description, ...metadata }, success: false });
}

export async function logSensitiveDataAccess(userId: string, userEmail: string, dataType: 'ssn' | 'financial' | 'tax_return' | 'credit_score', resourceId: string, ipAddress?: string): Promise<void> {
  await logAuditEvent({ action: 'sensitive_data_accessed', userId, userEmail, resourceType: 'loan_application', resourceId, ipAddress, metadata: { dataType }, success: true });
}

// TODO: Implement with Azure Cosmos DB operations

import { NextRequest, NextResponse } from 'next/server';
import { BrokerToken, Project } from '@/types';

export interface BrokerAuthResult {
  valid: boolean;
  error?: 'not_found' | 'expired' | 'revoked' | 'invalid_request';
  errorMessage?: string;
  token?: BrokerToken;
  project?: Pick<Project, 'id' | 'projectName' | 'businessName' | 'stage' | 'status' | 'sharepointFolderId'>;
}

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 30;
const RATE_LIMIT_WINDOW = 60 * 1000;

function checkRateLimit(token: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(token);
  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(token, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (limit.count >= RATE_LIMIT) return false;
  limit.count++;
  return true;
}

export async function validateBrokerToken(token: string): Promise<BrokerAuthResult> {
  if (!checkRateLimit(token)) {
    return { valid: false, error: 'invalid_request', errorMessage: 'Too many requests. Please try again later.' };
  }
  // TODO: Implement with Azure Cosmos DB
  throw new Error('validateBrokerToken not implemented. Migrate to Azure Cosmos DB.');
}

export async function incrementBrokerUploadCount(token: string): Promise<void> {
  // TODO: Implement with Azure Cosmos DB
  console.warn('incrementBrokerUploadCount not implemented. Migrate to Azure Cosmos DB.');
}

export function brokerErrorResponse(message: string, status: number = 400): NextResponse {
  return NextResponse.json({ error: message, valid: false }, { status });
}

export async function extractBrokerToken(request: NextRequest): Promise<string | null> {
  try {
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await request.json();
      if (body.token) return body.token;
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const token = formData.get('token');
      if (token && typeof token === 'string') return token;
    }
  } catch { /* ignore */ }
  const headerToken = request.headers.get('X-Broker-Token');
  if (headerToken) return headerToken;
  return null;
}

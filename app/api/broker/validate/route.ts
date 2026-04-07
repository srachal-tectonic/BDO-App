/**
 * Broker Token Validation Endpoint
 * Public endpoint - no auth required
 * Validates broker token and returns project info
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateBrokerToken, brokerErrorResponse } from '@/lib/brokerAuth';
import { checkCsrf } from '@/lib/csrf';

export async function POST(request: NextRequest) {
  // CSRF protection
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  try {
    // Parse request body
    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== 'string') {
      return brokerErrorResponse('Token is required', 400);
    }

    // Validate the token
    const result = await validateBrokerToken(token);

    if (!result.valid) {
      return NextResponse.json(
        {
          valid: false,
          error: result.error,
          message: result.errorMessage,
        },
        { status: result.error === 'not_found' ? 404 : 400 }
      );
    }

    // Return project info (limited fields only)
    return NextResponse.json({
      valid: true,
      project: result.project,
      tokenInfo: {
        expiresAt: result.token?.expiresAt,
        uploadCount: result.token?.uploadCount || 0,
      },
    });
  } catch (error) {
    console.error('Error in broker validate endpoint:', error);
    return brokerErrorResponse('An error occurred validating the token', 500);
  }
}

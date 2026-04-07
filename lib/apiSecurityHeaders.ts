/**
 * API Security Headers Utility
 * Adds security headers to API responses
 */

import { NextResponse } from 'next/server';

/**
 * Security headers for API responses
 */
export const API_SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store, max-age=0',
  'X-Frame-Options': 'DENY',
  'Content-Type': 'application/json',
} as const;

/**
 * Add security headers to an existing NextResponse
 */
export function addSecurityHeaders<T>(response: NextResponse<T>): NextResponse<T> {
  Object.entries(API_SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

/**
 * Create a JSON response with security headers
 */
export function secureJsonResponse<T>(
  data: T,
  options?: { status?: number; headers?: Record<string, string> }
): NextResponse<T> {
  const response = NextResponse.json(data, {
    status: options?.status,
    headers: {
      ...API_SECURITY_HEADERS,
      ...options?.headers,
    },
  });
  return response;
}

/**
 * Create an error response with security headers
 */
export function secureErrorResponse(
  error: string,
  status: number = 500,
  additionalData?: Record<string, unknown>
): NextResponse {
  return NextResponse.json(
    {
      error,
      ...additionalData,
    },
    {
      status,
      headers: API_SECURITY_HEADERS,
    }
  );
}

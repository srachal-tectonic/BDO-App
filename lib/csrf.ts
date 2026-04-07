/**
 * CSRF Protection Utility
 *
 * Provides Origin/Referer header validation for state-changing API endpoints.
 * This is an effective CSRF mitigation for SPA architectures where:
 * - All mutations go through fetch/XHR (which send Origin headers)
 * - The app doesn't need to support form submissions from external sites
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Get allowed origins from environment or use defaults
 */
function getAllowedOrigins(): string[] {
  const origins: string[] = [];

  // Add configured app URL
  if (process.env.NEXT_PUBLIC_APP_URL) {
    origins.push(process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, ''));
  }

  // Add localhost for development
  if (process.env.NODE_ENV === 'development') {
    origins.push('http://localhost:3000');
    origins.push('http://localhost:3001');
    origins.push('http://127.0.0.1:3000');
  }

  // Add any additional allowed origins from env
  if (process.env.CSRF_ALLOWED_ORIGINS) {
    const additional = process.env.CSRF_ALLOWED_ORIGINS.split(',').map(o => o.trim());
    origins.push(...additional);
  }

  return origins;
}

/**
 * Extract origin from a URL string
 */
function extractOrigin(url: string): string | null {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

/**
 * Validates that a request originated from an allowed origin
 *
 * Checks the Origin header first (set by browsers for CORS/fetch requests),
 * then falls back to the Referer header.
 *
 * @returns Object with validation result and details
 */
export function validateCsrf(request: NextRequest): {
  valid: boolean;
  origin: string | null;
  error?: string;
} {
  const allowedOrigins = getAllowedOrigins();

  // Get Origin header (preferred - always sent for POST/PUT/DELETE via fetch)
  const origin = request.headers.get('origin');

  if (origin) {
    if (allowedOrigins.length === 0) {
      // TEMPORARY: CSRF disabled until NEXT_PUBLIC_APP_URL is configured
      // TODO: Set NEXT_PUBLIC_APP_URL environment variable to enable CSRF protection
      // See SECURITY_CHANGES.md for details
      console.warn('[CSRF] No allowed origins configured - CSRF temporarily disabled');
      return { valid: true, origin };
    }

    if (allowedOrigins.includes(origin)) {
      return { valid: true, origin };
    }

    console.warn(`[CSRF] Origin rejected: ${origin}, allowed: ${allowedOrigins.join(', ')}`);
    return { valid: false, origin, error: 'Origin not allowed' };
  }

  // Fall back to Referer header
  const referer = request.headers.get('referer');

  if (referer) {
    const refererOrigin = extractOrigin(referer);

    if (refererOrigin && allowedOrigins.includes(refererOrigin)) {
      return { valid: true, origin: refererOrigin };
    }

    if (refererOrigin) {
      console.warn(`[CSRF] Referer origin rejected: ${refererOrigin}`);
      return { valid: false, origin: refererOrigin, error: 'Referer origin not allowed' };
    }
  }

  // No Origin or Referer header
  // This can happen for:
  // - Same-origin requests in some browsers
  // - Requests from privacy-focused browsers/extensions
  // - Server-to-server requests (which should use API keys instead)
  //
  // TEMPORARY: Allow when CSRF is not configured
  // TODO: Set NEXT_PUBLIC_APP_URL environment variable to enable CSRF protection
  if (allowedOrigins.length === 0) {
    console.warn('[CSRF] No Origin header and no allowed origins configured - CSRF temporarily disabled');
    return { valid: true, origin: null };
  }

  console.warn('[CSRF] No Origin or Referer header present');
  return { valid: false, origin: null, error: 'Missing Origin header' };
}

/**
 * CSRF error response
 */
export function csrfErrorResponse(message?: string): NextResponse {
  return NextResponse.json(
    { error: message || 'CSRF validation failed', code: 'CSRF_ERROR' },
    { status: 403 }
  );
}

/**
 * Middleware-style CSRF check that returns an error response or null
 *
 * Usage in API route:
 * ```
 * const csrfError = checkCsrf(request);
 * if (csrfError) return csrfError;
 * // ... rest of handler
 * ```
 */
export function checkCsrf(request: NextRequest): NextResponse | null {
  const result = validateCsrf(request);

  if (!result.valid) {
    return csrfErrorResponse(result.error);
  }

  return null;
}

/**
 * Check if a request has valid API key authentication
 * Requests with valid API keys don't need CSRF protection
 * (they're not vulnerable to CSRF because the attacker can't know the API key)
 */
export function hasApiKeyAuth(request: NextRequest, expectedKey?: string): boolean {
  const apiKey = request.headers.get('x-api-key');

  if (!apiKey) return false;

  if (expectedKey) {
    return apiKey === expectedKey;
  }

  // Check against environment variable
  const envKey = process.env.SYNC_API_KEY;
  return !!envKey && apiKey === envKey;
}

/**
 * CSRF check that skips validation for API key authenticated requests
 */
export function checkCsrfUnlessApiKey(request: NextRequest, apiKey?: string): NextResponse | null {
  // Skip CSRF for API key authenticated requests
  if (hasApiKeyAuth(request, apiKey)) {
    return null;
  }

  return checkCsrf(request);
}

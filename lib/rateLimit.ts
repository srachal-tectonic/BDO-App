/**
 * Simple In-Memory Rate Limiter
 *
 * Provides basic rate limiting for API routes using a sliding window algorithm.
 * Note: This is an in-memory implementation suitable for single-instance deployments.
 * For multi-instance deployments, consider using Redis-based rate limiting.
 */

import { NextResponse } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  /** Maximum number of requests allowed within the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
}

// In-memory store for rate limit tracking
// Key format: `${identifier}:${endpoint}`
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let cleanupTimer: NodeJS.Timeout | null = null;

function startCleanup() {
  if (cleanupTimer) return;

  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);

  // Don't prevent Node.js from exiting
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }
}

// Start cleanup on module load
startCleanup();

/**
 * Default rate limit configurations for different route types
 */
export const RATE_LIMITS = {
  /** Standard API routes - 60 requests per minute */
  standard: { maxRequests: 60, windowMs: 60 * 1000 },

  /** AI/OpenAI routes - 10 requests per minute (expensive operations) */
  ai: { maxRequests: 10, windowMs: 60 * 1000 },

  /** File upload routes - 30 requests per minute */
  upload: { maxRequests: 30, windowMs: 60 * 1000 },

  /** Authentication routes - 10 requests per minute (prevent brute force) */
  auth: { maxRequests: 10, windowMs: 60 * 1000 },

  /** Debug routes - 5 requests per minute */
  debug: { maxRequests: 5, windowMs: 60 * 1000 },
} as const;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  limit: number;
}

/**
 * Check if a request should be rate limited
 *
 * @param identifier - Unique identifier for the client (e.g., user ID, IP address)
 * @param endpoint - The API endpoint being accessed
 * @param config - Rate limit configuration
 * @returns RateLimitResult indicating if the request is allowed
 */
export function checkRateLimit(
  identifier: string,
  endpoint: string,
  config: RateLimitConfig
): RateLimitResult {
  const key = `${identifier}:${endpoint}`;
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  // If no entry exists or the window has expired, create a new entry
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(key, entry);

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: entry.resetTime,
      limit: config.maxRequests,
    };
  }

  // Increment the count
  entry.count++;
  rateLimitStore.set(key, entry);

  const allowed = entry.count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - entry.count);

  return {
    allowed,
    remaining,
    resetTime: entry.resetTime,
    limit: config.maxRequests,
  };
}

/**
 * Creates a rate limit exceeded response with appropriate headers
 *
 * @param result - The rate limit check result
 * @returns NextResponse with 429 status and rate limit headers
 */
export function rateLimitExceededResponse(result: RateLimitResult): NextResponse {
  const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);

  return NextResponse.json(
    {
      error: 'Too many requests. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter,
    },
    {
      status: 429,
      headers: {
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': result.resetTime.toString(),
        'Retry-After': retryAfter.toString(),
      },
    }
  );
}

/**
 * Adds rate limit headers to a successful response
 *
 * @param response - The original response
 * @param result - The rate limit check result
 * @returns Response with rate limit headers added
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult
): NextResponse {
  response.headers.set('X-RateLimit-Limit', result.limit.toString());
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
  response.headers.set('X-RateLimit-Reset', result.resetTime.toString());
  return response;
}

/**
 * Higher-order function to wrap an API handler with rate limiting
 *
 * @param getIdentifier - Function to extract identifier from request (e.g., user ID)
 * @param endpoint - The endpoint name for tracking
 * @param config - Rate limit configuration
 * @param handler - The actual request handler
 * @returns Wrapped handler with rate limiting
 */
export function withRateLimit<T extends Request>(
  getIdentifier: (request: T) => string | null,
  endpoint: string,
  config: RateLimitConfig,
  handler: (request: T) => Promise<NextResponse>
): (request: T) => Promise<NextResponse> {
  return async (request: T): Promise<NextResponse> => {
    const identifier = getIdentifier(request);

    // If we can't identify the client, allow the request but log a warning
    if (!identifier) {
      console.warn(`[RateLimit] No identifier for ${endpoint}, skipping rate limit`);
      return handler(request);
    }

    const result = checkRateLimit(identifier, endpoint, config);

    if (!result.allowed) {
      return rateLimitExceededResponse(result);
    }

    const response = await handler(request);
    return addRateLimitHeaders(response, result);
  };
}

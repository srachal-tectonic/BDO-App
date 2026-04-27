/**
 * Authenticated Fetch Utility
 *
 * Two auth paths:
 *   - Local development: Bearer "dev-bypass-token" stored in localStorage by the
 *     dev-mode sign-in flow.
 *   - Production: Azure Easy Auth (Entra ID) handles auth at the App Service
 *     edge. The browser already holds Easy Auth's session cookies, which travel
 *     with same-origin /api/* requests automatically — no token attached.
 */

function isDevMode(): boolean {
  return (
    process.env.NEXT_PUBLIC_APP_ENV === 'development' ||
    process.env.NODE_ENV === 'development'
  );
}

/**
 * Gets the current user's auth token.
 * Returns the dev bypass token in development; returns null in production
 * (production relies on Easy Auth cookies, not bearer tokens).
 */
export async function getAuthToken(): Promise<string | null> {
  if (typeof window !== 'undefined') {
    const devToken = localStorage.getItem('dev-auth-token');
    if (devToken) return devToken;
  }
  return null;
}

/**
 * Creates headers with authentication token
 * @param additionalHeaders - Optional additional headers to include
 * @returns Headers object with Authorization header
 */
export async function getAuthHeaders(
  additionalHeaders?: Record<string, string>
): Promise<Record<string, string>> {
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    ...additionalHeaders,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Makes an authenticated fetch request to an API endpoint
 * Automatically adds the auth token to the Authorization header
 *
 * @param url - The URL to fetch
 * @param options - Standard fetch options (method, body, etc.)
 * @returns The fetch Response
 * @throws Error if user is not authenticated
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getAuthToken();

  // In development, a missing token means the user hasn't completed the
  // dev-mode sign-in (no localStorage entry). Treat that as a real auth error.
  // In production, no token is expected — Easy Auth cookies authenticate.
  if (!token && isDevMode()) {
    console.error('[Auth] authenticatedFetch called in dev with no token');
    throw new Error('User not authenticated. Please sign in to continue.');
  }

  // Convert existing headers to a plain object
  let existingHeaders: Record<string, string> = {};
  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => {
        existingHeaders[key] = value;
      });
    } else if (Array.isArray(options.headers)) {
      options.headers.forEach(([key, value]) => {
        existingHeaders[key] = value;
      });
    } else {
      existingHeaders = { ...options.headers } as Record<string, string>;
    }
  }

  const headers: Record<string, string> = { ...existingHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const { headers: _, ...restOptions } = options;

  return fetch(url, {
    ...restOptions,
    // Same-origin cookies (Easy Auth session) travel by default for /api/*,
    // but be explicit so behavior is obvious.
    credentials: restOptions.credentials ?? 'same-origin',
    headers,
  });
}

/**
 * Makes an authenticated JSON POST request
 */
export async function authenticatedPost(
  url: string,
  data: unknown
): Promise<Response> {
  return authenticatedFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
}

/**
 * Makes an authenticated GET request
 */
export async function authenticatedGet(url: string): Promise<Response> {
  return authenticatedFetch(url, {
    method: 'GET',
  });
}

/**
 * Makes an authenticated form data POST request (for file uploads)
 */
export async function authenticatedFormPost(
  url: string,
  formData: FormData
): Promise<Response> {
  return authenticatedFetch(url, {
    method: 'POST',
    body: formData,
  });
}

/**
 * Authenticated Fetch Utility
 * Provides helper functions for making authenticated API calls from the client
 *
 * TODO: Replace with Microsoft Entra ID / MSAL token acquisition
 */

/**
 * Gets the current user's auth token
 * TODO: Implement with MSAL - use acquireTokenSilent() to get access token
 *
 * @returns The ID token string or null if not authenticated
 */
export async function getAuthToken(): Promise<string | null> {
  // Dev bypass: return token from localStorage when in development
  if (typeof window !== 'undefined') {
    const devToken = localStorage.getItem('dev-auth-token');
    if (devToken) return devToken;
  }

  // TODO: Implement with Microsoft Entra ID / MSAL
  // Example: const account = msalInstance.getActiveAccount();
  // const response = await msalInstance.acquireTokenSilent({ scopes: [...], account });
  // return response.accessToken;
  console.warn('[Auth] getAuthToken not implemented. Migrate to Microsoft Entra ID.');
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

  if (!token) {
    console.error('[Auth] authenticatedFetch called but no token available');
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

  // Add Authorization header
  const headers: Record<string, string> = {
    ...existingHeaders,
    'Authorization': `Bearer ${token}`,
  };

  const { headers: _, ...restOptions } = options;

  return fetch(url, {
    ...restOptions,
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

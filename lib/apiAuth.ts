// TODO: Implement with Microsoft Entra ID token verification

import { NextRequest, NextResponse } from 'next/server';

export interface AuthenticatedUser {
  uid: string;
  email: string | undefined;
  emailVerified: boolean;
}

export interface AuthResult {
  authenticated: boolean;
  user?: AuthenticatedUser;
  error?: string;
}

export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  // TODO: Implement with Microsoft Entra ID / Azure AD token verification
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return { authenticated: false, error: 'Missing Authorization header' };
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return { authenticated: false, error: 'Invalid Authorization header format. Expected: Bearer <token>' };
  }

  const token = parts[1];

  // Dev bypass: accept dev token in development
  if (
    (process.env.NEXT_PUBLIC_APP_ENV === 'development' || process.env.NODE_ENV === 'development') &&
    token === 'dev-bypass-token'
  ) {
    return {
      authenticated: true,
      user: {
        uid: 'dev-srachal',
        email: 'srachal@tectonicfinancial.com',
        emailVerified: true,
      },
    };
  }

  // TODO: Verify token with Microsoft Entra ID
  throw new Error('Auth verification not implemented. Migrate to Microsoft Entra ID.');
}

export function unauthorizedResponse(message: string = 'Unauthorized'): NextResponse {
  return NextResponse.json({ error: message, code: 'UNAUTHORIZED' }, { status: 401 });
}

export function withAuth<T extends NextRequest>(
  handler: (request: T, user: AuthenticatedUser) => Promise<NextResponse>
): (request: T) => Promise<NextResponse> {
  return async (request: T): Promise<NextResponse> => {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return unauthorizedResponse(authResult.error);
    }
    return handler(request, authResult.user);
  };
}

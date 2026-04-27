// Server-side authentication for API routes.
// Supports two auth paths:
//   1. Local development: Bearer dev-bypass-token in the Authorization header.
//   2. Production: Azure Easy Auth (Microsoft Entra ID) — App Service forwards
//      x-ms-client-principal* headers after the user signs in at /.auth/login/aad.
//      Easy Auth has already verified the token at the edge before the request
//      reaches Node, so presence of these headers is the source of truth.

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

interface EasyAuthPrincipal {
  claims?: Array<{ typ: string; val: string }>;
  userId?: string;
  userDetails?: string;
  identityProvider?: string;
}

const NAMEID_CLAIM_TYPES = [
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier',
  'http://schemas.microsoft.com/identity/claims/objectidentifier',
  'oid',
  'sub',
];

const EMAIL_CLAIM_TYPES = [
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
  'preferred_username',
  'email',
];

function findClaim(claims: Array<{ typ: string; val: string }>, types: string[]): string | undefined {
  for (const type of types) {
    const claim = claims.find((c) => c.typ === type);
    if (claim?.val) return claim.val;
  }
  return undefined;
}

export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  // === 1. Dev bypass: Bearer dev-bypass-token in development ===
  const authHeader = request.headers.get('Authorization');
  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      const token = parts[1];
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
    }
  }

  // === 2. Production: Azure Easy Auth (Entra ID) injected identity headers ===
  const principalHeader = request.headers.get('x-ms-client-principal');
  const principalId = request.headers.get('x-ms-client-principal-id');
  const principalName = request.headers.get('x-ms-client-principal-name');

  if (principalHeader || principalId) {
    let uid: string | undefined = principalId ?? undefined;
    let email: string | undefined = principalName ?? undefined;

    if (principalHeader) {
      try {
        const decoded = Buffer.from(principalHeader, 'base64').toString('utf-8');
        const principal = JSON.parse(decoded) as EasyAuthPrincipal;
        const claims = principal.claims ?? [];
        uid = uid || findClaim(claims, NAMEID_CLAIM_TYPES) || principal.userId;
        email = email || findClaim(claims, EMAIL_CLAIM_TYPES) || principal.userDetails;
      } catch (err) {
        console.warn('[Auth] Failed to parse x-ms-client-principal header:', err);
      }
    }

    if (uid) {
      return {
        authenticated: true,
        user: {
          uid,
          email,
          // Easy Auth only injects these headers after a successful Entra ID
          // sign-in, so the email is considered verified by the IdP.
          emailVerified: true,
        },
      };
    }
  }

  return {
    authenticated: false,
    error: 'Not authenticated. Sign in via Azure Easy Auth or provide a dev bearer token.',
  };
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

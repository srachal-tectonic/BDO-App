// Auth0 v4 uses middleware for auth routes instead of route handlers.
// See: https://github.com/auth0/nextjs-auth0/blob/main/V4_MIGRATION_GUIDE.md
//
// The auth routes are now automatically mounted via middleware at:
// - /auth/login
// - /auth/logout
// - /auth/callback
// - /auth/profile
//
// This file is kept for backwards compatibility but the actual auth
// handling is done via middleware.ts at the project root.

export async function GET() {
  return new Response('Auth0 v4 uses middleware. See /auth/* routes.', { status: 200 });
}

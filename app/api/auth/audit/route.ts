import { NextRequest, NextResponse } from 'next/server';
import { logAuditEvent, getClientIp } from '@/lib/auditLog';

/**
 * POST /api/auth/audit
 * Logs authentication events (login, logout, login failures).
 * Called from the client-side auth context after auth state changes.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, userId, userEmail, userName, error: errorMsg } = body;

    if (!event) {
      return NextResponse.json({ error: 'Event type required' }, { status: 400 });
    }

    const ipAddress = getClientIp(request.headers);
    const userAgent = request.headers.get('user-agent') || undefined;

    switch (event) {
      case 'login':
        await logAuditEvent({
          action: 'user_login',
          category: 'auth',
          userId,
          userEmail,
          userName,
          resourceType: 'user',
          resourceId: userId || 'unknown',
          summary: `User ${userEmail || userName || 'unknown'} logged in`,
          ipAddress,
          userAgent,
        });
        break;

      case 'logout':
        await logAuditEvent({
          action: 'user_logout',
          category: 'auth',
          userId,
          userEmail,
          userName,
          resourceType: 'user',
          resourceId: userId || 'unknown',
          summary: `User ${userEmail || userName || 'unknown'} logged out`,
          ipAddress,
          userAgent,
        });
        break;

      case 'login_failed':
        await logAuditEvent({
          action: 'login_failed',
          category: 'auth',
          userEmail,
          resourceType: 'user',
          resourceId: userEmail || 'unknown',
          summary: `Login failed for ${userEmail || 'unknown'}: ${errorMsg || 'unknown error'}`,
          metadata: { error: errorMsg },
          ipAddress,
          userAgent,
        });
        break;

      case 'portal_access':
        await logAuditEvent({
          action: 'borrower_portal_accessed',
          category: 'portal',
          projectId: body.projectId,
          resourceType: 'portal_token',
          resourceId: body.projectId || 'unknown',
          summary: `Borrower portal accessed for project ${body.projectId || 'unknown'}`,
          metadata: { tokenPrefix: body.tokenPrefix },
          ipAddress,
          userAgent,
        });
        break;

      default:
        return NextResponse.json({ error: `Unknown event type: ${event}` }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Auth Audit] Error:', error);
    return NextResponse.json({ error: 'Failed to log auth event' }, { status: 500 });
  }
}

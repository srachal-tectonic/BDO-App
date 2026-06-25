import { NextRequest, NextResponse } from 'next/server';
import {
  getSharePointAccessToken,
  getSharePointSiteUrl,
  getSharePointSiteId,
  parseSharePointSiteUrl,
} from '@/lib/sharepoint';
import { verifyAuth, unauthorizedResponse } from '@/lib/apiAuth';
import { checkRateLimit, rateLimitExceededResponse, addRateLimitHeaders, RATE_LIMITS } from '@/lib/rateLimit';
import { logAuditEvent, getClientIp } from '@/lib/auditLog';
import { checkCsrf } from '@/lib/csrf';

/**
 * SharePoint Item API Route
 * DELETE /api/sharepoint/item?projectId={projectId}&itemId={itemId}
 *
 * Deletes a single file (or folder) from a project's SharePoint document
 * library by its drive-item ID. Backs the "Additional Materials" remove
 * action on the PreQual / PQ Memo Business Questionnaire tab.
 * PROTECTED: Requires authentication.
 * RATE LIMITED: standard per-user limit.
 */
export async function DELETE(request: NextRequest) {
  // CSRF protection (Origin/Referer validation)
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  // Verify authentication
  const authResult = await verifyAuth(request);
  if (!authResult.authenticated || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  // Check rate limit
  const rateLimitResult = checkRateLimit(
    authResult.user.uid,
    'sharepoint/item',
    RATE_LIMITS.standard
  );
  if (!rateLimitResult.allowed) {
    return rateLimitExceededResponse(rateLimitResult);
  }

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const itemId = searchParams.get('itemId');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }
    if (!itemId) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    // Get SharePoint access token + site/drive context
    const token = await getSharePointAccessToken();
    const siteUrl = await getSharePointSiteUrl();
    const { hostname, sitePath } = parseSharePointSiteUrl(siteUrl);
    const siteId = await getSharePointSiteId(token, hostname, sitePath);

    const driveResponse = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/drive`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
    );
    if (!driveResponse.ok) {
      throw new Error(`Failed to get drive: ${await driveResponse.text()}`);
    }
    const driveData = await driveResponse.json();
    const driveId = driveData.id;

    // Delete the item via Microsoft Graph.
    const deleteResponse = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/items/${itemId}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
    );

    // 204 No Content is success; 404 means it's already gone — treat as success
    // so the UI converges (the file is no longer there either way).
    if (!deleteResponse.ok && deleteResponse.status !== 404) {
      const errorText = await deleteResponse.text();
      console.error('[SharePoint Item] Delete failed:', deleteResponse.status, errorText);
      throw new Error(`Failed to delete item (${deleteResponse.status}): ${errorText}`);
    }

    // Audit log: file deletion (fire-and-forget within the handler).
    await logAuditEvent({
      action: 'file_deleted',
      category: 'file',
      userId: authResult.user.uid,
      userEmail: authResult.user.email || undefined,
      projectId,
      resourceType: 'file',
      resourceId: projectId,
      summary: `Deleted SharePoint item ${itemId}`,
      metadata: { itemId, alreadyGone: deleteResponse.status === 404 },
      ipAddress: getClientIp(request.headers),
      userAgent: request.headers.get('user-agent') || undefined,
    });

    const response = NextResponse.json({ success: true });
    return addRateLimitHeaders(response, rateLimitResult);
  } catch (error) {
    console.error('[SharePoint Item] Error deleting item:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete item from SharePoint',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import {
  getSharePointAccessToken,
  getSharePointSiteUrl,
  getSharePointSiteId,
  parseSharePointSiteUrl,
} from '@/lib/sharepoint';
import { verifyAuth, unauthorizedResponse } from '@/lib/apiAuth';
import { checkRateLimit, rateLimitExceededResponse, addRateLimitHeaders, RATE_LIMITS } from '@/lib/rateLimit';

/**
 * SharePoint Debug API Route
 * GET /api/sharepoint/debug
 *
 * This route helps diagnose SharePoint connection and folder location issues.
 * PROTECTED: Requires authentication.
 * RATE LIMITED: 5 requests per minute per user.
 * DISABLED in production.
 */

export async function GET(request: NextRequest) {
  // Disable in production for security
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Debug endpoint is disabled in production' },
      { status: 404 }
    );
  }

  // Verify authentication
  const authResult = await verifyAuth(request);
  if (!authResult.authenticated || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  // Check rate limit
  const rateLimitResult = checkRateLimit(
    authResult.user.uid,
    'sharepoint/debug',
    RATE_LIMITS.debug
  );

  if (!rateLimitResult.allowed) {
    return rateLimitExceededResponse(rateLimitResult);
  }

  try {
    const siteUrl = await getSharePointSiteUrl();
    const parentFolderPath = process.env.SHAREPOINT_PARENT_FOLDER_PATH || '(root)';

    const { hostname, sitePath } = parseSharePointSiteUrl(siteUrl);

    // Get access token
    const token = await getSharePointAccessToken();

    // Get site ID
    const siteId = await getSharePointSiteId(token, hostname, sitePath);

    // Get site details
    const siteResponse = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${siteId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      }
    );

    const siteData = await siteResponse.json();

    // Get drive details
    const driveResponse = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/drive`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      }
    );

    const driveData = await driveResponse.json();

    // Get all drives for comparison
    const drivesResponse = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/drives`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      }
    );

    const drivesData = await drivesResponse.json();

    // Get root folder contents
    const rootResponse = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveData.id}/root/children`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      }
    );

    const rootContents = await rootResponse.json();

    const response = NextResponse.json({
      success: true,
      configuration: {
        siteUrl,
        hostname,
        sitePath,
        parentFolderPath,
      },
      site: {
        id: siteData.id,
        name: siteData.name,
        displayName: siteData.displayName,
        webUrl: siteData.webUrl,
      },
      defaultDrive: {
        id: driveData.id,
        name: driveData.name,
        driveType: driveData.driveType,
        webUrl: driveData.webUrl,
        description: driveData.description,
      },
      allDrives: drivesData.value.map((d: any) => ({
        id: d.id,
        name: d.name,
        driveType: d.driveType,
        webUrl: d.webUrl,
      })),
      rootFolders: rootContents.value.map((item: any) => ({
        name: item.name,
        type: item.folder ? 'folder' : 'file',
        webUrl: item.webUrl,
      })),
      message: 'This debug info shows where folders will be created. Check the defaultDrive.webUrl to navigate to the document library.',
    });

    return addRateLimitHeaders(response, rateLimitResult);
  } catch (error) {
    console.error('SharePoint debug error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get SharePoint debug info',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

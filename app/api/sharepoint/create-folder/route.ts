import { NextRequest, NextResponse } from 'next/server';
import {
  getSharePointAccessToken,
  createSharePointFolder,
} from '@/lib/sharepoint';
import { verifyAuth, unauthorizedResponse } from '@/lib/apiAuth';
import { checkRateLimit, rateLimitExceededResponse, addRateLimitHeaders, RATE_LIMITS } from '@/lib/rateLimit';
import { checkCsrf } from '@/lib/csrf';

/**
 * SharePoint Create Folder API Route
 * POST /api/sharepoint/create-folder
 *
 * Creates a new folder in SharePoint and returns the folder ID.
 * PROTECTED: Requires authentication.
 * RATE LIMITED: 60 requests per minute per user.
 */

interface CreateFolderRequest {
  projectName: string;
}

export async function POST(request: NextRequest) {
  // CSRF protection
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
    'sharepoint/create-folder',
    RATE_LIMITS.standard
  );

  if (!rateLimitResult.allowed) {
    return rateLimitExceededResponse(rateLimitResult);
  }

  try {
    const body: CreateFolderRequest = await request.json();
    const { projectName } = body;

    if (!projectName) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }

    // Get SharePoint access token
    const token = await getSharePointAccessToken();

    // Create the folder with subfolders (sanitization is handled in the shared function)
    const folderInfo = await createSharePointFolder(token, projectName);

    const response = NextResponse.json({
      success: true,
      folderId: folderInfo.folderId,
      folderUrl: folderInfo.webUrl,
      subfolders: folderInfo.subfolders,
      message: 'Folder created successfully',
    });

    return addRateLimitHeaders(response, rateLimitResult);
  } catch (error) {
    console.error('Error creating SharePoint folder:', error);
    return NextResponse.json(
      {
        error: 'Failed to create folder in SharePoint',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

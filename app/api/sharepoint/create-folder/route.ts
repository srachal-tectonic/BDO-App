import { NextRequest, NextResponse } from 'next/server';
import {
  getSharePointAccessToken,
  createSharePointFolder,
} from '@/lib/sharepoint';
import { verifyAuth, unauthorizedResponse } from '@/lib/apiAuth';
import { checkRateLimit, rateLimitExceededResponse, addRateLimitHeaders, RATE_LIMITS } from '@/lib/rateLimit';
import { checkCsrf } from '@/lib/csrf';
import { getCollection, COLLECTIONS } from '@/lib/cosmosdb';

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
  // Optional: when supplied, the server resolves the BDO from
  // `projectOverview.bdo1` on the loan application (not the logged-in BDO)
  // and nests the project folder under that BDO's name.
  projectId?: string;
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
    const { projectName, projectId } = body;

    if (!projectName) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }

    // Resolve the BDO name from the loan application's BDO 1 field so the
    // project folder is nested under the BDO selected on the project — not
    // the currently logged-in BDO.
    let bdoName: string | undefined;
    if (projectId) {
      const loanAppCol = await getCollection(COLLECTIONS.LOAN_APPLICATIONS);
      const loanAppDoc = await loanAppCol.findOne({ projectId });
      bdoName = loanAppDoc?.projectOverview?.bdo1;
    }

    // Get SharePoint access token
    const token = await getSharePointAccessToken();

    // Create the folder with subfolders (sanitization is handled in the shared function)
    const folderInfo = await createSharePointFolder(token, projectName, bdoName);

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

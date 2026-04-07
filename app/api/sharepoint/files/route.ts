import { getProjectAdmin, updateProjectAdmin } from '@/services/firestoreAdmin';
import {
  getSharePointAccessToken,
  getSharePointSiteUrl,
  getSharePointSiteId,
  parseSharePointSiteUrl,
  createSharePointFolder,
} from '@/lib/sharepoint';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, unauthorizedResponse } from '@/lib/apiAuth';
import { checkRateLimit, rateLimitExceededResponse, addRateLimitHeaders, RATE_LIMITS } from '@/lib/rateLimit';

/**
 * SharePoint Files API Route
 * GET /api/sharepoint/files?projectId={projectId}
 *
 * This route handles fetching files and folders from SharePoint for a specific project.
 * It retrieves the SharePoint folder ID from the database and uses it to fetch files.
 * If no folder ID exists, it automatically creates a new SharePoint folder.
 * PROTECTED: Requires authentication.
 * RATE LIMITED: 60 requests per minute per user.
 */

// SharePoint file/folder interface
interface SharePointItem {
  id: string;
  name: string;
  modifiedDate: string;
  type: 'file' | 'folder';
  fileType?: string;
  path: string;
  children?: SharePointItem[];
}

/**
 * Fetch files and folders from SharePoint for a specific project using folder ID
 */
async function fetchSharePointFiles(
  token: string,
  folderId: string
): Promise<SharePointItem[]> {
  const siteUrl = await getSharePointSiteUrl();
  const { hostname, sitePath } = parseSharePointSiteUrl(siteUrl);

  try {
    // Get the site ID
    console.log('[SharePoint Files] Getting site ID for:', hostname, sitePath);
    let siteId: string;
    try {
      siteId = await getSharePointSiteId(token, hostname, sitePath);
      console.log('[SharePoint Files] Got site ID:', siteId);
    } catch (siteError) {
      console.error('[SharePoint Files] Failed to get site ID:', siteError);
      throw new Error(`Failed to get SharePoint site. This may be a permissions issue. Details: ${siteError instanceof Error ? siteError.message : 'Unknown error'}`);
    }

    // Get the drive (document library) - using default document library
    console.log('[SharePoint Files] Getting drive for site:', siteId);
    const driveResponse = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/drive`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      }
    );

    if (!driveResponse.ok) {
      const errorText = await driveResponse.text();
      console.error('[SharePoint Files] Failed to get drive:', driveResponse.status, errorText);
      throw new Error(`Failed to get drive (${driveResponse.status}): ${errorText}`);
    }

    const driveData = await driveResponse.json();
    const driveId = driveData.id;
    console.log('[SharePoint Files] Got drive ID:', driveId);

    // Get the folder contents using folder ID
    console.log('[SharePoint Files] Fetching folder contents for folder ID:', folderId);
    const itemsResponse = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/items/${folderId}/children`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      }
    );

    if (!itemsResponse.ok) {
      // If the folder doesn't exist, return empty array
      if (itemsResponse.status === 404) {
        console.log('[SharePoint Files] Folder not found (404), returning empty array');
        return [];
      }
      const errorText = await itemsResponse.text();
      console.error('[SharePoint Files] Failed to fetch items:', itemsResponse.status, errorText);
      throw new Error(`Failed to fetch items (${itemsResponse.status}): ${errorText}`);
    }

    const itemsData = await itemsResponse.json();

    // Get the folder path for display purposes
    const folderResponse = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/items/${folderId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      }
    );

    let basePath = '';
    if (folderResponse.ok) {
      const folderData = await folderResponse.json();
      basePath = folderData.parentReference?.path
        ? `${folderData.parentReference.path}/${folderData.name}`.replace('/drive/root:', '')
        : `/${folderData.name}`;
    }

    return await transformSharePointItems(itemsData.value, token, siteId, driveId, basePath);
  } catch (error) {
    console.error('Error fetching SharePoint files:', error);
    throw error;
  }
}

/**
 * Transform SharePoint API response to our format
 */
async function transformSharePointItems(
  items: any[],
  token: string,
  siteId: string,
  driveId: string,
  basePath: string
): Promise<SharePointItem[]> {
  const transformed: SharePointItem[] = [];

  for (const item of items) {
    const isFolder = !!item.folder;
    const itemPath = `${basePath}/${item.name}`;

    const transformedItem: SharePointItem = {
      id: item.id,
      name: item.name,
      modifiedDate: item.lastModifiedDateTime,
      type: isFolder ? 'folder' : 'file',
      path: itemPath,
    };

    // Add file type for files
    if (!isFolder && item.name.includes('.')) {
      const extension = item.name.split('.').pop()?.toLowerCase();
      transformedItem.fileType = extension;
    }

    // Recursively fetch children for folders
    if (isFolder) {
      try {
        const childrenResponse = await fetch(
          `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/items/${item.id}/children`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          }
        );

        if (childrenResponse.ok) {
          const childrenData = await childrenResponse.json();
          transformedItem.children = await transformSharePointItems(
            childrenData.value,
            token,
            siteId,
            driveId,
            itemPath
          );
        }
      } catch (error) {
        console.error(`Error fetching children for folder ${item.name}:`, error);
        transformedItem.children = [];
      }
    }

    transformed.push(transformedItem);
  }

  return transformed;
}

export async function GET(request: NextRequest) {
  // Verify authentication
  const authResult = await verifyAuth(request);
  if (!authResult.authenticated || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  // Check rate limit
  const rateLimitResult = checkRateLimit(
    authResult.user.uid,
    'sharepoint/files',
    RATE_LIMITS.standard
  );

  if (!rateLimitResult.allowed) {
    return rateLimitExceededResponse(rateLimitResult);
  }

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Get project from database to retrieve SharePoint folder ID
    const project = await getProjectAdmin(projectId);

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Get SharePoint access token
    const token = await getSharePointAccessToken();

    let folderId = project.sharepointFolderId;
    let folderUrl = project.sharepointFolderUrl;

    // If no SharePoint folder ID exists, create one automatically
    if (!folderId) {
      console.log(`No SharePoint folder found for project ${projectId}. Creating one...`);

      try {
        // Create SharePoint folder with subfolders using the project name (sanitization handled in shared function)
        const folderInfo = await createSharePointFolder(token, project.projectName);
        folderId = folderInfo.folderId;
        folderUrl = folderInfo.webUrl;

        // Update the project in database with the new folder ID, URL, and subfolder IDs
        const updateData: Record<string, string | undefined> = {
          sharepointFolderId: folderId,
          sharepointFolderUrl: folderUrl,
        };

        // Add subfolder IDs if they were created successfully
        if (folderInfo.subfolders) {
          if (folderInfo.subfolders.businessApplicantFolderId) {
            updateData.sharepointBusinessApplicantFolderId = folderInfo.subfolders.businessApplicantFolderId;
          }
          if (folderInfo.subfolders.otherBusinessesFolderId) {
            updateData.sharepointOtherBusinessesFolderId = folderInfo.subfolders.otherBusinessesFolderId;
          }
          if (folderInfo.subfolders.projectFilesFolderId) {
            updateData.sharepointProjectFilesFolderId = folderInfo.subfolders.projectFilesFolderId;
          }
        }

        await updateProjectAdmin(projectId, updateData);

        console.log(`SharePoint folder created and saved for project ${projectId}:`, {
          folderId,
          folderUrl,
          subfolders: folderInfo.subfolders,
        });
      } catch (folderError) {
        console.error('Failed to create SharePoint folder:', folderError);
        return NextResponse.json(
          {
            error: 'Failed to create SharePoint folder',
            message: folderError instanceof Error ? folderError.message : 'Unknown error',
          },
          { status: 500 }
        );
      }
    }

    // Fetch files from SharePoint using the folder ID
    const items = await fetchSharePointFiles(token, folderId);

    const response = NextResponse.json({
      success: true,
      items,
    });

    return addRateLimitHeaders(response, rateLimitResult);
  } catch (error) {
    console.error('Error fetching SharePoint files:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch files from SharePoint',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

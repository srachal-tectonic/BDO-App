/**
 * SharePoint Server-Side Utilities
 * Handles SharePoint authentication using environment variables
 * TODO: Consider using Azure Key Vault for secrets management
 */

import { getProjectAdmin, updateProjectAdmin } from '@/services/firestoreAdmin';
import { getCollection, COLLECTIONS } from '@/lib/cosmosdb';

interface SharePointCredentials {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  siteUrl: string;
}

/**
 * Get SharePoint credentials from environment variables
 */
async function getSharePointCredentials(): Promise<SharePointCredentials> {
  const tenantId = process.env.SHAREPOINT_TENANT_ID;
  const clientId = process.env.SHAREPOINT_CLIENT_ID;
  const clientSecret = process.env.SHAREPOINT_CLIENT_SECRET;
  const siteUrl = process.env.SHAREPOINT_SITE_URL;

  if (!tenantId || !clientId || !clientSecret || !siteUrl) {
    throw new Error('SharePoint credentials not configured. Set SHAREPOINT_TENANT_ID, SHAREPOINT_CLIENT_ID, SHAREPOINT_CLIENT_SECRET, and SHAREPOINT_SITE_URL environment variables.');
  }

  return { tenantId, clientId, clientSecret, siteUrl };
}

/**
 * Get SharePoint access token using client credentials flow
 */
export async function getSharePointAccessToken(): Promise<string> {
  const { tenantId, clientId, clientSecret } = await getSharePointCredentials();

  const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Get SharePoint site URL from Secret Manager
 */
export async function getSharePointSiteUrl(): Promise<string> {
  const { siteUrl } = await getSharePointCredentials();
  return siteUrl;
}

/**
 * Parse SharePoint site URL to extract hostname and site path
 */
export function parseSharePointSiteUrl(siteUrl: string): { hostname: string; sitePath: string } {
  console.log('[SharePoint] Parsing site URL:', JSON.stringify(siteUrl));
  console.log('[SharePoint] URL length:', siteUrl.length, 'chars');

  // Trim whitespace and remove any trailing newlines
  const cleanedUrl = siteUrl.trim();
  console.log('[SharePoint] Cleaned URL:', JSON.stringify(cleanedUrl));

  const url = new URL(cleanedUrl);
  const hostname = url.hostname;
  const pathParts = url.pathname.split('/').filter(p => p);
  console.log('[SharePoint] Hostname:', hostname, 'Path parts:', pathParts);

  // pathParts should be ['sites', 'sitename']
  if (pathParts.length >= 2 && pathParts[0] === 'sites') {
    return { hostname, sitePath: pathParts[1] };
  }

  throw new Error(`Invalid SHAREPOINT_SITE_URL format: expected https://hostname.sharepoint.com/sites/sitename, got: ${cleanedUrl}`);
}

/**
 * Get SharePoint site ID using hostname and site path
 */
export async function getSharePointSiteId(token: string, hostname: string, sitePath: string): Promise<string> {
  const url = `https://graph.microsoft.com/v1.0/sites/${hostname}:/sites/${sitePath}`;
  console.log('[SharePoint] Fetching site ID from:', url);

  const siteResponse = await fetch(
    url,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    }
  );

  if (!siteResponse.ok) {
    const errorText = await siteResponse.text();
    console.error('[SharePoint] Failed to get site ID:', siteResponse.status, errorText);
    throw new Error(`Failed to get site (${siteResponse.status}): ${errorText}`);
  }

  const siteData = await siteResponse.json();
  console.log('[SharePoint] Successfully got site ID:', siteData.id);
  return siteData.id;
}

/**
 * Clear cached credentials (no-op — credentials are read from env vars)
 */
export function clearSharePointCredentialsCache(): void {
  // No-op: credentials are now read directly from environment variables
}

/**
 * Sanitize a folder name for SharePoint
 * SharePoint has restrictions on certain characters and patterns in file/folder names
 *
 * Invalid characters: " * : < > ? / \ |
 * Cannot end with a period or space
 * Cannot contain consecutive periods
 * Maximum length: 255 characters
 *
 * @param name - The original folder name
 * @returns Sanitized folder name safe for SharePoint
 */
export function sanitizeFolderName(name: string): string {
  if (!name || typeof name !== 'string') {
    throw new Error('Folder name is required and must be a string');
  }

  let sanitized = name
    // Remove invalid SharePoint characters
    .replace(/["*:<>?/\\|]/g, '-')
    // Replace consecutive periods with single period
    .replace(/\.{2,}/g, '.')
    // Remove leading/trailing whitespace
    .trim()
    // Remove trailing periods and spaces
    .replace(/[.\s]+$/g, '')
    // Remove leading periods
    .replace(/^\.+/, '');

  // Limit to 255 characters (SharePoint maximum)
  if (sanitized.length > 255) {
    sanitized = sanitized.substring(0, 255).trim().replace(/[.\s]+$/g, '');
  }

  // Ensure we have a valid name after sanitization
  if (!sanitized) {
    throw new Error('Folder name is invalid after sanitization');
  }

  return sanitized;
}

/**
 * SharePoint folder item returned from API
 */
export interface SharePointFolderItem {
  id: string;
  name: string;
  webUrl: string;
  parentReference?: {
    path?: string;
  };
}

/**
 * Ensures a folder path exists in SharePoint, creating folders as needed
 *
 * @param token - SharePoint access token
 * @param siteId - SharePoint site ID
 * @param driveId - SharePoint drive ID
 * @param folderPath - Path like "Dev-Working/SBA Loans" (relative to drive root)
 * @returns The folder item at the end of the path
 */
export async function ensureFolderPath(
  token: string,
  siteId: string,
  driveId: string,
  folderPath: string
): Promise<SharePointFolderItem> {
  // Normalize the path (remove leading/trailing slashes, split by /)
  // Filter out 'Documents', 'Shared Documents', and 'root' as these refer to the drive root itself
  const pathParts = folderPath.split('/').filter(p => {
    const normalized = p.trim();
    return normalized &&
           normalized !== 'root' &&
           normalized.toLowerCase() !== 'documents' &&
           normalized.toLowerCase() !== 'shared documents';
  });

  console.log(`[SharePoint] Ensuring folder path exists: "${folderPath}" -> [${pathParts.join(' > ')}]`);

  // Start at the root
  let currentFolderId = 'root';
  let currentPath = '';

  // Create/navigate through each folder in the path
  for (const folderName of pathParts) {
    const sanitizedName = sanitizeFolderName(folderName);
    currentPath = currentPath ? `${currentPath}/${sanitizedName}` : sanitizedName;

    // Try to get the folder first using path syntax
    const getFolderByPathResponse = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/root:/${currentPath}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      }
    );

    if (getFolderByPathResponse.ok) {
      const folderData = await getFolderByPathResponse.json();
      currentFolderId = folderData.id;
      console.log(`[SharePoint] Found existing folder: "${sanitizedName}" (ID: ${currentFolderId})`);
      continue;
    }

    // Folder doesn't exist, create it
    console.log(`[SharePoint] Creating folder: "${sanitizedName}" at /${currentPath}...`);
    const createFolderResponse = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/items/${currentFolderId}/children`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: sanitizedName,
          folder: {},
          '@microsoft.graph.conflictBehavior': 'fail',
        }),
      }
    );

    if (!createFolderResponse.ok) {
      // If it failed due to conflict (race condition), try to get it by path
      if (createFolderResponse.status === 409) {
        const retryByPathResponse = await fetch(
          `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/root:/${currentPath}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          }
        );

        if (retryByPathResponse.ok) {
          const folderData = await retryByPathResponse.json();
          currentFolderId = folderData.id;
          console.log(`[SharePoint] Folder exists (conflict): "${sanitizedName}" (ID: ${currentFolderId})`);
          continue;
        }
      }

      const errorText = await createFolderResponse.text();
      throw new Error(`Failed to create folder "${sanitizedName}" at /${currentPath}: ${errorText}`);
    }

    const newFolder = await createFolderResponse.json();
    currentFolderId = newFolder.id;
    console.log(`[SharePoint] Created folder: "${sanitizedName}" (ID: ${currentFolderId})`);
  }

  // Return the final folder
  const finalFolderResponse = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/items/${currentFolderId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    }
  );

  if (!finalFolderResponse.ok) {
    throw new Error(`Failed to get final folder: ${await finalFolderResponse.text()}`);
  }

  return await finalFolderResponse.json();
}

/**
 * Standard subfolder names for project folders
 */
export const SHAREPOINT_SUBFOLDERS = {
  BUSINESS_APPLICANT: 'Business Applicant',
  OTHER_BUSINESSES: 'Other Businesses',
  PROJECT_FILES: 'Project Files',
} as const;

/**
 * Result of creating a SharePoint folder with subfolders
 */
export interface CreateFolderResult {
  folderId: string;
  webUrl: string;
  subfolders?: {
    businessApplicantFolderId?: string;
    otherBusinessesFolderId?: string;
    projectFilesFolderId?: string;
  };
}

/**
 * Creates a subfolder within a parent folder in SharePoint
 *
 * @param token - SharePoint access token
 * @param siteId - SharePoint site ID
 * @param driveId - SharePoint drive ID
 * @param parentFolderId - ID of the parent folder
 * @param subfolderName - Name of the subfolder to create
 * @returns The subfolder ID, or undefined if creation failed
 */
async function createSubfolder(
  token: string,
  siteId: string,
  driveId: string,
  parentFolderId: string,
  subfolderName: string
): Promise<string | undefined> {
  try {
    const createResponse = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/items/${parentFolderId}/children`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: subfolderName,
          folder: {},
          '@microsoft.graph.conflictBehavior': 'fail', // Don't rename, we want exact names
        }),
      }
    );

    if (!createResponse.ok) {
      // If folder already exists (409 Conflict), try to get it
      if (createResponse.status === 409) {
        const getResponse = await fetch(
          `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/items/${parentFolderId}/children?$filter=name eq '${encodeURIComponent(subfolderName)}'`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          }
        );

        if (getResponse.ok) {
          const data = await getResponse.json();
          if (data.value && data.value.length > 0) {
            console.log(`[SharePoint] Subfolder "${subfolderName}" already exists, using existing ID`);
            return data.value[0].id;
          }
        }
      }

      const errorText = await createResponse.text();
      console.error(`[SharePoint] Failed to create subfolder "${subfolderName}":`, errorText);
      return undefined;
    }

    const subfolder = await createResponse.json();
    console.log(`[SharePoint] Created subfolder: "${subfolderName}" (ID: ${subfolder.id})`);
    return subfolder.id;
  } catch (error) {
    console.error(`[SharePoint] Error creating subfolder "${subfolderName}":`, error);
    return undefined;
  }
}

/**
 * Creates a SharePoint folder for a project with standard subfolders
 *
 * @param token - SharePoint access token
 * @param projectName - Name of the project (will be sanitized)
 * @returns Object containing folderId, webUrl, and subfolder IDs
 */
export async function createSharePointFolder(
  token: string,
  projectName: string,
  bdoName?: string
): Promise<CreateFolderResult> {
  const sanitizedProjectName = sanitizeFolderName(projectName);
  const siteUrl = await getSharePointSiteUrl();
  const { hostname, sitePath } = parseSharePointSiteUrl(siteUrl);

  console.log(`[SharePoint] Creating folder for project: "${sanitizedProjectName}"${bdoName ? ` (BDO: "${bdoName}")` : ''}`);

  // Get the site ID
  const siteId = await getSharePointSiteId(token, hostname, sitePath);

  // Get the drive (document library)
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
    throw new Error(`Failed to get drive: ${await driveResponse.text()}`);
  }

  const driveData = await driveResponse.json();
  const driveId = driveData.id;

  // Get parent folder path from environment variable or use root, then nest
  // the project under a per-BDO subfolder when a BDO name is supplied so the
  // final layout is `{parentFolderPath}/{bdoName}/{projectName}`.
  const baseParentPath = process.env.SHAREPOINT_PARENT_FOLDER_PATH || '';
  const trimmedBdoName = (bdoName || '').trim();
  const parentFolderPath = trimmedBdoName
    ? (baseParentPath ? `${baseParentPath}/${trimmedBdoName}` : trimmedBdoName)
    : baseParentPath;

  let parentFolderId: string;

  if (parentFolderPath) {
    // Try to get or create the parent folder path
    try {
      const parentFolder = await ensureFolderPath(token, siteId, driveId, parentFolderPath);
      parentFolderId = parentFolder.id;
    } catch (error) {
      console.error(`[SharePoint] Failed to ensure parent folder path: ${parentFolderPath}`, error);
      throw new Error(`Failed to access or create parent folder: ${parentFolderPath}. ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } else {
    // Use the root of the drive
    const rootResponse = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/root`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      }
    );

    if (!rootResponse.ok) {
      throw new Error(`Failed to get drive root: ${await rootResponse.text()}`);
    }

    const rootFolder = await rootResponse.json();
    parentFolderId = rootFolder.id;
  }

  // Create the main project folder under the parent
  const createFolderResponse = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/items/${parentFolderId}/children`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: sanitizedProjectName,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'rename', // Rename if folder already exists
      }),
    }
  );

  if (!createFolderResponse.ok) {
    const error = await createFolderResponse.text();
    throw new Error(`Failed to create folder: ${error}`);
  }

  const newFolder = await createFolderResponse.json();
  const projectFolderId = newFolder.id;

  console.log('[SharePoint] Main folder created successfully:', {
    id: projectFolderId,
    name: newFolder.name,
    webUrl: newFolder.webUrl,
  });

  // Create the standard subfolders inside the project folder
  console.log('[SharePoint] Creating subfolders...');

  const [businessApplicantFolderId, otherBusinessesFolderId, projectFilesFolderId] = await Promise.all([
    createSubfolder(token, siteId, driveId, projectFolderId, SHAREPOINT_SUBFOLDERS.BUSINESS_APPLICANT),
    createSubfolder(token, siteId, driveId, projectFolderId, SHAREPOINT_SUBFOLDERS.OTHER_BUSINESSES),
    createSubfolder(token, siteId, driveId, projectFolderId, SHAREPOINT_SUBFOLDERS.PROJECT_FILES),
  ]);

  console.log('[SharePoint] Subfolders created:', {
    businessApplicantFolderId,
    otherBusinessesFolderId,
    projectFilesFolderId,
  });

  return {
    folderId: projectFolderId,
    webUrl: newFolder.webUrl,
    subfolders: {
      businessApplicantFolderId,
      otherBusinessesFolderId,
      projectFilesFolderId,
    },
  };
}

/**
 * Ensures a named subfolder exists directly under a parent folder, returning
 * its ID. Looks the folder up by name first, creates it on miss, and tolerates
 * the create-create race (409) by re-reading. Unlike {@link ensureFolderPath}
 * this operates relative to an arbitrary parent item rather than the drive root.
 */
export async function ensureSubfolder(
  token: string,
  siteId: string,
  driveId: string,
  parentFolderId: string,
  subfolderName: string
): Promise<string> {
  const sanitized = sanitizeFolderName(subfolderName);

  const getResponse = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/items/${parentFolderId}/children?$filter=name eq '${encodeURIComponent(sanitized)}'`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
  );
  if (getResponse.ok) {
    const data = await getResponse.json();
    if (data.value && data.value.length > 0) return data.value[0].id;
  }

  const createResponse = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/items/${parentFolderId}/children`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: sanitized,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'fail',
      }),
    }
  );

  if (!createResponse.ok) {
    if (createResponse.status === 409) {
      const retry = await fetch(
        `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/items/${parentFolderId}/children?$filter=name eq '${encodeURIComponent(sanitized)}'`,
        { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
      );
      if (retry.ok) {
        const retryData = await retry.json();
        if (retryData.value && retryData.value.length > 0) return retryData.value[0].id;
      }
    }
    throw new Error(`Failed to create subfolder "${sanitized}": ${await createResponse.text()}`);
  }

  return (await createResponse.json()).id;
}

/**
 * Result of an automatic, system-generated upload into a project folder.
 */
export interface ProjectFileUploadResult {
  id: string;
  name: string;
  webUrl: string;
  size?: number;
}

/**
 * Server-side: upload a raw file buffer into a project's SharePoint folder
 * (optionally a named subfolder, which is auto-created). Resolves the project's
 * linked SharePoint folder and auto-provisions it — with the standard
 * subfolders — when the project isn't linked yet, persisting the new IDs back
 * onto the project. This mirrors the auto-provision behaviour of
 * `/api/sharepoint/upload`, but is callable directly from server code where
 * there is no multipart HTTP request to drive the existing route (e.g. saving a
 * generated PQ Memo PDF or a parsed financial spread).
 *
 * Files are uploaded with `@microsoft.graph.conflictBehavior: rename`, so a name
 * clash never overwrites an existing file — SharePoint appends a numeric suffix.
 * Callers that want distinct, identifiable copies should embed a timestamp in
 * `fileName` themselves.
 */
export async function uploadFileToProjectFolder(opts: {
  projectId: string;
  fileName: string;
  content: Buffer | Uint8Array | ArrayBuffer;
  contentType?: string;
  /** Named subfolder under the project folder, e.g. SHAREPOINT_SUBFOLDERS.PROJECT_FILES. */
  subfolderName?: string;
}): Promise<ProjectFileUploadResult> {
  const { projectId, fileName, content, contentType, subfolderName } = opts;

  const token = await getSharePointAccessToken();

  // Resolve (or auto-provision) the project's SharePoint folder.
  let folderId: string | undefined;
  const project = await getProjectAdmin(projectId);
  if (!project) {
    throw new Error(`Project ${projectId} not found`);
  }
  if (project.sharepointFolderId) {
    folderId = project.sharepointFolderId;
  } else {
    // Drive the folder hierarchy off the loan application's "BDO 1" field, the
    // same signal /api/sharepoint/upload uses.
    const loanAppCol = await getCollection(COLLECTIONS.LOAN_APPLICATIONS);
    const loanAppDoc = (await loanAppCol.findOne({ projectId })) as any;
    const bdo1 = loanAppDoc?.projectOverview?.bdo1;
    const folderInfo = await createSharePointFolder(token, project.projectName, bdo1);
    folderId = folderInfo.folderId;

    const updateData: Record<string, string | undefined> = {
      sharepointFolderId: folderInfo.folderId,
      sharepointFolderUrl: folderInfo.webUrl,
    };
    if (folderInfo.subfolders?.businessApplicantFolderId) {
      (updateData as any).sharepointBusinessApplicantFolderId = folderInfo.subfolders.businessApplicantFolderId;
    }
    if (folderInfo.subfolders?.otherBusinessesFolderId) {
      (updateData as any).sharepointOtherBusinessesFolderId = folderInfo.subfolders.otherBusinessesFolderId;
    }
    if (folderInfo.subfolders?.projectFilesFolderId) {
      (updateData as any).sharepointProjectFilesFolderId = folderInfo.subfolders.projectFilesFolderId;
    }
    await updateProjectAdmin(projectId, updateData as any);
    console.log(`[SharePoint] Auto-provisioned folder for project ${projectId} during file save`);
  }

  // Resolve site + drive.
  const siteUrl = await getSharePointSiteUrl();
  const { hostname, sitePath } = parseSharePointSiteUrl(siteUrl);
  const siteId = await getSharePointSiteId(token, hostname, sitePath);

  const driveResponse = await fetch(`https://graph.microsoft.com/v1.0/sites/${siteId}/drive`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!driveResponse.ok) {
    throw new Error(`Failed to get drive: ${await driveResponse.text()}`);
  }
  const driveId = (await driveResponse.json()).id;

  // Ensure the target subfolder (e.g. "Project Files") under the project folder.
  let targetFolderId = folderId!;
  if (subfolderName) {
    targetFolderId = await ensureSubfolder(token, siteId, driveId, folderId!, subfolderName);
  }

  // Normalise the body to a Buffer so we can measure size and chunk if needed.
  const buffer =
    content instanceof Buffer
      ? content
      : content instanceof Uint8Array
        ? Buffer.from(content)
        : Buffer.from(new Uint8Array(content));
  const fileSize = buffer.byteLength;
  const safeName = fileName.replace(/[\\/:*?"<>|]/g, '-');
  const mime = contentType || 'application/octet-stream';

  let uploadResponse: Response | undefined;
  if (fileSize <= 4 * 1024 * 1024) {
    // Simple upload for small files. `:/content` with conflictBehavior=rename is
    // expressed via query param since PUT /content takes no JSON body.
    uploadResponse = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/items/${targetFolderId}:/${encodeURIComponent(safeName)}:/content?@microsoft.graph.conflictBehavior=rename`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': mime },
        body: buffer,
      }
    );
  } else {
    // Resumable upload session for larger files (chunked at 10MB).
    const sessionResponse = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/items/${targetFolderId}:/${encodeURIComponent(safeName)}:/createUploadSession`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: { '@microsoft.graph.conflictBehavior': 'rename' } }),
      }
    );
    if (!sessionResponse.ok) {
      throw new Error(`Failed to create upload session: ${await sessionResponse.text()}`);
    }
    const uploadUrl = (await sessionResponse.json()).uploadUrl;

    const chunkSize = 10 * 1024 * 1024;
    let start = 0;
    while (start < fileSize) {
      const end = Math.min(start + chunkSize, fileSize);
      const chunk = buffer.subarray(start, end);
      uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Length': String(chunk.byteLength),
          'Content-Range': `bytes ${start}-${end - 1}/${fileSize}`,
        },
        body: chunk,
      });
      if (!uploadResponse.ok && uploadResponse.status !== 202) {
        throw new Error(`Failed to upload chunk: ${await uploadResponse.text()}`);
      }
      start = end;
    }
  }

  if (!uploadResponse || (!uploadResponse.ok && uploadResponse.status !== 201)) {
    throw new Error(`Failed to upload file: ${uploadResponse ? await uploadResponse.text() : 'no response'}`);
  }

  const uploaded = await uploadResponse.json();
  console.log(`[SharePoint] Saved "${uploaded.name}" to project ${projectId}`, { id: uploaded.id, webUrl: uploaded.webUrl });
  return { id: uploaded.id, name: uploaded.name, webUrl: uploaded.webUrl, size: uploaded.size };
}

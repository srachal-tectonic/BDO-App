import { NextRequest, NextResponse } from 'next/server';
import {
  getSharePointAccessToken,
  getSharePointSiteUrl,
  getSharePointSiteId,
  parseSharePointSiteUrl,
  sanitizeFolderName,
} from '@/lib/sharepoint';
import { verifyAuth, unauthorizedResponse } from '@/lib/apiAuth';
import { checkRateLimit, rateLimitExceededResponse, addRateLimitHeaders, RATE_LIMITS } from '@/lib/rateLimit';
import { validateFile, isDangerousExtension, FILE_SIZE_LIMITS } from '@/lib/fileValidation';
import { logFileUpload, getClientIp } from '@/lib/auditLog';
import { checkCsrf } from '@/lib/csrf';

/**
 * SharePoint Upload API Route
 * POST /api/sharepoint/upload
 *
 * Uploads a file to a project's SharePoint folder.
 * PROTECTED: Requires authentication.
 * RATE LIMITED: 30 requests per minute per user.
 */

/**
 * Maps UI subfolder names to SharePoint folder names
 */
function mapSubfolderName(uiName: string): string {
  const mappings: Record<string, string> = {
    'Business Files': 'Business Applicant',
    // Other mappings can be added here as needed
  };
  return mappings[uiName] || uiName;
}

/**
 * Ensures a subfolder exists within the project folder
 */
async function ensureSubfolder(
  token: string,
  siteId: string,
  driveId: string,
  parentFolderId: string,
  subfolderName: string
): Promise<string> {
  // Try to get the subfolder first
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
      console.log(`[SharePoint] Subfolder "${subfolderName}" already exists`);
      return data.value[0].id;
    }
  }

  // Create the subfolder
  console.log(`[SharePoint] Creating subfolder "${subfolderName}"`);
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
        '@microsoft.graph.conflictBehavior': 'fail',
      }),
    }
  );

  if (!createResponse.ok) {
    // If conflict, folder was created by another request - try to get it again
    if (createResponse.status === 409) {
      const retryResponse = await fetch(
        `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/items/${parentFolderId}/children?$filter=name eq '${encodeURIComponent(subfolderName)}'`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      );
      if (retryResponse.ok) {
        const retryData = await retryResponse.json();
        if (retryData.value && retryData.value.length > 0) {
          return retryData.value[0].id;
        }
      }
    }
    throw new Error(`Failed to create subfolder: ${await createResponse.text()}`);
  }

  const newFolder = await createResponse.json();
  return newFolder.id;
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
    'sharepoint/upload',
    RATE_LIMITS.upload
  );

  if (!rateLimitResult.allowed) {
    return rateLimitExceededResponse(rateLimitResult);
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const projectId = formData.get('projectId') as string | null;
    const folderId = formData.get('folderId') as string | null;
    const subfolder = formData.get('subfolder') as string | null; // 'Business Files' or 'Individual Files'
    const applicantName = formData.get('applicantName') as string | null; // Individual applicant's name for their folder
    const years = formData.get('years') as string | null; // JSON array of years
    const description = formData.get('description') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Security: Check for dangerous file extensions
    if (isDangerousExtension(file.name)) {
      return NextResponse.json(
        { error: 'File type not allowed for security reasons' },
        { status: 400 }
      );
    }

    // Security: Validate file type and size
    const validationResult = validateFile(file, { maxSize: FILE_SIZE_LIMITS.document });
    if (!validationResult.valid) {
      return NextResponse.json(
        { error: validationResult.error },
        { status: 400 }
      );
    }

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    if (!folderId) {
      return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 });
    }

    console.log(`[SharePoint] Uploading file "${file.name}" to project ${projectId}`);

    // Get SharePoint access token
    const token = await getSharePointAccessToken();

    // Get site info
    const siteUrl = await getSharePointSiteUrl();
    const { hostname, sitePath } = parseSharePointSiteUrl(siteUrl);
    const siteId = await getSharePointSiteId(token, hostname, sitePath);

    // Get the drive
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

    // Determine target folder (create subfolder if specified)
    let targetFolderId = folderId;
    let targetSubfolderName: string | null = null;

    if (applicantName) {
      // Individual applicant files go to a folder named after the applicant at project root
      targetSubfolderName = sanitizeFolderName(applicantName);
      targetFolderId = await ensureSubfolder(token, siteId, driveId, folderId, targetSubfolderName);
      console.log(`[SharePoint] Using applicant folder: "${targetSubfolderName}"`);
    } else if (subfolder) {
      // Map UI subfolder names to SharePoint folder names (e.g., "Business Files" -> "Business Applicant")
      const mappedSubfolder = mapSubfolderName(subfolder);
      targetSubfolderName = sanitizeFolderName(mappedSubfolder);
      targetFolderId = await ensureSubfolder(token, siteId, driveId, folderId, targetSubfolderName);
      console.log(`[SharePoint] Using mapped subfolder: "${subfolder}" -> "${targetSubfolderName}"`);
    }

    // Read file content
    const fileBuffer = await file.arrayBuffer();
    const fileSize = fileBuffer.byteLength;

    // Generate a unique filename to avoid conflicts
    const timestamp = Date.now();
    const originalName = file.name;
    const extension = originalName.includes('.') ? originalName.substring(originalName.lastIndexOf('.')) : '';
    const baseName = originalName.includes('.') ? originalName.substring(0, originalName.lastIndexOf('.')) : originalName;
    const uniqueFileName = `${baseName}_${timestamp}${extension}`;

    console.log(`[SharePoint] Uploading file: ${uniqueFileName} (${fileSize} bytes)`);

    // For files <= 4MB, use simple upload
    // For files > 4MB, use resumable upload session
    let uploadResponse;
    if (fileSize <= 4 * 1024 * 1024) {
      // Simple upload for small files
      uploadResponse = await fetch(
        `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/items/${targetFolderId}:/${encodeURIComponent(uniqueFileName)}:/content`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': file.type || 'application/octet-stream',
          },
          body: fileBuffer,
        }
      );
    } else {
      // Create upload session for large files
      const sessionResponse = await fetch(
        `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/items/${targetFolderId}:/${encodeURIComponent(uniqueFileName)}:/createUploadSession`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            item: {
              '@microsoft.graph.conflictBehavior': 'rename',
            },
          }),
        }
      );

      if (!sessionResponse.ok) {
        throw new Error(`Failed to create upload session: ${await sessionResponse.text()}`);
      }

      const session = await sessionResponse.json();
      const uploadUrl = session.uploadUrl;

      // Upload the file in chunks (10MB chunks)
      const chunkSize = 10 * 1024 * 1024;
      let start = 0;

      while (start < fileSize) {
        const end = Math.min(start + chunkSize, fileSize);
        const chunk = fileBuffer.slice(start, end);

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
      const errorText = uploadResponse ? await uploadResponse.text() : 'No response';
      throw new Error(`Failed to upload file: ${errorText}`);
    }

    const uploadedFile = await uploadResponse.json();
    console.log(`[SharePoint] File uploaded successfully:`, {
      id: uploadedFile.id,
      name: uploadedFile.name,
      webUrl: uploadedFile.webUrl,
    });

    // Audit log: successful file upload
    const clientIp = getClientIp(request.headers);
    const userAgent = request.headers.get('user-agent') || undefined;
    await logFileUpload(
      authResult.user.uid,
      authResult.user.email || undefined,
      projectId,
      file.name,
      file.size,
      true,
      clientIp,
      userAgent
    );

    // Parse years if provided
    let parsedYears: number[] = [];
    if (years) {
      try {
        parsedYears = JSON.parse(years);
      } catch {
        console.warn('[SharePoint] Failed to parse years:', years);
      }
    }

    const response = NextResponse.json({
      success: true,
      file: {
        id: uploadedFile.id,
        name: uploadedFile.name,
        originalName: originalName,
        webUrl: uploadedFile.webUrl,
        size: uploadedFile.size,
        mimeType: uploadedFile.file?.mimeType || file.type,
        createdDateTime: uploadedFile.createdDateTime,
        years: parsedYears,
        description: description || undefined,
        subfolder: targetSubfolderName || undefined,
        applicantName: applicantName || undefined,
      },
    });

    return addRateLimitHeaders(response, rateLimitResult);
  } catch (error) {
    console.error('[SharePoint] Error uploading file:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload file to SharePoint',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

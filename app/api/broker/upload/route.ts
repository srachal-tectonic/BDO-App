/**
 * Broker File Upload API Route
 * POST /api/broker/upload
 *
 * Uploads a file to a project's SharePoint folder using broker token authentication.
 * PUBLIC: No auth required - uses broker token instead.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getSharePointAccessToken,
  getSharePointSiteUrl,
  getSharePointSiteId,
  parseSharePointSiteUrl,
  sanitizeFolderName,
} from '@/lib/sharepoint';
import { validateBrokerToken, incrementBrokerUploadCount, brokerErrorResponse } from '@/lib/brokerAuth';
import { validateFile, isDangerousExtension, FILE_SIZE_LIMITS } from '@/lib/fileValidation';
import { logBrokerUpload, getClientIp } from '@/lib/auditLog';
import { checkCsrf } from '@/lib/csrf';

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
      console.log(`[Broker Upload] Subfolder "${subfolderName}" already exists`);
      return data.value[0].id;
    }
  }

  // Create the subfolder
  console.log(`[Broker Upload] Creating subfolder "${subfolderName}"`);
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

  try {
    const formData = await request.formData();
    const brokerToken = formData.get('token') as string | null;
    const file = formData.get('file') as File | null;
    const subfolder = formData.get('subfolder') as string | null; // 'Business Files' or 'Individual Files'
    const years = formData.get('years') as string | null; // JSON array of years
    const description = formData.get('description') as string | null;
    const category = formData.get('category') as string | null; // e.g., 'Tax Returns', 'Financial Statements'

    // Validate broker token
    if (!brokerToken) {
      return brokerErrorResponse('Broker token is required', 400);
    }

    const authResult = await validateBrokerToken(brokerToken);
    if (!authResult.valid || !authResult.project) {
      return brokerErrorResponse(authResult.errorMessage || 'Invalid token', 401);
    }

    // Validate file
    if (!file) {
      return brokerErrorResponse('No file provided', 400);
    }

    // Security: Check for dangerous file extensions
    if (isDangerousExtension(file.name)) {
      return brokerErrorResponse('File type not allowed for security reasons', 400);
    }

    // Security: Validate file type and size
    const validationResult = validateFile(file, { maxSize: FILE_SIZE_LIMITS.broker });
    if (!validationResult.valid) {
      return brokerErrorResponse(validationResult.error || 'Invalid file', 400);
    }

    // Validate subfolder
    if (!subfolder || !['Business Files', 'Individual Files'].includes(subfolder)) {
      return brokerErrorResponse('Valid subfolder is required (Business Files or Individual Files)', 400);
    }

    // Get SharePoint folder ID from project
    const folderId = authResult.project.sharepointFolderId;
    if (!folderId) {
      return brokerErrorResponse('Project does not have a SharePoint folder configured', 400);
    }

    console.log(`[Broker Upload] Uploading file "${file.name}" to project ${authResult.project.id} via broker token`);

    // Get SharePoint access token
    const spToken = await getSharePointAccessToken();

    // Get site info
    const siteUrl = await getSharePointSiteUrl();
    const { hostname, sitePath } = parseSharePointSiteUrl(siteUrl);
    const siteId = await getSharePointSiteId(spToken, hostname, sitePath);

    // Get the drive
    const driveResponse = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/drive`,
      {
        headers: {
          Authorization: `Bearer ${spToken}`,
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
    if (subfolder) {
      const sanitizedSubfolder = sanitizeFolderName(subfolder);
      targetFolderId = await ensureSubfolder(spToken, siteId, driveId, folderId, sanitizedSubfolder);
    }

    // Read file content
    const fileBuffer = await file.arrayBuffer();
    const fileSize = fileBuffer.byteLength;

    // Check file size limit (10MB for broker uploads)
    const maxSize = 10 * 1024 * 1024;
    if (fileSize > maxSize) {
      return brokerErrorResponse('File size exceeds 10MB limit', 400);
    }

    // Generate a unique filename to avoid conflicts
    const timestamp = Date.now();
    const originalName = file.name;
    const extension = originalName.includes('.') ? originalName.substring(originalName.lastIndexOf('.')) : '';
    const baseName = originalName.includes('.') ? originalName.substring(0, originalName.lastIndexOf('.')) : originalName;
    const uniqueFileName = `${baseName}_broker_${timestamp}${extension}`;

    console.log(`[Broker Upload] Uploading file: ${uniqueFileName} (${fileSize} bytes)`);

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
            Authorization: `Bearer ${spToken}`,
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
            Authorization: `Bearer ${spToken}`,
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

      // Upload the file in chunks (4MB chunks for broker uploads)
      const chunkSize = 4 * 1024 * 1024;
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
    console.log(`[Broker Upload] File uploaded successfully:`, {
      id: uploadedFile.id,
      name: uploadedFile.name,
      webUrl: uploadedFile.webUrl,
    });

    // Increment upload count for the broker token
    await incrementBrokerUploadCount(brokerToken);

    // Audit log: successful broker file upload
    const clientIp = getClientIp(request.headers);
    const userAgent = request.headers.get('user-agent') || undefined;
    await logBrokerUpload(
      brokerToken,
      authResult.project.id,
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
        console.warn('[Broker Upload] Failed to parse years:', years);
      }
    }

    return NextResponse.json({
      success: true,
      file: {
        id: uploadedFile.id,
        name: uploadedFile.name,
        originalName: originalName,
        size: uploadedFile.size,
        mimeType: uploadedFile.file?.mimeType || file.type,
        createdDateTime: uploadedFile.createdDateTime,
        years: parsedYears,
        description: description || undefined,
        category: category || undefined,
        subfolder: subfolder || undefined,
      },
    });
  } catch (error) {
    console.error('[Broker Upload] Error uploading file:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload file',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

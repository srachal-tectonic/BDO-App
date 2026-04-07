/**
 * SharePoint Service
 * Handles all interactions with SharePoint API for file and folder management
 */

export interface SharePointItem {
  id: string;
  name: string;
  modifiedDate: string;
  type: 'folder' | 'file';
  fileType?: string;
  path: string;
  size?: number;
  children?: SharePointItem[];
}

export interface SharePointConfig {
  siteUrl: string;
  clientId: string;
  tenantId: string;
}

/**
 * Fetches files and folders from SharePoint for a specific project
 * @param projectId The project ID to fetch files for
 * @returns Promise with the folder structure
 */
export async function getProjectFiles(projectId: string): Promise<SharePointItem[]> {
  try {
    // TODO: Implement actual SharePoint API integration
    // This will need to:
    // 1. Authenticate with SharePoint using OAuth
    // 2. Fetch the folder structure for the project
    // 3. Transform SharePoint response to our SharePointItem format

    const response = await fetch(`/api/sharepoint/files?projectId=${projectId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`SharePoint API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error fetching SharePoint files:', error);
    throw error;
  }
}

/**
 * Uploads a file to SharePoint
 * @param projectId The project ID
 * @param folderPath The folder path where the file should be uploaded
 * @param file The file to upload
 * @returns Promise with the uploaded file information
 */
export async function uploadFile(
  projectId: string,
  folderPath: string,
  file: File
): Promise<SharePointItem> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', projectId);
    formData.append('folderPath', folderPath);

    const response = await fetch('/api/sharepoint/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.item;
  } catch (error) {
    console.error('Error uploading file to SharePoint:', error);
    throw error;
  }
}

/**
 * Creates a new folder in SharePoint
 * @param projectId The project ID
 * @param folderPath The parent folder path
 * @param folderName The name of the new folder
 * @returns Promise with the created folder information
 */
export async function createFolder(
  projectId: string,
  folderPath: string,
  folderName: string
): Promise<SharePointItem> {
  try {
    const response = await fetch('/api/sharepoint/folder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId,
        folderPath,
        folderName,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create folder: ${response.statusText}`);
    }

    const data = await response.json();
    return data.item;
  } catch (error) {
    console.error('Error creating folder in SharePoint:', error);
    throw error;
  }
}

/**
 * Deletes a file or folder from SharePoint
 * @param projectId The project ID
 * @param itemId The ID of the item to delete
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteItem(projectId: string, itemId: string): Promise<void> {
  try {
    const response = await fetch(`/api/sharepoint/item?projectId=${projectId}&itemId=${itemId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete item: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error deleting item from SharePoint:', error);
    throw error;
  }
}

/**
 * Downloads a file from SharePoint
 * @param projectId The project ID
 * @param itemId The ID of the file to download
 * @returns Promise with the file blob
 */
export async function downloadFile(projectId: string, itemId: string): Promise<Blob> {
  try {
    const response = await fetch(
      `/api/sharepoint/download?projectId=${projectId}&itemId=${itemId}`,
      {
        method: 'GET',
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    return await response.blob();
  } catch (error) {
    console.error('Error downloading file from SharePoint:', error);
    throw error;
  }
}

/**
 * Transforms SharePoint API response to our SharePointItem format
 * This is a helper function for when you implement the actual SharePoint integration
 */
export function transformSharePointResponse(spItem: any): SharePointItem {
  const isFolder = spItem.folder !== undefined;

  return {
    id: spItem.id || spItem.Id,
    name: spItem.name || spItem.Name,
    modifiedDate: spItem.lastModifiedDateTime || spItem.Modified,
    type: isFolder ? 'folder' : 'file',
    fileType: !isFolder ? getFileExtension(spItem.name || spItem.Name) : undefined,
    path: spItem.path || spItem.ServerRelativeUrl,
    size: spItem.size || spItem.Length,
    children: isFolder && spItem.children ? spItem.children.map(transformSharePointResponse) : [],
  };
}

function getFileExtension(fileName: string): string {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

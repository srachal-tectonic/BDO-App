/**
 * File Validation Utility
 * Validates file types, sizes, and content for secure uploads
 */

// Allowed MIME types mapped to their valid extensions
export const ALLOWED_FILE_TYPES: Record<string, string[]> = {
  // Documents
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'text/plain': ['.txt'],
  'text/csv': ['.csv'],
  // Images
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/tiff': ['.tif', '.tiff'],
  // Archives (for document packages)
  'application/zip': ['.zip'],
};

// Maximum file sizes by category (in bytes)
export const FILE_SIZE_LIMITS = {
  default: 10 * 1024 * 1024, // 10MB
  image: 5 * 1024 * 1024, // 5MB for images
  document: 25 * 1024 * 1024, // 25MB for documents
  broker: 10 * 1024 * 1024, // 10MB for broker uploads
};

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  sanitizedFileName?: string;
}

/**
 * Get file extension from filename
 */
function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filename.substring(lastDot).toLowerCase();
}

/**
 * Sanitize filename to prevent path traversal and special characters
 */
export function sanitizeFileName(filename: string): string {
  // Remove path components
  let sanitized = filename.split(/[/\\]/).pop() || filename;

  // Remove null bytes and other control characters
  sanitized = sanitized.replace(/[\x00-\x1f\x7f]/g, '');

  // Replace potentially dangerous characters
  sanitized = sanitized.replace(/[<>:"|?*]/g, '_');

  // Limit length
  if (sanitized.length > 255) {
    const ext = getFileExtension(sanitized);
    const baseName = sanitized.substring(0, sanitized.lastIndexOf('.'));
    sanitized = baseName.substring(0, 255 - ext.length) + ext;
  }

  // Ensure it's not empty
  if (!sanitized || sanitized === '.' || sanitized === '..') {
    sanitized = 'unnamed_file';
  }

  return sanitized;
}

/**
 * Validate file type based on MIME type and extension
 */
export function validateFileType(file: File): FileValidationResult {
  const allowedExtensions = ALLOWED_FILE_TYPES[file.type];

  // Check if MIME type is allowed
  if (!allowedExtensions) {
    return {
      valid: false,
      error: `File type '${file.type}' is not allowed. Allowed types: PDF, Word, Excel, images.`,
    };
  }

  // Validate extension matches MIME type
  const ext = getFileExtension(file.name);
  if (!ext) {
    return {
      valid: false,
      error: 'File must have an extension.',
    };
  }

  if (!allowedExtensions.includes(ext)) {
    return {
      valid: false,
      error: `File extension '${ext}' does not match the file type '${file.type}'.`,
    };
  }

  // Sanitize filename
  const sanitizedFileName = sanitizeFileName(file.name);

  return {
    valid: true,
    sanitizedFileName,
  };
}

/**
 * Validate file size
 */
export function validateFileSize(
  file: File,
  maxSize: number = FILE_SIZE_LIMITS.default
): FileValidationResult {
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    return {
      valid: false,
      error: `File size (${Math.round(file.size / (1024 * 1024))}MB) exceeds the ${maxSizeMB}MB limit.`,
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: 'File is empty.',
    };
  }

  return { valid: true };
}

/**
 * Comprehensive file validation
 */
export function validateFile(
  file: File,
  options?: {
    maxSize?: number;
    allowedTypes?: string[];
  }
): FileValidationResult {
  // Validate file type
  const typeResult = validateFileType(file);
  if (!typeResult.valid) {
    return typeResult;
  }

  // If specific types are allowed, check against them
  if (options?.allowedTypes && !options.allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type '${file.type}' is not allowed for this upload.`,
    };
  }

  // Validate file size
  const sizeResult = validateFileSize(file, options?.maxSize);
  if (!sizeResult.valid) {
    return sizeResult;
  }

  return {
    valid: true,
    sanitizedFileName: typeResult.sanitizedFileName,
  };
}

/**
 * Check if file extension indicates an executable or dangerous file
 */
export function isDangerousExtension(filename: string): boolean {
  const dangerousExtensions = [
    '.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.pif',
    '.vbs', '.vbe', '.js', '.jse', '.ws', '.wsf', '.wsc', '.wsh',
    '.ps1', '.psm1', '.psd1', '.sh', '.bash', '.zsh',
    '.dll', '.sys', '.drv',
    '.php', '.php3', '.php4', '.php5', '.phtml', '.asp', '.aspx',
    '.jar', '.class', '.py', '.pyc', '.pyo', '.rb',
    '.hta', '.cpl', '.inf', '.reg',
  ];

  const ext = getFileExtension(filename);
  return dangerousExtensions.includes(ext);
}

/**
 * Get appropriate file size limit based on file type
 */
export function getFileSizeLimit(mimeType: string): number {
  if (mimeType.startsWith('image/')) {
    return FILE_SIZE_LIMITS.image;
  }
  if (
    mimeType.includes('pdf') ||
    mimeType.includes('word') ||
    mimeType.includes('excel') ||
    mimeType.includes('powerpoint')
  ) {
    return FILE_SIZE_LIMITS.document;
  }
  return FILE_SIZE_LIMITS.default;
}

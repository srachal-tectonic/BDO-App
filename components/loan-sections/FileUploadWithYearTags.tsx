'use client';

import { useState } from 'react';
import { FileText, X, Loader2 } from 'lucide-react';
import YearSelectionModal from './YearSelectionModal';
import { authenticatedFormPost } from '@/lib/authenticatedFetch';

// SharePoint file reference (stored in database instead of binary File)
export interface SharePointFileRef {
  id: string;           // SharePoint file ID
  name: string;         // Display name
  originalName: string; // Original filename
  webUrl: string;       // SharePoint URL
  size: number;
  mimeType: string;
  years: number[];
  description?: string;
  uploadedAt: string;
}

// Legacy interface for backwards compatibility during migration
export interface FileWithYear {
  file?: File;
  sharepointFile?: SharePointFileRef;
  years: number[];
  description?: string;
}

interface FileUploadWithYearTagsProps {
  label: string;
  description?: string;
  files: FileWithYear[];
  onChange: (files: FileWithYear[]) => void;
  accept?: string;
  multiple?: boolean;
  showYearTags?: boolean;
  showDescription?: boolean;
  testId: string;
  // SharePoint upload props
  projectId?: string;
  sharepointFolderId?: string;
  subfolder?: string; // e.g., "Business Files" or "Individual Files"
  applicantName?: string; // Individual applicant's name - creates a folder with their name
}

export default function FileUploadWithYearTags({
  label,
  description,
  files,
  onChange,
  accept = '.pdf,.xlsx,.xls,.doc,.docx,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.webp',
  multiple = true,
  showYearTags = true,
  showDescription = false,
  testId,
  projectId,
  sharepointFolderId,
  subfolder,
  applicantName,
}: FileUploadWithYearTagsProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [currentDescription, setCurrentDescription] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [fileIndex, setFileIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Upload file to SharePoint
  const uploadToSharePoint = async (
    file: File,
    years: number[],
    fileDescription?: string
  ): Promise<SharePointFileRef | null> => {
    if (!projectId || !sharepointFolderId) {
      console.warn('[FileUpload] SharePoint upload skipped - missing projectId or folderId');
      return null;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', projectId);
    formData.append('folderId', sharepointFolderId);
    if (applicantName) {
      formData.append('applicantName', applicantName);
    } else if (subfolder) {
      formData.append('subfolder', subfolder);
    }
    if (years.length > 0) {
      formData.append('years', JSON.stringify(years));
    }
    if (fileDescription) {
      formData.append('description', fileDescription);
    }

    console.log('[FileUpload] Uploading to SharePoint:', {
      fileName: file.name,
      projectId,
      folderId: sharepointFolderId,
      subfolder,
      applicantName,
      years,
    });

    const response = await authenticatedFormPost('/api/sharepoint/upload', formData);

    const data = await response.json();

    if (!response.ok) {
      console.error('[FileUpload] SharePoint upload failed:', data);
      throw new Error(data.message || 'Failed to upload file');
    }

    console.log('[FileUpload] SharePoint upload successful:', data.file);

    return {
      id: data.file.id,
      name: data.file.name,
      originalName: data.file.originalName,
      webUrl: data.file.webUrl,
      size: data.file.size,
      mimeType: data.file.mimeType,
      years: data.file.years || years,
      description: data.file.description || fileDescription,
      uploadedAt: new Date().toISOString(),
    };
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const filesArray = Array.from(selectedFiles);
    setUploadError(null);

    if (showYearTags) {
      setPendingFiles(filesArray);
      setFileIndex(0);
      setCurrentFile(filesArray[0]);
      setModalOpen(true);
    } else if (showDescription) {
      setPendingFiles(filesArray);
      setFileIndex(0);
      setCurrentFile(filesArray[0]);
      setCurrentDescription('');
    } else {
      // Files without year tags or descriptions - upload directly
      setIsUploading(true);
      try {
        const newFiles: FileWithYear[] = [];
        for (const file of filesArray) {
          const sharepointFile = await uploadToSharePoint(file, []);
          newFiles.push({
            file: sharepointFile ? undefined : file,
            sharepointFile: sharepointFile || undefined,
            years: [],
          });
        }
        onChange([...files, ...newFiles]);
      } catch (error) {
        console.error('[FileUpload] Upload error:', error);
        setUploadError(error instanceof Error ? error.message : 'Upload failed');
      } finally {
        setIsUploading(false);
      }
    }

    e.target.value = '';
  };

  const handleYearConfirm = async (selectedYears: number[]) => {
    if (!currentFile) return;

    setUploadError(null);
    setIsUploading(true);

    try {
      // Upload to SharePoint
      const sharepointFile = await uploadToSharePoint(currentFile, selectedYears);

      const newFile: FileWithYear = {
        file: sharepointFile ? undefined : currentFile, // Only keep File if SharePoint upload failed
        sharepointFile: sharepointFile || undefined,
        years: selectedYears,
      };

      onChange([...files, newFile]);

      // Check if there are more files to process
      const nextIndex = fileIndex + 1;
      if (nextIndex < pendingFiles.length) {
        setFileIndex(nextIndex);
        setCurrentFile(pendingFiles[nextIndex]);
        // Modal stays open for next file
      } else {
        // All files processed
        setModalOpen(false);
        setCurrentFile(null);
        setPendingFiles([]);
        setFileIndex(0);
      }
    } catch (error) {
      console.error('[FileUpload] Upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddWithDescription = async () => {
    if (!currentFile) return;

    const fileDescription = currentDescription || 'No description provided';
    setUploadError(null);
    setIsUploading(true);

    try {
      // Upload to SharePoint
      const sharepointFile = await uploadToSharePoint(currentFile, [], fileDescription);

      const newFile: FileWithYear = {
        file: sharepointFile ? undefined : currentFile,
        sharepointFile: sharepointFile || undefined,
        years: [],
        description: fileDescription,
      };

      onChange([...files, newFile]);

      // Check if there are more files to process
      const nextIndex = fileIndex + 1;
      if (nextIndex < pendingFiles.length) {
        setFileIndex(nextIndex);
        setCurrentFile(pendingFiles[nextIndex]);
        setCurrentDescription('');
      } else {
        // All files processed
        setCurrentFile(null);
        setCurrentDescription('');
        setPendingFiles([]);
        setFileIndex(0);
      }
    } catch (error) {
      console.error('[FileUpload] Upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    onChange(newFiles);
  };

  return (
    <div className="mb-7">
      <label className="block text-sm font-medium text-[color:var(--t-color-text-body)] mb-2">{label}</label>
      {description && (
        <p className="text-sm text-[color:var(--t-color-text-secondary)] mb-3">{description}</p>
      )}

      <div
        onClick={() => !isUploading && document.getElementById(`file-input-${testId}`)?.click()}
        className={`border-2 border-dashed border-[var(--t-color-border)] rounded-lg p-6 text-center bg-[#f8f9fb] transition-all ${
          isUploading
            ? 'cursor-wait opacity-60'
            : 'cursor-pointer hover:border-[var(--t-color-accent)] hover:bg-[#eff6ff]'
        }`}
        data-testid={`upload-area-${testId}`}
      >
        {isUploading ? (
          <>
            <Loader2 className="w-12 h-12 mx-auto mb-2 text-[color:var(--t-color-accent)] animate-spin" />
            <div className="text-[15px] text-[color:var(--t-color-text-body)] font-medium mb-1">
              Uploading to SharePoint...
            </div>
            <div className="text-sm text-[color:var(--t-color-text-muted)]">Please wait</div>
          </>
        ) : (
          <>
            <FileText className="w-12 h-12 mx-auto mb-2 text-[color:var(--t-color-text-secondary)]" />
            <div className="text-[15px] text-[color:var(--t-color-text-body)] font-medium mb-1">
              Click to upload {multiple ? 'files' : 'file'}
            </div>
            <div className="text-sm text-[color:var(--t-color-text-muted)]">PDF, XLSX, Images, Word (max. 10MB)</div>
          </>
        )}
        <input
          id={`file-input-${testId}`}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
          data-testid={`input-file-${testId}`}
        />
      </div>

      {/* Upload Error */}
      {uploadError && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          Upload failed: {uploadError}
        </div>
      )}

      {/* Description Input (for Other Files) */}
      {showDescription && currentFile && (
        <div className="mt-4 p-4 bg-[#f9fafb] border border-[var(--t-color-border)] rounded-lg">
          <p className="text-sm font-medium text-[color:var(--t-color-text-body)] mb-2">
            Add a description for: {currentFile.name}
          </p>
          <input
            type="text"
            value={currentDescription}
            onChange={(e) => setCurrentDescription(e.target.value)}
            placeholder="Enter file description..."
            className="w-full px-4 py-2 border border-[var(--t-color-border)] rounded-lg text-[15px] mb-3"
            data-testid="input-file-description"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAddWithDescription}
              className="px-4 py-2 bg-[var(--t-color-accent)] text-white rounded-md text-sm font-medium hover-elevate active-elevate-2"
              data-testid="button-add-with-description"
            >
              Add File
            </button>
            <button
              onClick={() => setCurrentFile(null)}
              className="px-4 py-2 bg-[var(--t-color-input-bg)] text-[#4b5563] rounded-md text-sm font-medium hover-elevate active-elevate-2"
              data-testid="button-cancel-description"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Uploaded Files List */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((fileData, index) => {
            const fileName = fileData.sharepointFile?.originalName || fileData.file?.name || 'Unknown file';
            const isUploaded = !!fileData.sharepointFile;

            return (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-white border border-[var(--t-color-border)] rounded-lg"
                data-testid={`file-item-${testId}-${index}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[color:var(--t-color-text-body)] truncate">
                      {fileName}
                    </span>
                    {isUploaded && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                        SharePoint
                      </span>
                    )}
                  </div>
                  {fileData.years && fileData.years.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {fileData.years.map((year) => (
                        <span
                          key={year}
                          className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[var(--t-color-accent)] text-white"
                          data-testid={`year-badge-${year}`}
                        >
                          {year}
                        </span>
                      ))}
                    </div>
                  )}
                  {fileData.description && (
                    <div className="text-xs text-[color:var(--t-color-text-secondary)] mt-1">
                      {fileData.description}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveFile(index)}
                  className="ml-3 text-[#ef4444] hover:text-[color:var(--t-color-danger-text)] cursor-pointer"
                  data-testid={`button-remove-file-${index}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Year Selection Modal */}
      <YearSelectionModal
        isOpen={modalOpen}
        filename={currentFile?.name || ''}
        onConfirm={handleYearConfirm}
        onCancel={() => {
          setModalOpen(false);
          setCurrentFile(null);
          setPendingFiles([]);
          setFileIndex(0);
        }}
        currentFileIndex={fileIndex}
        totalFiles={pendingFiles.length}
      />
    </div>
  );
}

'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, AlertCircle, Loader2 } from 'lucide-react';
import { useApplication } from '@/lib/applicationStore';
import { IndividualApplicant } from '@/lib/schema';
import FileTypeSelectionModal, { FileTypeOption } from './FileTypeSelectionModal';
import IndividualFileUploadModal, { IndividualFileTypeOption } from './IndividualFileUploadModal';
import YearSelectionModal from './YearSelectionModal';
import { authenticatedFormPost, authenticatedGet } from '@/lib/authenticatedFetch';
import { getFileUploadInstructions, FileUploadInstructions } from '@/services/firestore';
import { SharePointFileRef } from './FileUploadWithYearTags';

// SharePoint API response types
interface SharePointItem {
  id: string;
  name: string;
  modifiedDate: string;
  type: 'file' | 'folder';
  fileType?: string;
  path: string;
  children?: SharePointItem[];
}

// Known folder names for categorization
const KNOWN_FOLDERS = ['Business Applicant', 'Other Businesses', 'Project Files'];

interface CombinedFilesSectionProps {
  projectId?: string;
  sharepointFolderId?: string;
}

// Extended file reference with file type metadata
interface UploadedFile extends SharePointFileRef {
  fileType: string;
  fileTypeLabel: string;
  applicantName?: string;
}

type UploadSection = 'business' | 'individual' | 'other-businesses' | 'project';

/**
 * Generate a filename for upload based on file type, years, and optionally applicant name.
 *
 * Examples:
 * - Business with year: "2025 Business Federal Tax Returns.pdf"
 * - Business with multiple years: "2024, 2025 Business Federal Tax Returns.pdf"
 * - Business without year: "Interim Balance Sheet.pdf"
 * - Individual with year: "2025 John Smith Personal Federal Tax Returns.pdf"
 * - Individual without year: "John Smith Resume.pdf"
 */
function generateUploadFilename(
  originalFile: File,
  fileTypeLabel: string,
  years: number[],
  applicantName?: string
): string {
  // Extract extension from original filename
  const originalName = originalFile.name;
  const lastDotIndex = originalName.lastIndexOf('.');
  const extension = lastDotIndex !== -1 ? originalName.substring(lastDotIndex) : '';

  // Build the new filename
  const parts: string[] = [];

  // Add years if any (sorted ascending, comma-separated)
  if (years.length > 0) {
    const sortedYears = [...years].sort((a, b) => a - b);
    parts.push(sortedYears.join(', '));
  }

  // Add applicant name if provided
  if (applicantName) {
    parts.push(applicantName);
  }

  // Add file type label
  parts.push(fileTypeLabel);

  // Join parts with space and add extension
  return parts.join(' ') + extension;
}

/**
 * Create a new File object with a different name
 */
function renameFile(file: File, newName: string): File {
  return new File([file], newName, { type: file.type });
}

export default function CombinedFilesSection({ projectId, sharepointFolderId }: CombinedFilesSectionProps) {
  const [isAboutExpanded, setIsAboutExpanded] = useState(true);

  // Get application data from the store
  const { data } = useApplication();
  const individualApplicants = data.individualApplicants || [];
  const businessName = data.businessApplicant?.legalName || '';

  // File state for each section
  const [businessFiles, setBusinessFiles] = useState<UploadedFile[]>([]);
  const [individualFiles, setIndividualFiles] = useState<UploadedFile[]>([]);
  const [otherBusinessesFiles, setOtherBusinessesFiles] = useState<UploadedFile[]>([]);
  const [projectFilesState, setProjectFilesState] = useState<UploadedFile[]>([]);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingSection, setUploadingSection] = useState<UploadSection | null>(null);

  // Existing files state (fetched from SharePoint)
  const [existingBusinessFiles, setExistingBusinessFiles] = useState<string[]>([]);
  const [existingIndividualFiles, setExistingIndividualFiles] = useState<string[]>([]);
  const [existingOtherBusinessesFiles, setExistingOtherBusinessesFiles] = useState<string[]>([]);
  const [existingProjectFiles, setExistingProjectFiles] = useState<string[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [loadFilesError, setLoadFilesError] = useState<string | null>(null);

  // File upload instructions from Admin Settings
  const [uploadInstructions, setUploadInstructions] = useState<FileUploadInstructions>({
    businessApplicant: '',
    individualApplicants: '',
    otherBusinesses: '',
    projectFiles: '',
  });

  // Pending file state for modal flow
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingSection, setPendingSection] = useState<UploadSection | null>(null);

  // Modal states
  const [isBusinessFileTypeModalOpen, setIsBusinessFileTypeModalOpen] = useState(false);
  const [isIndividualModalOpen, setIsIndividualModalOpen] = useState(false);
  const [isYearModalOpen, setIsYearModalOpen] = useState(false);

  // Selected metadata for upload
  const [selectedFileType, setSelectedFileType] = useState<FileTypeOption | IndividualFileTypeOption | null>(null);
  const [selectedApplicant, setSelectedApplicant] = useState<IndividualApplicant | null>(null);

  // File input refs
  const businessInputRef = useRef<HTMLInputElement>(null);
  const individualInputRef = useRef<HTMLInputElement>(null);
  const otherBusinessesInputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);

  /**
   * Categorize files from SharePoint by folder structure.
   * - Business Applicant folder → businessFiles
   * - Other Businesses folder → otherBusinessesFiles
   * - Project Files folder → projectFiles
   * - Any other folders (individual applicant names) → individualFiles
   */
  const categorizeSharePointFiles = (items: SharePointItem[]) => {
    const business: string[] = [];
    const individual: string[] = [];
    const otherBusinesses: string[] = [];
    const projectFilesList: string[] = [];

    for (const item of items) {
      if (item.type === 'folder') {
        const folderName = item.name;
        const children = item.children || [];

        // Get all files from this folder
        const files = children.filter(child => child.type === 'file').map(f => f.name);

        if (folderName === 'Business Applicant') {
          business.push(...files);
        } else if (folderName === 'Other Businesses') {
          otherBusinesses.push(...files);
        } else if (folderName === 'Project Files') {
          projectFilesList.push(...files);
        } else if (!KNOWN_FOLDERS.includes(folderName)) {
          // Any unknown folder is assumed to be an individual applicant folder
          individual.push(...files);
        }
      }
    }

    return { business, individual, otherBusinesses, projectFiles: projectFilesList };
  };

  // Fetch file upload instructions from Admin Settings on component mount
  useEffect(() => {
    const fetchInstructions = async () => {
      try {
        const instructions = await getFileUploadInstructions();
        setUploadInstructions(instructions);
      } catch (error) {
        console.error('Error fetching file upload instructions:', error);
        // Keep default empty instructions on error
      }
    };

    fetchInstructions();
  }, []);

  // Fetch existing files from SharePoint on component mount
  useEffect(() => {
    const fetchExistingFiles = async () => {
      if (!projectId) {
        return;
      }

      setIsLoadingFiles(true);
      setLoadFilesError(null);

      try {
        const response = await authenticatedGet(`/api/sharepoint/files?projectId=${projectId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || data.error || 'Failed to fetch files');
        }

        if (data.success && data.items) {
          const categorized = categorizeSharePointFiles(data.items);
          setExistingBusinessFiles(categorized.business);
          setExistingIndividualFiles(categorized.individual);
          setExistingOtherBusinessesFiles(categorized.otherBusinesses);
          setExistingProjectFiles(categorized.projectFiles);
        }
      } catch (error) {
        console.error('[CombinedFilesSection] Error fetching existing files:', error);
        setLoadFilesError(error instanceof Error ? error.message : 'Failed to load existing files');
      } finally {
        setIsLoadingFiles(false);
      }
    };

    fetchExistingFiles();
  }, [projectId]);

  // Upload file to SharePoint
  const uploadToSharePoint = async (
    file: File,
    years: number[],
    subfolder?: string,
    applicantName?: string
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

    const response = await authenticatedFormPost('/api/sharepoint/upload', formData);
    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.message || 'Failed to upload file');
    }

    return {
      id: responseData.file.id,
      name: responseData.file.name,
      originalName: responseData.file.originalName,
      webUrl: responseData.file.webUrl,
      size: responseData.file.size,
      mimeType: responseData.file.mimeType,
      years: responseData.file.years || years,
      uploadedAt: new Date().toISOString(),
    };
  };

  // Handle file selection for Business Applicant section
  const handleBusinessFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPendingFile(file);
    setPendingSection('business');
    setIsBusinessFileTypeModalOpen(true);
    e.target.value = '';
  };

  // Handle file selection for Individual Applicants section
  const handleIndividualFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPendingFile(file);
    setPendingSection('individual');
    setIsIndividualModalOpen(true);
    e.target.value = '';
  };

  // Handle file selection for Other Businesses section (direct upload)
  const handleOtherBusinessesFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';
    setUploadError(null);
    setIsUploading(true);
    setUploadingSection('other-businesses');

    try {
      const sharepointFile = await uploadToSharePoint(file, [], 'Other Businesses');
      if (sharepointFile) {
        const uploadedFile: UploadedFile = {
          ...sharepointFile,
          fileType: 'other-businesses',
          fileTypeLabel: 'Other Business Documentation',
        };
        setOtherBusinessesFiles(prev => [...prev, uploadedFile]);
      }
    } catch (error) {
      console.error('[FileUpload] Upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      setUploadingSection(null);
    }
  };

  // Handle file selection for Project Files section (direct upload)
  const handleProjectFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';
    setUploadError(null);
    setIsUploading(true);
    setUploadingSection('project');

    try {
      const sharepointFile = await uploadToSharePoint(file, [], 'Project Files');
      if (sharepointFile) {
        const uploadedFile: UploadedFile = {
          ...sharepointFile,
          fileType: 'project-files',
          fileTypeLabel: 'Project Document',
        };
        setProjectFilesState(prev => [...prev, uploadedFile]);
      }
    } catch (error) {
      console.error('[FileUpload] Upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      setUploadingSection(null);
    }
  };

  // Handle Business file type selection
  const handleBusinessFileTypeSelect = (fileType: FileTypeOption) => {
    setSelectedFileType(fileType);
    setIsBusinessFileTypeModalOpen(false);

    if (fileType.requiresYearTag) {
      setIsYearModalOpen(true);
    } else {
      // Upload immediately without year tags
      uploadBusinessFile(fileType, []);
    }
  };

  // Handle Individual applicant and file type selection
  const handleIndividualSelect = (applicant: IndividualApplicant, fileType: IndividualFileTypeOption) => {
    setSelectedApplicant(applicant);
    setSelectedFileType(fileType);
    setIsIndividualModalOpen(false);

    if (fileType.requiresYearTag) {
      setIsYearModalOpen(true);
    } else {
      // Upload immediately without year tags
      uploadIndividualFile(applicant, fileType, []);
    }
  };

  // Handle year selection confirmation
  const handleYearConfirm = async (years: number[]) => {
    setIsYearModalOpen(false);

    if (pendingSection === 'business' && selectedFileType) {
      await uploadBusinessFile(selectedFileType as FileTypeOption, years);
    } else if (pendingSection === 'individual' && selectedApplicant && selectedFileType) {
      await uploadIndividualFile(selectedApplicant, selectedFileType as IndividualFileTypeOption, years);
    }
  };

  // Upload business file
  const uploadBusinessFile = async (fileType: FileTypeOption, years: number[]) => {
    if (!pendingFile) return;

    setUploadError(null);
    setIsUploading(true);
    setUploadingSection('business');

    try {
      // Generate new filename based on file type and years
      const newFilename = generateUploadFilename(pendingFile, fileType.label, years);
      const renamedFile = renameFile(pendingFile, newFilename);

      const sharepointFile = await uploadToSharePoint(renamedFile, years, 'Business Files');
      if (sharepointFile) {
        const uploadedFile: UploadedFile = {
          ...sharepointFile,
          fileType: fileType.id,
          fileTypeLabel: fileType.label,
          years,
        };
        setBusinessFiles(prev => [...prev, uploadedFile]);
      }
    } catch (error) {
      console.error('[FileUpload] Upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      setUploadingSection(null);
      resetPendingState();
    }
  };

  // Upload individual file
  const uploadIndividualFile = async (
    applicant: IndividualApplicant,
    fileType: IndividualFileTypeOption,
    years: number[]
  ) => {
    if (!pendingFile) return;

    const applicantName = `${applicant.firstName || ''} ${applicant.lastName || ''}`.trim();

    setUploadError(null);
    setIsUploading(true);
    setUploadingSection('individual');

    try {
      // Generate new filename based on file type, years, and applicant name
      const newFilename = generateUploadFilename(pendingFile, fileType.label, years, applicantName);
      const renamedFile = renameFile(pendingFile, newFilename);

      const sharepointFile = await uploadToSharePoint(renamedFile, years, undefined, applicantName);
      if (sharepointFile) {
        const uploadedFile: UploadedFile = {
          ...sharepointFile,
          fileType: fileType.id,
          fileTypeLabel: fileType.label,
          applicantName,
          years,
        };
        setIndividualFiles(prev => [...prev, uploadedFile]);
      }
    } catch (error) {
      console.error('[FileUpload] Upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      setUploadingSection(null);
      resetPendingState();
    }
  };

  // Reset pending state
  const resetPendingState = () => {
    setPendingFile(null);
    setPendingSection(null);
    setSelectedFileType(null);
    setSelectedApplicant(null);
  };

  // Cancel modal flow
  const handleModalCancel = () => {
    setIsBusinessFileTypeModalOpen(false);
    setIsIndividualModalOpen(false);
    setIsYearModalOpen(false);
    resetPendingState();
  };

  // Render upload area
  const renderUploadArea = (
    section: UploadSection,
    inputRef: React.RefObject<HTMLInputElement | null>,
    onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void,
    disabled: boolean = false
  ) => {
    const isThisSectionUploading = isUploading && uploadingSection === section;

    return (
      <div
        onClick={() => !isUploading && !disabled && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${
          disabled
            ? 'border-[#e5e7eb] bg-[#f9fafb] cursor-not-allowed opacity-60'
            : isThisSectionUploading
            ? 'border-[#d1d5db] bg-[#f8f9fb] cursor-wait opacity-60'
            : 'border-[#d1d5db] bg-[#f8f9fb] cursor-pointer hover:border-[#2563eb] hover:bg-[#eff6ff]'
        }`}
        data-testid={`upload-area-${section}`}
      >
        {isThisSectionUploading ? (
          <>
            <Loader2 className="w-12 h-12 mx-auto mb-2 text-[#2563eb] animate-spin" />
            <div className="text-[15px] text-[#1f2937] font-medium mb-1">
              Uploading to SharePoint...
            </div>
            <div className="text-sm text-[#9ca3af]">Please wait</div>
          </>
        ) : (
          <>
            <div className="text-4xl mb-2">📄</div>
            <div className="text-[15px] text-[#6b7280]">Click to upload files</div>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.xlsx,.xls,.doc,.docx,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.webp"
          onChange={onFileSelect}
          className="hidden"
          disabled={isUploading || disabled}
          data-testid={`input-file-${section}`}
        />
      </div>
    );
  };

  // Render file list (simplified - filename only)
  const renderFileList = (uploadedFiles: UploadedFile[], existingFiles: string[]) => {
    const hasUploadedFiles = uploadedFiles.length > 0;
    const hasExistingFiles = existingFiles.length > 0;

    if (!hasUploadedFiles && !hasExistingFiles && !isLoadingFiles) return null;

    return (
      <div className="mt-4 space-y-2">
        {/* Loading indicator */}
        {isLoadingFiles && (
          <div className="p-3 bg-[#f9fafb] border border-[#e5e7eb] rounded-lg flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-[#6b7280] animate-spin" />
            <span className="text-sm text-[#6b7280]">Loading files...</span>
          </div>
        )}

        {/* Existing files from SharePoint */}
        {existingFiles.map((filename, index) => (
          <div
            key={`existing-${index}`}
            className="p-3 bg-[#f9fafb] border border-[#e5e7eb] rounded-lg"
          >
            <span className="text-sm text-[#1f2937]">
              {filename}
            </span>
          </div>
        ))}

        {/* Newly uploaded files */}
        {uploadedFiles.map((file, index) => (
          <div
            key={`uploaded-${file.id}-${index}`}
            className="p-3 bg-[#f9fafb] border border-[#e5e7eb] rounded-lg"
          >
            <span className="text-sm text-[#1f2937]">
              {file.name}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <div className="p-4 sm:p-6 pb-3 sm:pb-4">
        <h1 className="text-[28px] font-bold text-[#1a1a1a]">File Uploads</h1>
      </div>

      {/* About This Section */}
      <div className="px-4 sm:px-6 mb-6">
        <div className="bg-[#f8fafc] border border-[#e5e7eb] rounded-lg p-4">
          <div
            className="flex items-start gap-3 cursor-pointer"
            onClick={() => setIsAboutExpanded(!isAboutExpanded)}
            data-testid="button-toggle-about-section"
          >
            <ChevronDown
              className={`w-5 h-5 text-[#6b7280] flex-shrink-0 mt-0.5 transition-transform duration-200 ${
                isAboutExpanded ? 'rotate-180' : 'rotate-0'
              }`}
            />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-[#374151] mb-1">About This Section</h3>
              {isAboutExpanded && (
                <div className="mt-2">
                  <p className="text-[15px] text-[#4b5563] leading-relaxed">
                    Please upload all required documents for your loan application. Organize your
                    files by category to help us process your application more efficiently.
                    Accepted formats include PDF, JPG, PNG, and common document formats.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Upload Error */}
      {uploadError && (
        <div className="px-4 sm:px-6 mb-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            Upload failed: {uploadError}
          </div>
        </div>
      )}

      {/* Load Files Error */}
      {loadFilesError && (
        <div className="px-4 sm:px-6 mb-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
            Could not load existing files: {loadFilesError}
          </div>
        </div>
      )}

      <div className="px-4 sm:px-6 space-y-6">
        {/* Business Applicant Section */}
        <div className="bg-white border border-[#e5e7eb] rounded-lg p-6">
          <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4 pb-3 border-b border-[#e5e7eb]">
            Business Applicant
          </h2>

          {uploadInstructions.businessApplicant && (
            <div className="mb-4">
              <p className="text-sm text-[#6b7280] whitespace-pre-wrap">
                {uploadInstructions.businessApplicant}
              </p>
            </div>
          )}

          {renderUploadArea('business', businessInputRef, handleBusinessFileSelect)}
          {renderFileList(businessFiles, existingBusinessFiles)}
        </div>

        {/* Individual Applicants Section */}
        <div className="bg-white border border-[#e5e7eb] rounded-lg p-6">
          <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4 pb-3 border-b border-[#e5e7eb]">
            Individual Applicants
          </h2>

          {individualApplicants.length === 0 ? (
            <div className="bg-[#fef3c7] border border-[#f59e0b] rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#d97706] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[15px] text-[#92400e] font-medium">No Individual Applicants</p>
                <p className="text-sm text-[#a16207] mt-1">
                  Please add individual applicants in the &quot;Individual Applicants&quot; step before uploading files.
                </p>
              </div>
            </div>
          ) : (
            <>
              {uploadInstructions.individualApplicants && (
                <div className="mb-4">
                  <p className="text-sm text-[#6b7280] whitespace-pre-wrap">
                    {uploadInstructions.individualApplicants}
                  </p>
                </div>
              )}

              {renderUploadArea('individual', individualInputRef, handleIndividualFileSelect)}
              {renderFileList(individualFiles, existingIndividualFiles)}
            </>
          )}
        </div>

        {/* Other Businesses Section */}
        <div className="bg-white border border-[#e5e7eb] rounded-lg p-6">
          <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4 pb-3 border-b border-[#e5e7eb]">
            Other Businesses
          </h2>

          {uploadInstructions.otherBusinesses && (
            <div className="mb-4">
              <p className="text-sm text-[#6b7280] whitespace-pre-wrap">
                {uploadInstructions.otherBusinesses}
              </p>
            </div>
          )}

          {renderUploadArea('other-businesses', otherBusinessesInputRef, handleOtherBusinessesFileSelect)}
          {renderFileList(otherBusinessesFiles, existingOtherBusinessesFiles)}
        </div>

        {/* Project Files Section */}
        <div className="bg-white border border-[#e5e7eb] rounded-lg p-6">
          <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4 pb-3 border-b border-[#e5e7eb]">
            Project Files
          </h2>

          {uploadInstructions.projectFiles && (
            <div className="mb-4">
              <p className="text-sm text-[#6b7280] whitespace-pre-wrap">
                {uploadInstructions.projectFiles}
              </p>
            </div>
          )}

          {renderUploadArea('project', projectInputRef, handleProjectFileSelect)}
          {renderFileList(projectFilesState, existingProjectFiles)}
        </div>
      </div>

      {/* Business File Type Selection Modal */}
      <FileTypeSelectionModal
        isOpen={isBusinessFileTypeModalOpen}
        filename={pendingFile?.name || ''}
        onSelect={handleBusinessFileTypeSelect}
        onCancel={handleModalCancel}
      />

      {/* Individual Applicant and File Type Selection Modal */}
      <IndividualFileUploadModal
        isOpen={isIndividualModalOpen}
        filename={pendingFile?.name || ''}
        applicants={individualApplicants}
        onSelect={handleIndividualSelect}
        onCancel={handleModalCancel}
      />

      {/* Year Selection Modal */}
      <YearSelectionModal
        isOpen={isYearModalOpen}
        filename={pendingFile?.name || ''}
        onConfirm={handleYearConfirm}
        onCancel={handleModalCancel}
      />
    </div>
  );
}

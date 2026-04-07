'use client';

import { useState, useRef } from 'react';
import { Upload, X, CheckCircle, AlertCircle, FileText, Loader2 } from 'lucide-react';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  category: string;
  years?: number[];
}

interface BrokerFileUploadProps {
  token: string;
  subfolder: 'Business Files' | 'Individual Files';
  category: string;
  label: string;
  description?: string;
  showYearTags?: boolean;
  accept?: string;
}

const currentYear = new Date().getFullYear();
const availableYears = [currentYear, currentYear - 1, currentYear - 2];

export default function BrokerFileUpload({
  token,
  subfolder,
  category,
  label,
  description,
  showYearTags = false,
  accept = '.pdf,.xlsx,.xls,.doc,.docx,.jpg,.jpeg,.png',
}: BrokerFileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB limit');
      return;
    }

    setError(null);

    if (showYearTags) {
      setPendingFile(file);
      setSelectedYears([]);
    } else {
      uploadFile(file);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFile = async (file: File, years?: number[]) => {
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('token', token);
      formData.append('subfolder', subfolder);
      formData.append('category', category);

      if (years && years.length > 0) {
        formData.append('years', JSON.stringify(years));
      }

      const response = await fetch('/api/broker/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Upload failed');
      }

      // Add to uploaded files list
      setUploadedFiles((prev) => [
        ...prev,
        {
          id: data.file.id,
          name: file.name,
          size: file.size,
          category,
          years,
        },
      ]);

      setPendingFile(null);
      setSelectedYears([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleYearToggle = (year: number) => {
    setSelectedYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]
    );
  };

  const handleConfirmUpload = () => {
    if (pendingFile) {
      uploadFile(pendingFile, selectedYears);
    }
  };

  const handleCancelUpload = () => {
    setPendingFile(null);
    setSelectedYears([]);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-900">{label}</h3>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>

      {/* Year Selection Modal */}
      {pendingFile && showYearTags && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-medium text-blue-900 mb-2">
            Select year(s) for: {pendingFile.name}
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {availableYears.map((year) => (
              <button
                key={year}
                type="button"
                onClick={() => handleYearToggle(year)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  selectedYears.includes(year)
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {year}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleConfirmUpload}
              disabled={uploading}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 inline animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload'
              )}
            </button>
            <button
              type="button"
              onClick={handleCancelUpload}
              disabled={uploading}
              className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-300 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Upload Area */}
      {!pendingFile && (
        <div
          className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
            uploading
              ? 'border-blue-300 bg-blue-50'
              : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
            id={`file-${category.replace(/\s+/g, '-')}`}
          />
          <label
            htmlFor={`file-${category.replace(/\s+/g, '-')}`}
            className={`cursor-pointer ${uploading ? 'cursor-not-allowed' : ''}`}
          >
            {uploading ? (
              <div className="flex flex-col items-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                <span className="text-sm text-blue-600">Uploading...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">
                  Click to upload or drag and drop
                </span>
                <span className="text-xs text-gray-400 mt-1">
                  PDF, Excel, Word, or images (max 10MB)
                </span>
              </div>
            )}
          </label>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Uploaded Files (session only) */}
      {uploadedFiles.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-gray-500 mb-2">
            Uploaded this session ({uploadedFiles.length})
          </p>
          <div className="space-y-2">
            {uploadedFiles
              .filter((f) => f.category === category)
              .map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-3 p-2 bg-green-50 border border-green-200 rounded-lg"
                >
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                      {file.years && file.years.length > 0 && (
                        <> &middot; {file.years.join(', ')}</>
                      )}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

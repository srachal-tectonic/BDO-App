'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { FileText, Download, Upload, Check, AlertCircle, Loader2, Building2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Form {
  id: string;
  formName: string;
  status: string;
  generatedAt: string;
  downloadedAt?: string;
}

interface PortalData {
  projectId: string;
  projectName: string;
  businessName: string;
  bdoName: string;
  forms: Form[];
}

interface UploadResult {
  filename: string;
  success: boolean;
  error?: string;
}

export default function PublicFormsPortalPage() {
  const params = useParams();
  const token = params?.token as string;

  const [portalData, setPortalData] = useState<PortalData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const [downloadingForms, setDownloadingForms] = useState<Set<string>>(new Set());
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [showUploadSuccess, setShowUploadSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (token) {
      loadPortalData();
    }
  }, [token]);

  const loadPortalData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/forms/${token}`);
      const data = await response.json();

      if (!response.ok) {
        setError({
          title: data.error || 'Error',
          message: data.message || 'An unexpected error occurred.',
        });
        return;
      }

      setPortalData(data);
    } catch (err) {
      console.error('Error loading portal data:', err);
      setError({
        title: 'Connection Error',
        message: 'Unable to connect to the server. Please check your internet connection and try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (formId: string) => {
    try {
      setDownloadingForms((prev) => new Set(prev).add(formId));

      // Open download in new tab/trigger download
      window.open(`/api/forms/${token}/download/${formId}`, '_blank');

      // Update local state to show downloaded
      setTimeout(() => {
        setPortalData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            forms: prev.forms.map((f) =>
              f.id === formId
                ? { ...f, status: f.status === 'pending' ? 'downloaded' : f.status, downloadedAt: new Date().toISOString() }
                : f
            ),
          };
        });
      }, 1000);
    } catch (err) {
      console.error('Error downloading form:', err);
    } finally {
      setTimeout(() => {
        setDownloadingForms((prev) => {
          const next = new Set(prev);
          next.delete(formId);
          return next;
        });
      }, 1500);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleUpload(files);
    }
  }, [token]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleUpload(files);
    }
    // Reset input
    e.target.value = '';
  };

  const handleUpload = async (files: File[]) => {
    if (!token || files.length === 0) return;

    try {
      setIsUploading(true);
      setUploadResults([]);
      setShowUploadSuccess(false);

      // Convert files to base64 using FileReader (most reliable method for binary data)
      const fileDataPromises = files.map((file) => {
        return new Promise<{ name: string; type: string; size: number; data: string }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            // Extract base64 data from data URL (format: "data:mime/type;base64,XXXXX")
            const base64 = dataUrl.split(',')[1];
            resolve({
              name: file.name,
              type: file.type,
              size: file.size,
              data: base64,
            });
          };
          reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
          reader.readAsDataURL(file);
        });
      });

      const fileData = await Promise.all(fileDataPromises);

      const response = await fetch(`/api/forms/${token}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ files: fileData }),
      });

      const data = await response.json();

      if (!response.ok) {
        setUploadResults([{ filename: 'Upload', success: false, error: data.error || 'Upload failed' }]);
        return;
      }

      setUploadResults(data.results || []);
      if (data.successCount > 0) {
        setShowUploadSuccess(true);
      }
    } catch (err) {
      console.error('Error uploading files:', err);
      setUploadResults([{ filename: 'Upload', success: false, error: 'Failed to upload files. Please try again.' }]);
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <Loader2 className="w-10 h-10 text-blue-600 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">Loading your documents...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{error.title}</h2>
            <p className="text-gray-600">{error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{portalData?.projectName}</h1>
              {portalData?.businessName && (
                <p className="text-sm text-gray-500">{portalData.businessName}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Welcome Message */}
        <Card>
          <CardContent className="py-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Welcome to Your Document Portal</h2>
            <p className="text-gray-600">
              Please download the forms below, complete them, and upload the signed documents.
              {portalData?.bdoName && (
                <> If you have any questions, please contact <span className="font-medium">{portalData.bdoName}</span>.</>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Forms to Download */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Download className="w-5 h-5 text-blue-600" />
              Forms to Download
            </CardTitle>
            <CardDescription>
              Download and complete these required forms
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {portalData?.forms.map((form) => (
                <div
                  key={form.id}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    form.downloadedAt ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    {form.downloadedAt ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <FileText className="w-5 h-5 text-gray-500" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">
                      {form.formName}
                    </h4>
                    {form.downloadedAt && (
                      <p className="text-xs text-gray-500 mt-1">
                        Downloaded {new Date(form.downloadedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  <Button
                    variant={form.downloadedAt ? 'outline' : 'default'}
                    size="sm"
                    onClick={() => handleDownload(form.id)}
                    disabled={downloadingForms.has(form.id)}
                    className="gap-2 flex-shrink-0"
                  >
                    {downloadingForms.has(form.id) ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        {form.downloadedAt ? 'Download Again' : 'Download'}
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Upload className="w-5 h-5 text-blue-600" />
              Upload Completed Documents
            </CardTitle>
            <CardDescription>
              Upload your signed and completed forms (PDF, images, Word, or Excel files up to 25MB each)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {showUploadSuccess && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-800">
                  <Check className="w-5 h-5" />
                  <span className="font-medium">Documents uploaded successfully!</span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  Your documents have been received and will be reviewed by your loan officer.
                </p>
              </div>
            )}

            {uploadResults.some((r) => !r.success) && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-800 mb-2">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">Some files could not be uploaded</span>
                </div>
                <ul className="text-sm text-red-700 space-y-1">
                  {uploadResults.filter((r) => !r.success).map((r, i) => (
                    <li key={i}>{r.filename}: {r.error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {isUploading ? (
                <div className="space-y-3">
                  <Loader2 className="w-10 h-10 text-blue-600 mx-auto animate-spin" />
                  <p className="text-gray-600">Uploading your documents...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
                    <Upload className="w-6 h-6 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-gray-700 font-medium">
                      Drag and drop files here, or click to browse
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      PDF, images, Word, Excel (max 25MB per file)
                    </p>
                  </div>
                  <label>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button variant="outline" className="cursor-pointer" asChild>
                      <span>Select Files</span>
                    </Button>
                  </label>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer Note */}
        <div className="text-center text-sm text-gray-500 pb-8">
          <p>This is a secure document portal. Your uploaded files are encrypted and can only be accessed by your loan officer.</p>
        </div>
      </main>
    </div>
  );
}

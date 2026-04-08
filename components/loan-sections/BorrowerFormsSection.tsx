'use client';

import { useEffect, useState } from 'react';
import { FileText, Send, Check, Clock, Download, AlertCircle, Copy, ExternalLink, Loader2, RefreshCw, Upload, File, ChevronDown, ChevronRight, CheckCircle, XCircle, Edit2, Play, Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getGeneratedForms, generateFormsForProject, deleteGeneratedForm, type GeneratedForm } from '@/services/firestore';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { ExtractionStatus, ExtractedFieldStatus, ExtractedFieldValue, ExtractionRecord } from '@/types';

interface BorrowerFormsSectionProps {
  projectId: string;
}

interface PortalTokenInfo {
  token: string | null;
  hasToken: boolean;
  isExpired?: boolean;
  isRevoked?: boolean;
  expiresAt?: string;
}

interface BorrowerUpload {
  id: string;
  filename: string;
  originalName: string;
  uploadedAt: string;
  fileSize: number;
  mimeType: string;
  extractionStatus?: ExtractionStatus;
  detectedFormType?: string;
  extractionId?: string;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'pending':
      return <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">Pending</Badge>;
    case 'downloaded':
      return <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50">Downloaded</Badge>;
    case 'uploaded':
      return <Badge variant="outline" className="text-purple-600 border-purple-300 bg-purple-50">Uploaded</Badge>;
    case 'imported':
      return <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">Completed</Badge>;
    case 'error':
      return <Badge variant="destructive">Error</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
}

function getExtractionStatusBadge(status?: ExtractionStatus) {
  switch (status) {
    case 'pending':
      return <Badge variant="outline" className="text-gray-600 border-gray-300 bg-gray-50">Pending Extraction</Badge>;
    case 'extracting':
      return <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50">Extracting...</Badge>;
    case 'extracted':
      return <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">Ready for Review</Badge>;
    case 'reviewed':
      return <Badge variant="outline" className="text-purple-600 border-purple-300 bg-purple-50">Reviewed</Badge>;
    case 'applied':
      return <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">Data Applied</Badge>;
    case 'failed':
      return <Badge variant="destructive">Extraction Failed</Badge>;
    case 'not_applicable':
      return <Badge variant="outline" className="text-gray-500 border-gray-200 bg-gray-50">N/A</Badge>;
    default:
      return null;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.9) return 'text-green-600';
  if (confidence >= 0.7) return 'text-amber-600';
  return 'text-red-600';
}

function getFieldStatusIcon(status: ExtractedFieldStatus) {
  switch (status) {
    case 'approved':
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    case 'rejected':
      return <XCircle className="w-4 h-4 text-red-600" />;
    case 'edited':
      return <Edit2 className="w-4 h-4 text-blue-600" />;
    default:
      return <Clock className="w-4 h-4 text-gray-400" />;
  }
}

export default function BorrowerFormsSection({ projectId }: BorrowerFormsSectionProps) {
  const { currentUser, userInfo } = useFirebaseAuth();
  const [forms, setForms] = useState<GeneratedForm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [portalToken, setPortalToken] = useState<PortalTokenInfo | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(false);
  const [isRegeneratingToken, setIsRegeneratingToken] = useState(false);
  const [borrowerUploads, setBorrowerUploads] = useState<BorrowerUpload[]>([]);
  const [isLoadingUploads, setIsLoadingUploads] = useState(false);

  // Extraction review state
  const [expandedUpload, setExpandedUpload] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<ExtractionRecord | null>(null);
  const [isLoadingExtraction, setIsLoadingExtraction] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [isApplying, setIsApplying] = useState(false);
  const [isSavingReview, setIsSavingReview] = useState(false);

  useEffect(() => {
    if (projectId) {
      loadForms();
      loadPortalToken();
      loadBorrowerUploads();
    }
  }, [projectId]);

  const loadForms = async () => {
    try {
      setIsLoading(true);
      const formsData = await getGeneratedForms(projectId);
      setForms(formsData);
    } catch (error) {
      console.error('Error loading forms:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPortalToken = async () => {
    try {
      setIsLoadingToken(true);
      const response = await fetch(`/api/projects/${projectId}/portal-token`);
      if (response.ok) {
        const data = await response.json();
        setPortalToken(data);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error loading portal token:', response.status, errorData);
        // Show error details for debugging
        if (errorData.details) {
          console.error('Server error details:', errorData.details, errorData.code);
        }
      }
    } catch (error) {
      console.error('Error loading portal token:', error);
    } finally {
      setIsLoadingToken(false);
    }
  };

  const loadBorrowerUploads = async () => {
    try {
      setIsLoadingUploads(true);
      const response = await fetch(`/api/projects/${projectId}/borrower-uploads`);
      if (response.ok) {
        const data = await response.json();
        setBorrowerUploads(data.uploads || []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error loading borrower uploads:', response.status, errorData);
        // Show error details for debugging
        if (errorData.details) {
          console.error('Server error details:', errorData.details, errorData.code);
        }
      }
    } catch (error) {
      console.error('Error loading borrower uploads:', error);
    } finally {
      setIsLoadingUploads(false);
    }
  };

  const loadExtraction = async (uploadId: string) => {
    try {
      setIsLoadingExtraction(true);
      const response = await fetch(`/api/projects/${projectId}/borrower-uploads/${uploadId}/extraction`);
      if (response.ok) {
        const data = await response.json();
        setExtraction(data.extraction);
      }
    } catch (error) {
      console.error('Error loading extraction:', error);
    } finally {
      setIsLoadingExtraction(false);
    }
  };

  const handleGenerateForms = async () => {
    try {
      setIsGenerating(true);
      const generatedForms = await generateFormsForProject(projectId);
      setForms(generatedForms);

      // Also generate a portal token if we don't have one
      if (!portalToken?.hasToken || portalToken?.isExpired || portalToken?.isRevoked) {
        await createPortalToken();
      }

      alert(`${generatedForms.length} forms have been generated for the borrower.`);
    } catch (error) {
      console.error('Error generating forms:', error);
      alert('Failed to generate forms. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const createPortalToken = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/portal-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          createdBy: currentUser?.uid || 'unknown',
          createdByName: userInfo?.displayName || currentUser?.email || 'Unknown User',
          expirationDays: 30,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setPortalToken({
          token: data.token,
          hasToken: true,
          expiresAt: data.expiresAt,
        });
        return data.token;
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error creating portal token:', response.status, errorData);

        // Show detailed error in development
        const details = errorData.details ? `: ${errorData.details}` : '';
        alert(`Failed to create portal link${details}`);
      }
    } catch (error) {
      console.error('Error creating portal token:', error);
      alert('Network error. Please check your connection and try again.');
    }
    return null;
  };

  const handleRegenerateToken = async () => {
    try {
      setIsRegeneratingToken(true);
      const token = await createPortalToken();
      if (token) {
        alert('A new portal link has been generated. The previous link is no longer valid.');
      } else {
        alert('Failed to generate new link. Please try again.');
      }
    } finally {
      setIsRegeneratingToken(false);
    }
  };

  const getPortalUrl = () => {
    if (portalToken?.token) {
      return `${typeof window !== 'undefined' ? window.location.origin : ''}/forms/${portalToken.token}`;
    }
    return null;
  };

  const copyPortalLink = async () => {
    let url = getPortalUrl();

    // If no valid token, create one first
    if (!url) {
      const token = await createPortalToken();
      if (token) {
        url = `${window.location.origin}/forms/${token}`;
      }
    }

    if (url) {
      navigator.clipboard.writeText(url);
      alert('The borrower portal link has been copied to your clipboard.');
    } else {
      alert('Failed to generate portal link. Please try again.');
    }
  };

  const openPortal = async () => {
    let url = getPortalUrl();

    // If no valid token, create one first
    if (!url) {
      const token = await createPortalToken();
      if (token) {
        url = `/forms/${token}`;
      }
    }

    if (url) {
      window.open(url.startsWith('http') ? `/forms/${portalToken?.token}` : url, '_blank');
    } else {
      alert('Failed to generate portal link. Please try again.');
    }
  };

  const handleDownloadForm = (formId: string) => {
    window.open(`/api/generated-forms/${formId}/download`, '_blank');
  };

  const handleDownloadBorrowerUpload = (uploadId: string) => {
    window.open(`/api/projects/${projectId}/borrower-uploads/${uploadId}/download`, '_blank');
  };

  const handleDeleteForm = async (formId: string, formName: string) => {
    if (!confirm(`Are you sure you want to delete "${formName}"? This cannot be undone.`)) return;

    try {
      await deleteGeneratedForm(formId);
      setForms((prev) => prev.filter((f) => f.id !== formId));
    } catch (error) {
      console.error('Error deleting form:', error);
      alert('Failed to delete form. Please try again.');
    }
  };

  const handleDeleteUpload = async (uploadId: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"? This will also remove any extracted data. This cannot be undone.`)) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/borrower-uploads/${uploadId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setBorrowerUploads((prev) => prev.filter((u) => u.id !== uploadId));
        if (expandedUpload === uploadId) {
          setExpandedUpload(null);
          setExtraction(null);
        }
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete upload');
      }
    } catch (error) {
      console.error('Error deleting upload:', error);
      alert('Failed to delete upload. Please try again.');
    }
  };

  const handleToggleUploadExpand = async (uploadId: string) => {
    if (expandedUpload === uploadId) {
      setExpandedUpload(null);
      setExtraction(null);
    } else {
      setExpandedUpload(uploadId);
      setEditedValues({});
      setEditingField(null);
      await loadExtraction(uploadId);
    }
  };

  const handleTriggerExtraction = async (uploadId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/borrower-uploads/${uploadId}/extract`, {
        method: 'POST',
      });

      if (response.ok) {
        await loadBorrowerUploads();
        await loadExtraction(uploadId);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to extract data from PDF');
      }
    } catch (error) {
      console.error('Error triggering extraction:', error);
      alert('Failed to trigger extraction');
    }
  };

  const handleFieldStatusChange = async (pdfFieldName: string, status: ExtractedFieldStatus, editedValue?: string) => {
    if (!extraction) return;

    setIsSavingReview(true);
    try {
      const update: { pdfFieldName: string; status: ExtractedFieldStatus; editedValue?: string } = {
        pdfFieldName,
        status,
      };

      if (editedValue !== undefined) {
        update.editedValue = editedValue;
      }

      const response = await fetch(`/api/projects/${projectId}/borrower-uploads/${expandedUpload}/extraction`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extractionId: extraction.id,
          fieldUpdates: [update],
          reviewedBy: currentUser?.uid,
          reviewedByName: userInfo?.displayName || currentUser?.email,
        }),
      });

      if (response.ok) {
        // Update local state
        setExtraction({
          ...extraction,
          fields: extraction.fields.map((f) =>
            f.pdfFieldName === pdfFieldName
              ? { ...f, status, ...(editedValue !== undefined && { editedValue }) }
              : f
          ),
        });
        setEditingField(null);
        setEditedValues((prev) => {
          const next = { ...prev };
          delete next[pdfFieldName];
          return next;
        });
      }
    } catch (error) {
      console.error('Error updating field status:', error);
    } finally {
      setIsSavingReview(false);
    }
  };

  const handleApplyExtraction = async () => {
    if (!extraction || !expandedUpload) return;

    setIsApplying(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/borrower-uploads/${expandedUpload}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extractionId: extraction.id,
          appliedBy: currentUser?.uid,
          appliedByName: userInfo?.displayName || currentUser?.email,
          overwriteExisting: false,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`Successfully applied ${data.fieldsApplied} field(s) to the loan application.`);
        await loadBorrowerUploads();
        await loadExtraction(expandedUpload);
      } else if (data.conflicts && data.conflicts.length > 0) {
        const confirmOverwrite = confirm(
          `${data.conflicts.length} field(s) already have values. Do you want to overwrite them?\n\n` +
          data.conflicts.map((c: { field: string; existingValue: unknown; newValue: unknown }) =>
            `${c.field}: "${c.existingValue}" → "${c.newValue}"`
          ).join('\n')
        );

        if (confirmOverwrite) {
          const retryResponse = await fetch(`/api/projects/${projectId}/borrower-uploads/${expandedUpload}/apply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              extractionId: extraction.id,
              appliedBy: currentUser?.uid,
              appliedByName: userInfo?.displayName || currentUser?.email,
              overwriteExisting: true,
            }),
          });

          const retryData = await retryResponse.json();
          if (retryData.success) {
            alert(`Successfully applied ${retryData.fieldsApplied} field(s) to the loan application.`);
            await loadBorrowerUploads();
            await loadExtraction(expandedUpload);
          } else {
            alert(retryData.error || 'Failed to apply extracted data');
          }
        }
      } else {
        alert(data.error || 'Failed to apply extracted data');
      }
    } catch (error) {
      console.error('Error applying extraction:', error);
      alert('Failed to apply extracted data');
    } finally {
      setIsApplying(false);
    }
  };

  const approveAllFields = async () => {
    if (!extraction) return;

    setIsSavingReview(true);
    try {
      const fieldUpdates = extraction.fields
        .filter((f) => f.mappedSection && f.mappedPath && f.status === 'pending')
        .map((f) => ({
          pdfFieldName: f.pdfFieldName,
          status: 'approved' as ExtractedFieldStatus,
        }));

      if (fieldUpdates.length === 0) {
        alert('No pending fields to approve');
        return;
      }

      const response = await fetch(`/api/projects/${projectId}/borrower-uploads/${expandedUpload}/extraction`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extractionId: extraction.id,
          fieldUpdates,
          reviewedBy: currentUser?.uid,
          reviewedByName: userInfo?.displayName || currentUser?.email,
        }),
      });

      if (response.ok) {
        await loadExtraction(expandedUpload!);
      }
    } catch (error) {
      console.error('Error approving all fields:', error);
    } finally {
      setIsSavingReview(false);
    }
  };

  const completedForms = forms.filter(f => f.status === 'imported' || f.status === 'uploaded').length;
  const totalForms = forms.length;
  const downloadedCount = forms.filter(f => f.downloadedAt).length;

  const mappedFields = extraction?.fields.filter((f) => f.mappedSection && f.mappedPath) || [];
  const approvedFields = mappedFields.filter((f) => f.status === 'approved' || f.status === 'edited');
  const canApply = approvedFields.length > 0 && extraction?.status !== 'applied';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[28px] font-bold text-[color:var(--t-color-text-body)]">Borrower Forms</h2>
        <p className="text-[color:var(--t-color-text-secondary)] mt-1">
          Generate fillable PDF forms for borrowers to complete and upload.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[color:var(--t-color-accent)]" />
            Generate Forms for Borrower
          </CardTitle>
          <CardDescription>
            Generate project-specific PDF forms pre-filled with available data.
            Borrowers can download, complete, and upload these forms.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={handleGenerateForms}
              disabled={isGenerating}
              className="gap-2"
              data-testid="button-generate-forms"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : forms.length > 0 ? (
                <>
                  <FileText className="w-4 h-4" />
                  Regenerate Forms
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Generate Forms
                </>
              )}
            </Button>

            {forms.length > 0 && (
              <>
                <Button
                  variant="outline"
                  onClick={copyPortalLink}
                  className="gap-2"
                  data-testid="button-copy-link"
                >
                  <Copy className="w-4 h-4" />
                  Copy Portal Link
                </Button>

                <Button
                  variant="outline"
                  onClick={openPortal}
                  className="gap-2"
                  data-testid="button-open-portal"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Portal
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="inline-block animate-spin w-8 h-8 border-4 border-[var(--t-color-accent)] border-t-transparent rounded-full"></div>
            <p className="text-[color:var(--t-color-text-secondary)] mt-4">Loading forms...</p>
          </CardContent>
        </Card>
      ) : forms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 text-[color:var(--t-color-text-muted)] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[color:var(--t-color-text-body)] mb-2">No Forms Generated</h3>
            <p className="text-[color:var(--t-color-text-secondary)] max-w-md mx-auto">
              Click &quot;Generate Forms&quot; to create project-specific PDF forms for the borrower to complete.
              Forms will be pre-filled with any data you&apos;ve already entered.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Generated Forms</CardTitle>
                <CardDescription>
                  {downloadedCount} of {totalForms} forms downloaded by borrower
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[color:var(--t-color-text-secondary)]" />
                <span className="text-sm text-[color:var(--t-color-text-secondary)]">
                  {forms.length > 0 && forms[0].generatedAt && (
                    <>Generated {new Date(forms[0].generatedAt).toLocaleDateString()}</>
                  )}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {forms.map((form) => (
                <div
                  key={form.id}
                  className="flex items-center gap-4 p-4 bg-[#f8f9fa] rounded-lg border border-[var(--t-color-border)]"
                  data-testid={`form-item-${form.id}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    form.status === 'imported' ? 'bg-green-100' :
                    form.status === 'uploaded' ? 'bg-purple-100' :
                    form.status === 'downloaded' ? 'bg-blue-100' :
                    form.status === 'error' ? 'bg-red-100' :
                    'bg-gray-100'
                  }`}>
                    {form.status === 'imported' ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : form.status === 'uploaded' ? (
                      <Upload className="w-5 h-5 text-purple-600" />
                    ) : form.status === 'downloaded' ? (
                      <Download className="w-5 h-5 text-blue-600" />
                    ) : form.status === 'error' ? (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    ) : (
                      <FileText className="w-5 h-5 text-gray-600" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-[color:var(--t-color-text-body)] truncate">
                      {form.formName}
                    </h4>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {getStatusBadge(form.status)}
                      {form.downloadedAt && (
                        <span className="text-xs text-[color:var(--t-color-text-secondary)]">
                          Borrower downloaded {new Date(form.downloadedAt).toLocaleDateString()}
                        </span>
                      )}
                      {form.uploadedAt && (
                        <span className="text-xs text-[color:var(--t-color-text-secondary)]">
                          Uploaded {new Date(form.uploadedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownloadForm(form.id)}
                      className="gap-2"
                      data-testid={`button-download-${form.id}`}
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteForm(form.id, form.formName)}
                      className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      data-testid={`button-delete-form-${form.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Portal Link Section */}
      {forms.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <h3 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
              <Send className="w-4 h-4" />
              Share with Borrower
            </h3>
            <p className="text-sm text-blue-800 mb-4">
              Copy the portal link below and send it to your borrower. They can download, fill out,
              and upload all required forms through this secure portal.
            </p>

            {portalToken?.hasToken && !portalToken.isExpired && !portalToken.isRevoked ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <code className="flex-1 bg-white px-3 py-2 rounded border border-blue-200 text-sm text-blue-900 overflow-x-auto">
                    {getPortalUrl()}
                  </code>
                  <Button
                    size="sm"
                    onClick={copyPortalLink}
                    className="gap-2 flex-shrink-0"
                    data-testid="button-copy-portal-link"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </Button>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  {portalToken.expiresAt && (
                    <span className="text-blue-700">
                      Expires: {new Date(portalToken.expiresAt).toLocaleDateString()}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRegenerateToken}
                    disabled={isRegeneratingToken}
                    className="gap-2 text-blue-700 hover:text-blue-900 hover:bg-blue-100"
                  >
                    {isRegeneratingToken ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Regenerate Link
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-blue-700">
                  {portalToken?.isExpired ? 'Link has expired.' : portalToken?.isRevoked ? 'Link has been revoked.' : 'No portal link generated yet.'}
                </span>
                <Button
                  size="sm"
                  onClick={copyPortalLink}
                  className="gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Generate & Copy Link
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Borrower Uploads Section */}
      {forms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Upload className="w-5 h-5 text-[color:var(--t-color-accent)]" />
              Borrower Uploads
            </CardTitle>
            <CardDescription>
              Documents uploaded by the borrower through the portal. PDF data is automatically extracted for review.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingUploads ? (
              <div className="py-8 text-center">
                <Loader2 className="w-6 h-6 text-[color:var(--t-color-accent)] mx-auto animate-spin" />
                <p className="text-[color:var(--t-color-text-secondary)] mt-2">Loading uploads...</p>
              </div>
            ) : borrowerUploads.length === 0 ? (
              <div className="py-8 text-center">
                <File className="w-10 h-10 text-[color:var(--t-color-text-muted)] mx-auto mb-3" />
                <p className="text-[color:var(--t-color-text-secondary)]">No documents uploaded yet</p>
                <p className="text-sm text-[color:var(--t-color-text-muted)] mt-1">
                  Uploads will appear here when the borrower submits documents through the portal.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {borrowerUploads.map((upload) => (
                  <div key={upload.id} className="border border-[var(--t-color-border)] rounded-lg overflow-hidden">
                    <div
                      className={`flex items-center gap-4 p-4 bg-[#f8f9fa] cursor-pointer hover:bg-[#f0f1f3] transition-colors ${
                        expandedUpload === upload.id ? 'border-b border-[var(--t-color-border)]' : ''
                      }`}
                      onClick={() => handleToggleUploadExpand(upload.id)}
                    >
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <File className="w-5 h-5 text-green-600" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-[color:var(--t-color-text-body)] truncate">
                          {upload.originalName}
                        </h4>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="text-xs text-[color:var(--t-color-text-secondary)]">{formatFileSize(upload.fileSize)}</span>
                          <span className="text-xs text-[color:var(--t-color-text-secondary)]">Uploaded {new Date(upload.uploadedAt).toLocaleDateString()}</span>
                          {getExtractionStatusBadge(upload.extractionStatus)}
                          {upload.detectedFormType && (
                            <Badge variant="outline" className="text-xs">
                              {upload.detectedFormType.replace('sba_', 'SBA ').replace('irs_', 'IRS ')}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadBorrowerUpload(upload.id);
                          }}
                          className="gap-2"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteUpload(upload.id, upload.originalName);
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        {upload.mimeType === 'application/pdf' && (
                          expandedUpload === upload.id ? (
                            <ChevronDown className="w-5 h-5 text-[color:var(--t-color-text-secondary)]" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-[color:var(--t-color-text-secondary)]" />
                          )
                        )}
                      </div>
                    </div>

                    {/* Extraction Review Panel */}
                    {expandedUpload === upload.id && upload.mimeType === 'application/pdf' && (
                      <div className="p-4 bg-white">
                        {isLoadingExtraction ? (
                          <div className="py-6 text-center">
                            <Loader2 className="w-6 h-6 text-[color:var(--t-color-accent)] mx-auto animate-spin" />
                            <p className="text-[color:var(--t-color-text-secondary)] mt-2">Loading extraction data...</p>
                          </div>
                        ) : !extraction ? (
                          <div className="py-6 text-center">
                            <Eye className="w-8 h-8 text-[color:var(--t-color-text-muted)] mx-auto mb-3" />
                            <p className="text-[color:var(--t-color-text-secondary)] mb-3">No extraction data available</p>
                            {upload.extractionStatus === 'failed' ? (
                              <Button
                                size="sm"
                                onClick={() => handleTriggerExtraction(upload.id)}
                                className="gap-2"
                              >
                                <Play className="w-4 h-4" />
                                Retry Extraction
                              </Button>
                            ) : upload.extractionStatus === 'pending' ? (
                              <Button
                                size="sm"
                                onClick={() => handleTriggerExtraction(upload.id)}
                                className="gap-2"
                              >
                                <Play className="w-4 h-4" />
                                Extract Data
                              </Button>
                            ) : null}
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {/* Empty Fields Warning */}
                            {extraction.possibleIssues?.includes('ALL_FIELDS_EMPTY') && (
                              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                <div className="flex items-start gap-2">
                                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                  <div>
                                    <p className="text-sm font-medium text-amber-800">All form fields are empty</p>
                                    <p className="text-xs text-amber-700 mt-1">
                                      The uploaded PDF appears to be a blank template or the form data was not saved properly.
                                      Please ensure the borrower fills out the form using Adobe Acrobat or Reader and saves it before uploading.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                            {extraction.possibleIssues?.includes('MOSTLY_EMPTY') && !extraction.possibleIssues?.includes('ALL_FIELDS_EMPTY') && (
                              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                <div className="flex items-start gap-2">
                                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                  <div>
                                    <p className="text-sm font-medium text-amber-800">Most form fields are empty</p>
                                    <p className="text-xs text-amber-700 mt-1">
                                      Only {extraction.filledFields} of {extraction.mappedFields} mapped fields have values.
                                      The form may be incomplete or some data was not saved properly.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Extraction Summary */}
                            <div className="flex items-center justify-between pb-3 border-b border-[var(--t-color-border)]">
                              <div className="flex items-center gap-4 flex-wrap">
                                <div className="text-sm">
                                  <span className="text-[color:var(--t-color-text-secondary)]">Form Type:</span>{' '}
                                  <span className="font-medium">{extraction.formType?.replace('sba_', 'SBA ').replace('irs_', 'IRS ') || 'Unknown'}</span>
                                </div>
                                <div className="text-sm">
                                  <span className="text-[color:var(--t-color-text-secondary)]">Fields with Values:</span>{' '}
                                  <span className={`font-medium ${extraction.filledFields === 0 ? 'text-red-600' : extraction.filledFields < extraction.mappedFields / 2 ? 'text-amber-600' : 'text-green-600'}`}>
                                    {extraction.filledFields || 0} / {extraction.mappedFields}
                                  </span>
                                </div>
                                <div className="text-sm">
                                  <span className="text-[color:var(--t-color-text-secondary)]">Avg Confidence:</span>{' '}
                                  <span className={`font-medium ${getConfidenceColor(extraction.averageConfidence)}`}>
                                    {(extraction.averageConfidence * 100).toFixed(0)}%
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {extraction.status !== 'applied' && mappedFields.some((f) => f.status === 'pending') && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={approveAllFields}
                                    disabled={isSavingReview}
                                    className="gap-2"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                    Approve All
                                  </Button>
                                )}
                                {canApply && (
                                  <Button
                                    size="sm"
                                    onClick={handleApplyExtraction}
                                    disabled={isApplying}
                                    className="gap-2"
                                  >
                                    {isApplying ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Play className="w-4 h-4" />
                                    )}
                                    Apply to Application
                                  </Button>
                                )}
                                {extraction.status === 'applied' && (
                                  <Badge className="bg-green-100 text-green-800 border-green-200">
                                    <Check className="w-3 h-3 mr-1" />
                                    Applied
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Field List */}
                            {mappedFields.length === 0 ? (
                              <p className="text-[color:var(--t-color-text-secondary)] text-center py-4">
                                No mappable fields found in this document.
                              </p>
                            ) : (
                              <div className="space-y-2 max-h-96 overflow-y-auto">
                                {mappedFields.map((field) => (
                                  <div
                                    key={field.pdfFieldName}
                                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                                      field.status === 'approved' ? 'bg-green-50 border-green-200' :
                                      field.status === 'rejected' ? 'bg-red-50 border-red-200' :
                                      field.status === 'edited' ? 'bg-blue-50 border-blue-200' :
                                      'bg-gray-50 border-gray-200'
                                    }`}
                                  >
                                    {getFieldStatusIcon(field.status)}

                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm truncate">
                                          {field.mappedLabel || field.pdfFieldName}
                                        </span>
                                        <span className={`text-xs ${getConfidenceColor(field.confidence)}`}>
                                          {(field.confidence * 100).toFixed(0)}%
                                        </span>
                                      </div>
                                      <div className="text-xs text-[color:var(--t-color-text-secondary)] mt-0.5">
                                        {field.mappedSection} → {field.mappedPath}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      {editingField === field.pdfFieldName ? (
                                        <>
                                          <Input
                                            value={editedValues[field.pdfFieldName] ?? String(field.transformedValue ?? field.rawValue ?? '')}
                                            onChange={(e) => setEditedValues((prev) => ({ ...prev, [field.pdfFieldName]: e.target.value }))}
                                            className="w-40 h-8 text-sm"
                                            onClick={(e) => e.stopPropagation()}
                                          />
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleFieldStatusChange(
                                              field.pdfFieldName,
                                              'edited',
                                              editedValues[field.pdfFieldName]
                                            )}
                                            disabled={isSavingReview}
                                          >
                                            <Check className="w-4 h-4" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => {
                                              setEditingField(null);
                                              setEditedValues((prev) => {
                                                const next = { ...prev };
                                                delete next[field.pdfFieldName];
                                                return next;
                                              });
                                            }}
                                          >
                                            <XCircle className="w-4 h-4" />
                                          </Button>
                                        </>
                                      ) : (
                                        <>
                                          <span
                                            className={`text-sm font-mono bg-white px-2 py-1 rounded border max-w-[200px] truncate ${
                                              (field.transformedValue === null || field.transformedValue === undefined || field.transformedValue === '') &&
                                              (field.rawValue === null || field.rawValue === undefined || field.rawValue === '') &&
                                              field.status !== 'edited'
                                                ? 'text-gray-400 italic'
                                                : ''
                                            }`}
                                            title={
                                              (field.transformedValue === null || field.transformedValue === undefined || field.transformedValue === '') &&
                                              (field.rawValue === null || field.rawValue === undefined || field.rawValue === '') &&
                                              field.status !== 'edited'
                                                ? 'No value found in PDF - field was empty'
                                                : undefined
                                            }
                                          >
                                            {field.status === 'edited'
                                              ? String(field.editedValue ?? '')
                                              : (field.transformedValue !== null && field.transformedValue !== undefined && field.transformedValue !== '')
                                                ? String(field.transformedValue)
                                                : (field.rawValue !== null && field.rawValue !== undefined && field.rawValue !== '')
                                                  ? String(field.rawValue)
                                                  : '(empty)'}
                                          </span>
                                          {extraction.status !== 'applied' && (
                                            <>
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setEditingField(field.pdfFieldName)}
                                                className="h-8 w-8 p-0"
                                                title="Edit value"
                                              >
                                                <Edit2 className="w-4 h-4" />
                                              </Button>
                                              {field.status !== 'approved' && (
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  onClick={() => handleFieldStatusChange(field.pdfFieldName, 'approved')}
                                                  disabled={isSavingReview}
                                                  className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                  title="Approve"
                                                >
                                                  <CheckCircle className="w-4 h-4" />
                                                </Button>
                                              )}
                                              {field.status !== 'rejected' && (
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  onClick={() => handleFieldStatusChange(field.pdfFieldName, 'rejected')}
                                                  disabled={isSavingReview}
                                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                  title="Reject"
                                                >
                                                  <XCircle className="w-4 h-4" />
                                                </Button>
                                              )}
                                            </>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Help text for empty fields */}
                            {extraction.filledFields === 0 && extraction.mappedFields > 0 && (
                              <div className="text-xs text-[color:var(--t-color-text-secondary)] pt-3 border-t border-[var(--t-color-border)]">
                                <p className="font-medium mb-1">Why are all fields showing &quot;(empty)&quot;?</p>
                                <ul className="list-disc list-inside space-y-0.5 text-[color:var(--t-color-text-muted)]">
                                  <li>The PDF may be a blank template (not filled out)</li>
                                  <li>The form was filled using a PDF viewer that doesn&apos;t save form data</li>
                                  <li>The PDF was &quot;flattened&quot; after filling (converted to static image)</li>
                                </ul>
                                <p className="mt-2 text-[color:var(--t-color-text-secondary)]">
                                  For best results, have borrowers fill forms using Adobe Acrobat or Adobe Reader and save before uploading.
                                </p>
                              </div>
                            )}

                            {/* Applied Info */}
                            {extraction.appliedBy && extraction.appliedAt && (
                              <div className="text-xs text-[color:var(--t-color-text-secondary)] pt-2 border-t border-[var(--t-color-border)]">
                                Applied by {extraction.appliedByName || extraction.appliedBy} on{' '}
                                {new Date(extraction.appliedAt).toLocaleString()}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {borrowerUploads.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[var(--t-color-border)]">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadBorrowerUploads}
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh Uploads
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

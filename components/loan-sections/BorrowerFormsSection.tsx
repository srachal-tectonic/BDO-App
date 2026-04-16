'use client';

import { useEffect, useRef, useState } from 'react';
import { FileText, Send, Check, Clock, Download, AlertCircle, Copy, ExternalLink, Loader2, RefreshCw, Upload, File, ChevronDown, ChevronRight, CheckCircle, XCircle, Edit2, Play, Eye, Trash2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getGeneratedForms, generateFormsForProject, deleteGeneratedForm, type GeneratedForm } from '@/services/firestore';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { useApplication } from '@/lib/applicationStore';
import { ExtractionStatus, ExtractedFieldStatus, ExtractedFieldValue, ExtractionRecord } from '@/types';

/** Form IDs that are per-individual (not per-business). */
const INDIVIDUAL_FORM_IDS = new Set([
  'blank-individual-applicant',
  'individual-pfi-worksheet',
]);

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
  const { data: appData } = useApplication();
  const individuals = appData.individualApplicants || [];

  const [forms, setForms] = useState<GeneratedForm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [portalToken, setPortalToken] = useState<PortalTokenInfo | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(false);
  const [isRegeneratingToken, setIsRegeneratingToken] = useState(false);
  const [borrowerUploads, setBorrowerUploads] = useState<BorrowerUpload[]>([]);
  const [isLoadingUploads, setIsLoadingUploads] = useState(false);

  // Per-form selected individual (keyed by form ID)
  const [selectedIndividual, setSelectedIndividual] = useState<Record<string, string>>({});

  // Extraction review state
  const [expandedUpload, setExpandedUpload] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<ExtractionRecord | null>(null);
  const [isLoadingExtraction, setIsLoadingExtraction] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [isApplying, setIsApplying] = useState(false);
  const [isSavingReview, setIsSavingReview] = useState(false);

  // Import filled envelope PDF (Business Applicant / Project Information) to
  // auto-populate project data via /api/projects/[id]/envelope-pdf/apply
  const importFilledFormInputRef = useRef<HTMLInputElement>(null);
  const [isImportingFilledForm, setIsImportingFilledForm] = useState(false);

  const handleImportFilledForm = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('Please select a PDF file.');
      if (importFilledFormInputRef.current) importFilledFormInputRef.current.value = '';
      return;
    }

    setIsImportingFilledForm(true);
    try {
      const base64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1] ?? '');
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      const res = await fetch(`/api/projects/${projectId}/envelope-pdf/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, pdfData: base64 }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const payload = await res.json();
      const extracted = payload.extractedFieldCount ?? 0;
      const nonEmpty = payload.nonEmptyFieldCount ?? 0;
      const mapped = payload.mappedFieldCount ?? 0;
      const applied = payload.appliedFieldCount ?? 0;

      if (applied === 0) {
        alert(
          `Imported "${file.name}" but 0 fields were applied.\n\n` +
          `• ${extracted} total AcroForm fields found in the PDF\n` +
          `• ${nonEmpty} of those had a non-empty value\n` +
          `• ${mapped} matched the expected envelope field naming (ba_*, ia*_*, po_*, si_*, sba_*, oob*_*)\n` +
          `• ${applied} were actually written to the project\n\n` +
          `This usually means the uploaded PDF was not produced by the T Bank envelope generator, so its field names don't match. Open the server console for a sample of the actual field names.`
        );
      } else {
        alert(
          `Imported "${file.name}". Applied ${applied} field(s) to the loan application ` +
          `(${mapped} matched the envelope map, ${nonEmpty}/${extracted} non-empty). ` +
          `Reload the page to see the updated data on the loan application tabs.`
        );
      }
    } catch (err: any) {
      console.error('Filled-form import failed:', err);
      alert(`Import failed: ${err?.message ?? 'Could not process the PDF file'}`);
    } finally {
      setIsImportingFilledForm(false);
      if (importFilledFormInputRef.current) importFilledFormInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (projectId) {
      loadForms();
      loadPortalToken();
      // Borrower uploads card was removed; no longer fetching that list.
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
        <h2 className="text-lg font-semibold text-[color:var(--t-color-text-primary)] uppercase tracking-wider">Borrower Forms</h2>
        <p className="text-[color:var(--t-color-text-muted)] mt-1">
          Generate fillable PDF forms for borrowers to complete and upload.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[color:var(--t-color-text-primary)] font-bold">
            <FileText className="w-5 h-5 text-[color:var(--t-color-primary)]" />
            Generate Forms for Borrower
          </CardTitle>
          <CardDescription className="text-[color:var(--t-color-text-muted)]">
            Generate project-specific PDF forms pre-filled with available data.
            Borrowers can download, complete, and upload these forms.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={handleGenerateForms}
              disabled={isGenerating}
              className="gap-2 bg-[var(--t-color-primary)] hover:bg-[var(--t-color-primary-light)] text-white"
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
          </div>

          {/* Shared hidden file input — the per-form Import buttons below click this. */}
          <input
            ref={importFilledFormInputRef}
            type="file"
            accept=".pdf"
            onChange={handleImportFilledForm}
            className="hidden"
            data-testid="input-import-filled-form"
          />
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
                <CardTitle className="text-lg text-[color:var(--t-color-text-primary)] font-bold">Generated Forms</CardTitle>
                <CardDescription className="text-[color:var(--t-color-text-muted)]">
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
                  className="flex items-center gap-4 p-4 bg-[var(--t-color-page-bg)] rounded-lg border border-[var(--t-color-border)]"
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
                    {INDIVIDUAL_FORM_IDS.has(form.id) && individuals.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[color:var(--t-color-text-secondary)] flex-shrink-0" />
                        <select
                          value={selectedIndividual[form.id] || ''}
                          onChange={(e) => setSelectedIndividual(prev => ({ ...prev, [form.id]: e.target.value }))}
                          className="text-sm border border-[var(--t-color-border)] rounded-md px-2 py-1.5 bg-[var(--t-color-card-bg)] text-[color:var(--t-color-text-body)] focus:border-[var(--t-color-accent)] focus:outline-none focus:shadow-[0_0_0_2px_rgba(37,99,235,0.1)] min-w-[160px]"
                          data-testid={`select-individual-${form.id}`}
                        >
                          <option value="">Select Individual</option>
                          {individuals.map((ind) => (
                            <option key={ind.id} value={ind.id}>
                              {[ind.firstName, ind.lastName].filter(Boolean).join(' ') || 'Unnamed'}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
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
                      onClick={() => importFilledFormInputRef.current?.click()}
                      disabled={isImportingFilledForm}
                      className="gap-2"
                      data-testid={`button-import-${form.id}`}
                    >
                      {isImportingFilledForm ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Import
                        </>
                      )}
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
        <Card className="bg-[var(--t-color-info-bg)] border-[var(--t-color-info-border)]">
          <CardContent className="p-6">
            <h3 className="font-medium text-[color:var(--t-color-text-primary)] mb-2 flex items-center gap-2">
              <Send className="w-4 h-4" />
              Share with Borrower
            </h3>
            <p className="text-sm text-[color:var(--t-color-text-secondary)] mb-4">
              Copy the portal link below and send it to your borrower. They can download, fill out,
              and upload all required forms through this secure portal.
            </p>

            {portalToken?.hasToken && !portalToken.isExpired && !portalToken.isRevoked ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <code className="flex-1 bg-[var(--t-color-card-bg)] px-3 py-2 rounded border border-[var(--t-color-info-border)] text-sm text-[color:var(--t-color-text-primary)] overflow-x-auto">
                    {getPortalUrl()}
                  </code>
                  <Button
                    size="sm"
                    onClick={copyPortalLink}
                    className="gap-2 flex-shrink-0 bg-[var(--t-color-primary)] hover:bg-[var(--t-color-primary-light)] text-white"
                    data-testid="button-copy-portal-link"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </Button>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  {portalToken.expiresAt && (
                    <span className="text-[color:var(--t-color-text-secondary)]">
                      Expires: {new Date(portalToken.expiresAt).toLocaleDateString()}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRegenerateToken}
                    disabled={isRegeneratingToken}
                    className="gap-2 text-[color:var(--t-color-primary-light)] hover:text-[color:var(--t-color-primary)] hover:bg-[var(--t-color-primary-palest)]"
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
                <span className="text-sm text-[color:var(--t-color-text-secondary)]">
                  {portalToken?.isExpired ? 'Link has expired.' : portalToken?.isRevoked ? 'Link has been revoked.' : 'No portal link generated yet.'}
                </span>
                <Button
                  size="sm"
                  onClick={copyPortalLink}
                  className="gap-2 bg-[var(--t-color-primary)] hover:bg-[var(--t-color-primary-light)] text-white"
                >
                  <Copy className="w-4 h-4" />
                  Generate & Copy Link
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

    </div>
  );
}

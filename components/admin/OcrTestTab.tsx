'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { authenticatedFetch, authenticatedFormPost, authenticatedGet } from '@/lib/authenticatedFetch';
import { validateFile, isDangerousExtension, FILE_SIZE_LIMITS } from '@/lib/fileValidation';
import type { OcrTestResult } from '@/types';
import { AlertCircle, FileScan, Loader2, ScanText, Trash2, Upload } from 'lucide-react';

const OCR_ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff'];
const ACCEPT_ATTR = '.pdf,.jpg,.jpeg,.png,.tif,.tiff';

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatConfidence(confidence?: number): string {
  if (confidence === undefined || confidence === null) return '—';
  return `${Math.round(confidence * 100)}%`;
}

function confidenceClass(confidence?: number): string {
  if (confidence === undefined || confidence === null) return 'text-muted-foreground';
  if (confidence < 0.7) return 'text-amber-600 font-medium';
  return 'text-green-700';
}

export function OcrTestTab() {
  const [results, setResults] = useState<OcrTestResult[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<OcrTestResult | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadResults = useCallback(async () => {
    try {
      const response = await authenticatedGet('/api/ocr-test');
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Failed to load results (HTTP ${response.status})`);
      }
      const data = await response.json();
      setResults(data.results || []);
      setConfigured(data.configured !== false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load OCR test results');
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  const handleUpload = async (file: File) => {
    setError(null);

    if (isDangerousExtension(file.name)) {
      setError('File type not allowed for security reasons.');
      return;
    }
    const validation = validateFile(file, {
      maxSize: FILE_SIZE_LIMITS.document,
      allowedTypes: OCR_ALLOWED_TYPES,
    });
    if (!validation.valid) {
      setError(validation.error || 'File failed validation.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await authenticatedFormPost('/api/ocr-test', formData);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // A failed analysis (502) still persists a history row — show it
        if (data.result) {
          setResults((prev) => [data.result, ...prev]);
        }
        throw new Error(data.error || `Upload failed (HTTP ${response.status})`);
      }

      setResults((prev) => [data.result, ...prev]);
      setSelected(data.result);
      setShowRaw(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSelect = async (result: OcrTestResult) => {
    setError(null);
    setSelected(result);
    setShowRaw(false);
    // List rows don't carry the heavy payloads — fetch the full document
    if (result.extracted || result.status === 'failed') return;
    setDetailLoading(true);
    try {
      const response = await authenticatedGet(`/api/ocr-test/${result.id}`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Failed to load result (HTTP ${response.status})`);
      }
      const full: OcrTestResult = await response.json();
      setSelected(full);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load result details');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleShowRaw = async () => {
    setShowRaw(true);
    // The upload response omits rawResult — fetch the full doc on first toggle
    if (selected && selected.rawResult === undefined && !selected.rawTruncated && selected.status === 'succeeded') {
      setDetailLoading(true);
      try {
        const response = await authenticatedGet(`/api/ocr-test/${selected.id}`);
        if (response.ok) {
          const full: OcrTestResult = await response.json();
          setSelected(full);
        }
      } finally {
        setDetailLoading(false);
      }
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setError(null);
    try {
      const response = await authenticatedFetch(`/api/ocr-test/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Delete failed (HTTP ${response.status})`);
      }
      setResults((prev) => prev.filter((r) => r.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const sortedFields = selected?.extracted
    ? Object.entries(selected.extracted.fields)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ScanText className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">OCR Test</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Upload a document to analyze it with the Azure Document Intelligence custom model. The file
        itself is not stored — only the extracted results are kept for review.
      </p>

      {!configured && (
        <Alert variant="destructive" data-testid="alert-ocr-not-configured">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Document Intelligence not configured</AlertTitle>
          <AlertDescription>
            Set <code>AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT</code>,{' '}
            <code>AZURE_DOCUMENT_INTELLIGENCE_KEY</code>, and{' '}
            <code>AZURE_DOCUMENT_INTELLIGENCE_MODEL_ID</code> in the environment, then restart the app.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" data-testid="alert-ocr-error">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload Document</CardTitle>
          <CardDescription>
            PDF, JPEG, PNG, or TIFF — up to {Math.round(FILE_SIZE_LIMITS.document / (1024 * 1024))}MB.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_ATTR}
            className="hidden"
            data-testid="input-ocr-file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
            }}
          />
          <div className="flex items-center gap-4">
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || !configured}
              data-testid="button-ocr-upload"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              {uploading ? 'Analyzing…' : 'Select File'}
            </Button>
            {uploading && (
              <span className="text-sm text-muted-foreground">
                Analyzing with Document Intelligence… this can take up to ~30 seconds.
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Previous Uploads</CardTitle>
          <CardDescription>Click a row to view its extraction results.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingList ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : results.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4" data-testid="text-ocr-empty">
              No documents have been analyzed yet.
            </p>
          ) : (
            <Table data-testid="table-ocr-results">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fields</TableHead>
                  <TableHead>Doc Type</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result) => (
                  <TableRow
                    key={result.id}
                    className={`cursor-pointer ${selected?.id === result.id ? 'bg-muted/50' : ''}`}
                    onClick={() => handleSelect(result)}
                    data-testid={`row-ocr-result-${result.id}`}
                  >
                    <TableCell className="font-medium max-w-[240px] truncate" title={result.fileName}>
                      {result.fileName}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatTimestamp(result.createdAt)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatFileSize(result.fileSize)}</TableCell>
                    <TableCell>
                      {result.status === 'succeeded' ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-transparent">
                          Succeeded
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Failed</Badge>
                      )}
                    </TableCell>
                    <TableCell>{result.fieldCount ?? '—'}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {result.docType ? (
                        <span title={`Confidence: ${formatConfidence(result.docConfidence)}`}>
                          {result.docType}{' '}
                          <span className={`text-xs ${confidenceClass(result.docConfidence)}`}>
                            ({formatConfidence(result.docConfidence)})
                          </span>
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={(e) => handleDelete(e, result.id)}
                        data-testid={`button-ocr-delete-${result.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail */}
      {selected && (
        <Card data-testid="card-ocr-detail">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileScan className="w-4 h-4 text-primary shrink-0" />
                <CardTitle className="text-base truncate" title={selected.fileName}>
                  {selected.fileName}
                </CardTitle>
                {selected.status === 'succeeded' ? (
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-transparent">
                    Succeeded
                  </Badge>
                ) : (
                  <Badge variant="destructive">Failed</Badge>
                )}
              </div>
              {selected.status === 'succeeded' && (
                <div className="flex gap-1">
                  <Button
                    variant={!showRaw ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setShowRaw(false)}
                    data-testid="button-ocr-view-extracted"
                  >
                    Extracted
                  </Button>
                  <Button
                    variant={showRaw ? 'default' : 'outline'}
                    size="sm"
                    onClick={handleShowRaw}
                    data-testid="button-ocr-view-raw"
                  >
                    Raw JSON
                  </Button>
                </div>
              )}
            </div>
            <CardDescription>
              Model: {selected.modelId}
              {selected.durationMs !== undefined && ` · Analyzed in ${(selected.durationMs / 1000).toFixed(1)}s`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {detailLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading result…
              </div>
            ) : selected.status === 'failed' ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Analysis failed</AlertTitle>
                <AlertDescription>{selected.error || 'No error details recorded.'}</AlertDescription>
              </Alert>
            ) : showRaw ? (
              selected.rawTruncated ? (
                <p className="text-sm text-muted-foreground">
                  The raw response was too large to store and is unavailable. The extracted view is
                  still complete.
                </p>
              ) : (
                <pre
                  className="text-xs bg-muted rounded-md p-4 overflow-auto max-h-[500px]"
                  data-testid="pre-ocr-raw-json"
                >
                  {JSON.stringify(selected.rawResult, null, 2)}
                </pre>
              )
            ) : (
              <div className="space-y-6">
                {sortedFields.length > 0 ? (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">
                      Extracted Fields ({sortedFields.length})
                    </h3>
                    <Table data-testid="table-ocr-fields">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Field</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead className="w-28">Confidence</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedFields.map(([name, field]) => (
                          <TableRow key={name}>
                            <TableCell className="font-medium whitespace-nowrap">{name}</TableCell>
                            <TableCell className="whitespace-pre-wrap break-words">
                              {field.value === null || field.value === '' ? (
                                <span className="text-muted-foreground italic">(empty)</span>
                              ) : (
                                String(field.value)
                              )}
                            </TableCell>
                            <TableCell className={confidenceClass(field.confidence)}>
                              {formatConfidence(field.confidence)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    The model did not extract any fields from this document.
                  </p>
                )}

                {selected.extracted?.content && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Full Text</h3>
                    <pre
                      className="text-xs bg-muted rounded-md p-4 overflow-auto max-h-[400px] whitespace-pre-wrap"
                      data-testid="pre-ocr-content"
                    >
                      {selected.extracted.content}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

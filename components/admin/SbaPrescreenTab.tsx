'use client';

import { useRef, useState } from 'react';
import { saveAs } from 'file-saver';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSbaPrescreen } from '@/hooks/useSbaPrescreen';
import type { DiligencePhase } from '@/hooks/useDiligenceReport';
import { MarkdownBody } from '@/components/diligence/DiligenceReportPanel';
import { markdownToDocxBlob } from '@/lib/markdownToDocx';
import {
  AlertCircle,
  BookOpen,
  Brain,
  FileDown,
  FileSpreadsheet,
  FileText,
  Loader2,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';

const MAX_PDF_MB = 25;
const MAX_EXCEL_MB = 15;

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function StreamingStatus({ phase }: { phase: DiligencePhase }) {
  let icon = <Brain className="w-4 h-4 text-[#2563eb]" />;
  let label = 'The agent is reading the documents…';
  if (phase === 'researching') {
    icon = <Search className="w-4 h-4 text-[#2563eb] animate-pulse" />;
    label = 'The agent is running research / analysis tools…';
  } else if (phase === 'writing') {
    icon = <BookOpen className="w-4 h-4 text-[#2563eb]" />;
    label = 'Generating the prescreen document…';
  }

  return (
    <div
      className="px-4 py-3 rounded-md border border-[#e7edf4] bg-[#f7faff]"
      data-testid={`status-sba-prescreen-phase-${phase || 'thinking'}`}
    >
      <div className="flex items-center gap-2">
        <span className="relative flex w-2 h-2">
          <span className="absolute inline-flex w-full h-full rounded-full bg-[#2563eb] opacity-50 animate-ping" />
          <span className="relative inline-flex w-2 h-2 rounded-full bg-[#2563eb]" />
        </span>
        {icon}
        <span className="text-[13px] text-[#133c7f] font-medium">{label}</span>
      </div>
    </div>
  );
}

function FilePicker({
  label,
  description,
  accept,
  file,
  disabled,
  icon,
  testId,
  onSelect,
  onClear,
}: {
  label: string;
  description: string;
  accept: string;
  file: File | null;
  disabled: boolean;
  icon: React.ReactNode;
  testId: string;
  onSelect: (file: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex-1 min-w-[260px] border rounded-md p-4 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon}
        {label}
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        data-testid={`input-${testId}`}
        onChange={(e) => {
          const selected = e.target.files?.[0];
          if (selected) onSelect(selected);
          e.target.value = '';
        }}
      />
      {file ? (
        <div className="flex items-center gap-2 text-sm">
          <span className="truncate font-medium" title={file.name}>
            {file.name}
          </span>
          <span className="text-xs text-muted-foreground shrink-0">
            ({formatFileSize(file.size)})
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
            onClick={onClear}
            disabled={disabled}
            data-testid={`button-clear-${testId}`}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          data-testid={`button-${testId}`}
        >
          <Upload className="w-4 h-4 mr-2" />
          Select File
        </Button>
      )}
    </div>
  );
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export function SbaPrescreenTab() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const { result, document, isStreaming, phase, streamedText, error, generate } =
    useSbaPrescreen();

  const displayText = isStreaming ? streamedText : result?.reportText || streamedText;

  const handlePdfSelect = (file: File) => {
    setFileError(null);
    if (!/\.pdf$/i.test(file.name)) {
      setFileError('The application document must be a .pdf file.');
      return;
    }
    if (file.size > MAX_PDF_MB * 1024 * 1024) {
      setFileError(`PDF exceeds the ${MAX_PDF_MB}MB limit.`);
      return;
    }
    setPdfFile(file);
  };

  const handleExcelSelect = (file: File) => {
    setFileError(null);
    if (!/\.(xlsx|xls|xlsm)$/i.test(file.name)) {
      setFileError('The financial document must be an Excel workbook (.xlsx, .xls, or .xlsm).');
      return;
    }
    if (file.size > MAX_EXCEL_MB * 1024 * 1024) {
      setFileError(`Excel workbook exceeds the ${MAX_EXCEL_MB}MB limit.`);
      return;
    }
    setExcelFile(file);
  };

  const handleRun = () => {
    if (!pdfFile || !excelFile) return;
    setFileError(null);
    generate(pdfFile, excelFile);
  };

  const handleDownload = () => {
    // Normal path: the .docx the agent generated and attached to its response.
    if (document) {
      saveAs(base64ToBlob(document.data, DOCX_MIME), document.filename);
      return;
    }
    // Fallback: the agent replied with text only — convert it locally so the
    // run isn't lost.
    const text = result?.reportText || streamedText;
    if (!text) return;
    const baseName = (pdfFile?.name || 'Prescreen').replace(/\.pdf$/i, '').replace(/[^a-z0-9]/gi, '_');
    saveAs(markdownToDocxBlob(text), `SBA_Prescreen_${baseName}_${Date.now()}.docx`);
  };

  const canDownload = !!document || !!(result?.reportText || streamedText);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">SBA Prescreen</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Upload an application PDF and a financial Excel workbook, then run the Foundry{' '}
        <code>sba-prequal-quick-screen</code> agent. The agent generates the quick-screen Word
        (.docx) document itself and returns it for download. Nothing is stored — the documents go
        straight to the agent and only this page ever sees the result.
      </p>

      {(error || fileError) && (
        <Alert variant="destructive" data-testid="alert-sba-prescreen-error">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{fileError || error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Documents</CardTitle>
          <CardDescription>
            Both documents are required. PDF up to {MAX_PDF_MB}MB; Excel up to {MAX_EXCEL_MB}MB.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <FilePicker
              label="Application PDF"
              description="The application / narrative document (.pdf)."
              accept=".pdf"
              file={pdfFile}
              disabled={isStreaming}
              icon={<FileText className="w-4 h-4 text-primary" />}
              testId="sba-prescreen-pdf"
              onSelect={handlePdfSelect}
              onClear={() => setPdfFile(null)}
            />
            <FilePicker
              label="Financial Workbook"
              description="The financial spreadsheet (.xlsx, .xls, or .xlsm)."
              accept=".xlsx,.xls,.xlsm"
              file={excelFile}
              disabled={isStreaming}
              icon={<FileSpreadsheet className="w-4 h-4 text-primary" />}
              testId="sba-prescreen-excel"
              onSelect={handleExcelSelect}
              onClear={() => setExcelFile(null)}
            />
          </div>
          <Button
            onClick={handleRun}
            disabled={!pdfFile || !excelFile || isStreaming}
            data-testid="button-sba-prescreen-run"
          >
            {isStreaming ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            {isStreaming ? 'Running…' : result ? 'Run Again' : 'Run Prescreen'}
          </Button>
        </CardContent>
      </Card>

      {(isStreaming || displayText || result) && (
        <Card data-testid="card-sba-prescreen-output">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="min-w-0">
                <CardTitle className="text-base truncate">
                  {document ? document.filename : 'Prescreen Result'}
                </CardTitle>
                {result && !isStreaming && (
                  <CardDescription>
                    Model: {result.model} · Generated{' '}
                    {new Date(result.generatedAt).toLocaleString('en-US')}
                    {result.excelTruncated
                      ? ' · Workbook was truncated to fit the model context'
                      : ''}
                    {!document
                      ? ' · No file attached by the agent — download converts the text reply'
                      : ''}
                  </CardDescription>
                )}
              </div>
              {!isStreaming && canDownload && (
                <Button
                  size="sm"
                  onClick={handleDownload}
                  data-testid="button-sba-prescreen-download"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Download .docx
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isStreaming && <StreamingStatus phase={phase} />}
            {displayText ? (
              <div data-testid="text-sba-prescreen-memo">
                <MarkdownBody markdown={displayText} />
              </div>
            ) : (
              isStreaming && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Waiting for the first response from the agent…
                </div>
              )
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

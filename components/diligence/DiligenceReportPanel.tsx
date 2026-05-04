'use client';

import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  AlertTriangle,
  BookOpen,
  Brain,
  Check,
  Copy,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';
import { useDiligenceReport, type DiligencePhase } from '@/hooks/useDiligenceReport';
import { useToast } from '@/hooks/use-toast';

interface Props {
  projectId: string;
  legalName?: string;
  industry?: string;
  naicsCode?: string;
  primaryProjectPurpose?: string;
}

export default function DiligenceReportPanel({
  projectId,
  legalName,
  industry,
  naicsCode,
  primaryProjectPurpose,
}: Props) {
  const {
    report,
    isLoading,
    isStreaming,
    phase,
    streamedText,
    searchQueries,
    error,
    generate,
  } = useDiligenceReport(projectId);
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const missingFields = useMemo(() => {
    const missing: string[] = [];
    if (!legalName?.trim()) missing.push('Legal Name');
    if (!industry?.trim()) missing.push('Industry');
    if (!naicsCode?.trim()) missing.push('NAICS Code');
    if (!primaryProjectPurpose?.trim()) missing.push('Primary Project Purpose');
    return missing;
  }, [legalName, industry, naicsCode, primaryProjectPurpose]);

  const canGenerate = missingFields.length === 0;
  const tooltip = !canGenerate ? `Missing required fields: ${missingFields.join(', ')}` : '';

  const displayText = isStreaming ? streamedText : report?.reportText || '';
  const hasContent = displayText.length > 0;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast({ title: 'Copied', description: 'Report copied to clipboard' });
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Could not copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  const runGenerate = () => {
    if (!canGenerate || isStreaming) return;
    return generate();
  };

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center py-16 text-[#718bbc]"
        data-testid="status-diligence-loading"
      >
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        <span className="text-[13px]">Loading report…</span>
      </div>
    );
  }

  if (!isStreaming && !report) {
    return (
      <div className="p-8" data-testid="panel-diligence-empty">
        <div className="border border-dashed border-[#c5d4e8] rounded-lg p-10 text-center max-w-2xl mx-auto bg-[#f7faff]">
          <Sparkles className="w-10 h-10 text-[#2563eb] mx-auto mb-4" />
          <h2 className="text-[18px] font-semibold text-[#133c7f] mb-2">
            AI-Powered Due Diligence Report
          </h2>
          <p className="text-[13px] text-[#4263a5] mb-6 leading-relaxed">
            Claude will research the applicant using public web sources, verify entity status,
            industry context, local market, online reputation, and known risk factors. Reports
            typically take 2-4 minutes to generate.
          </p>
          <div title={tooltip} className="inline-block">
            <button
              onClick={runGenerate}
              disabled={!canGenerate}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#2563eb] text-white text-[13px] font-semibold rounded-md transition-all hover-elevate active-elevate-2 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-generate-diligence"
            >
              <Sparkles className="w-4 h-4" />
              Generate Diligence Report
            </button>
          </div>
          {!canGenerate && (
            <p
              className="text-[12px] text-[#a1b3d2] mt-4"
              data-testid="text-missing-fields"
            >
              Missing: {missingFields.join(', ')}
            </p>
          )}
          {error && (
            <p
              className="text-[12px] text-red-600 mt-4"
              data-testid="text-diligence-error"
            >
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white" data-testid="panel-diligence-report">
      <div className="sticky top-0 z-10 bg-white border-b border-[#c5d4e8] px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Sparkles className="w-4 h-4 text-[#2563eb] shrink-0" />
          <div className="min-w-0">
            <h2
              className="text-[14px] font-semibold text-[#133c7f] truncate"
              data-testid="text-diligence-title"
            >
              Due Diligence — {legalName || 'Applicant'}
            </h2>
            <p className="text-[11px] text-[#718bbc]" data-testid="text-diligence-meta">
              {report
                ? `Generated ${new Date(report.generatedAt).toLocaleString('en-US')} · ${report.model}`
                : isStreaming
                ? `Streaming · ${phase || 'starting'}`
                : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {hasContent && (
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium text-[#133c7f] bg-white border border-[#c5d4e8] rounded-md transition-all hover-elevate active-elevate-2"
              data-testid="button-copy-diligence"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          )}
          <div title={tooltip} className="inline-block">
            <button
              onClick={runGenerate}
              disabled={!canGenerate || isStreaming}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium text-white bg-[#2563eb] rounded-md transition-all hover-elevate active-elevate-2 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-regenerate-diligence"
            >
              {isStreaming ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              {isStreaming ? 'Generating…' : 'Regenerate'}
            </button>
          </div>
        </div>
      </div>

      {isStreaming && <StreamingStatus phase={phase} searchQueries={searchQueries} />}

      {error && !isStreaming && (
        <div
          className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2"
          data-testid="error-diligence"
        >
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <p className="text-[12px] text-red-700">{error}</p>
        </div>
      )}

      <div className="px-8 py-6">
        {hasContent ? (
          <ProseRenderer markdown={displayText} streaming={isStreaming} />
        ) : isStreaming ? (
          <div
            className="text-[13px] text-[#718bbc] italic"
            data-testid="text-diligence-waiting"
          >
            Waiting for first response from Claude…
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StreamingStatus({
  phase,
  searchQueries,
}: {
  phase: DiligencePhase;
  searchQueries: string[];
}) {
  const recent = searchQueries.slice(-5).reverse();

  let icon = <Brain className="w-4 h-4 text-[#2563eb]" />;
  let label = 'Claude is reading the application…';
  if (phase === 'researching') {
    icon = <Search className="w-4 h-4 text-[#2563eb] animate-pulse" />;
    label = 'Researching the business and industry…';
  } else if (phase === 'writing') {
    icon = <BookOpen className="w-4 h-4 text-[#2563eb]" />;
    label = 'Writing the diligence report…';
  }

  return (
    <div
      className="px-6 py-3 border-b border-[#e7edf4] bg-[#f7faff]"
      data-testid={`status-phase-${phase || 'thinking'}`}
    >
      <div className="flex items-center gap-2">
        <span className="relative flex w-2 h-2">
          <span className="absolute inline-flex w-full h-full rounded-full bg-[#2563eb] opacity-50 animate-ping" />
          <span className="relative inline-flex w-2 h-2 rounded-full bg-[#2563eb]" />
        </span>
        {icon}
        <span className="text-[13px] text-[#133c7f] font-medium">{label}</span>
        {searchQueries.length > 0 && (
          <span className="text-[11px] text-[#718bbc] ml-2" data-testid="text-search-count">
            · {searchQueries.length} search{searchQueries.length === 1 ? '' : 'es'}
          </span>
        )}
      </div>

      {phase === 'researching' && recent.length > 0 && (
        <ul className="mt-2 space-y-1" data-testid="list-search-queries">
          {recent.map((q, i) => (
            <li
              key={`${q}-${i}`}
              className="text-[12px] text-[#4263a5] flex items-start gap-2"
            >
              <Search className="w-3 h-3 text-[#a1b3d2] shrink-0 mt-0.5" />
              <span className="truncate" data-testid={`text-search-query-${i}`}>
                {q}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ProseRenderer({
  markdown,
  streaming,
}: {
  markdown: string;
  streaming: boolean;
}) {
  return (
    <div
      className="text-[13px] text-[#1a1a1a] leading-relaxed max-w-3xl mx-auto"
      data-testid="diligence-markdown"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (props) => (
            <h1 className="text-[20px] font-semibold text-[#133c7f] mt-6 mb-3" {...props} />
          ),
          h2: (props) => (
            <h2
              className="text-[17px] font-semibold text-[#133c7f] mt-6 mb-3 pb-1.5 border-b border-[#e7edf4]"
              {...props}
            />
          ),
          h3: (props) => (
            <h3 className="text-[14px] font-semibold text-[#4263a5] mt-5 mb-2" {...props} />
          ),
          p: (props) => <p className="mb-3" {...props} />,
          ul: (props) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
          ol: (props) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />,
          li: (props) => <li className="text-[13px]" {...props} />,
          a: (props) => (
            <a
              className="text-[#2563eb] underline"
              target="_blank"
              rel="noreferrer"
              {...props}
            />
          ),
          strong: (props) => (
            <strong className="font-semibold text-[#133c7f]" {...props} />
          ),
          blockquote: (props) => (
            <blockquote
              className="border-l-4 border-amber-400 bg-amber-50 px-4 py-2 my-3 text-[13px] text-[#7a4f00]"
              {...props}
            />
          ),
          code: ({ children, ...props }: any) => (
            <code
              className="bg-[#e7edf4] text-[#133c7f] rounded px-1 py-0.5 text-[12px] font-mono"
              {...props}
            >
              {children}
            </code>
          ),
          table: (props) => (
            <div className="overflow-x-auto my-3">
              <table className="w-full border border-[#c5d4e8] text-[12px]" {...props} />
            </div>
          ),
          th: (props) => (
            <th
              className="bg-[#e7edf4] text-left px-2 py-1.5 font-semibold text-[#133c7f] border border-[#c5d4e8]"
              {...props}
            />
          ),
          td: (props) => (
            <td className="px-2 py-1.5 border border-[#c5d4e8] align-top" {...props} />
          ),
          hr: () => <hr className="my-4 border-[#e7edf4]" />,
        }}
      >
        {markdown}
      </ReactMarkdown>
      {streaming && (
        <span
          className="inline-block w-[7px] h-[14px] bg-[#2563eb] align-middle animate-pulse ml-0.5"
          data-testid="cursor-streaming"
        />
      )}
    </div>
  );
}

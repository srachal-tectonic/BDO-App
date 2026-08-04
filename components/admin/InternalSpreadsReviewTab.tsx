'use client';

import { useEffect, useMemo, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useInternalSpreadsReview } from '@/hooks/useInternalSpreadsReview';
import type { DiligencePhase } from '@/hooks/useDiligenceReport';
import { MarkdownBody } from '@/components/diligence/DiligenceReportPanel';
import { getAllProjects } from '@/services/firestore';
import type { Project } from '@/types';
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  Brain,
  Copy,
  Loader2,
  Sparkles,
} from 'lucide-react';

interface SpreadListItem {
  id: string;
  versionLabel: string;
  fileName: string;
  isActive: boolean;
  uploadedAt: string;
}

// Sentinel for "review whichever spread is active (or newest)" — Radix Select
// items can't have an empty-string value.
const AUTO_SPREAD = '__auto__';

function StreamingStatus({ phase }: { phase: DiligencePhase }) {
  let icon = <Brain className="w-4 h-4 text-[#2563eb]" />;
  let label = 'The model is reading the spread…';
  if (phase === 'writing') {
    icon = <BookOpen className="w-4 h-4 text-[#2563eb]" />;
    label = 'Writing the spreads review…';
  }

  return (
    <div
      className="px-4 py-3 rounded-md border border-[#e7edf4] bg-[#f7faff]"
      data-testid={`status-spreads-review-phase-${phase || 'thinking'}`}
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

export function InternalSpreadsReviewTab() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  const [spreadsList, setSpreadsList] = useState<SpreadListItem[]>([]);
  const [loadingSpreads, setLoadingSpreads] = useState(false);
  const [selectedSpreadId, setSelectedSpreadId] = useState<string>(AUTO_SPREAD);

  const { toast } = useToast();

  const {
    result,
    isStreaming,
    phase,
    streamedText,
    error,
    generate,
  } = useInternalSpreadsReview();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await getAllProjects({ maxRecords: 500 });
        if (!cancelled) setProjects(list || []);
      } catch (err) {
        if (!cancelled) {
          setProjectsError(err instanceof Error ? err.message : 'Failed to load projects');
        }
      } finally {
        if (!cancelled) setLoadingProjects(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load the project's spread versions whenever the project changes so the
  // admin can pick a specific version (default: active/newest).
  useEffect(() => {
    setSpreadsList([]);
    setSelectedSpreadId(AUTO_SPREAD);
    if (!selectedProjectId) return;

    let cancelled = false;
    (async () => {
      setLoadingSpreads(true);
      try {
        const res = await fetch(`/api/projects/${selectedProjectId}/financials`);
        const data = res.ok ? await res.json() : [];
        if (!cancelled) setSpreadsList(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setSpreadsList([]);
      } finally {
        if (!cancelled) setLoadingSpreads(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedProjectId]);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  const displayText = isStreaming ? streamedText : result?.reviewText || streamedText;

  const handleCopy = async () => {
    const text = result?.reviewText || streamedText;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copied', description: 'Review copied to clipboard.' });
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  const spreadLabel = (s: SpreadListItem) => {
    const date = s.uploadedAt ? new Date(s.uploadedAt).toLocaleDateString('en-US') : '';
    return `${s.versionLabel || s.fileName || s.id}${date ? ` — ${date}` : ''}${s.isActive ? ' (Active)' : ''}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">Internal Spreads Review</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Send a project&apos;s parsed financial spread (income statement periods, debt coverage,
        financing structure, and sources &amp; uses) to the internal Azure OpenAI (Foundry)
        spreads-review model for an analyst-style credit review. Output is displayed only and is
        never saved.
      </p>

      {error && (
        <Alert variant="destructive" data-testid="alert-spreads-review-error">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {projectsError && (
        <Alert variant="destructive" data-testid="alert-spreads-review-projects-error">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to load projects</AlertTitle>
          <AlertDescription>{projectsError}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select Project</CardTitle>
          <CardDescription>
            Pick a project with at least one uploaded financial spread. By default the active
            spread is reviewed (falling back to the newest upload); choose a specific version to
            override.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-full sm:w-[380px]">
              <Select
                value={selectedProjectId}
                onValueChange={setSelectedProjectId}
                disabled={loadingProjects || isStreaming}
              >
                <SelectTrigger data-testid="select-spreads-review-project">
                  <SelectValue
                    placeholder={loadingProjects ? 'Loading projects…' : 'Select a project'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.projectName || p.businessName || p.id}
                      {p.businessName && p.projectName && p.businessName !== p.projectName
                        ? ` — ${p.businessName}`
                        : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-[300px]">
              <Select
                value={selectedSpreadId}
                onValueChange={setSelectedSpreadId}
                disabled={!selectedProjectId || loadingSpreads || isStreaming}
              >
                <SelectTrigger data-testid="select-spreads-review-spread">
                  <SelectValue
                    placeholder={loadingSpreads ? 'Loading spreads…' : 'Spread version'}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={AUTO_SPREAD}>Active / newest spread</SelectItem>
                  {spreadsList.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {spreadLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() =>
                generate(
                  selectedProjectId,
                  selectedSpreadId === AUTO_SPREAD ? undefined : selectedSpreadId
                )
              }
              disabled={!selectedProjectId || isStreaming || loadingProjects}
              data-testid="button-spreads-review-generate"
            >
              {isStreaming ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              {isStreaming ? 'Generating…' : result ? 'Regenerate' : 'Generate Review'}
            </Button>
          </div>
          {selectedProjectId && !loadingSpreads && spreadsList.length === 0 && (
            <p className="text-sm text-muted-foreground mt-3" data-testid="text-spreads-review-no-spreads">
              This project has no uploaded spreads. Upload one on the project&apos;s Financials
              section first.
            </p>
          )}
        </CardContent>
      </Card>

      {(isStreaming || displayText || result) && (
        <Card data-testid="card-spreads-review-output">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="min-w-0">
                <CardTitle className="text-base truncate">
                  {selectedProject
                    ? `Spreads Review — ${selectedProject.projectName || selectedProject.businessName || selectedProject.id}`
                    : 'Spreads Review'}
                </CardTitle>
                {result && !isStreaming && (
                  <CardDescription>
                    Model: {result.model}
                    {result.versionLabel ? ` · Spread: ${result.versionLabel}` : ''} · Generated{' '}
                    {new Date(result.generatedAt).toLocaleString('en-US')}
                  </CardDescription>
                )}
              </div>
              {!isStreaming && (result?.reviewText || streamedText) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  data-testid="button-spreads-review-copy"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isStreaming && <StreamingStatus phase={phase} />}
            {displayText ? (
              <div data-testid="text-spreads-review-report">
                <MarkdownBody markdown={displayText} />
              </div>
            ) : (
              isStreaming && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Waiting for the first response from the model…
                </div>
              )
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

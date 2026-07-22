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
import { useInternalDdTest } from '@/hooks/useInternalDdTest';
import type { DiligencePhase } from '@/hooks/useDiligenceReport';
import { MarkdownBody } from '@/components/diligence/DiligenceReportPanel';
import { getAllProjects } from '@/services/firestore';
import type { Project } from '@/types';
import {
  AlertCircle,
  BookOpen,
  Brain,
  Copy,
  FlaskConical,
  Loader2,
  Search,
  Sparkles,
} from 'lucide-react';

function StreamingStatus({
  phase,
  searchQueries,
}: {
  phase: DiligencePhase;
  searchQueries: string[];
}) {
  const recent = searchQueries.slice(-5).reverse();

  let icon = <Brain className="w-4 h-4 text-[#2563eb]" />;
  let label = 'The model is reading the application…';
  if (phase === 'researching') {
    icon = <Search className="w-4 h-4 text-[#2563eb] animate-pulse" />;
    label = 'Researching the business and industry…';
  } else if (phase === 'writing') {
    icon = <BookOpen className="w-4 h-4 text-[#2563eb]" />;
    label = 'Writing the diligence report…';
  }

  return (
    <div
      className="px-4 py-3 rounded-md border border-[#e7edf4] bg-[#f7faff]"
      data-testid={`status-internal-dd-phase-${phase || 'thinking'}`}
    >
      <div className="flex items-center gap-2">
        <span className="relative flex w-2 h-2">
          <span className="absolute inline-flex w-full h-full rounded-full bg-[#2563eb] opacity-50 animate-ping" />
          <span className="relative inline-flex w-2 h-2 rounded-full bg-[#2563eb]" />
        </span>
        {icon}
        <span className="text-[13px] text-[#133c7f] font-medium">{label}</span>
        {searchQueries.length > 0 && (
          <span className="text-[11px] text-[#718bbc] ml-2" data-testid="text-internal-dd-search-count">
            · {searchQueries.length} search{searchQueries.length === 1 ? '' : 'es'}
          </span>
        )}
      </div>

      {phase === 'researching' && recent.length > 0 && (
        <ul className="mt-2 space-y-1" data-testid="list-internal-dd-search-queries">
          {recent.map((q, i) => (
            <li key={`${q}-${i}`} className="text-[12px] text-[#4263a5] flex items-start gap-2">
              <Search className="w-3 h-3 text-[#a1b3d2] shrink-0 mt-0.5" />
              <span className="truncate">{q}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function InternalDdTestTab() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const { toast } = useToast();

  const {
    result,
    isStreaming,
    phase,
    streamedText,
    searchQueries,
    error,
    generate,
  } = useInternalDdTest();

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

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  const displayText = isStreaming ? streamedText : result?.reportText || streamedText;

  const handleCopy = async () => {
    const text = result?.reportText || streamedText;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copied', description: 'Report copied to clipboard.' });
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <FlaskConical className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">Internal DD Test</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Generate a due-diligence report with the internal Azure OpenAI (Foundry) model instead of
        the external Anthropic API. Uses the exact same prompt, DD Prompts overrides, and loan
        application data as the regular Due Diligence page — including web search. Output is
        displayed only and is never saved.
      </p>

      {error && (
        <Alert variant="destructive" data-testid="alert-internal-dd-error">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {projectsError && (
        <Alert variant="destructive" data-testid="alert-internal-dd-projects-error">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to load projects</AlertTitle>
          <AlertDescription>{projectsError}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select Project</CardTitle>
          <CardDescription>
            Pick a project with a saved loan application (Legal Name, Industry, NAICS Code, and
            Primary Project Purpose are required).
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
                <SelectTrigger data-testid="select-internal-dd-project">
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
            <Button
              onClick={() => generate(selectedProjectId)}
              disabled={!selectedProjectId || isStreaming || loadingProjects}
              data-testid="button-internal-dd-generate"
            >
              {isStreaming ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              {isStreaming ? 'Generating…' : result ? 'Regenerate' : 'Generate Report'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {(isStreaming || displayText || result) && (
        <Card data-testid="card-internal-dd-output">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="min-w-0">
                <CardTitle className="text-base truncate">
                  {selectedProject
                    ? `Due Diligence Report — ${selectedProject.projectName || selectedProject.businessName || selectedProject.id}`
                    : 'Due Diligence Report'}
                </CardTitle>
                {result && !isStreaming && (
                  <CardDescription>
                    Model: {result.model} · Generated{' '}
                    {new Date(result.generatedAt).toLocaleString('en-US')}
                  </CardDescription>
                )}
              </div>
              {!isStreaming && (result?.reportText || streamedText) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  data-testid="button-internal-dd-copy"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isStreaming && <StreamingStatus phase={phase} searchQueries={searchQueries} />}
            {displayText ? (
              <div data-testid="text-internal-dd-report">
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

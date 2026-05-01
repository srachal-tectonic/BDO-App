'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { authenticatedFetch, authenticatedGet } from '@/lib/authenticatedFetch';

export interface DiligenceReport {
  projectId: string;
  reportText: string;
  model: string;
  generatedAt: string;
  generatedBy?: string;
  legalName?: string;
  industry?: string;
  naicsCode?: string;
  primaryProjectPurpose?: string;
}

export type DiligencePhase = 'thinking' | 'researching' | 'writing' | null;

interface GenerateInput {
  legalName: string;
  industry: string;
  naicsCode: string;
  primaryProjectPurpose: string;
}

interface UseDiligenceReportResult {
  report: DiligenceReport | null;
  isLoading: boolean;
  isStreaming: boolean;
  phase: DiligencePhase;
  streamedText: string;
  searchQueries: string[];
  error: string | null;
  generate: (input: GenerateInput) => Promise<void>;
}

export function useDiligenceReport(projectId: string | undefined): UseDiligenceReportResult {
  const [report, setReport] = useState<DiligenceReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [phase, setPhase] = useState<DiligencePhase>(null);
  const [streamedText, setStreamedText] = useState<string>('');
  const [searchQueries, setSearchQueries] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // Load the existing report (if any) on mount / projectId change.
  useEffect(() => {
    let cancelled = false;
    if (!projectId) {
      setIsLoading(false);
      setReport(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await authenticatedGet(
          `/api/diligence-report?projectId=${encodeURIComponent(projectId)}`
        );
        if (!res.ok) {
          throw new Error(`Failed to load report (${res.status})`);
        }
        const data = await res.json();
        if (!cancelled) setReport(data || null);
      } catch (err: any) {
        if (!cancelled) {
          console.error('[useDiligenceReport] Load failed:', err);
          setError(err?.message || 'Failed to load report');
          setReport(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // Cancel any in-flight stream on unmount.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const generate = useCallback(
    async (input: GenerateInput) => {
      if (!projectId) {
        setError('Missing projectId');
        return;
      }
      if (isStreaming) return;

      // Reset streaming state.
      const controller = new AbortController();
      abortRef.current?.abort();
      abortRef.current = controller;

      setIsStreaming(true);
      setStreamedText('');
      setSearchQueries([]);
      setPhase('thinking');
      setError(null);

      try {
        const res = await authenticatedFetch('/api/diligence-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, ...input }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          let message = `Generate failed (${res.status})`;
          try {
            const errBody = await res.json();
            if (errBody?.error) message = errBody.error;
          } catch {
            // ignore
          }
          throw new Error(message);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let newlineIdx: number;
          while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, newlineIdx).trim();
            buffer = buffer.slice(newlineIdx + 1);
            if (!line) continue;
            let evt: any;
            try {
              evt = JSON.parse(line);
            } catch {
              continue;
            }
            switch (evt.type) {
              case 'phase':
                setPhase(evt.phase ?? null);
                break;
              case 'search':
                if (typeof evt.query === 'string' && evt.query.trim()) {
                  setSearchQueries((prev) => [...prev, evt.query]);
                }
                break;
              case 'text':
                if (typeof evt.text === 'string') {
                  setStreamedText((prev) => prev + evt.text);
                }
                break;
              case 'error':
                setError(evt.error || 'Generation failed');
                break;
              case 'done':
                setReport({
                  projectId,
                  reportText: evt.reportText || '',
                  model: evt.model || '',
                  generatedAt: evt.generatedAt || new Date().toISOString(),
                  legalName: input.legalName,
                  industry: input.industry,
                  naicsCode: input.naicsCode,
                  primaryProjectPurpose: input.primaryProjectPurpose,
                });
                break;
            }
          }
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        console.error('[useDiligenceReport] Generate failed:', err);
        setError(err?.message || 'Failed to generate report');
      } finally {
        setIsStreaming(false);
        setPhase(null);
      }
    },
    [projectId, isStreaming]
  );

  return {
    report,
    isLoading,
    isStreaming,
    phase,
    streamedText,
    searchQueries,
    error,
    generate,
  };
}

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
  status?: 'generating' | 'completed' | 'failed';
}

export type DiligencePhase = 'thinking' | 'researching' | 'writing' | null;

interface UseDiligenceReportResult {
  report: DiligenceReport | null;
  isLoading: boolean;
  isStreaming: boolean;
  phase: DiligencePhase;
  streamedText: string;
  searchQueries: string[];
  error: string | null;
  generate: () => Promise<void>;
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

  // Open an ndjson event stream and apply each event to local state. Used both
  // to start a generation ({ projectId }) and to reconnect to one already
  // running in the background ({ projectId, subscribe: true }). Aborting only
  // detaches this viewer — the server keeps generating regardless.
  const consumeStream = useCallback(
    async (body: { projectId: string; subscribe?: boolean }) => {
      const controller = new AbortController();
      abortRef.current?.abort();
      abortRef.current = controller;

      setIsStreaming(true);
      setError(null);

      try {
        const res = await authenticatedFetch('/api/diligence-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
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
              case 'reset':
                // Sent first on (re)subscribe so the upcoming replay rebuilds
                // the partial report from scratch without duplicating text.
                setStreamedText('');
                setSearchQueries([]);
                break;
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
                  projectId: body.projectId,
                  reportText: evt.reportText || '',
                  model: evt.model || '',
                  generatedAt: evt.generatedAt || new Date().toISOString(),
                  legalName: evt.legalName,
                  industry: evt.industry,
                  naicsCode: evt.naicsCode,
                  primaryProjectPurpose: evt.primaryProjectPurpose,
                  status: 'completed',
                });
                break;
            }
          }
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        console.error('[useDiligenceReport] Stream failed:', err);
        setError(err?.message || 'Failed to generate report');
      } finally {
        setIsStreaming(false);
        setPhase(null);
      }
    },
    []
  );

  // Load the existing report (if any) on mount / projectId change. If a
  // generation is still running in the background, reconnect to it so the user
  // sees it continue in real time.
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
        if (cancelled) return;

        if (data && data.status === 'generating') {
          // A background generation is in progress — show the streaming UI and
          // attach to the live job. The replay rebuilds whatever has been
          // produced so far, then live updates continue.
          setReport(null);
          setStreamedText('');
          setSearchQueries([]);
          setPhase((data.phase as DiligencePhase) ?? 'thinking');
          setIsLoading(false);
          void consumeStream({ projectId, subscribe: true });
          return;
        }

        setReport(data || null);
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
  }, [projectId, consumeStream]);

  // Detach from the stream on unmount. This does NOT stop the server-side job —
  // it keeps generating and will be picked back up on the next mount.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const generate = useCallback(async () => {
    if (!projectId) {
      setError('Missing projectId');
      return;
    }
    if (isStreaming) return;

    setStreamedText('');
    setSearchQueries([]);
    setPhase('thinking');
    await consumeStream({ projectId });
  }, [projectId, isStreaming, consumeStream]);

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

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { authenticatedFetch } from '@/lib/authenticatedFetch';
import type { DiligencePhase } from '@/hooks/useDiligenceReport';

export interface InternalDdTestResult {
  reportText: string;
  model: string;
  generatedAt: string;
  legalName?: string;
  industry?: string;
  naicsCode?: string;
  primaryProjectPurpose?: string;
}

interface UseInternalDdTestResult {
  result: InternalDdTestResult | null;
  isStreaming: boolean;
  phase: DiligencePhase;
  streamedText: string;
  searchQueries: string[];
  error: string | null;
  generate: (projectId: string) => Promise<void>;
}

// Display-only variant of useDiligenceReport for the Internal DD Test admin
// tab (Azure OpenAI). No persistence, no reconnect: aborting the request
// (unmount / regenerate) genuinely cancels the server-side generation.
export function useInternalDdTest(): UseInternalDdTestResult {
  const [result, setResult] = useState<InternalDdTestResult | null>(null);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [phase, setPhase] = useState<DiligencePhase>(null);
  const [streamedText, setStreamedText] = useState<string>('');
  const [searchQueries, setSearchQueries] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const isStreamingRef = useRef(false);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const generate = useCallback(async (projectId: string) => {
    if (!projectId) {
      setError('Select a project first');
      return;
    }
    if (isStreamingRef.current) return;

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    isStreamingRef.current = true;
    setIsStreaming(true);
    setError(null);
    setResult(null);
    setStreamedText('');
    setSearchQueries([]);
    setPhase('thinking');

    try {
      const res = await authenticatedFetch('/api/internal-dd-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
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
              setResult({
                reportText: evt.reportText || '',
                model: evt.model || '',
                generatedAt: evt.generatedAt || new Date().toISOString(),
                legalName: evt.legalName,
                industry: evt.industry,
                naicsCode: evt.naicsCode,
                primaryProjectPurpose: evt.primaryProjectPurpose,
              });
              break;
          }
        }
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.error('[useInternalDdTest] Stream failed:', err);
      setError(err?.message || 'Failed to generate report');
    } finally {
      isStreamingRef.current = false;
      setIsStreaming(false);
      setPhase(null);
    }
  }, []);

  return {
    result,
    isStreaming,
    phase,
    streamedText,
    searchQueries,
    error,
    generate,
  };
}

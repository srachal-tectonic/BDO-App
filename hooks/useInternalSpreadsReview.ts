'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { authenticatedFetch } from '@/lib/authenticatedFetch';
import type { DiligencePhase } from '@/hooks/useDiligenceReport';

export interface InternalSpreadsReviewResult {
  reviewText: string;
  model: string;
  generatedAt: string;
  versionLabel?: string;
  fileName?: string;
}

interface UseInternalSpreadsReviewResult {
  result: InternalSpreadsReviewResult | null;
  isStreaming: boolean;
  phase: DiligencePhase;
  streamedText: string;
  error: string | null;
  generate: (projectId: string, spreadId?: string) => Promise<void>;
}

// Display-only streaming hook for the Internal Spreads Review admin tab
// (Azure OpenAI). Mirrors useInternalDdTest: no persistence, no reconnect —
// aborting the request (unmount / regenerate) genuinely cancels the
// server-side generation.
export function useInternalSpreadsReview(): UseInternalSpreadsReviewResult {
  const [result, setResult] = useState<InternalSpreadsReviewResult | null>(null);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [phase, setPhase] = useState<DiligencePhase>(null);
  const [streamedText, setStreamedText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const isStreamingRef = useRef(false);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const generate = useCallback(async (projectId: string, spreadId?: string) => {
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
    setPhase('thinking');

    try {
      const res = await authenticatedFetch('/api/internal-spreads-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, ...(spreadId ? { spreadId } : {}) }),
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
              break;
            case 'phase':
              setPhase(evt.phase ?? null);
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
                reviewText: evt.reviewText || '',
                model: evt.model || '',
                generatedAt: evt.generatedAt || new Date().toISOString(),
                versionLabel: evt.versionLabel,
                fileName: evt.fileName,
              });
              break;
          }
        }
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.error('[useInternalSpreadsReview] Stream failed:', err);
      setError(err?.message || 'Failed to generate review');
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
    error,
    generate,
  };
}

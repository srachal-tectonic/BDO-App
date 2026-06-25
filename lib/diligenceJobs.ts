// In-memory registry of in-flight Due Diligence generation jobs.
//
// The expensive Claude generation runs *detached* from any single HTTP request
// so that a user navigating away or refreshing the page does NOT abort it.
// Live viewers `subscribe()` to a job and receive a replay of everything emitted
// so far (so a reconnecting tab rebuilds the full partial report) followed by
// subsequent events in real time. When every viewer disconnects the job keeps
// running to completion and persists itself to Cosmos.
//
// CAVEAT: this state lives in the Node process. On Azure App Service this works
// for a single Always-On instance. A process recycle (deploy / idle shutdown)
// or scale-out to multiple instances will drop in-memory jobs — that is why the
// generator also writes incremental progress (status:'generating' + partial
// reportText) to Cosmos, which is the durable source of truth a fresh page load
// reads back.

export type JobStatus = 'generating' | 'completed' | 'failed';

export interface DiligenceJobEvent {
  type: string;
  [k: string]: unknown;
}

interface DiligenceJob {
  projectId: string;
  status: JobStatus;
  // Full ordered history of emitted events, replayed to new subscribers.
  events: DiligenceJobEvent[];
  subscribers: Set<(evt: DiligenceJobEvent) => void>;
  reportText: string;
  phase: string | null;
  cleanupTimer: ReturnType<typeof setTimeout> | null;
}

const jobs = new Map<string, DiligenceJob>();

// Keep a finished job around briefly so a tab that reconnects right after
// completion can still replay the final events instead of racing Cosmos.
const CLEANUP_DELAY_MS = 60_000;

/** Is a job actively generating right now for this project? */
export function isGenerating(projectId: string): boolean {
  const job = jobs.get(projectId);
  return !!job && job.status === 'generating';
}

/** Live snapshot of an in-memory job (any status), or null if none. */
export function getJobSnapshot(
  projectId: string
): { status: JobStatus; reportText: string; phase: string | null } | null {
  const job = jobs.get(projectId);
  if (!job) return null;
  return { status: job.status, reportText: job.reportText, phase: job.phase };
}

/** Register a new job, replacing any stale finished job for the same project. */
export function createJob(projectId: string): void {
  const existing = jobs.get(projectId);
  if (existing?.cleanupTimer) clearTimeout(existing.cleanupTimer);
  jobs.set(projectId, {
    projectId,
    status: 'generating',
    events: [],
    subscribers: new Set(),
    reportText: '',
    phase: 'thinking',
    cleanupTimer: null,
  });
}

/** Append an event to a job and fan it out to all live subscribers. */
export function emit(projectId: string, evt: DiligenceJobEvent): void {
  const job = jobs.get(projectId);
  if (!job) return;
  job.events.push(evt);
  if (evt.type === 'text' && typeof evt.text === 'string') {
    job.reportText += evt.text;
  }
  if (evt.type === 'phase' && typeof evt.phase === 'string') {
    job.phase = evt.phase;
  }
  for (const cb of job.subscribers) {
    try {
      cb(evt);
    } catch {
      // Subscriber stream already closed — it will be removed via unsubscribe.
    }
  }
}

/** Mark a job finished and schedule its eventual removal from memory. */
export function finishJob(projectId: string, status: 'completed' | 'failed'): void {
  const job = jobs.get(projectId);
  if (!job) return;
  job.status = status;
  job.phase = null;
  if (job.cleanupTimer) clearTimeout(job.cleanupTimer);
  job.cleanupTimer = setTimeout(() => {
    jobs.delete(projectId);
  }, CLEANUP_DELAY_MS);
}

/**
 * Subscribe to a job. Synchronously replays the full event history to `cb`
 * first (so a reconnecting viewer rebuilds state from scratch), then streams
 * subsequent events live. Returns an unsubscribe function, or null if no job
 * exists for the project. Note: there is no `await` between replay and adding
 * the subscriber, so (JS being single-threaded) no live event can be missed.
 */
export function subscribe(
  projectId: string,
  cb: (evt: DiligenceJobEvent) => void
): (() => void) | null {
  const job = jobs.get(projectId);
  if (!job) return null;
  for (const evt of job.events) {
    try {
      cb(evt);
    } catch {
      // ignore
    }
  }
  job.subscribers.add(cb);
  return () => {
    job.subscribers.delete(cb);
  };
}

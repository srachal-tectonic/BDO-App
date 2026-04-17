'use client';

import { useEffect, useState, useCallback } from 'react';
import type { AuditCategory } from '@/lib/auditLog';
import {
  Clock,
  FileText,
  User,
  Shield,
  Settings,
  DollarSign,
  StickyNote,
  Link2,
  ChevronDown,
  ChevronRight,
  Filter,
} from 'lucide-react';

interface FieldChange {
  field: string;
  label: string;
  oldValue: unknown;
  newValue: unknown;
}

interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  category: AuditCategory;
  userId?: string;
  userEmail?: string;
  userName?: string;
  projectId?: string;
  resourceType?: string;
  resourceId?: string;
  summary: string;
  changes?: FieldChange[];
  metadata?: Record<string, unknown>;
}

interface AuditTimelineProps {
  projectId: string;
  maxHeight?: string;
}

const CATEGORY_CONFIG: Record<string, { icon: typeof Clock; color: string; bg: string }> = {
  auth: { icon: Shield, color: 'text-blue-600', bg: 'bg-blue-100' },
  project: { icon: FileText, color: 'text-green-600', bg: 'bg-green-100' },
  loan_application: { icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  file: { icon: FileText, color: 'text-purple-600', bg: 'bg-purple-100' },
  financial: { icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-100' },
  admin: { icon: Settings, color: 'text-red-600', bg: 'bg-red-100' },
  portal: { icon: Link2, color: 'text-cyan-600', bg: 'bg-cyan-100' },
  note: { icon: StickyNote, color: 'text-orange-600', bg: 'bg-orange-100' },
};

const CATEGORY_LABELS: Record<string, string> = {
  auth: 'Authentication',
  project: 'Project',
  loan_application: 'Loan Application',
  file: 'Files',
  financial: 'Financials',
  admin: 'Admin',
  portal: 'Portal',
  note: 'Notes',
};

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

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '(empty)';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'number') return val.toLocaleString();
  if (Array.isArray(val)) return val.join(', ') || '(empty)';
  const str = String(val);
  return str.length > 80 ? str.substring(0, 80) + '...' : str;
}

function AuditEntryRow({ entry }: { entry: AuditEntry }) {
  const [expanded, setExpanded] = useState(false);
  const config = CATEGORY_CONFIG[entry.category] || CATEGORY_CONFIG.project;
  const Icon = config.icon;
  const hasChanges = entry.changes && entry.changes.length > 0;

  return (
    <div className="relative pl-8 pb-4">
      {/* Timeline line */}
      <div className="absolute left-3 top-6 bottom-0 w-px bg-border" />

      {/* Timeline dot */}
      <div className={`absolute left-1 top-1.5 w-5 h-5 rounded-full ${config.bg} flex items-center justify-center`}>
        <Icon className={`w-3 h-3 ${config.color}`} />
      </div>

      <div className="bg-card border rounded-lg p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground">{entry.summary}</p>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              {entry.userName || entry.userEmail ? (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {entry.userName || entry.userEmail}
                </span>
              ) : null}
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTimestamp(entry.timestamp)}
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${config.bg} ${config.color}`}>
                {CATEGORY_LABELS[entry.category] || entry.category}
              </span>
            </div>
          </div>

          {hasChanges && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="shrink-0 p-1 hover:bg-muted rounded text-muted-foreground"
              title={expanded ? 'Hide changes' : 'Show changes'}
            >
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
        </div>

        {expanded && hasChanges && (
          <div className="mt-2 border-t pt-2 space-y-1">
            {entry.changes!.map((change, i) => (
              <div key={i} className="text-xs grid grid-cols-[1fr,auto,1fr] gap-1 items-baseline">
                <span className="font-medium text-muted-foreground truncate" title={change.field}>
                  {change.label}
                </span>
                <span className="text-muted-foreground px-1">&rarr;</span>
                <div className="flex items-center gap-1 min-w-0">
                  {change.oldValue != null && (
                    <>
                      <span className="text-red-600 line-through truncate" title={formatValue(change.oldValue)}>
                        {formatValue(change.oldValue)}
                      </span>
                      <span className="text-muted-foreground">&rarr;</span>
                    </>
                  )}
                  <span className="text-green-600 truncate" title={formatValue(change.newValue)}>
                    {formatValue(change.newValue)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function AuditTimeline({ projectId, maxHeight = '600px' }: AuditTimelineProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '30' });
      if (categoryFilter) params.set('category', categoryFilter);

      const res = await fetch(`/api/projects/${projectId}/audit-log?${params}`);
      if (!res.ok) throw new Error('Failed to fetch audit log');

      const data = await res.json();
      setEntries(data.items);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [projectId, page, categoryFilter]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setPage(1);
  }, [categoryFilter]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Activity Log {total > 0 && <span className="text-muted-foreground font-normal">({total})</span>}
        </h3>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <Filter className="w-3 h-3" />
          Filter
        </button>
      </div>

      {showFilters && (
        <div className="flex gap-2 flex-wrap">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs border rounded px-2 py-1 bg-background"
          >
            <option value="">All categories</option>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      )}

      <div className="overflow-y-auto" style={{ maxHeight }}>
        {loading && entries.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        )}

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
            {error}
          </div>
        )}

        {!loading && entries.length === 0 && !error && (
          <div className="text-sm text-muted-foreground text-center py-8">
            No activity recorded yet
          </div>
        )}

        {entries.map((entry) => (
          <AuditEntryRow key={entry.id} entry={entry} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 border-t">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="text-xs px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
          >
            Previous
          </button>
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="text-xs px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

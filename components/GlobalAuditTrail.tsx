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
  Search,
} from 'lucide-react';
import { Input } from '@/components/ui/input';

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

function AuditRow({ entry }: { entry: AuditEntry }) {
  const [expanded, setExpanded] = useState(false);
  const config = CATEGORY_CONFIG[entry.category] || CATEGORY_CONFIG.project;
  const Icon = config.icon;
  const hasChanges = entry.changes && entry.changes.length > 0;

  return (
    <tr className="border-b hover:bg-muted/50">
      <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
        {formatTimestamp(entry.timestamp)}
      </td>
      <td className="px-3 py-2">
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${config.bg} ${config.color}`}>
          <Icon className="w-3 h-3" />
          {CATEGORY_LABELS[entry.category] || entry.category}
        </span>
      </td>
      <td className="px-3 py-2 text-xs">
        {entry.userName || entry.userEmail || <span className="text-muted-foreground">System</span>}
      </td>
      <td className="px-3 py-2">
        <div className="flex items-start gap-1">
          <div className="flex-1 min-w-0">
            <p className="text-sm">{entry.summary}</p>
            {expanded && hasChanges && (
              <div className="mt-2 space-y-1 border-t pt-2">
                {entry.changes!.map((change, i) => (
                  <div key={i} className="text-xs flex items-baseline gap-1 flex-wrap">
                    <span className="font-medium text-muted-foreground">{change.label}:</span>
                    {change.oldValue != null && (
                      <>
                        <span className="text-red-600 line-through">{formatValue(change.oldValue)}</span>
                        <span className="text-muted-foreground">&rarr;</span>
                      </>
                    )}
                    <span className="text-green-600">{formatValue(change.newValue)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {hasChanges && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="shrink-0 p-0.5 hover:bg-muted rounded text-muted-foreground"
              title={expanded ? 'Hide changes' : `Show ${entry.changes!.length} change(s)`}
            >
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
        </div>
      </td>
      <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
        {entry.projectId ? (
          <a href={`/bdo/projects/${entry.projectId}`} className="text-primary hover:underline">
            {entry.projectId.substring(0, 16)}...
          </a>
        ) : '—'}
      </td>
    </tr>
  );
}

export function GlobalAuditTrail() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '50' });
      if (categoryFilter) params.set('category', categoryFilter);
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`/api/audit-log?${params}`);
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
  }, [page, categoryFilter, searchQuery]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  useEffect(() => {
    setPage(1);
  }, [categoryFilter, searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Filter className="w-4 h-4" />
          Filters:
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="text-sm border rounded px-2 py-1.5 bg-background"
        >
          <option value="">All categories</option>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <form onSubmit={handleSearch} className="flex items-center gap-1">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search activity..."
              className="pl-8 h-8 text-sm w-56"
            />
          </div>
        </form>
        {total > 0 && (
          <span className="text-sm text-muted-foreground ml-auto">
            {total.toLocaleString()} event{total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-xs font-medium text-muted-foreground w-32">When</th>
                <th className="px-3 py-2 text-xs font-medium text-muted-foreground w-28">Category</th>
                <th className="px-3 py-2 text-xs font-medium text-muted-foreground w-36">User</th>
                <th className="px-3 py-2 text-xs font-medium text-muted-foreground">Action</th>
                <th className="px-3 py-2 text-xs font-medium text-muted-foreground w-36">Project</th>
              </tr>
            </thead>
            <tbody>
              {loading && entries.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  </td>
                </tr>
              )}
              {error && (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-sm text-destructive">{error}</td>
                </tr>
              )}
              {!loading && entries.length === 0 && !error && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-sm text-muted-foreground">
                    No audit events found
                  </td>
                </tr>
              )}
              {entries.map((entry) => (
                <AuditRow key={entry.id} entry={entry} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="text-sm px-3 py-1.5 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="text-sm px-3 py-1.5 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

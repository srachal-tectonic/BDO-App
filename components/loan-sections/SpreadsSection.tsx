'use client';

import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { SpreadsWorkbook } from '@/types';
import { AlertCircle, Calendar, CheckCircle2, Clock, ExternalLink, FileSpreadsheet, Table2, Tag, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';

interface SpreadsSectionProps {
  projectId: string;
  projectName?: string;
  existingWorkbooks?: SpreadsWorkbook[];
  currentUser?: {
    uid: string;
    displayName: string | null;
  };
  onWorkbookCreated?: (workbook: SpreadsWorkbook) => void;
  onWorkbookDeleted?: (workbookId: string) => void;
}

function formatRelativeTime(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  return d.toLocaleDateString();
}

export default function SpreadsSection({
  existingWorkbooks = [],
  onWorkbookDeleted,
}: SpreadsSectionProps) {
  const [workbooks, setWorkbooks] = useState<SpreadsWorkbook[]>(existingWorkbooks);
  const [deleteConfirmWorkbook, setDeleteConfirmWorkbook] = useState<SpreadsWorkbook | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setWorkbooks(existingWorkbooks);
  }, [existingWorkbooks]);

  const lastSyncedWorkbookId = useMemo(() => {
    const syncedWorkbooks = workbooks.filter(w => w.lastSyncedAt);
    if (syncedWorkbooks.length === 0) return null;

    return syncedWorkbooks.reduce((latest, current) => {
      const latestDate = new Date(latest.lastSyncedAt!);
      const currentDate = new Date(current.lastSyncedAt!);
      return currentDate > latestDate ? current : latest;
    }).workbookId;
  }, [workbooks]);

  const handleDeleteWorkbook = async (workbook: SpreadsWorkbook) => {
    setIsDeleting(true);
    try {
      // TODO: Replace with Azure-backed delete once migration is complete
      setWorkbooks(prev => prev.filter(w => w.workbookId !== workbook.workbookId));
      if (onWorkbookDeleted) {
        onWorkbookDeleted(workbook.workbookId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete workbook');
    } finally {
      setIsDeleting(false);
      setDeleteConfirmWorkbook(null);
    }
  };

  const formatDate = (date: Date | string) => {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Financial Spreads</h2>
          <p className="text-sm text-slate-500 mt-1">
            Generate and manage financial spreadsheets for this loan application
          </p>
        </div>
        <Button
          disabled
          className="flex items-center gap-2"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Generate New Spread
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Migration notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex gap-3">
          <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-amber-800">Spreads integration pending Azure migration</h3>
            <p className="text-sm text-amber-700 mt-1">
              Spreadsheet generation will be available once the Azure-based integration is complete.
              Existing spreads linked to this project are displayed below and can still be opened.
            </p>
          </div>
        </div>
      </div>

      {/* Spreads Workbooks List */}
      {workbooks.length > 0 && (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
            <h3 className="text-sm font-medium text-slate-700">
              Spreads ({workbooks.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-200">
            {workbooks.map((workbook) => {
              const isLastSynced = workbook.workbookId === lastSyncedWorkbookId;

              return (
                <div
                  key={workbook.workbookId}
                  className={`flex items-center justify-between px-4 py-3 ${isLastSynced ? 'bg-blue-50' : 'bg-white'}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileSpreadsheet className={`w-5 h-5 flex-shrink-0 ${isLastSynced ? 'text-blue-600' : 'text-slate-400'}`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-medium truncate ${isLastSynced ? 'text-blue-800' : 'text-slate-800'}`}>
                          {workbook.workbookName}
                        </p>
                        {workbook.label && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                            <Tag className="w-3 h-3 mr-1" />
                            {workbook.label}
                          </span>
                        )}
                        {isLastSynced && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Synced
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(workbook.createdAt)}
                        </span>
                        {workbook.createdByName && <span>by {workbook.createdByName}</span>}
                        {workbook.cellsPopulated !== undefined && workbook.cellsPopulated > 0 && (
                          <span>• {workbook.cellsPopulated} cells populated</span>
                        )}
                        {isLastSynced && workbook.lastSyncedAt && (
                          <span className="text-blue-600">• Synced {formatRelativeTime(workbook.lastSyncedAt)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => window.open(workbook.workbookUrl, '_blank')}
                      className="flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirmWorkbook(workbook)}
                      className="flex items-center gap-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {workbooks.length === 0 && (
        <div className="border border-dashed border-slate-300 rounded-lg p-12">
          <div className="text-center">
            <Table2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-600 mb-2">No Spreads Linked Yet</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Spread generation will be available after the Azure migration is complete.
            </p>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmWorkbook} onOpenChange={(open: boolean) => !open && setDeleteConfirmWorkbook(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Spread?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove &quot;{deleteConfirmWorkbook?.workbookName}&quot; from this project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmWorkbook && handleDeleteWorkbook(deleteConfirmWorkbook)}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

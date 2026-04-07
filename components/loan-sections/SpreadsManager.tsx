'use client';

import { useState, useEffect, useMemo } from 'react';
import { FileSpreadsheet, ExternalLink, AlertCircle, Calendar, Trash2, Tag, RefreshCw, Star, Clock } from 'lucide-react';
import type { SpreadsWorkbook } from '@/types';
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

interface SpreadsManagerProps {
  projectId?: string;
  existingWorkbooks?: SpreadsWorkbook[];
  currentUser?: {
    uid: string;
    displayName: string | null;
  };
  isReadOnly?: boolean;
  onWorkbookCreated?: (workbook: SpreadsWorkbook) => void;
  onWorkbookDeleted?: (workbookId: string) => void;
  primarySpreadId?: string;
  onMarkAsPrimary?: (workbookId: string) => Promise<void>;
}

export default function SpreadsManager({
  existingWorkbooks = [],
  isReadOnly = false,
  onWorkbookDeleted,
  primarySpreadId,
  onMarkAsPrimary,
}: SpreadsManagerProps) {
  const [workbooks, setWorkbooks] = useState<SpreadsWorkbook[]>(existingWorkbooks);
  const [deleteConfirmWorkbook, setDeleteConfirmWorkbook] = useState<SpreadsWorkbook | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [primaryConfirmWorkbook, setPrimaryConfirmWorkbook] = useState<SpreadsWorkbook | null>(null);
  const [isSettingPrimary, setIsSettingPrimary] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update workbooks when existingWorkbooks prop changes
  useEffect(() => {
    setWorkbooks(existingWorkbooks);
  }, [existingWorkbooks]);

  // Find the workbook with the most recent lastSyncedAt timestamp
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

  const handleMarkAsPrimary = async (workbook: SpreadsWorkbook) => {
    if (!onMarkAsPrimary) return;
    setIsSettingPrimary(true);
    setError(null);
    try {
      await onMarkAsPrimary(workbook.workbookId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as primary');
    } finally {
      setIsSettingPrimary(false);
      setPrimaryConfirmWorkbook(null);
    }
  };

  const formatDate = (date: Date | string) => {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString();
  };

  const formatRelativeTime = (date: Date | string): string => {
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
  };

  return (
    <>
      {/* Error Alert */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Spreads integration pending notice */}
      <div className="mb-4 border border-[#e5e7eb] rounded-lg overflow-hidden">
        <div className="bg-[#f9fafb] px-3 py-2 border-b border-[#e5e7eb] flex items-center justify-between">
          <h3 className="text-sm font-medium text-[#374151]">Spreads</h3>
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled
            data-testid="button-create-spread"
          >
            <FileSpreadsheet className="w-4 h-4 mr-1" />
            Create New Spread
          </Button>
        </div>

        {/* Migration notice */}
        <div className="px-3 py-4 bg-amber-50 border-b border-[#e5e7eb] flex items-start gap-2">
          <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Spreads integration pending Azure migration</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Spreadsheet generation will be available once the Azure-based integration is complete.
            </p>
          </div>
        </div>

        {/* Workbooks List (read-only display of any existing linked workbooks) */}
        {workbooks.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-[#6b7280]">
            No spreads linked to this project.
          </div>
        ) : (
          <div className="divide-y divide-[#e5e7eb]">
            {workbooks.map((wb) => {
              const isLastSynced = wb.workbookId === lastSyncedWorkbookId;
              const isPrimary = wb.workbookId === primarySpreadId;
              const hasSynced = !!wb.lastSyncedAt;
              return (
                <div
                  key={wb.workbookId}
                  className={`flex items-center justify-between px-3 py-2 ${isPrimary ? 'bg-purple-50' : 'bg-white'}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileSpreadsheet className={`w-4 h-4 flex-shrink-0 ${isPrimary ? 'text-purple-600' : 'text-[#6b7280]'}`} />
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${isPrimary ? 'text-purple-800' : 'text-[#1a1a1a]'}`}>
                        {wb.workbookName}
                        {wb.label && (
                          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                            {wb.label}
                          </span>
                        )}
                        {isPrimary && (
                          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                            <Star className="w-3 h-3 mr-0.5 fill-current" />
                            Primary
                          </span>
                        )}
                        {isLastSynced && wb.lastSyncedAt && (
                          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            <RefreshCw className="w-3 h-3 mr-0.5" />
                            Synced {formatRelativeTime(wb.lastSyncedAt)}
                          </span>
                        )}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-[#6b7280]">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(wb.createdAt)}
                        </span>
                        {wb.createdByName && <span>by {wb.createdByName}</span>}
                        {wb.cellsPopulated !== undefined && wb.cellsPopulated > 0 && (
                          <span>• {wb.cellsPopulated} cells</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {onMarkAsPrimary && hasSynced && !isPrimary && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPrimaryConfirmWorkbook(wb)}
                        disabled={isReadOnly || isSettingPrimary}
                        className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                        data-testid={`button-mark-primary-${wb.workbookId}`}
                      >
                        <Star className="w-4 h-4 mr-1" />
                        Mark as Primary
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteConfirmWorkbook(wb)}
                      disabled={isReadOnly || isDeleting}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      data-testid={`button-delete-workbook-${wb.workbookId}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={() => window.open(wb.workbookUrl, '_blank')}
                      data-testid={`button-open-workbook-${wb.workbookId}`}
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Open
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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

      {/* Mark as Primary Confirmation Dialog */}
      <AlertDialog open={!!primaryConfirmWorkbook} onOpenChange={(open: boolean) => !open && setPrimaryConfirmWorkbook(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Primary?</AlertDialogTitle>
            <AlertDialogDescription>
              This will populate all three Sources &amp; Uses tables with the synced data from
              &quot;{primaryConfirmWorkbook?.workbookName}&quot;.
              {'\n\n'}
              <strong>Warning:</strong> Any existing data in the tables will be overwritten.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSettingPrimary}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => primaryConfirmWorkbook && handleMarkAsPrimary(primaryConfirmWorkbook)}
              disabled={isSettingPrimary}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isSettingPrimary ? 'Setting Primary...' : 'Mark as Primary'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

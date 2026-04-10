'use client';

import { useState, useEffect } from 'react';
import { CollapsibleCard } from '@/components/ui/CollapsibleCard';
import SpreadsManager from './SpreadsManager';
import SourcesUsesMatrix from './SourcesUsesMatrix';
import type { SourcesUses } from '@/lib/schema';
import type { SpreadsWorkbook } from '@/types';
import { getProjectSourcesUses, setPrimarySpreadId } from '@/services/firestore';
import { mapSyncedDataToStore, hasSyncedData } from '@/lib/syncedDataMapper';

/** Row keys that hold numeric source data (matching SourcesUsesMatrix rows). */
const DATA_ROW_KEYS = [
  'realEstate', 'debtRefiCRE', 'debtRefiNonCRE', 'equipment',
  'furnitureFixtures', 'inventory', 'businessAcquisition',
  'workingCapital', 'workingCapitalPreOpening', 'franchiseFees',
  'constructionHardCosts', 'interimInterestReserve',
  'constructionContingency', 'otherConstructionSoftCosts',
  'closingCosts', 'sbaGtyFee', 'other',
];

/** Returns true when every data row in the table has all-zero / undefined values. */
function isTableEmpty(sourcesUses: Partial<SourcesUses>): boolean {
  if (!sourcesUses) return true;
  for (const key of DATA_ROW_KEYS) {
    const row = sourcesUses[key] as Record<string, number> | undefined;
    if (!row) continue;
    const total = (row.tBankLoan || 0) + (row.sba504 || 0) +
                  (row.cdcDebenture || 0) + (row.sellerNote || 0) +
                  (row.thirdParty || 0) + (row.equity || 0);
    if (total > 0) return false;
  }
  return true;
}

interface SourcesUsesCardsProps {
  projectId?: string;
  existingWorkbooks?: SpreadsWorkbook[];
  currentUser?: {
    uid: string;
    displayName: string | null;
  };
  onWorkbookCreated?: (workbook: SpreadsWorkbook) => void;
  onWorkbookDeleted?: (workbookId: string) => void;
  isReadOnly?: boolean;
  // Table-specific state and update functions
  sourcesUses7a: Partial<SourcesUses>;
  sourcesUses504: Partial<SourcesUses>;
  sourcesUsesExpress: Partial<SourcesUses>;
  updateSourcesUses7a: (updates: Partial<SourcesUses>) => void;
  updateSourcesUses504: (updates: Partial<SourcesUses>) => void;
  updateSourcesUsesExpress: (updates: Partial<SourcesUses>) => void;
  updateAllSourcesUses: (updates: {
    sourcesUses7a?: Partial<SourcesUses>;
    sourcesUses504?: Partial<SourcesUses>;
    sourcesUsesExpress?: Partial<SourcesUses>;
  }) => void;
  primarySpreadId?: string;
  onPrimarySpreadChanged?: (workbookId: string) => void;
}

export function SourcesUsesCards({
  projectId,
  existingWorkbooks = [],
  currentUser,
  onWorkbookCreated,
  onWorkbookDeleted,
  isReadOnly = false,
  sourcesUses7a,
  sourcesUses504,
  sourcesUsesExpress,
  updateSourcesUses7a,
  updateSourcesUses504,
  updateSourcesUsesExpress,
  updateAllSourcesUses,
  primarySpreadId,
  onPrimarySpreadChanged,
}: SourcesUsesCardsProps) {
  // Track expanded state per card — initialized based on whether data exists.
  const [expanded7a, setExpanded7a] = useState(() => !isTableEmpty(sourcesUses7a));
  const [expanded504, setExpanded504] = useState(() => !isTableEmpty(sourcesUses504));
  const [expandedExpress, setExpandedExpress] = useState(() => !isTableEmpty(sourcesUsesExpress));

  // Auto-expand / collapse when table data changes
  useEffect(() => {
    setExpanded7a(!isTableEmpty(sourcesUses7a));
  }, [sourcesUses7a]);

  useEffect(() => {
    setExpanded504(!isTableEmpty(sourcesUses504));
  }, [sourcesUses504]);

  useEffect(() => {
    setExpandedExpress(!isTableEmpty(sourcesUsesExpress));
  }, [sourcesUsesExpress]);

  /**
   * Handle marking a spread as primary.
   * This fetches the synced data for the specific workbook,
   * maps it to the store format, updates ALL THREE application store tables,
   * and saves the primary spread ID.
   */
  const handleMarkAsPrimary = async (workbookId: string): Promise<void> => {
    if (!projectId) {
      throw new Error('Project ID is required to mark a spread as primary');
    }

    // Fetch synced Sources & Uses data for this specific workbook
    const syncedData = await getProjectSourcesUses(projectId, workbookId);

    if (!hasSyncedData(syncedData)) {
      throw new Error('No synced data found for this spread. Please sync the spread first.');
    }

    // Map synced data to store format for each table type
    const mapped7a = mapSyncedDataToStore(syncedData!, '7a');
    const mapped504 = mapSyncedDataToStore(syncedData!, '504');
    const mappedExpress = mapSyncedDataToStore(syncedData!, 'express');

    // Update all three application store tables in a single batched operation
    updateAllSourcesUses({
      sourcesUses7a: mapped7a,
      sourcesUses504: mapped504,
      sourcesUsesExpress: mappedExpress,
    });

    // Save the primary spread ID to database
    await setPrimarySpreadId(projectId, workbookId);

    // Notify parent component if callback provided
    if (onPrimarySpreadChanged) {
      onPrimarySpreadChanged(workbookId);
    }
  };

  return (
    <div className="space-y-4">
      {/* Spreads Manager — above all three S&U cards */}
      <SpreadsManager
        projectId={projectId}
        existingWorkbooks={existingWorkbooks}
        currentUser={currentUser}
        isReadOnly={isReadOnly}
        onWorkbookCreated={onWorkbookCreated}
        onWorkbookDeleted={onWorkbookDeleted}
        primarySpreadId={primarySpreadId}
        onMarkAsPrimary={handleMarkAsPrimary}
      />

      {/* Card 1: Sources & Uses - 7(a) Standard */}
      <CollapsibleCard
        title="Sources & Uses - 7(a) Standard"
        expanded={expanded7a}
        onToggle={setExpanded7a}
      >
        <SourcesUsesMatrix
          isReadOnly={isReadOnly}
          sourcesUses={sourcesUses7a as SourcesUses}
          updateSourcesUses={updateSourcesUses7a}
          tableType="7a"
        />
      </CollapsibleCard>

      {/* Card 2: Sources & Uses - 504 */}
      <CollapsibleCard
        title="Sources & Uses - 504"
        expanded={expanded504}
        onToggle={setExpanded504}
      >
        <SourcesUsesMatrix
          isReadOnly={isReadOnly}
          sourcesUses={sourcesUses504 as SourcesUses}
          updateSourcesUses={updateSourcesUses504}
          tableType="504"
        />
      </CollapsibleCard>

      {/* Card 3: Sources & Uses - 7(a) Express */}
      <CollapsibleCard
        title="Sources & Uses - 7(a) Express"
        expanded={expandedExpress}
        onToggle={setExpandedExpress}
      >
        <SourcesUsesMatrix
          isReadOnly={isReadOnly}
          sourcesUses={sourcesUsesExpress as SourcesUses}
          updateSourcesUses={updateSourcesUsesExpress}
          tableType="express"
        />
      </CollapsibleCard>
    </div>
  );
}

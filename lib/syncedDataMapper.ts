/**
 * Maps synced ProjectSourcesUses data to the SourcesUses format
 * used by the application store.
 */

import type {
  SourcesUses,
  SourcesUsesRow,
  ProjectSourcesUses,
  SourcesUses7a,
  SourcesUses504,
  SourcesUsesExpress,
  SourcesUsesRow7a,
  SourcesUsesRow504,
} from '@/lib/schema';

/**
 * Mapping from synced row keys to application store row keys
 */
const SYNCED_TO_STORE_ROW_MAPPING: Record<string, keyof SourcesUses> = {
  realEstateAcquisition: 'realEstate',
  debtRefiCRE: 'debtRefiCRE',
  debtRefiNonCRE: 'debtRefiNonCRE',
  machineryEquipment: 'equipment',
  furnitureFixtures: 'furnitureFixtures',
  inventory: 'inventory',
  workingCapital: 'workingCapital',
  workingCapitalPreOpening: 'workingCapital', // Combine with workingCapital
  businessAcquisition: 'businessAcquisition',
  franchiseFees: 'other', // Map to other
  constructionHardCosts: 'other', // Map to other
  interimInterestReserve: 'other', // Map to other
  constructionContingency: 'other', // Map to other
  otherConstructionSoftCosts: 'other', // Map to other
  closingCosts: 'closingCosts',
  sbaGtyFee: 'other', // Map to other
};

/**
 * Convert a synced row (7a or Express format) to application store row format
 */
function convertRow7aToStoreRow(syncedRow: SourcesUsesRow7a | undefined): SourcesUsesRow {
  if (!syncedRow) {
    return {};
  }
  return {
    tBankLoan: syncedRow.tBankLoan,
    borrower: syncedRow.borrower,
    sellerNote: syncedRow.sellerNote,
    thirdParty: syncedRow.thirdParty,
    sbaTerm: syncedRow.sbaTerm,
  };
}

/**
 * Convert a synced row (504 format) to application store row format
 * Note: cdc504 is mapped to thirdParty in the store
 */
function convertRow504ToStoreRow(syncedRow: SourcesUsesRow504 | undefined): SourcesUsesRow {
  if (!syncedRow) {
    return {};
  }
  return {
    tBankLoan: syncedRow.tBankLoan,
    borrower: syncedRow.borrower,
    sellerNote: syncedRow.sellerNote,
    thirdParty: syncedRow.cdc504, // Map cdc504 to thirdParty
    sbaTerm: syncedRow.sbaTerm,
  };
}

/**
 * Merge two SourcesUsesRow objects, summing numeric values
 */
function mergeRows(row1: SourcesUsesRow, row2: SourcesUsesRow): SourcesUsesRow {
  return {
    tBankLoan: (row1.tBankLoan || 0) + (row2.tBankLoan || 0),
    borrower: (row1.borrower || 0) + (row2.borrower || 0),
    sellerNote: (row1.sellerNote || 0) + (row2.sellerNote || 0),
    thirdParty: (row1.thirdParty || 0) + (row2.thirdParty || 0),
    sbaTerm: row1.sbaTerm || row2.sbaTerm, // Take first non-zero term
  };
}

/**
 * Check if a row has any non-zero values
 */
function hasValues(row: SourcesUsesRow): boolean {
  return (
    (row.tBankLoan || 0) > 0 ||
    (row.borrower || 0) > 0 ||
    (row.sellerNote || 0) > 0 ||
    (row.thirdParty || 0) > 0
  );
}

/**
 * Convert a synced SourcesUses7a or SourcesUsesExpress table to application store format
 */
function convertTable7aToStore(
  syncedTable: SourcesUses7a | SourcesUsesExpress | undefined
): Partial<SourcesUses> {
  if (!syncedTable) {
    return {};
  }

  const result: Partial<SourcesUses> = {};

  // Process each row in the synced table
  const syncedKeys = Object.keys(syncedTable) as (keyof SourcesUses7a)[];

  for (const syncedKey of syncedKeys) {
    // Skip totals and calculated fields
    if (syncedKey === 'totals' || syncedKey === 'columnPercentages' || syncedKey === 'weightedTerm') {
      continue;
    }

    const storeKey = SYNCED_TO_STORE_ROW_MAPPING[syncedKey];
    if (!storeKey) continue;

    const convertedRow = convertRow7aToStoreRow(syncedTable[syncedKey] as SourcesUsesRow7a);

    if (!hasValues(convertedRow)) continue;

    // If the store key already has data (e.g., multiple synced rows map to 'other'),
    // merge the values
    const existingRow = result[storeKey] as SourcesUsesRow | undefined;
    if (existingRow && typeof existingRow === 'object') {
      result[storeKey] = mergeRows(existingRow, convertedRow);
    } else {
      result[storeKey] = convertedRow;
    }
  }

  return result;
}

/**
 * Convert a synced SourcesUses504 table to application store format
 */
function convertTable504ToStore(
  syncedTable: SourcesUses504 | undefined
): Partial<SourcesUses> {
  if (!syncedTable) {
    return {};
  }

  const result: Partial<SourcesUses> = {};

  // Process each row in the synced table
  const syncedKeys = Object.keys(syncedTable) as (keyof SourcesUses504)[];

  for (const syncedKey of syncedKeys) {
    // Skip totals and calculated fields
    if (syncedKey === 'totals' || syncedKey === 'columnPercentages' || syncedKey === 'weightedTerm') {
      continue;
    }

    const storeKey = SYNCED_TO_STORE_ROW_MAPPING[syncedKey];
    if (!storeKey) continue;

    const convertedRow = convertRow504ToStoreRow(syncedTable[syncedKey] as SourcesUsesRow504);

    if (!hasValues(convertedRow)) continue;

    // If the store key already has data, merge the values
    const existingRow = result[storeKey] as SourcesUsesRow | undefined;
    if (existingRow && typeof existingRow === 'object') {
      result[storeKey] = mergeRows(existingRow, convertedRow);
    } else {
      result[storeKey] = convertedRow;
    }
  }

  return result;
}

/**
 * Default empty row for SourcesUses
 */
const defaultEmptyRow: SourcesUsesRow = {
  tBankLoan: 0,
  borrower: 0,
  sellerNote: 0,
  thirdParty: 0,
  sbaTerm: 0,
};

/**
 * Row keys for SourcesUses
 */
const ROW_KEYS = ['realEstate', 'debtRefiCRE', 'debtRefiNonCRE', 'equipment',
                  'furnitureFixtures', 'inventory', 'businessAcquisition',
                  'workingCapital', 'closingCosts', 'other'] as const;

/**
 * Calculate totals for SourcesUses and ensure all row keys are present with defaults
 */
function calculateTotals(sourcesUses: Partial<SourcesUses>): SourcesUses {
  let loanAmount = 0;
  let sellerFinancing = 0;
  let equityInjection = 0;
  let otherSources = 0;

  // Build result with all row keys, using defaults for missing rows
  const result: Record<string, SourcesUsesRow | number> = {};

  for (const key of ROW_KEYS) {
    const row = sourcesUses[key] as SourcesUsesRow | undefined;
    if (row && typeof row === 'object' && hasValues(row)) {
      result[key] = row;
      loanAmount += row.tBankLoan || 0;
      equityInjection += row.borrower || 0;
      sellerFinancing += row.sellerNote || 0;
      otherSources += row.thirdParty || 0;
    } else {
      // Always include the row with default empty values
      result[key] = { ...defaultEmptyRow };
    }
  }

  const totalSources = loanAmount + sellerFinancing + equityInjection + otherSources;

  return {
    ...result,
    loanAmount,
    sellerFinancing,
    equityInjection,
    otherSources,
    totalSources,
    // Uses (same as sources for balanced S&U)
    purchasePrice: totalSources,
    workingCapital: 0,
    closingCosts: 0,
    contingency: 0,
    otherUses: 0,
    totalUses: totalSources,
    gap: 0,
  } as SourcesUses;
}

/**
 * Map synced ProjectSourcesUses data to application store SourcesUses format.
 *
 * This function takes the synced data and converts it to the format
 * used by the application's editable tables.
 *
 * By default, it uses the 7(a) Standard table data. If you want to use a specific
 * table type, pass the tableType parameter.
 *
 * @param syncedData - The ProjectSourcesUses data from the database
 * @param tableType - Which table to use as the source ('7a' | '504' | 'express')
 * @returns SourcesUses in the application store format
 */
export function mapSyncedDataToStore(
  syncedData: ProjectSourcesUses,
  tableType: '7a' | '504' | 'express' = '7a'
): SourcesUses {
  let partialSourcesUses: Partial<SourcesUses>;

  switch (tableType) {
    case '7a':
      partialSourcesUses = convertTable7aToStore(syncedData.sourcesUses7a);
      break;
    case '504':
      partialSourcesUses = convertTable504ToStore(syncedData.sourcesUses504);
      break;
    case 'express':
      partialSourcesUses = convertTable7aToStore(syncedData.sourcesUsesExpress);
      break;
    default:
      partialSourcesUses = convertTable7aToStore(syncedData.sourcesUses7a);
  }

  return calculateTotals(partialSourcesUses);
}

/**
 * Check if the synced data has any meaningful data
 */
export function hasSyncedData(syncedData: ProjectSourcesUses | null | undefined): boolean {
  if (!syncedData) return false;

  return !!(
    syncedData.sourcesUses7a ||
    syncedData.sourcesUses504 ||
    syncedData.sourcesUsesExpress
  );
}

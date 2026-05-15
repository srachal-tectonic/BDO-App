import * as XLSX from 'xlsx';

/**
 * Maps row labels from the "Financial Spread"/"Financial Spreads" sheet
 * (column B) to the camelCase keys expected by SpreadComparisonTable /
 * SPREAD_SECTIONS.
 *
 * Labels are trimmed and lowercased for matching; the spreadsheet sometimes
 * truncates long labels so we match by prefix where necessary. Both the
 * legacy "New BDO Pre-Qual_04.2026" layout and the newer "New BDO Prequal
 * Ben 5.5.26" layout are supported — newer label names are listed alongside
 * the older ones so existing uploads keep parsing.
 */
const ROW_LABEL_TO_KEY: Record<string, string> = {
  'statement date': 'statementDate',
  'months covered': 'monthsCovered',
  'statement type': 'statementType',
  'revenue recognition': 'revenueRecognition',
  'total revenue': 'totalRevenue',
  'total cogs': 'totalCogs',
  'total gross margin': 'totalGrossMargin',
  'total operating expenses': 'totalOperatingExpenses',
  'ordinary income': 'ordinaryIncome',
  'total other income/expenses': 'totalOtherIncomeExpenses',
  'net income before taxes': 'netIncomeBeforeTaxes',
  'standard add backs': 'standardAddBacks',
  'other add back 1': 'otherAddBack1',
  'other add back 2': 'otherAddBack2',
  'other add back 3': 'otherAddBack3',
  'other add back 4': 'otherAddBack4',
  'other add back 5': 'otherAddBack5',
  'estimated property tax': 'estimatedPropertyTax',
  "required owner's draw": 'requiredOwnersDraw',
  'cash available': 'cashAvailable',
  'existing debt service': 'existingDebtService',
  // Per-source debt-service rows. Older sheets used the "Proposed X Debt"
  // labels; the 5.5.26 / 5.6.26 layouts name each row after the financing
  // type the user selected (e.g. "Seller Note Debt Service"). Unused slots
  // are labelled "N/A Debt Service" — those don't match any key and are
  // skipped. SBA Express Line / CAPLine and USDA / P&E / Conventional fold
  // into the existing 7(a) and 3rd-party slots respectively, since the
  // downstream comparison table has fixed slot keys.
  'proposed 7a debt': 'proposed7aDebt',
  'sba 7(a) debt service': 'proposed7aDebt',
  'sba 7a debt service': 'proposed7aDebt',
  'sba 7(a) standard debt service': 'proposed7aDebt',
  'sba 7(a) express debt service': 'proposed7aDebt',
  'sba express line debt service': 'proposed7aDebt',
  'sba capline debt service': 'proposed7aDebt',
  'proposed 504 debt': 'proposed504Debt',
  'sba 504 debt service': 'proposed504Debt',
  '504 debt service': 'proposed504Debt',
  'proposed cdc debt': 'proposedCdcDebt',
  'cdc debt service': 'proposedCdcDebt',
  'cdc debenture debt service': 'proposedCdcDebt',
  'debenture debt service': 'proposedCdcDebt',
  'proposed seller note': 'proposedSellerNote',
  'seller note debt service': 'proposedSellerNote',
  'proposed 3rd party financing': 'proposed3rdPartyFinancing',
  '3rd party debt service': 'proposed3rdPartyFinancing',
  'usda debt service': 'proposed3rdPartyFinancing',
  'p&e debt service': 'proposed3rdPartyFinancing',
  'conventional debt service': 'proposed3rdPartyFinancing',
  'total debt service': 'totalDebtService',
  'debt coverage ratio': 'debtCoverageRatio',
  'total affiliate cash available': 'totalAffiliateCashAvailable',
  'total affiliate cash avail': 'totalAffiliateCashAvailable',
  'total subject business cash available': 'totalSubjectBusinessCashAvailable',
  'total subject business cash': 'totalSubjectBusinessCashAvailable',
  'total guarantor cash available': 'totalGuarantorCashAvailable',
  'total global cash available': 'totalGlobalCashAvailable',
  'total affiliate debt service': 'totalAffiliateDebtService',
  'total affiliate debt servic': 'totalAffiliateDebtService',
  'total subject business debt service': 'totalSubjectBusinessDebtService',
  'total subject business debt': 'totalSubjectBusinessDebtService',
  'total global debt service': 'totalGlobalDebtService',
  'global debt coverage ratio': 'globalDebtCoverageRatio',
};

/** Normalise a cell label: trim whitespace, collapse runs of spaces, lowercase. */
function normaliseLabel(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Try to match a row label to a known field key. */
function matchKey(rawLabel: string): string | null {
  const norm = normaliseLabel(rawLabel);
  // Exact match first
  if (ROW_LABEL_TO_KEY[norm]) return ROW_LABEL_TO_KEY[norm];
  // Prefix match for truncated labels
  for (const [pattern, key] of Object.entries(ROW_LABEL_TO_KEY)) {
    if (norm.startsWith(pattern) || pattern.startsWith(norm)) return key;
  }
  return null;
}

export interface ParsedPeriod {
  periodLabel: string;
  [key: string]: any;
}

export interface FinancingSource {
  label: string;
  financingSource: string;
  guaranteePercent: string;
  amount: number | null;
  rateType: string;
  termYears: number | string | null;
  amortizationMonths: number | string | null;
  baseRate: number | string | null;
  spread: number | string | null;
  totalRate: number | string | null;
}

export interface SourcesUsesRow {
  label: string;
  values: Record<string, number | null>; // keyed by source header (e.g. "7a", "504", ...)
  total: number | null;
}

export interface ParsedSpreadsheet {
  periods: ParsedPeriod[];
  financingSources: FinancingSource[];
  sourcesUses: SourcesUsesRow[];
  sourcesUsesHeaders: string[]; // column headers for Sources & Uses (e.g. ["7a","504","Debenture",...])
}

/** Helper to read a cell value, returning undefined if empty. */
function cellVal(ws: XLSX.WorkSheet, r: number, c: number): any {
  const cell = ws[XLSX.utils.encode_cell({ r, c })];
  return cell?.v !== undefined && cell?.v !== null ? cell.v : undefined;
}

/** True when a cell value reads as N/A (case-insensitive, optional slash). */
function isNA(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  const s = String(v).trim().toLowerCase();
  return s === 'n/a' || s === 'na';
}

/**
 * Parse a Financial Spread workbook buffer and extract:
 * - Financing Structure (rows 0-10)
 * - Sources & Uses of Proceeds (rows 12-31)
 * - Up to 4 periods of income-statement / debt-coverage data (rows 33+)
 */
export function parseFinancialSpreadsheet(buffer: Buffer): ParsedSpreadsheet {
  const wb = XLSX.read(buffer, { type: 'buffer' });

  const ws = wb.Sheets['Financial Spread'] || wb.Sheets['Financial Spreads'];
  if (!ws) {
    throw new Error(
      'Sheet "Financial Spread" or "Financial Spreads" not found. Available sheets: ' +
        wb.SheetNames.join(', ')
    );
  }

  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');

  // ===== 1. Financing Structure (rows 0-10 in the sheet) =====
  // Row 0: "Financing Structure" header in col B
  // Row 1: Source headers (Source 1, Source 2, ...) in cols C-H
  // Row 2: Financing Source names
  // Rows 3-10: Guarantee %, Amount, Rate Type, Term Yrs, Amortization, Base Rate, Spread, Total Rate

  let financingHeaderRow = -1;
  for (let r = 0; r <= Math.min(range.e.r, 5); r++) {
    const v = cellVal(ws, r, 1);
    if (v && String(v).trim() === 'Financing Structure') {
      financingHeaderRow = r;
      break;
    }
  }

  const financingSources: FinancingSource[] = [];
  if (financingHeaderRow >= 0) {
    // Source label row is financingHeaderRow+1, data starts at financingHeaderRow+2
    const srcLabelRow = financingHeaderRow + 1;
    // Detect how many source columns exist (cols C onward = index 2+).
    // Skip columns whose label is "N/A" — those columns aren't part of the structure.
    const srcCols: number[] = [];
    for (let c = 2; c <= Math.min(range.e.c, 9); c++) {
      const v = cellVal(ws, srcLabelRow, c);
      if (v && String(v).trim() && !isNA(v)) srcCols.push(c);
    }

    // Each entry: list of label patterns to match (case-insensitive prefix),
    // followed by the canonical key used to look up the row index downstream.
    // The 5.5.26 layout renames "Financing Source" to "Financing Type"; both
    // forms resolve to the same canonical key so the rest of the parser is
    // unchanged.
    const FINANCING_ROW_PATTERNS: Array<[string[], string]> = [
      [['Financing Source', 'Financing Type'], 'Financing Source'],
      [['Guarantee %'], 'Guarantee %'],
      [['Amount'], 'Amount'],
      [['Rate Type'], 'Rate Type'],
      [['Term Yrs'], 'Term Yrs'],
      [['Amortization (Months)', 'Amortization'], 'Amortization (Months)'],
      [['Base Rate'], 'Base Rate'],
      [['Spread'], 'Spread'],
      [['Total Rate'], 'Total Rate'],
    ];

    // Map row labels to their row indices
    const rowMap: Record<string, number> = {};
    for (let r = financingHeaderRow + 2; r <= financingHeaderRow + 12 && r <= range.e.r; r++) {
      const v = cellVal(ws, r, 1);
      if (!v) continue;
      const norm = String(v).trim().toLowerCase();
      for (const [patterns, key] of FINANCING_ROW_PATTERNS) {
        if (patterns.some(p => norm.startsWith(p.toLowerCase()))) {
          if (rowMap[key] === undefined) rowMap[key] = r;
          break;
        }
      }
    }

    for (const c of srcCols) {
      // Also skip columns whose Financing Source (the "type" row, e.g., "7A Standard") is N/A.
      const sourceVal = cellVal(ws, rowMap['Financing Source'], c);
      if (isNA(sourceVal)) continue;

      const label = String(cellVal(ws, srcLabelRow, c) ?? '').trim();
      financingSources.push({
        label,
        financingSource: String(sourceVal ?? ''),
        guaranteePercent: String(cellVal(ws, rowMap['Guarantee %'], c) ?? ''),
        amount: cellVal(ws, rowMap['Amount'], c) ?? null,
        rateType: String(cellVal(ws, rowMap['Rate Type'], c) ?? ''),
        termYears: cellVal(ws, rowMap['Term Yrs'], c) ?? null,
        amortizationMonths: cellVal(ws, rowMap['Amortization (Months)'], c) ?? null,
        baseRate: cellVal(ws, rowMap['Base Rate'], c) ?? null,
        spread: cellVal(ws, rowMap['Spread'], c) ?? null,
        totalRate: cellVal(ws, rowMap['Total Rate'], c) ?? null,
      });
    }
  }

  // ===== 2. Sources and Uses of Proceeds =====
  let sourcesHeaderRow = -1;
  for (let r = 0; r <= range.e.r; r++) {
    const v = cellVal(ws, r, 1);
    if (v && String(v).trim() === 'Sources and Uses of Proceeds') {
      sourcesHeaderRow = r;
      break;
    }
  }

  const sourcesUses: SourcesUsesRow[] = [];
  const sourcesUsesHeaders: string[] = [];
  if (sourcesHeaderRow >= 0) {
    // Column headers row is sourcesHeaderRow+1 (e.g. "7a", "504", "Debenture", ...)
    // Skip columns whose header is "N/A" — those columns aren't part of the structure
    // even if numeric values appear in the cells below.
    const colHeaderRow = sourcesHeaderRow + 1;
    const suCols: number[] = [];
    for (let c = 2; c <= Math.min(range.e.c, 9); c++) {
      const v = cellVal(ws, colHeaderRow, c);
      if (v && String(v).trim() && !isNA(v)) {
        suCols.push(c);
        sourcesUsesHeaders.push(String(v).trim());
      }
    }

    // Find where the next section starts (Income Statement Spreads) to know where to stop
    let suEndRow = range.e.r;
    for (let r = sourcesHeaderRow + 2; r <= range.e.r; r++) {
      const v = cellVal(ws, r, 1);
      if (v && String(v).trim() === 'Income Statement Spreads') {
        suEndRow = r - 1;
        break;
      }
      // Also stop at a blank gap of 2+ rows
      if (!v) {
        const nextV = cellVal(ws, r + 1, 1);
        if (!nextV) { suEndRow = r - 1; break; }
      }
    }

    for (let r = sourcesHeaderRow + 2; r <= suEndRow; r++) {
      const labelRaw = cellVal(ws, r, 1);
      if (labelRaw === undefined || labelRaw === null) continue;
      const label = String(labelRaw).trim();
      if (!label) continue;

      const values: Record<string, number | null> = {};
      let total: number | null = null;

      for (let ci = 0; ci < suCols.length; ci++) {
        const v = cellVal(ws, r, suCols[ci]);
        const header = sourcesUsesHeaders[ci];
        if (header.toLowerCase() === 'total') {
          total = typeof v === 'number' ? v : null;
        } else {
          values[header] = typeof v === 'number' ? v : null;
        }
      }

      sourcesUses.push({ label, values, total });
    }
  }

  // ===== 3. Income Statement Spreads (periods) =====
  let incomeHeaderRow = -1;
  for (let r = 0; r <= range.e.r; r++) {
    const cell = ws[XLSX.utils.encode_cell({ r, c: 1 })];
    if (cell && typeof cell.v === 'string' && cell.v.trim() === 'Income Statement Spreads') {
      incomeHeaderRow = r;
      break;
    }
  }

  if (incomeHeaderRow === -1) {
    throw new Error('Could not find "Income Statement Spreads" section in the Financial Spread sheet.');
  }

  const periodLabelRow = incomeHeaderRow + 1;
  const periodCols: number[] = [];
  const periodLabels: string[] = [];
  for (let c = 2; c <= Math.min(range.e.c, 9); c++) {
    const cell = ws[XLSX.utils.encode_cell({ r: periodLabelRow, c })];
    if (cell && cell.v !== undefined && cell.v !== null && String(cell.v).trim()) {
      periodCols.push(c);
      periodLabels.push(String(cell.v).trim());
    }
  }

  const periods: ParsedPeriod[] = periodLabels.map(label => ({ periodLabel: label }));

  if (periodCols.length > 0) {
    const dataStartRow = periodLabelRow + 1;
    for (let r = dataStartRow; r <= range.e.r; r++) {
      const labelCell = ws[XLSX.utils.encode_cell({ r, c: 1 })];
      if (!labelCell || labelCell.v === undefined || labelCell.v === null) continue;

      const rawLabel = String(labelCell.v).trim();
      if (!rawLabel) continue;

      const upper = rawLabel.toUpperCase();
      if (
        upper === 'GROSS INCOME' ||
        upper === 'NET INCOME' ||
        upper === 'ADD BACKS & ADJUSTMENTS' ||
        upper === 'DEBT COVERAGE' ||
        upper === 'GLOBAL DEBT COVERAGE'
      ) {
        continue;
      }

      const key = matchKey(rawLabel);
      if (!key) continue;

      for (let pi = 0; pi < periodCols.length; pi++) {
        const valCell = ws[XLSX.utils.encode_cell({ r, c: periodCols[pi] })];
        if (valCell && valCell.v !== undefined && valCell.v !== null) {
          periods[pi][key] = valCell.v;
        }
      }
    }
  }

  return { periods, financingSources, sourcesUses, sourcesUsesHeaders };
}

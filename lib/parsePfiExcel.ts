import * as XLSX from 'xlsx';
import type { PersonalFinancialStatement } from './applicationStore';

/**
 * Parses the "Individual Applicant — Personal Financial Information" xlsx
 * template into a PersonalFinancialStatement object that can be merged into
 * `loanApplication.personalFinancialStatements[applicantId]`.
 *
 * The template has 6 sheets, but only sheets 2-6 contain user-entered data:
 *  Sheet 2 "Personal Financial Statement"   – assets/liabilities + income/contingent
 *  Sheet 3 "Notes Payable to Banks & Others"
 *  Sheet 4 "Stocks & Bonds"
 *  Sheet 5 "Real Estate Owned"
 *  Sheet 6 "Other Details (Sec. 5-8)"       – free-form descriptions
 *
 * Parsing is driven by label matching in column B (and column E for the
 * second paired column on sheet 2), so inserted/removed template rows do
 * not break the mapping.
 */

// Empty row templates, kept in sync with IndividualApplicantsSection.tsx.
const emptyNote = {
  noteholder: '',
  originalBalance: '',
  currentBalance: '',
  paymentAmount: '',
  frequency: '',
  collateral: '',
};
const emptySecurity = {
  numberOfShares: '',
  nameOfSecurities: '',
  cost: '',
  marketValue: '',
  dateOfQuotation: '',
  totalValue: '',
};
const emptyRealEstate = {
  type: '',
  address: '',
  datePurchased: '',
  originalCost: '',
  presentMarketValue: '',
  mortgageHolder: '',
  mortgageAccountNumber: '',
  mortgageBalance: '',
  monthlyPayment: '',
  status: '',
};

function makeEmptyPfs(): PersonalFinancialStatement {
  return {
    name: '',
    asOfDate: '',
    cashOnHand: '',
    savingsAccounts: '',
    iraRetirement: '',
    accountsReceivable: '',
    lifeInsuranceCashValue: '',
    stocksAndBonds: '',
    realEstate: '',
    automobiles: '',
    otherPersonalProperty: '',
    otherAssets: '',
    accountsPayable: '',
    notesPayableToBanks: '',
    installmentAccountAuto: '',
    installmentAccountAutoPayments: '',
    installmentAccountOther: '',
    installmentAccountOtherPayments: '',
    loansAgainstLifeInsurance: '',
    mortgagesOnRealEstate: '',
    unpaidTaxes: '',
    otherLiabilities: '',
    salary: '',
    netInvestmentIncome: '',
    realEstateIncome: '',
    otherIncome: '',
    otherIncomeDescription: '',
    asEndorserOrCoMaker: '',
    legalClaimsJudgments: '',
    provisionFederalIncomeTax: '',
    otherSpecialDebt: '',
    notesPayable: [],
    securities: [],
    realEstateOwned: [],
    otherPersonalPropertyDescription: '',
    unpaidTaxesDescription: '',
    otherLiabilitiesDescription: '',
    lifeInsuranceDescription: '',
  };
}

function normaliseLabel(raw: unknown): string {
  return String(raw ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function cellText(ws: XLSX.WorkSheet, addr: string): string {
  const cell = ws[addr];
  if (!cell) return '';
  if (cell.v === null || cell.v === undefined) return '';
  return String(cell.v).trim();
}

function cellNumber(ws: XLSX.WorkSheet, addr: string): string {
  const cell = ws[addr];
  if (!cell) return '';
  if (cell.v === null || cell.v === undefined || cell.v === '') return '';
  if (typeof cell.v === 'number') {
    // Store as a plain number string (no commas) — input fields parse via
    // parseFloat, and the PFS UI only formats for display.
    if (cell.v === 0) return '';
    return String(cell.v);
  }
  const s = String(cell.v).trim();
  return s;
}

function excelDateToIso(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number') {
    // Excel serial date: days since 1899-12-30.
    const ms = Math.round((value - 25569) * 86400 * 1000);
    const d = new Date(ms);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  }
  const s = String(value).trim();
  // Accept already-formatted yyyy-mm-dd or similar.
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return s;
}

// Maps Sheet 2 label → PFS field for the ASSETS / INCOME column (B→C).
const LEFT_COLUMN_MAP: Record<string, keyof PersonalFinancialStatement> = {
  'salary': 'salary',
  'net investment income': 'netInvestmentIncome',
  'real estate income': 'realEstateIncome',
  'other income (describe below)': 'otherIncome',
  'other income': 'otherIncome',
  'cash on hand & in banks': 'cashOnHand',
  'savings accounts': 'savingsAccounts',
  'ira or other retirement account': 'iraRetirement',
  'accounts & notes receivable': 'accountsReceivable',
  'life insurance – cash surrender value': 'lifeInsuranceCashValue',
  'life insurance - cash surrender value': 'lifeInsuranceCashValue',
  'stocks and bonds': 'stocksAndBonds',
  'real estate': 'realEstate',
  'automobiles': 'automobiles',
  'other personal property': 'otherPersonalProperty',
  'other assets': 'otherAssets',
};

// Maps Sheet 2 label → PFS field for the LIABILITIES / CONTINGENT column (E→F).
const RIGHT_COLUMN_MAP: Record<string, keyof PersonalFinancialStatement> = {
  'as endorser or co-maker': 'asEndorserOrCoMaker',
  'legal claims & judgments': 'legalClaimsJudgments',
  'provision for federal income tax': 'provisionFederalIncomeTax',
  'other special debt': 'otherSpecialDebt',
  'accounts payable': 'accountsPayable',
  'notes payable to banks and others': 'notesPayableToBanks',
  'installment account (auto)': 'installmentAccountAuto',
  'installment account (other)': 'installmentAccountOther',
  'loans against life insurance': 'loansAgainstLifeInsurance',
  'mortgages on real estate': 'mortgagesOnRealEstate',
  'unpaid taxes': 'unpaidTaxes',
  'other liabilities': 'otherLiabilities',
};

function parsePfsSheet(ws: XLSX.WorkSheet, pfs: PersonalFinancialStatement) {
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let r = range.s.r; r <= range.e.r; r++) {
    const leftLabel = normaliseLabel(
      ws[XLSX.utils.encode_cell({ r, c: 1 /* B */ })]?.v,
    );
    const rightLabel = normaliseLabel(
      ws[XLSX.utils.encode_cell({ r, c: 4 /* E */ })]?.v,
    );

    if (leftLabel === 'statement date (within last 90 days):' || leftLabel === 'statement date') {
      const valueCell = ws[XLSX.utils.encode_cell({ r, c: 2 /* C */ })];
      pfs.asOfDate = excelDateToIso(valueCell?.v);
    }

    if (leftLabel === 'description of other income:') {
      // Description can be in column C on the same row or the row directly
      // below (templates sometimes wrap the caret onto the next line).
      const here = cellText(ws, XLSX.utils.encode_cell({ r, c: 2 }));
      const below = cellText(ws, XLSX.utils.encode_cell({ r: r + 1, c: 2 }));
      pfs.otherIncomeDescription = here || below;
    }

    const leftKey = LEFT_COLUMN_MAP[leftLabel];
    if (leftKey) {
      const valueCell = ws[XLSX.utils.encode_cell({ r, c: 2 /* C */ })];
      const txt = cellNumber(ws, XLSX.utils.encode_cell({ r, c: 2 }));
      (pfs as any)[leftKey] = txt || (pfs as any)[leftKey];
      // Silence "unused" lint while keeping the cell lookup for readability.
      void valueCell;
    }

    const rightKey = RIGHT_COLUMN_MAP[rightLabel];
    if (rightKey) {
      const txt = cellNumber(ws, XLSX.utils.encode_cell({ r, c: 5 /* F */ }));
      (pfs as any)[rightKey] = txt || (pfs as any)[rightKey];
    }
  }
}

function parseNotesPayable(ws: XLSX.WorkSheet, pfs: PersonalFinancialStatement) {
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  let headerRow = -1;
  for (let r = range.s.r; r <= range.e.r; r++) {
    if (normaliseLabel(ws[XLSX.utils.encode_cell({ r, c: 1 })]?.v) === 'noteholder name/address') {
      headerRow = r;
      break;
    }
  }
  if (headerRow < 0) return;

  for (let r = headerRow + 1; r <= range.e.r; r++) {
    const firstLabel = normaliseLabel(ws[XLSX.utils.encode_cell({ r, c: 1 })]?.v);
    if (firstLabel.startsWith('total') || firstLabel.startsWith('*')) break;

    const row = {
      ...emptyNote,
      noteholder: cellText(ws, XLSX.utils.encode_cell({ r, c: 1 /* B */ })),
      collateral: cellText(ws, XLSX.utils.encode_cell({ r, c: 2 /* C */ })),
      originalBalance: cellNumber(ws, XLSX.utils.encode_cell({ r, c: 3 /* D */ })),
      currentBalance: cellNumber(ws, XLSX.utils.encode_cell({ r, c: 4 /* E */ })),
      paymentAmount: cellNumber(ws, XLSX.utils.encode_cell({ r, c: 5 /* F */ })),
      frequency: cellText(ws, XLSX.utils.encode_cell({ r, c: 6 /* G */ })),
    };

    const hasData = row.noteholder || row.collateral || row.originalBalance
      || row.currentBalance || row.paymentAmount || row.frequency;
    if (hasData) pfs.notesPayable.push(row);
  }
}

function parseSecurities(ws: XLSX.WorkSheet, pfs: PersonalFinancialStatement) {
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  let headerRow = -1;
  for (let r = range.s.r; r <= range.e.r; r++) {
    if (normaliseLabel(ws[XLSX.utils.encode_cell({ r, c: 1 })]?.v) === 'name of securities') {
      headerRow = r;
      break;
    }
  }
  if (headerRow < 0) return;

  for (let r = headerRow + 1; r <= range.e.r; r++) {
    const firstLabel = normaliseLabel(ws[XLSX.utils.encode_cell({ r, c: 1 })]?.v);
    if (firstLabel.startsWith('total') || firstLabel.startsWith('*')) break;

    const dateCell = ws[XLSX.utils.encode_cell({ r, c: 5 /* F */ })];
    const row = {
      ...emptySecurity,
      nameOfSecurities: cellText(ws, XLSX.utils.encode_cell({ r, c: 1 /* B */ })),
      numberOfShares: cellNumber(ws, XLSX.utils.encode_cell({ r, c: 2 /* C */ })),
      cost: cellNumber(ws, XLSX.utils.encode_cell({ r, c: 3 /* D */ })),
      marketValue: cellNumber(ws, XLSX.utils.encode_cell({ r, c: 4 /* E */ })),
      dateOfQuotation: excelDateToIso(dateCell?.v),
      totalValue: cellNumber(ws, XLSX.utils.encode_cell({ r, c: 6 /* G */ })),
    };

    const hasData = row.nameOfSecurities || row.numberOfShares || row.cost
      || row.marketValue || row.dateOfQuotation || row.totalValue;
    if (hasData) pfs.securities.push(row);
  }
}

function parseRealEstate(ws: XLSX.WorkSheet, pfs: PersonalFinancialStatement) {
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  let headerRow = -1;
  for (let r = range.s.r; r <= range.e.r; r++) {
    const label = normaliseLabel(ws[XLSX.utils.encode_cell({ r, c: 1 })]?.v);
    if (label === 'property') {
      headerRow = r;
      break;
    }
  }
  if (headerRow < 0) return;

  for (let r = headerRow + 1; r <= range.e.r; r++) {
    const firstLabel = normaliseLabel(ws[XLSX.utils.encode_cell({ r, c: 1 })]?.v);
    if (firstLabel.startsWith('total') || firstLabel.startsWith('*')) break;

    const dateCell = ws[XLSX.utils.encode_cell({ r, c: 4 /* E */ })];
    const row = {
      ...emptyRealEstate,
      type: cellText(ws, XLSX.utils.encode_cell({ r, c: 2 /* C */ })),
      address: cellText(ws, XLSX.utils.encode_cell({ r, c: 3 /* D */ })),
      datePurchased: excelDateToIso(dateCell?.v),
      originalCost: cellNumber(ws, XLSX.utils.encode_cell({ r, c: 5 /* F */ })),
      presentMarketValue: cellNumber(ws, XLSX.utils.encode_cell({ r, c: 6 /* G */ })),
      mortgageHolder: cellText(ws, XLSX.utils.encode_cell({ r, c: 7 /* H */ })),
      mortgageAccountNumber: cellText(ws, XLSX.utils.encode_cell({ r, c: 8 /* I */ })),
      mortgageBalance: cellNumber(ws, XLSX.utils.encode_cell({ r, c: 9 /* J */ })),
      monthlyPayment: cellNumber(ws, XLSX.utils.encode_cell({ r, c: 10 /* K */ })),
      status: cellText(ws, XLSX.utils.encode_cell({ r, c: 11 /* L */ })),
    };

    const hasData = row.type || row.address || row.datePurchased || row.originalCost
      || row.presentMarketValue || row.mortgageHolder || row.mortgageAccountNumber
      || row.mortgageBalance || row.monthlyPayment || row.status;
    if (hasData) pfs.realEstateOwned.push(row);
  }
}

/**
 * Parse free-form descriptions on the "Other Details (Sec. 5-8)" sheet.
 * Each section consists of a heading row ("SECTION 5 — ..."), an instruction
 * row, then one or more user-input rows before the next section. We gather
 * all non-instruction text between one heading and the next.
 */
function parseOtherDetails(ws: XLSX.WorkSheet, pfs: PersonalFinancialStatement) {
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  const sectionField: Record<string, keyof PersonalFinancialStatement> = {
    '5': 'otherPersonalPropertyDescription',
    '6': 'unpaidTaxesDescription',
    '7': 'otherLiabilitiesDescription',
    '8': 'lifeInsuranceDescription',
  };

  // Discover section header rows (in column B).
  const headings: Array<{ row: number; section: string }> = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    const label = normaliseLabel(ws[XLSX.utils.encode_cell({ r, c: 1 })]?.v);
    const match = label.match(/^section\s+(\d+)/);
    if (match) headings.push({ row: r, section: match[1] });
  }

  for (let i = 0; i < headings.length; i++) {
    const { row, section } = headings[i];
    const nextRow = i + 1 < headings.length ? headings[i + 1].row : range.e.r + 1;
    const field = sectionField[section];
    if (!field) continue;

    // Skip the heading row itself and the immediately-following instruction row.
    const parts: string[] = [];
    for (let r = row + 2; r < nextRow; r++) {
      const b = cellText(ws, XLSX.utils.encode_cell({ r, c: 1 /* B */ }));
      const c = cellText(ws, XLSX.utils.encode_cell({ r, c: 2 /* C */ }));
      const text = [b, c].filter(Boolean).join(' ').trim();
      if (text) parts.push(text);
    }
    const joined = parts.join('\n').trim();
    if (joined) (pfs as any)[field] = joined;
  }
}

export interface ParsedPfiResult {
  pfs: PersonalFinancialStatement;
  populatedFieldCount: number;
}

export function parsePfiExcel(buffer: Buffer): ParsedPfiResult {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  const pfs = makeEmptyPfs();

  const pfsSheetName = wb.SheetNames.find(
    (n) => n.toLowerCase() === 'personal financial statement',
  );
  if (pfsSheetName) parsePfsSheet(wb.Sheets[pfsSheetName], pfs);

  const notesSheetName = wb.SheetNames.find(
    (n) => n.toLowerCase().startsWith('notes payable'),
  );
  if (notesSheetName) parseNotesPayable(wb.Sheets[notesSheetName], pfs);

  const stocksSheetName = wb.SheetNames.find(
    (n) => n.toLowerCase().startsWith('stocks'),
  );
  if (stocksSheetName) parseSecurities(wb.Sheets[stocksSheetName], pfs);

  const realEstateSheetName = wb.SheetNames.find(
    (n) => n.toLowerCase().startsWith('real estate'),
  );
  if (realEstateSheetName) parseRealEstate(wb.Sheets[realEstateSheetName], pfs);

  const otherSheetName = wb.SheetNames.find(
    (n) => n.toLowerCase().startsWith('other details'),
  );
  if (otherSheetName) parseOtherDetails(wb.Sheets[otherSheetName], pfs);

  // Count non-empty scalar fields plus any rows in the table sections.
  let populated = 0;
  for (const [k, v] of Object.entries(pfs)) {
    if (Array.isArray(v)) populated += v.length;
    else if (v !== '' && v !== null && v !== undefined) populated += 1;
    void k;
  }

  return { pfs, populatedFieldCount: populated };
}

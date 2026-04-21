/**
 * Dynamically append fillable form-field pages to the blank
 * "Business Applicant / Project Information" envelope PDF.
 *
 * Visibility mirrors components/loan-sections/SellerInfoSection.tsx —
 * any primary or secondary project purpose selected on the Projects page
 * causes the matching section's fields to appear both there and here.
 *
 * Layout matches the reference PDF "Stoneworks_Marble__Business_Applicant_
 * Project_Information (1).pdf": sections are packed densely on a continuous
 * flow (Business Acquisition starts on the last page of the existing blank,
 * directly below po_projectDescription; subsequent sections continue onto
 * the same page until space runs out, then flow to new pages).
 */

import {
  PDFDocument,
  PDFPage,
  PDFFont,
  rgb,
  StandardFonts,
} from 'pdf-lib';

type Purposes = {
  primary: string;
  secondary: string[];
};

type ActiveSections = {
  isAcquisition: boolean;
  isCREConstruction: boolean;
  isCREPurchase: boolean;
  isDebtRefinance: boolean;
  isEquipmentPurchase: boolean;
};

export function computeActiveSections({ primary, secondary }: Purposes): ActiveSections {
  const all = [
    ...(primary ? [primary] : []),
    ...(Array.isArray(secondary) ? secondary : []),
  ];
  return {
    isAcquisition: all.includes('Business Acquisition'),
    isCREConstruction: all.includes('CRE: Construction'),
    isCREPurchase: all.includes('CRE: Purchase'),
    isDebtRefinance: all.includes('Debt Refinance'),
    isEquipmentPurchase: all.includes('Equipment Purchase'),
  };
}

// ---------- Layout constants (match reference PDF) ----------
const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN_X = 34;
const MARGIN_TOP_NEW_PAGE = PAGE_H - 50; // new-page cursor start
const MARGIN_BOTTOM = 50;
const FIELD_W_FULL = 544;
const FIELD_W_HALF = 261;
const FIELD_W_THIRD = 166;
const FIELD_H = 17;
const FIELD_H_MULTI = 48;
const LABEL_FONT = 8;
const LABEL_GAP = 4;
const ROW_GAP = 14; // gap between label-row pairs (31pt total per line)
const SECTION_HEADER_GAP_BEFORE = 18;
const SECTION_HEADER_GAP_AFTER = 10;
const SECTION_HEADER_SIZE = 12;

const BORDER = rgb(0.773, 0.831, 0.910);
const INPUT_BG = rgb(0.98, 0.99, 1);
const HEADER_COLOR = rgb(0.075, 0.235, 0.498); // #133c7f
const LABEL_COLOR = rgb(0.15, 0.15, 0.15);

type Ctx = {
  pdf: PDFDocument;
  page: PDFPage;
  cursorY: number;
  font: PDFFont;
  bold: PDFFont;
};

// ---------- Core layout helpers ----------

function addNewPage(ctx: Ctx): void {
  ctx.page = ctx.pdf.addPage([PAGE_W, PAGE_H]);
  ctx.cursorY = MARGIN_TOP_NEW_PAGE;
}

function ensureRoom(ctx: Ctx, needed: number): void {
  if (ctx.cursorY - needed < MARGIN_BOTTOM) {
    addNewPage(ctx);
  }
}

function drawSectionHeader(ctx: Ctx, text: string): void {
  ensureRoom(ctx, SECTION_HEADER_SIZE + SECTION_HEADER_GAP_AFTER + 30);
  ctx.cursorY -= SECTION_HEADER_GAP_BEFORE;
  ctx.page.drawText(text, {
    x: MARGIN_X,
    y: ctx.cursorY,
    size: SECTION_HEADER_SIZE,
    font: ctx.bold,
    color: HEADER_COLOR,
  });
  ctx.cursorY -= 4;
  ctx.page.drawLine({
    start: { x: MARGIN_X, y: ctx.cursorY },
    end: { x: MARGIN_X + FIELD_W_FULL, y: ctx.cursorY },
    thickness: 0.75,
    color: BORDER,
  });
  ctx.cursorY -= SECTION_HEADER_GAP_AFTER;
}

/**
 * Draw a bold header line for a single item within a table-like section
 * (e.g. "Debt #1", "Equipment #3"). Reserves vertical space for the header
 * AND the next row so the header isn't orphaned at the bottom of a page.
 */
function drawItemHeader(ctx: Ctx, text: string): void {
  const headerSize = 8.5;
  const headerGap = 4;
  const nextRowSpace = LABEL_FONT + LABEL_GAP + FIELD_H + ROW_GAP;
  if (ctx.cursorY - (headerSize + headerGap + nextRowSpace) < MARGIN_BOTTOM) {
    addNewPage(ctx);
  }
  ctx.page.drawText(text, {
    x: MARGIN_X,
    y: ctx.cursorY - headerSize,
    size: headerSize,
    font: ctx.bold,
    color: rgb(0.35, 0.35, 0.35),
  });
  ctx.cursorY -= headerSize + headerGap;
}

type FieldSpec = {
  name: string;
  label: string;
  x: number;
  width: number;
  kind?: 'text' | 'dropdown';
  options?: string[];
  multiline?: boolean;
  height?: number;
};

function placeFieldRow(ctx: Ctx, specs: FieldSpec[]): void {
  const maxH = Math.max(...specs.map(s => (s.multiline ? (s.height ?? FIELD_H_MULTI) : FIELD_H)));
  const neededForRow = LABEL_FONT + LABEL_GAP + maxH + ROW_GAP;
  ensureRoom(ctx, neededForRow);

  // Labels above fields
  const labelY = ctx.cursorY - LABEL_FONT;
  for (const s of specs) {
    ctx.page.drawText(s.label, {
      x: s.x,
      y: labelY,
      size: LABEL_FONT,
      font: ctx.font,
      color: LABEL_COLOR,
    });
  }

  // Fields
  const fieldTopY = labelY - LABEL_GAP;
  const fieldBottomY = fieldTopY - maxH;
  const form = ctx.pdf.getForm();

  for (const s of specs) {
    const h = s.multiline ? (s.height ?? FIELD_H_MULTI) : FIELD_H;
    const yBottom = fieldTopY - h;

    if (s.kind === 'dropdown' && s.options && s.options.length > 0) {
      const dd = form.createDropdown(s.name);
      dd.addOptions(s.options);
      dd.addToPage(ctx.page, {
        x: s.x,
        y: yBottom,
        width: s.width,
        height: h,
        borderWidth: 0.5,
        borderColor: BORDER,
        backgroundColor: INPUT_BG,
      });
    } else {
      const tf = form.createTextField(s.name);
      if (s.multiline) tf.enableMultiline();
      tf.addToPage(ctx.page, {
        x: s.x,
        y: yBottom,
        width: s.width,
        height: h,
        borderWidth: 0.5,
        borderColor: BORDER,
        backgroundColor: INPUT_BG,
      });
    }
  }

  ctx.cursorY = fieldBottomY - ROW_GAP;
}

// ---------- Column layouts ----------

const COL_TWO = [
  { x: MARGIN_X, width: FIELD_W_HALF },
  { x: MARGIN_X + FIELD_W_HALF + 22, width: FIELD_W_HALF },
];

const COL_THREE = [
  { x: MARGIN_X, width: FIELD_W_THIRD },
  { x: MARGIN_X + FIELD_W_THIRD + 23, width: FIELD_W_THIRD },
  { x: MARGIN_X + 2 * (FIELD_W_THIRD + 23), width: FIELD_W_THIRD },
];

const COL_ONE_FULL = [{ x: MARGIN_X, width: FIELD_W_FULL }];

// Debt-refinance 5-col row for the financial details (original/rate/payment/maturity/collateral)
const DEBT_DETAIL_COLS = [
  { x: MARGIN_X + 0 * 111, width: 100 },
  { x: MARGIN_X + 1 * 111, width: 100 },
  { x: MARGIN_X + 2 * 111, width: 100 },
  { x: MARGIN_X + 3 * 111, width: 100 },
  { x: MARGIN_X + 4 * 111, width: 100 },
];

// Debt-refinance top row: lenderName (wide) + currentOutstandingBalance (third)
const DEBT_TOP_COLS = [
  { x: MARGIN_X, width: 355 },
  { x: MARGIN_X + 355 + 23, width: FIELD_W_THIRD },
];

// Equipment 4-col row: purchasePrice, year, make, model
const EQUIP_DETAIL_COLS = [
  { x: MARGIN_X + 0 * 142, width: 119 },
  { x: MARGIN_X + 1 * 142, width: 119 },
  { x: MARGIN_X + 2 * 142, width: 119 },
  { x: MARGIN_X + 3 * 142, width: 119 },
];

// ---------- Section generators ----------

function generateAcquisition(ctx: Ctx): void {
  drawSectionHeader(ctx, 'Business Acquisition');

  placeFieldRow(ctx, [
    { name: 'si_legalName', label: 'Legal Name', x: COL_TWO[0].x, width: COL_TWO[0].width },
    { name: 'si_dbaName', label: 'DBA Name', x: COL_TWO[1].x, width: COL_TWO[1].width },
  ]);
  placeFieldRow(ctx, [
    { name: 'si_contactName', label: 'Contact Name', x: COL_THREE[0].x, width: COL_THREE[0].width },
    { name: 'si_phone', label: 'Seller Phone', x: COL_THREE[1].x, width: COL_THREE[1].width },
    { name: 'si_email', label: 'Seller Email', x: COL_THREE[2].x, width: COL_THREE[2].width },
  ]);
  placeFieldRow(ctx, [
    { name: 'si_website', label: 'Business Website', x: COL_ONE_FULL[0].x, width: COL_ONE_FULL[0].width },
  ]);
  placeFieldRow(ctx, [
    {
      name: 'si_typeOfAcquisition',
      label: 'Type of Acquisition',
      x: COL_TWO[0].x,
      width: COL_TWO[0].width,
      kind: 'dropdown',
      options: ['Stock', 'Asset'],
    },
    {
      name: 'si_purchasing100Percent',
      label: 'Purchasing 100%?',
      x: COL_TWO[1].x,
      width: COL_TWO[1].width,
      kind: 'dropdown',
      options: ['Yes', 'No'],
    },
  ]);
  placeFieldRow(ctx, [
    {
      name: 'si_purchaseContractStatus',
      label: 'Purchase Contract Status',
      x: COL_TWO[0].x,
      width: COL_TWO[0].width,
      kind: 'dropdown',
      options: ['No Contract Yet', 'LOI Signed', 'Contract Drafted', 'Fully Executed'],
    },
    {
      name: 'si_hasSellerCarryNote',
      label: 'Seller Carry Note?',
      x: COL_TWO[1].x,
      width: COL_TWO[1].width,
      kind: 'dropdown',
      options: ['Yes', 'No'],
    },
  ]);
  placeFieldRow(ctx, [
    {
      name: 'si_businessDescription',
      label: 'Business Description',
      x: COL_ONE_FULL[0].x,
      width: COL_ONE_FULL[0].width,
      multiline: true,
      height: FIELD_H_MULTI,
    },
  ]);
}

function generateCREConstruction(ctx: Ctx): void {
  drawSectionHeader(ctx, 'CRE: Construction');

  placeFieldRow(ctx, [
    { name: 'si_creCon_street', label: 'Property Street', x: COL_ONE_FULL[0].x, width: COL_ONE_FULL[0].width },
  ]);
  placeFieldRow(ctx, [
    { name: 'si_creCon_city', label: 'City', x: COL_THREE[0].x, width: COL_THREE[0].width },
    { name: 'si_creCon_state', label: 'State', x: COL_THREE[1].x, width: COL_THREE[1].width },
    { name: 'si_creCon_zip', label: 'ZIP', x: COL_THREE[2].x, width: COL_THREE[2].width },
  ]);
  placeFieldRow(ctx, [
    {
      name: 'si_creCon_landAlreadyOwned',
      label: 'Land Already Owned?',
      x: COL_TWO[0].x,
      width: COL_TWO[0].width,
      kind: 'dropdown',
      options: ['Yes', 'No'],
    },
    { name: 'si_creCon_currentLandValue', label: 'Current Land Value ($)', x: COL_TWO[1].x, width: COL_TWO[1].width },
  ]);
  placeFieldRow(ctx, [
    { name: 'si_creCon_totalConstructionCost', label: 'Total Construction Cost ($)', x: COL_TWO[0].x, width: COL_TWO[0].width },
    { name: 'si_creCon_generalContractorName', label: 'General Contractor Name', x: COL_TWO[1].x, width: COL_TWO[1].width },
  ]);
  placeFieldRow(ctx, [
    { name: 'si_creCon_constructionTimeline', label: 'Construction Timeline (months)', x: COL_THREE[0].x, width: COL_THREE[0].width },
    { name: 'si_creCon_proposedSquareFootage', label: 'Proposed Square Footage', x: COL_THREE[1].x, width: COL_THREE[1].width },
    { name: 'si_creCon_ownerOccupancyPercent', label: 'Owner-Occupancy % (post)', x: COL_THREE[2].x, width: COL_THREE[2].width },
  ]);
  placeFieldRow(ctx, [
    { name: 'si_creCon_projectedAfterConstructionValue', label: 'Projected After-Construction Value ($)', x: COL_ONE_FULL[0].x, width: COL_ONE_FULL[0].width },
  ]);
}

function generateCREPurchase(ctx: Ctx): void {
  drawSectionHeader(ctx, 'CRE: Purchase');

  placeFieldRow(ctx, [
    { name: 'si_crePur_street', label: 'Property Street', x: COL_ONE_FULL[0].x, width: COL_ONE_FULL[0].width },
  ]);
  placeFieldRow(ctx, [
    { name: 'si_crePur_city', label: 'City', x: COL_THREE[0].x, width: COL_THREE[0].width },
    { name: 'si_crePur_state', label: 'State', x: COL_THREE[1].x, width: COL_THREE[1].width },
    { name: 'si_crePur_zip', label: 'ZIP', x: COL_THREE[2].x, width: COL_THREE[2].width },
  ]);
  placeFieldRow(ctx, [
    { name: 'si_crePur_purchasePrice', label: 'Purchase Price ($)', x: COL_TWO[0].x, width: COL_TWO[0].width },
    { name: 'si_crePur_propertyType', label: 'Property Type', x: COL_TWO[1].x, width: COL_TWO[1].width },
  ]);
  placeFieldRow(ctx, [
    { name: 'si_crePur_squareFootage', label: 'Square Footage', x: COL_TWO[0].x, width: COL_TWO[0].width },
    { name: 'si_crePur_ownerOccupancyPercent', label: 'Owner-Occupancy %', x: COL_TWO[1].x, width: COL_TWO[1].width },
  ]);
}

function generateDebtRefinance(ctx: Ctx): void {
  drawSectionHeader(ctx, 'Debt Refinance');

  const collateralOptions = ['Real Estate', 'Equipment', 'Business Assets', 'Unsecured', 'Other'];

  for (let i = 0; i < 10; i++) {
    drawItemHeader(ctx, `Debt #${i + 1}`);
    // Sub-row 1: Lender + Current Outstanding Balance
    placeFieldRow(ctx, [
      { name: `si_debt${i}_lenderName`, label: 'Lender Name', x: DEBT_TOP_COLS[0].x, width: DEBT_TOP_COLS[0].width },
      { name: `si_debt${i}_currentOutstandingBalance`, label: 'Current Outstanding Balance ($)', x: DEBT_TOP_COLS[1].x, width: DEBT_TOP_COLS[1].width },
    ]);
    // Sub-row 2: Original / Rate / Payment / Maturity / Collateral
    placeFieldRow(ctx, [
      { name: `si_debt${i}_originalLoanAmount`, label: 'Original Loan Amt ($)', x: DEBT_DETAIL_COLS[0].x, width: DEBT_DETAIL_COLS[0].width },
      { name: `si_debt${i}_interestRate`, label: 'Interest Rate', x: DEBT_DETAIL_COLS[1].x, width: DEBT_DETAIL_COLS[1].width },
      { name: `si_debt${i}_monthlyPayment`, label: 'Monthly Payment', x: DEBT_DETAIL_COLS[2].x, width: DEBT_DETAIL_COLS[2].width },
      { name: `si_debt${i}_maturityDate`, label: 'Maturity Date', x: DEBT_DETAIL_COLS[3].x, width: DEBT_DETAIL_COLS[3].width },
      {
        name: `si_debt${i}_collateralType`,
        label: 'Collateral Type',
        x: DEBT_DETAIL_COLS[4].x,
        width: DEBT_DETAIL_COLS[4].width,
        kind: 'dropdown',
        options: collateralOptions,
      },
    ]);
    // Sub-row 3: Original Loan Purpose
    placeFieldRow(ctx, [
      { name: `si_debt${i}_originalLoanPurpose`, label: 'Original Loan Purpose', x: COL_ONE_FULL[0].x, width: COL_ONE_FULL[0].width },
    ]);
    // Spacer between items
    ctx.cursorY -= 6;
  }
}

function generateEquipmentPurchase(ctx: Ctx): void {
  drawSectionHeader(ctx, 'Equipment Purchase');

  for (let i = 0; i < 10; i++) {
    drawItemHeader(ctx, `Equipment #${i + 1}`);
    // Sub-row 1: Description + New/Used + Vendor
    placeFieldRow(ctx, [
      { name: `si_equip${i}_equipmentDescription`, label: 'Equipment Description', x: COL_THREE[0].x, width: COL_THREE[0].width },
      {
        name: `si_equip${i}_newOrUsed`,
        label: 'New or Used',
        x: COL_THREE[1].x,
        width: COL_THREE[1].width,
        kind: 'dropdown',
        options: ['New', 'Used'],
      },
      { name: `si_equip${i}_vendorDealerName`, label: 'Vendor / Dealer Name', x: COL_THREE[2].x, width: COL_THREE[2].width },
    ]);
    // Sub-row 2: Price / Year / Make / Model
    placeFieldRow(ctx, [
      { name: `si_equip${i}_purchasePrice`, label: 'Purchase Price ($)', x: EQUIP_DETAIL_COLS[0].x, width: EQUIP_DETAIL_COLS[0].width },
      { name: `si_equip${i}_year`, label: 'Year', x: EQUIP_DETAIL_COLS[1].x, width: EQUIP_DETAIL_COLS[1].width },
      { name: `si_equip${i}_make`, label: 'Make', x: EQUIP_DETAIL_COLS[2].x, width: EQUIP_DETAIL_COLS[2].width },
      { name: `si_equip${i}_model`, label: 'Model', x: EQUIP_DETAIL_COLS[3].x, width: EQUIP_DETAIL_COLS[3].width },
    ]);
    // Sub-row 3: Estimated Useful Life
    placeFieldRow(ctx, [
      { name: `si_equip${i}_estimatedUsefulLife`, label: 'Estimated Useful Life', x: COL_ONE_FULL[0].x, width: COL_ONE_FULL[0].width },
    ]);
    ctx.cursorY -= 6;
  }
}

// ---------- Starting-cursor helpers ----------

/**
 * Find the lowest-bottom-edge of any widget on the given page. Returns a y-coordinate
 * we can start drawing BELOW (with a small gap). If the page has no widgets we
 * start near the top-margin.
 */
function lowestYOnPage(pdf: PDFDocument, page: PDFPage): number {
  const form = pdf.getForm();
  let lowest = Infinity;

  // Build widget-to-page lookup via Annots
  const annotsArr = page.node.Annots();
  const widgetRefs = new Set<string>();
  if (annotsArr) {
    const len = annotsArr.size();
    for (let i = 0; i < len; i++) {
      widgetRefs.add(annotsArr.get(i).toString());
    }
  }

  for (const f of form.getFields()) {
    const acroField: any = (f as any).acroField;
    const widgets = acroField?.getWidgets?.() ?? [];
    for (const w of widgets) {
      const wRef = pdf.context.getObjectRef((w as any).dict);
      if (!wRef) continue;
      if (!widgetRefs.has(wRef.toString())) continue;
      const rect = (w as any).getRectangle();
      if (rect?.y != null) {
        if (rect.y < lowest) lowest = rect.y;
      }
    }
  }
  return isFinite(lowest) ? lowest : MARGIN_TOP_NEW_PAGE;
}

/**
 * Append fillable sections for any active purposes. Returns modified PDF bytes.
 * If no sections are active, returns the saved PDF unchanged.
 */
export async function appendActiveSections(
  pdfBytes: Uint8Array | Buffer,
  purposes: Purposes,
): Promise<Uint8Array> {
  const active = computeActiveSections(purposes);
  const anyActive =
    active.isAcquisition ||
    active.isCREConstruction ||
    active.isCREPurchase ||
    active.isDebtRefinance ||
    active.isEquipmentPurchase;

  const pdf = await PDFDocument.load(pdfBytes);
  if (!anyActive) {
    return pdf.save();
  }

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const pages = pdf.getPages();
  const lastPage = pages[pages.length - 1];
  const startY = lowestYOnPage(pdf, lastPage) - 8;

  const ctx: Ctx = {
    pdf,
    page: lastPage,
    cursorY: Math.max(startY, MARGIN_BOTTOM + 40),
    font,
    bold,
  };

  if (active.isAcquisition) generateAcquisition(ctx);
  if (active.isCREConstruction) generateCREConstruction(ctx);
  if (active.isCREPurchase) generateCREPurchase(ctx);
  if (active.isDebtRefinance) generateDebtRefinance(ctx);
  if (active.isEquipmentPurchase) generateEquipmentPurchase(ctx);

  // Pre-bake appearance streams so dropdowns show the arrow on first render
  // (without this, some viewers only draw the chevron after the field is
  // interacted with for the first time).
  pdf.getForm().updateFieldAppearances(font);

  return pdf.save();
}

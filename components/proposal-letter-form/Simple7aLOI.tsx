'use client';

import { useMemo } from 'react';
import { useApplication } from '@/lib/applicationStore';
import { useToast } from '@/hooks/use-toast';
import { FileDown, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PizZip from 'pizzip';
import { saveAs } from 'file-saver';

interface UseOfProceedsRow {
  category: string;
  amount: number;
}

interface Simple7aLOIData {
  letterDate: string;
  loanName: string;
  principalName: string;
  principalTitle: string;
  mailingAddress: string;
  borrowerName: string;
  guarantorNames: string;
  loanAmount: string;
  loanType: string;
  loanPurpose: string;
  useOfProceeds: UseOfProceedsRow[];
  termMonths: string;
  loanFees: string;
  interestRateSpread: string;
  rateAdjustmentPeriod: string;
  prepaymentTerms: string;
  collateralDescription: string;
  lifeInsurance: string;
  goodFaithDeposit: string;
  expirationDate: string;
  bdoName: string;
  bdoTitle: string;
  bdoPhone: string;
  bdoEmail: string;
  authAppraisal: boolean;
  authEnvironmental: boolean;
  authValuation: boolean;
}

function formatPhone(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

const formatCurrency = (value: number): string => {
  if (!value) return '';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value);
};

const escapeXml = (text: string): string => {
  if (!text) return '';
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
};

function formatTermDisplay(months: string): string {
  const m = parseInt(months);
  if (!m || isNaN(m)) return months ? `${months} months` : '[Term]';
  const years = Math.floor(m / 12);
  const remaining = m % 12;
  if (remaining === 0) return `${m} months / ${years} year${years !== 1 ? 's' : ''}`;
  return `${m} months / ${years} year${years !== 1 ? 's' : ''} ${remaining} month${remaining !== 1 ? 's' : ''}`;
}

interface LogoAsset {
  bytes: Uint8Array;
  aspect: number; // width / height
}

// Fetch the navy T Bank logo (extracted from the "T Bank Letterhead" .docx — a
// transparent-background, navy version that reads well on white) and read its
// intrinsic aspect ratio from the PNG IHDR chunk so the embedded image isn't
// distorted.
async function fetchLogo(): Promise<LogoAsset | null> {
  try {
    const res = await fetch('/images/TBank-logo-navy.png');
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    // PNG: 8-byte signature, then IHDR length(4)+type(4); width@16, height@20.
    const w = dv.getUint32(16);
    const h = dv.getUint32(20);
    const aspect = w > 0 && h > 0 ? w / h : 3.484;
    return { bytes, aspect };
  } catch {
    return null;
  }
}

function generateSimple7aDocx(data: Simple7aLOIData, logo: LogoAsset | null) {
  const e = escapeXml;

  const p = (text: string, opts?: { bold?: boolean; indent?: boolean; spacing?: number; size?: number; underline?: boolean }) => {
    const rPr = [];
    if (opts?.bold) rPr.push('<w:b/>');
    if (opts?.underline) rPr.push('<w:u w:val="single"/>');
    if (opts?.size) rPr.push(`<w:sz w:val="${opts.size}"/><w:szCs w:val="${opts.size}"/>`);
    const rPrXml = rPr.length ? `<w:rPr>${rPr.join('')}</w:rPr>` : '';
    const pPr = [];
    if (opts?.indent) pPr.push('<w:ind w:left="720"/>');
    if (opts?.spacing !== undefined) pPr.push(`<w:spacing w:after="${opts.spacing}"/>`);
    const pPrXml = pPr.length ? `<w:pPr>${pPr.join('')}</w:pPr>` : '';
    return `<w:p>${pPrXml}<w:r>${rPrXml}<w:t xml:space="preserve">${e(text)}</w:t></w:r></w:p>`;
  };

  const mixedP = (parts: Array<{ text: string; bold?: boolean; underline?: boolean }>, opts?: { indent?: boolean; spacing?: number }) => {
    const pPr = [];
    if (opts?.indent) pPr.push('<w:ind w:left="720"/>');
    if (opts?.spacing !== undefined) pPr.push(`<w:spacing w:after="${opts.spacing}"/>`);
    const pPrXml = pPr.length ? `<w:pPr>${pPr.join('')}</w:pPr>` : '';
    const runs = parts.map(part => {
      const rPr = [];
      if (part.bold) rPr.push('<w:b/>');
      if (part.underline) rPr.push('<w:u w:val="single"/>');
      const rPrXml = rPr.length ? `<w:rPr>${rPr.join('')}</w:rPr>` : '';
      return `<w:r>${rPrXml}<w:t xml:space="preserve">${e(part.text)}</w:t></w:r>`;
    }).join('');
    return `<w:p>${pPrXml}${runs}</w:p>`;
  };

  // Blank-line separation is handled by paragraph `after` spacing (see
  // styles.xml docDefaults), so an "empty" paragraph collapses to nothing \u2014
  // this keeps the letter compact enough to fit two pages.
  const empty = () => '';

  const checkbox = (text: string, checked: boolean) => {
    const mark = checked ? '\u2611' : '\u2610';
    return `<w:p><w:pPr><w:spacing w:after="40"/><w:ind w:left="360"/></w:pPr><w:r><w:t xml:space="preserve">${mark} ${e(text)}</w:t></w:r></w:p>`;
  };

  // ----- Styled building blocks (mirrors the Business Applicant Form) -----
  const HEADER_BLUE = '133C7F';   // section/title text \u2014 #133c7f
  const BORDER_BLUE = 'C5D4E8';   // field + rule borders
  const FIELD_FILL = 'FAFBFC';    // field background
  const LABEL_GRAY = '404040';    // small field label

  // Document header \u2014 letterhead style: white background, the navy T Bank logo
  // on the left, a navy right-aligned title, and a navy rule beneath. The logo
  // is an inline DrawingML picture referencing the embedded media (rId2).
  const HEADER_NAVY = '103C7C'; // navy sampled from the T Bank letterhead logo
  const LOGO_REL_ID = 'rId2';
  const LOGO_H_EMU = 393700; // 31pt tall, like the PDF header logo (12700 EMU/pt)
  const logoWidthEmu = logo ? Math.round(LOGO_H_EMU * logo.aspect) : 0;
  const logoDrawing = logo
    ? `<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${logoWidthEmu}" cy="${LOGO_H_EMU}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="1" name="TBankLogo"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="1" name="TBankLogo"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${LOGO_REL_ID}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${logoWidthEmu}" cy="${LOGO_H_EMU}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>`
    : '';
  const barCellPr = (firstCol: boolean) => `<w:tcPr><w:tcW w:w="5080" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="FFFFFF"/><w:tcBorders><w:bottom w:val="single" w:sz="8" w:space="0" w:color="${HEADER_NAVY}"/></w:tcBorders><w:tcMar><w:top w:w="80" w:type="dxa"/><w:left w:w="${firstCol ? 40 : 80}" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/><w:right w:w="${firstCol ? 80 : 40}" w:type="dxa"/></w:tcMar><w:vAlign w:val="center"/></w:tcPr>`;
  const headerBar = `<w:tbl><w:tblPr><w:tblW w:w="10160" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblLook w:val="0000" w:firstRow="0" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="1" w:noVBand="1"/></w:tblPr><w:tblGrid><w:gridCol w:w="5080"/><w:gridCol w:w="5080"/></w:tblGrid><w:tr><w:tc>${barCellPr(true)}<w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr><w:r>${logoDrawing}</w:r></w:p></w:tc><w:tc>${barCellPr(false)}<w:p><w:pPr><w:spacing w:before="0" w:after="0"/><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/><w:color w:val="${HEADER_NAVY}"/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr><w:t xml:space="preserve">7(a) LOI Proposal Letter</w:t></w:r></w:p></w:tc></w:tr></w:tbl>`;

  // Section heading \u2014 blue, bold, with a light-blue underline rule. Generous
  // space above each so sections are clearly separated.
  const sectionHeader = (text: string) => `<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="18" w:space="2" w:color="${BORDER_BLUE}"/></w:pBdr><w:spacing w:before="360" w:after="120"/><w:keepNext/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="${HEADER_BLUE}"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${e(text)}</w:t></w:r></w:p>`;

  // Thin spacer paragraph \u2014 also keeps Word from merging adjacent tables.
  const tableGap = '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="80" w:lineRule="exact"/></w:pPr></w:p>';
  // Medium vertical spacer (~9pt) for separating prose blocks.
  const spacer = '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="180" w:lineRule="exact"/></w:pPr></w:p>';

  // A boxed field (label + value) styled like the Business Applicant Form's
  // input boxes. `span` of 2 makes it full-width across both grid columns.
  const fieldCell = (label: string, value: string, span = 1) => {
    const w = span === 2 ? 10160 : 5080;
    const gridSpan = span === 2 ? '<w:gridSpan w:val="2"/>' : '';
    const border = (side: string) => `<w:${side} w:val="single" w:sz="4" w:space="0" w:color="${BORDER_BLUE}"/>`;
    return `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${gridSpan}<w:tcBorders>${border('top')}${border('left')}${border('bottom')}${border('right')}</w:tcBorders><w:shd w:val="clear" w:color="auto" w:fill="${FIELD_FILL}"/><w:tcMar><w:top w:w="30" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="30" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar></w:tcPr><w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="200" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:color w:val="${LABEL_GRAY}"/><w:sz w:val="15"/><w:szCs w:val="15"/></w:rPr><w:t xml:space="preserve">${e(label)}</w:t></w:r></w:p><w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="220" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve">${e(value || '\u2014')}</w:t></w:r></w:p></w:tc>`;
  };

  const fieldRow = (cells: string) => `<w:tr><w:trPr><w:tblCellSpacing w:w="36" w:type="dxa"/></w:trPr>${cells}</w:tr>`;

  const fieldTable = (rows: string[]) => `<w:tbl><w:tblPr><w:tblW w:w="10160" w:type="dxa"/><w:tblCellSpacing w:w="36" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblLook w:val="0000" w:firstRow="0" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="1" w:noVBand="1"/></w:tblPr><w:tblGrid><w:gridCol w:w="5080"/><w:gridCol w:w="5080"/></w:tblGrid>${rows.join('')}</w:tbl>`;

  // Use-of-Proceeds table, restyled with the same blue borders/headers.
  const propCell = (text: string, opts?: { right?: boolean; bold?: boolean; fill?: string; color?: string }) => {
    const jc = opts?.right ? '<w:jc w:val="right"/>' : '';
    const b = opts?.bold ? '<w:b/>' : '';
    const shd = opts?.fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${opts.fill}"/>` : '';
    const wv = opts?.right ? 2600 : 7560;
    const border = (side: string) => `<w:${side} w:val="single" w:sz="4" w:space="0" w:color="${BORDER_BLUE}"/>`;
    return `<w:tc><w:tcPr><w:tcW w:w="${wv}" w:type="dxa"/><w:tcBorders>${border('top')}${border('left')}${border('bottom')}${border('right')}</w:tcBorders>${shd}<w:tcMar><w:top w:w="20" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="20" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar></w:tcPr><w:p><w:pPr><w:spacing w:before="0" w:after="0"/>${jc}</w:pPr><w:r><w:rPr>${b}<w:color w:val="${opts?.color || '000000'}"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">${e(text)}</w:t></w:r></w:p></w:tc>`;
  };

  const buildProceedsTable = () => {
    const head = `<w:tr>${propCell('Use of Proceeds', { bold: true, fill: 'EAF0FA', color: HEADER_BLUE })}${propCell('Amount', { right: true, bold: true, fill: 'EAF0FA', color: HEADER_BLUE })}</w:tr>`;
    const body = data.useOfProceeds
      .map(row => `<w:tr>${propCell(row.category)}${propCell(formatCurrency(row.amount), { right: true })}</w:tr>`)
      .join('');
    const total = `<w:tr>${propCell('Total', { bold: true, fill: 'F2F6FC' })}${propCell(formatCurrency(data.useOfProceeds.reduce((s, r) => s + r.amount, 0)), { right: true, bold: true, fill: 'F2F6FC' })}</w:tr>`;
    return `<w:tbl><w:tblPr><w:tblW w:w="10160" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblLook w:val="0000" w:firstRow="0" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="1" w:noVBand="1"/></w:tblPr><w:tblGrid><w:gridCol w:w="7560"/><w:gridCol w:w="2600"/></w:tblGrid>${head}${body}${total}</w:tbl>`;
  };

  const paragraphs: string[] = [];

  paragraphs.push(headerBar);
  // Gap below the header band before the document title.
  paragraphs.push('<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="160" w:lineRule="exact"/></w:pPr></w:p>');

  // Large, bold, navy document title — left-aligned, with clear space beneath
  // it before the Date line.
  paragraphs.push(`<w:p><w:pPr><w:spacing w:before="0" w:after="320"/><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="${HEADER_NAVY}"/><w:sz w:val="40"/><w:szCs w:val="40"/></w:rPr><w:t xml:space="preserve">7(a) LOI Proposal Letter</w:t></w:r></w:p>`);

  paragraphs.push(mixedP([{ text: 'Date: ', bold: true }, { text: data.letterDate || '[Date]' }], { spacing: 40 }));
  paragraphs.push(mixedP([{ text: 'To: ', bold: true }, { text: data.principalName || '[Name]' }], { spacing: 40 }));
  if (data.principalTitle) {
    paragraphs.push(mixedP([{ text: 'Title: ', bold: true }, { text: data.principalTitle }], { spacing: 40 }));
  }
  if (data.mailingAddress) {
    paragraphs.push(mixedP([{ text: 'Address: ', bold: true }, { text: data.mailingAddress.split('\n').join(', ') }], { spacing: 40 }));
  }
  paragraphs.push(mixedP([{ text: 'Re: ', bold: true }, { text: data.loanName || '[Loan Name]' }], { spacing: 120 }));
  paragraphs.push(p(`Dear ${data.principalName || '[Principal Name]'}:`, { spacing: 100 }));
  paragraphs.push(p(
    `This Letter of Interest (\u201CLetter\u201D) outlines the preliminary terms under which T Bank may be willing to consider financing for ${data.borrowerName || '[Borrower Name]'} under the U.S. Small Business Administration (\u201CSBA\u201D) 7(a) Loan Program. This Letter is provided for discussion purposes only and does not constitute a commitment to lend.`,
    { spacing: 60 }
  ));

  paragraphs.push(sectionHeader('Proposed Loan Terms (Subject to Credit Approval)'));

  paragraphs.push(fieldTable([
    fieldRow(fieldCell('Loan Program', data.loanType || 'SBA 7(a)') + fieldCell('Loan Amount', data.loanAmount || '[Amount]')),
    fieldRow(fieldCell('Borrower', data.borrowerName || '[Legal Business Name]') + fieldCell('Term / Amortization', formatTermDisplay(data.termMonths))),
    fieldRow(fieldCell('Guarantor(s)', data.guarantorNames || '[Owner Name(s)]') + fieldCell('Loan Fees', data.loanFees || '[Fees]')),
  ]));
  paragraphs.push(tableGap);

  if (data.useOfProceeds.length > 0) {
    paragraphs.push(mixedP([{ text: 'Loan Purpose / Use of Proceeds', bold: true }], { spacing: 60 }));
    paragraphs.push(buildProceedsTable());
  } else {
    paragraphs.push(fieldTable([
      fieldRow(fieldCell('Loan Purpose', data.loanPurpose || '[Purpose]', 2)),
    ]));
  }
  paragraphs.push(tableGap);

  const rateText = data.interestRateSpread
    ? `The rate is WSJ Prime Plus ${data.interestRateSpread}%.  The rate will adjust on a ${data.rateAdjustmentPeriod || 'quarterly'} basis for the life of the loan. The above rates are subject to change the prevailing Wall Street Journal Prime (WSJ P) rate.`
    : '[Interest Rate Details]';
  const collateralText = data.collateralDescription || 'First UCC blanket lien on all business assets.';

  paragraphs.push(fieldTable([
    fieldRow(fieldCell('Interest Rate', rateText, 2)),
    fieldRow(fieldCell('Prepayment', data.prepaymentTerms || '[Prepayment Terms]') + fieldCell('Life Insurance', data.lifeInsurance || 'Life insurance may be required')),
    fieldRow(fieldCell('Collateral', collateralText, 2)),
  ]));

  paragraphs.push(sectionHeader('Good Faith Deposit'));
  paragraphs.push(p(
    `Upon execution of this Letter, the Borrower will be required to remit a Good Faith Deposit in the amount of ${data.goodFaithDeposit || '$[Amount]'}.`
  ));
  paragraphs.push(empty());

  paragraphs.push(p('Fedex or Wire Instructions:', { bold: true }));
  paragraphs.push(empty());
  paragraphs.push(p('T Bank', { indent: true }));
  paragraphs.push(p('16200 Dallas Parkway Suite 190', { indent: true }));
  paragraphs.push(p('Dallas, Texas 75248', { indent: true }));
  paragraphs.push(empty());
  paragraphs.push(p('Notify: Loan Operations 972-720-9000', { indent: true }));
  paragraphs.push(mixedP([{ text: 'ABA #111024975' }], { indent: true }));
  paragraphs.push(mixedP([{ text: 'Account #91240010-0070' }], { indent: true }));
  paragraphs.push(mixedP([{ text: 'Reference: ', bold: true }, { text: data.borrowerName || '[Borrower Name]' }], { indent: true }));
  paragraphs.push(mixedP([{ text: 'Reference: ', bold: true }, { text: data.bdoName || '[BDO Name]' }], { indent: true, spacing: 60 }));
  paragraphs.push(spacer);

  paragraphs.push(p(
    'The Good Faith Deposit will be applied toward third-party costs, including but not limited to appraisal fees, environmental reports, credit reports, background checks, and other due diligence expenses.  T Bank will exercise reasonableness and sensitivity toward the Borrower regarding fees and expenses.  In the event the loan does not close, you will be responsible for all third-party expenses incurred by T Bank on your behalf that were made in a good faith attempt to close the loan.'
  ));
  paragraphs.push(empty());

  paragraphs.push(p('I hereby authorize T Bank to order the following reports:', { bold: true }));
  paragraphs.push(empty());
  paragraphs.push(checkbox('Real Estate appraisal', data.authAppraisal));
  paragraphs.push(checkbox('Environmental Report', data.authEnvironmental));
  paragraphs.push(checkbox('Business Valuation', data.authValuation));
  paragraphs.push(spacer);

  paragraphs.push(p(
    'All correspondence between the Bank and the Borrower, and all of Bank\u2019s documents including this Term Sheet, are confidential and may not be shown or discussed with any third party (other than on a confidential basis with Borrower\u2019s legal counsel, independent certified public accountants, and representatives of the Borrower), without Bank\u2019s prior written consent.  It is understood that T bank will from time to time give information on the status of your loan to the U.S. Small Business Administration.',
    { spacing: 240 }
  ));
  paragraphs.push(empty());

  paragraphs.push(p('We are excited about your project and look forward to working with you.  If you have any questions, please feel free to reach out.'));
  paragraphs.push(empty());
  paragraphs.push(p('Sincerely,'));
  paragraphs.push(empty());
  paragraphs.push(empty());

  if (data.bdoName) paragraphs.push(mixedP([{ text: 'Name: ', bold: true }, { text: data.bdoName }]));
  if (data.bdoTitle) paragraphs.push(mixedP([{ text: 'Title: ', bold: true }, { text: data.bdoTitle }]));
  if (data.bdoPhone) paragraphs.push(mixedP([{ text: 'Phone: ', bold: true }, { text: data.bdoPhone }]));
  if (data.bdoEmail) paragraphs.push(mixedP([{ text: 'Email: ', bold: true }, { text: data.bdoEmail }]));
  paragraphs.push(empty());
  paragraphs.push(empty());

  paragraphs.push(p(
    'I understand that the preliminary information given above is provided for informational purposes only and should not be considered a commitment for financing by Lender and/or any of its subsidiaries. This information may change without notice prior to final approval.',
    { size: 20 }
  ));
  paragraphs.push(empty());
  paragraphs.push(empty());

  paragraphs.push(p('Borrower: _______________________________ Date: ___________'));
  paragraphs.push(empty());
  paragraphs.push(p('Guarantor: ______________________________ Date: ___________'));

  const zip = new PizZip();
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`);
  zip.folder('_rels');
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
  zip.folder('word');
  zip.folder('word/_rels');
  const imageRel = logo
    ? '\n  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/>'
    : '';
  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${imageRel}
</Relationships>`);
  if (logo) {
    zip.folder('word/media');
    zip.file('word/media/image1.png', logo.bytes);
  }
  // Compact document defaults: 10pt Calibri, single line spacing, 5pt after each
  // paragraph (replaces the old blank-line paragraphs) so the letter fits 2 pages.
  zip.file('word/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:rPrDefault>
    <w:pPrDefault><w:pPr><w:spacing w:after="100" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
</w:styles>`);
  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
    ${paragraphs.join('\n    ')}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="720" w:right="900" w:bottom="720" w:left="900" w:header="360" w:footer="360" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`);

  const blob = zip.generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  const projectName = (data.loanName || data.borrowerName || 'LOI')
    .replace(/[\\/:*?"<>|]/g, '')
    .trim() || 'LOI';
  const now = new Date();
  const dateGenerated = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${now.getFullYear()}`;
  saveAs(blob, `LOI_7a_${projectName}_${dateGenerated}.docx`);
}

interface Simple7aLOIProps {
  onBack: () => void;
}

export default function Simple7aLOI({ onBack }: Simple7aLOIProps) {
  const { data: appData, updateProposalLetter7a, resetProposalLetter7a } = useApplication();
  const { toast } = useToast();

  const initialData = useMemo((): Simple7aLOIData => {
    const individuals = appData.individualApplicants || [];
    const firstIndividual = individuals[0];
    const primaryName = firstIndividual
      ? [firstIndividual.firstName, firstIndividual.lastName].filter(Boolean).join(' ')
      : '';
    const guarantorNames = individuals
      .map(ind => [ind.firstName, ind.lastName].filter(Boolean).join(' '))
      .filter(Boolean)
      .join(', ');

    const individualAddr = firstIndividual?.homeAddress;
    const addressParts: string[] = [];
    if (individualAddr?.street1) addressParts.push(individualAddr.street1);
    if (individualAddr?.street2) addressParts.push(individualAddr.street2);
    if (individualAddr?.city || individualAddr?.state || individualAddr?.zipCode) {
      addressParts.push([individualAddr.city, individualAddr.state].filter(Boolean).join(', ') + (individualAddr.zipCode ? ` ${individualAddr.zipCode}` : ''));
    }

    const business = appData.businessApplicant;
    const financingSources = appData.financingSources || [];
    const sba7aSource = financingSources.find(s =>
      s.financingType?.toLowerCase().includes('7(a)') || s.financingType?.toLowerCase().includes('7a')
    );
    const loan = appData.loan1;

    // Build Use of Proceeds from sourcesUses7a (T Bank Loan column)
    let totalSba7a = 0;
    const useOfProceeds: UseOfProceedsRow[] = [];
    const su7a = appData.sourcesUses7a;
    if (su7a) {
      const categoryLabels: Record<string, string> = {
        realEstateAcquisition: 'Real Estate',
        debtRefiCRE: 'Debt Refinance (CRE)',
        debtRefiNonCRE: 'Debt Refinance (Non-CRE)',
        machineryEquipment: 'Equipment',
        furnitureFixtures: 'Furniture & Fixtures',
        inventory: 'Inventory',
        workingCapital: 'Working Capital',
        workingCapitalPreOpening: 'Working Capital - Pre Opening',
        businessAcquisition: 'Business Acquisition',
        franchiseFees: 'Franchise Fees',
        constructionHardCosts: 'Construction Hard Costs',
        constructionContingency: 'Construction Contingency',
        interimInterestReserve: 'Interest Reserve - 3 Mos',
        otherConstructionSoftCosts: 'Construction Soft Costs',
        closingCosts: 'Closing Costs',
        sbaGtyFee: 'SBA Gty Fee',
        usdaGtyFee: 'USDA Gty Fee',
      };
      Object.entries(su7a).forEach(([key, row]) => {
        if (key === 'totals' || key === 'columnPercentages' || key === 'weightedTerm') return;
        if (row && typeof row === 'object' && 'tBankLoan' in row) {
          const val = (row as { tBankLoan?: number }).tBankLoan || 0;
          if (val > 0) {
            totalSba7a += val;
            useOfProceeds.push({ category: categoryLabels[key] || key, amount: val });
          }
        }
      });
    }
    const loanAmount = sba7aSource?.amount || loan?.amount || totalSba7a;

    const rawPurpose = appData.projectOverview?.primaryProjectPurpose || '';
    const purposeText = Array.isArray(rawPurpose) ? rawPurpose.join(', ') : rawPurpose;
    const selectedBdoName = appData.projectOverview?.bdo1 || appData.projectOverview?.bdoName || '';

    const spread = sba7aSource?.spread || loan?.spread || 0;
    const termMonths = sba7aSource
      ? String(Math.round((sba7aSource.termYears || 0) * 12))
      : (loan?.term ? String(loan.term) : '');

    return {
      letterDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      loanName: appData.projectOverview?.projectName || '',
      principalName: primaryName,
      principalTitle: firstIndividual?.title || '',
      mailingAddress: addressParts.join('\n'),
      borrowerName: business?.legalName || '',
      guarantorNames,
      loanAmount: loanAmount ? formatCurrency(loanAmount) : '',
      loanType: sba7aSource?.financingType || loan?.type || '',
      loanPurpose: purposeText,
      useOfProceeds,
      termMonths,
      loanFees: '',
      interestRateSpread: spread ? spread.toFixed(2) : '',
      rateAdjustmentPeriod: 'quarterly',
      prepaymentTerms: '',
      collateralDescription: '',
      lifeInsurance: 'Life insurance may be required',
      goodFaithDeposit: '',
      expirationDate: '',
      bdoName: selectedBdoName,
      bdoTitle: '',
      bdoPhone: '',
      bdoEmail: '',
      authAppraisal: false,
      authEnvironmental: false,
      authValuation: false,
    };
  }, [appData]);

  // User edits are persisted as overrides in the application store (survives
  // page refresh) and layered on top of the values auto-derived from project data.
  const overrides = (appData.proposalLetter7a || {}) as Partial<Simple7aLOIData>;
  const formData = useMemo<Simple7aLOIData>(
    () => ({ ...initialData, ...overrides }),
    [initialData, overrides]
  );

  const updateField = (field: keyof Simple7aLOIData, value: any) => {
    updateProposalLetter7a({ [field]: value });
  };

  const handleGenerate = async () => {
    try {
      const logo = await fetchLogo();
      generateSimple7aDocx(formData, logo);
      toast({ title: "Success", description: "7(a) LOI document generated." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to generate document.", variant: "destructive" });
    }
  };

  const handleReloadFromProject = () => {
    resetProposalLetter7a();
    toast({ title: "Reloaded", description: "Fields refreshed from project data." });
  };

  const inputClass = "w-full px-3 py-2 border border-[var(--t-color-border)] rounded-lg text-sm focus:border-[var(--t-color-accent)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] bg-[var(--t-color-card-bg)] transition-all";
  const labelClass = "block text-[13px] font-medium text-[color:var(--t-color-text-secondary)] mb-1";

  return (
    <div className="bg-[var(--t-color-card-bg)] border border-[var(--t-color-border)] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] min-h-[calc(100vh-160px)]">
      <div className="border-b border-[var(--t-color-border)] p-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back-to-proposal-letters">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-[20px] font-semibold text-[color:var(--t-color-text-body)]">7(a) Letter of Interest</h2>
              <p className="text-[color:var(--t-color-text-muted)] text-[13px] mt-1">LOI matching T Bank letter format</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleReloadFromProject}
              className="px-4 py-2 border border-[var(--t-color-border)] text-[color:var(--t-color-text-body)] text-[13px] font-medium rounded-lg hover-elevate active-elevate-2 flex items-center gap-2"
              data-testid="button-reload-from-project"
            >
              <RefreshCw className="w-4 h-4" />
              Reload from Project
            </button>
            <button
              onClick={handleGenerate}
              className="px-4 py-2 bg-[var(--t-color-primary)] hover:bg-[var(--t-color-primary-light)] text-white text-[13px] font-medium rounded-lg transition-colors flex items-center gap-2"
              data-testid="button-generate-7a"
            >
              <FileDown className="w-4 h-4" />
              Generate .docx
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        <div>
          <h3 className="text-base font-semibold text-[color:var(--t-color-text-secondary)] mb-4 pb-1.5 border-b-2 border-[var(--t-color-accent)]">
            Section 1: Letter Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass} data-testid="label-letter-date">Date</label>
              <input className={inputClass} value={formData.letterDate} onChange={e => updateField('letterDate', e.target.value)} data-testid="input-letter-date" />
            </div>
            <div>
              <label className={labelClass} data-testid="label-loan-name">Loan Name (Re: line)</label>
              <input className={inputClass} value={formData.loanName} onChange={e => updateField('loanName', e.target.value)} placeholder="e.g., Anna - Test #9" data-testid="input-loan-name" />
            </div>
            <div>
              <label className={labelClass} data-testid="label-principal-name">To / Dear (Primary Contact Name)</label>
              <input className={inputClass} value={formData.principalName} onChange={e => updateField('principalName', e.target.value)} data-testid="input-principal-name" />
            </div>
            <div>
              <label className={labelClass} data-testid="label-principal-title">Principal Title</label>
              <input className={inputClass} value={formData.principalTitle} onChange={e => updateField('principalTitle', e.target.value)} data-testid="input-principal-title" />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass} data-testid="label-mailing-address">Address (Individual Home Address)</label>
              <textarea className={`${inputClass} resize-vertical`} rows={2} value={formData.mailingAddress} onChange={e => updateField('mailingAddress', e.target.value)} data-testid="input-mailing-address" />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-base font-semibold text-[color:var(--t-color-text-secondary)] mb-4 pb-1.5 border-b-2 border-[var(--t-color-accent)]">
            Section 2: Loan Terms
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass} data-testid="label-loan-type">Loan Program</label>
              <input className={inputClass} value={formData.loanType} onChange={e => updateField('loanType', e.target.value)} placeholder="e.g., sba-7a-standard" data-testid="input-loan-type" />
            </div>
            <div>
              <label className={labelClass} data-testid="label-borrower-name">Borrower (Legal Business Name)</label>
              <input className={inputClass} value={formData.borrowerName} onChange={e => updateField('borrowerName', e.target.value)} data-testid="input-borrower-name" />
            </div>
            <div>
              <label className={labelClass} data-testid="label-guarantors">Guarantor(s)</label>
              <input className={inputClass} value={formData.guarantorNames} onChange={e => updateField('guarantorNames', e.target.value)} data-testid="input-guarantors" />
            </div>
            <div>
              <label className={labelClass} data-testid="label-loan-amount">Loan Amount</label>
              <input className={inputClass} value={formData.loanAmount} onChange={e => updateField('loanAmount', e.target.value)} placeholder="$0.00" data-testid="input-loan-amount" />
            </div>
            <div>
              <label className={labelClass} data-testid="label-term-months">Term (months)</label>
              <input className={inputClass} value={formData.termMonths} onChange={e => updateField('termMonths', e.target.value)} data-testid="input-term-months" />
            </div>
            <div>
              <label className={labelClass} data-testid="label-loan-fees">Loan Fees</label>
              <input className={inputClass} value={formData.loanFees} onChange={e => updateField('loanFees', e.target.value)} placeholder="e.g., SBA Guarantee Fee per SBA guidelines" data-testid="input-loan-fees" />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass} data-testid="label-loan-purpose">Loan Purpose (fallback if no Use of Proceeds)</label>
              <textarea className={`${inputClass} resize-vertical`} rows={2} value={formData.loanPurpose} onChange={e => updateField('loanPurpose', e.target.value)} data-testid="input-loan-purpose" />
            </div>
            {formData.useOfProceeds.length > 0 && (
              <div className="md:col-span-2">
                <label className={labelClass}>Use of Proceeds (from Sources & Uses)</label>
                <div className="border border-[var(--t-color-border)] rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--t-color-page-bg)]">
                      <tr>
                        <th className="text-left py-2 px-3 font-medium text-[color:var(--t-color-text-secondary)]">Category</th>
                        <th className="text-right py-2 px-3 font-medium text-[color:var(--t-color-text-secondary)]">SBA 7(a) Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.useOfProceeds.map((row, idx) => (
                        <tr key={idx} className="border-t border-[var(--t-color-highlight-border)]">
                          <td className="py-2 px-3 text-[color:var(--t-color-text-body)]">{row.category}</td>
                          <td className="py-2 px-3 text-right text-[color:var(--t-color-text-body)]">{formatCurrency(row.amount)}</td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-[var(--t-color-border)] bg-[var(--t-color-page-bg)] font-semibold">
                        <td className="py-2 px-3 text-[color:var(--t-color-text-body)]">Total</td>
                        <td className="py-2 px-3 text-right text-[color:var(--t-color-text-body)]">{formatCurrency(formData.useOfProceeds.reduce((s, r) => s + r.amount, 0))}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div>
              <label className={labelClass} data-testid="label-interest-rate">Interest Rate (WSJ Prime Plus %)</label>
              <input className={inputClass} value={formData.interestRateSpread} onChange={e => updateField('interestRateSpread', e.target.value)} placeholder="e.g., 2.75" data-testid="input-interest-rate" />
            </div>
            <div>
              <label className={labelClass} data-testid="label-rate-adjustment">Rate Adjustment Period</label>
              <select className={inputClass} value={formData.rateAdjustmentPeriod} onChange={e => updateField('rateAdjustmentPeriod', e.target.value)} data-testid="select-rate-adjustment">
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annually">Annually</option>
              </select>
            </div>
            <div>
              <label className={labelClass} data-testid="label-prepayment">Prepayment Terms</label>
              <input className={inputClass} value={formData.prepaymentTerms} onChange={e => updateField('prepaymentTerms', e.target.value)} placeholder="e.g., 5% in year 1, 3% in year 2, 1% in year 3" data-testid="input-prepayment" />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass} data-testid="label-collateral">Collateral</label>
              <textarea className={`${inputClass} resize-vertical`} rows={2} value={formData.collateralDescription} onChange={e => updateField('collateralDescription', e.target.value)} placeholder="First UCC blanket lien on all business assets." data-testid="input-collateral" />
            </div>
            <div>
              <label className={labelClass} data-testid="label-life-insurance">Life Insurance</label>
              <select className={inputClass} value={formData.lifeInsurance} onChange={e => updateField('lifeInsurance', e.target.value)} data-testid="select-life-insurance">
                <option value="Life insurance may be required">Life insurance may be required</option>
                <option value="Life insurance is required">Life insurance is required</option>
                <option value="No life insurance required">No life insurance required</option>
              </select>
            </div>
            <div>
              <label className={labelClass} data-testid="label-good-faith-deposit">Good Faith Deposit Amount</label>
              <input className={inputClass} value={formData.goodFaithDeposit} onChange={e => updateField('goodFaithDeposit', e.target.value)} placeholder="e.g., $5,000" data-testid="input-good-faith-deposit" />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-base font-semibold text-[color:var(--t-color-text-secondary)] mb-4 pb-1.5 border-b-2 border-[var(--t-color-accent)]">
            Section 3: Authorization
          </h3>
          <p className="text-sm text-[color:var(--t-color-text-secondary)] mb-3">Select which reports to authorize T Bank to order:</p>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer" data-testid="label-auth-appraisal">
              <input
                type="checkbox"
                checked={formData.authAppraisal}
                onChange={e => updateField('authAppraisal', e.target.checked)}
                className="w-4 h-4 rounded border-[var(--t-color-border)] text-[color:var(--t-color-accent)] focus:ring-[var(--t-color-accent)]"
                data-testid="checkbox-auth-appraisal"
              />
              <span className="text-sm text-[color:var(--t-color-text-body)]">Real Estate Appraisal</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer" data-testid="label-auth-environmental">
              <input
                type="checkbox"
                checked={formData.authEnvironmental}
                onChange={e => updateField('authEnvironmental', e.target.checked)}
                className="w-4 h-4 rounded border-[var(--t-color-border)] text-[color:var(--t-color-accent)] focus:ring-[var(--t-color-accent)]"
                data-testid="checkbox-auth-environmental"
              />
              <span className="text-sm text-[color:var(--t-color-text-body)]">Environmental Report</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer" data-testid="label-auth-valuation">
              <input
                type="checkbox"
                checked={formData.authValuation}
                onChange={e => updateField('authValuation', e.target.checked)}
                className="w-4 h-4 rounded border-[var(--t-color-border)] text-[color:var(--t-color-accent)] focus:ring-[var(--t-color-accent)]"
                data-testid="checkbox-auth-valuation"
              />
              <span className="text-sm text-[color:var(--t-color-text-body)]">Business Valuation</span>
            </label>
          </div>
        </div>

        <div>
          <h3 className="text-base font-semibold text-[color:var(--t-color-text-secondary)] mb-4 pb-1.5 border-b-2 border-[var(--t-color-accent)]">
            Section 4: BDO & Expiration
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass} data-testid="label-bdo-name">BDO Name</label>
              <input className={inputClass} value={formData.bdoName} onChange={e => updateField('bdoName', e.target.value)} data-testid="input-bdo-name" />
            </div>
            <div>
              <label className={labelClass} data-testid="label-bdo-title">BDO Title</label>
              <input className={inputClass} value={formData.bdoTitle} onChange={e => updateField('bdoTitle', e.target.value)} data-testid="input-bdo-title" />
            </div>
            <div>
              <label className={labelClass} data-testid="label-bdo-phone">BDO Phone</label>
              <input className={inputClass} value={formData.bdoPhone} onChange={e => updateField('bdoPhone', formatPhone(e.target.value))} maxLength={14} data-testid="input-bdo-phone" />
            </div>
            <div>
              <label className={labelClass} data-testid="label-bdo-email">BDO Email</label>
              <input className={inputClass} value={formData.bdoEmail} onChange={e => updateField('bdoEmail', e.target.value)} data-testid="input-bdo-email" />
            </div>
            <div>
              <label className={labelClass} data-testid="label-expiration-date">Letter Expiration Date</label>
              <input type="date" className={inputClass} value={formData.expirationDate} onChange={e => updateField('expirationDate', e.target.value)} data-testid="input-expiration-date" />
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--t-color-border)] pt-6 flex justify-end gap-3">
          <button
            onClick={onBack}
            className="px-6 py-2.5 border border-[var(--t-color-border)] text-[color:var(--t-color-text-body)] text-[13px] font-medium rounded-lg hover-elevate active-elevate-2"
            data-testid="button-back-bottom"
          >
            Back to Proposal Letters
          </button>
          <button
            onClick={handleGenerate}
            className="px-6 py-2.5 bg-[var(--t-color-primary)] hover:bg-[var(--t-color-primary-light)] text-white text-[13px] font-medium rounded-lg transition-colors flex items-center gap-2"
            data-testid="button-generate-7a-bottom"
          >
            <FileDown className="w-4 h-4" />
            Generate .docx
          </button>
        </div>
      </div>
    </div>
  );
}

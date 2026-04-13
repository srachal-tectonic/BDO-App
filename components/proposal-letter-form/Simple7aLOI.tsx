'use client';

import { useState, useEffect, useMemo } from 'react';
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

function generateSimple7aDocx(data: Simple7aLOIData) {
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

  const empty = () => '<w:p/>';

  const checkbox = (text: string, checked: boolean) => {
    const mark = checked ? '\u2611' : '\u2610';
    return `<w:p><w:pPr><w:ind w:left="360"/></w:pPr><w:r><w:t xml:space="preserve">${mark} ${e(text)}</w:t></w:r></w:p>`;
  };

  const tableRow = (cells: Array<{ text: string; bold?: boolean; width?: number; align?: string }>) => {
    const tcs = cells.map(cell => {
      const rPr = cell.bold ? '<w:rPr><w:b/></w:rPr>' : '';
      const jc = cell.align ? `<w:jc w:val="${cell.align}"/>` : '';
      const tcW = cell.width ? `<w:tcW w:w="${cell.width}" w:type="dxa"/>` : '';
      return `<w:tc><w:tcPr>${tcW}</w:tcPr><w:p><w:pPr>${jc}</w:pPr><w:r>${rPr}<w:t xml:space="preserve">${e(cell.text)}</w:t></w:r></w:p></w:tc>`;
    }).join('');
    return `<w:tr>${tcs}</w:tr>`;
  };

  const paragraphs: string[] = [];

  paragraphs.push(mixedP([{ text: 'Date: ', bold: true }, { text: data.letterDate || '[Date]' }]));
  paragraphs.push(empty());
  paragraphs.push(mixedP([{ text: 'To:  ', bold: true }, { text: data.principalName || '[Name]' }]));
  paragraphs.push(empty());
  if (data.mailingAddress) {
    paragraphs.push(mixedP([{ text: 'Address: ', bold: true }, { text: data.mailingAddress.split('\n').join(', ') }]));
  }
  paragraphs.push(empty());
  paragraphs.push(mixedP([{ text: 'Re: ', bold: true }, { text: data.loanName || '[Loan Name]' }]));
  paragraphs.push(empty());
  paragraphs.push(p(`Dear ${data.principalName || '[Principal Name]'}:`));
  paragraphs.push(empty());
  paragraphs.push(p(
    `This Letter of Interest (\u201CLetter\u201D) outlines the preliminary terms under which T Bank may be willing to consider financing for ${data.borrowerName || '[Borrower Name]'} under the U.S. Small Business Administration (\u201CSBA\u201D) 7(a) Loan Program. This Letter is provided for discussion purposes only and does not constitute a commitment to lend.`
  ));
  paragraphs.push(empty());
  paragraphs.push(p('Proposed Loan Terms (Subject to Credit Approval)', { bold: true, underline: true, size: 24 }));
  paragraphs.push(empty());
  paragraphs.push(mixedP([{ text: 'Loan Program: ', bold: true }, { text: data.loanType || 'SBA 7(a)' }]));
  paragraphs.push(mixedP([{ text: 'Borrower: ', bold: true }, { text: data.borrowerName || '[Legal Business Name]' }]));
  paragraphs.push(mixedP([{ text: 'Guarantor(s): ', bold: true }, { text: data.guarantorNames || '[Owner Name(s)]' }]));
  paragraphs.push(mixedP([{ text: 'Loan Amount: ', bold: true }, { text: data.loanAmount || '[Amount]' }]));

  if (data.useOfProceeds.length > 0) {
    paragraphs.push(mixedP([{ text: 'Loan Purpose: ', bold: true }]));
    const proceedsTable = `<w:tbl>
      <w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/>
      </w:tblBorders></w:tblPr>
      ${tableRow([
        { text: 'Use of Proceeds', bold: true, width: 5000 },
        { text: 'Amount', bold: true, width: 3000, align: 'right' },
      ])}
      ${data.useOfProceeds.map(row => tableRow([
        { text: row.category, width: 5000 },
        { text: formatCurrency(row.amount), width: 3000, align: 'right' },
      ])).join('\n')}
      ${tableRow([
        { text: 'Total', bold: true, width: 5000 },
        { text: formatCurrency(data.useOfProceeds.reduce((sum, r) => sum + r.amount, 0)), bold: true, width: 3000, align: 'right' },
      ])}
    </w:tbl>`;
    paragraphs.push(proceedsTable);
  } else {
    paragraphs.push(mixedP([{ text: 'Loan Purpose:  ', bold: true }, { text: data.loanPurpose || '[Purpose]' }]));
  }
  paragraphs.push(empty());

  paragraphs.push(mixedP([{ text: 'Term / Amortization: ', bold: true }, { text: formatTermDisplay(data.termMonths) }]));
  paragraphs.push(mixedP([{ text: 'Loan Fees: ', bold: true }, { text: data.loanFees || '[Fees]' }]));

  const rateText = data.interestRateSpread
    ? `The rate is WSJ Prime Plus ${data.interestRateSpread}%.  The rate will adjust on a ${data.rateAdjustmentPeriod || 'quarterly'} basis for the life of the loan. The above rates are subject to change the prevailing Wall Street Journal Prime (WSJ P) rate.`
    : '[Interest Rate Details]';
  paragraphs.push(mixedP([{ text: 'Interest Rate: ', bold: true }, { text: rateText }]));
  paragraphs.push(mixedP([{ text: 'Prepayment: ', bold: true }, { text: data.prepaymentTerms || '[Prepayment Terms]' }]));

  const collateralText = data.collateralDescription || 'First UCC blanket lien on all business assets.';
  paragraphs.push(mixedP([{ text: 'Collateral: ', bold: true }, { text: collateralText }]));
  paragraphs.push(mixedP([{ text: 'Life Insurance: ', bold: true }, { text: data.lifeInsurance || 'Life insurance may be required' }]));
  paragraphs.push(empty());

  paragraphs.push(p('Good Faith Deposit', { bold: true, underline: true, size: 24 }));
  paragraphs.push(empty());
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
  paragraphs.push(mixedP([{ text: 'Reference: ', bold: true }, { text: data.bdoName || '[BDO Name]' }], { indent: true }));
  paragraphs.push(empty());

  paragraphs.push(p(
    'The Good Faith Deposit will be applied toward third-party costs, including but not limited to appraisal fees, environmental reports, credit reports, background checks, and other due diligence expenses.  T Bank will exercise reasonableness and sensitivity toward the Borrower regarding fees and expenses.  In the event the loan does not close, you will be responsible for all third-party expenses incurred by T Bank on your behalf that were made in a good faith attempt to close the loan.'
  ));
  paragraphs.push(empty());

  paragraphs.push(p('I hereby authorize T Bank to order the following reports:', { bold: true }));
  paragraphs.push(empty());
  paragraphs.push(checkbox('Real Estate appraisal', data.authAppraisal));
  paragraphs.push(checkbox('Environmental Report', data.authEnvironmental));
  paragraphs.push(checkbox('Business Valuation', data.authValuation));
  paragraphs.push(empty());

  paragraphs.push(p(
    'All correspondence between the Bank and the Borrower, and all of Bank\u2019s documents including this Term Sheet, are confidential and may not be shown or discussed with any third party (other than on a confidential basis with Borrower\u2019s legal counsel, independent certified public accountants, and representatives of the Borrower), without Bank\u2019s prior written consent.  It is understood that T bank will from time to time give information on the status of your loan to the U.S. Small Business Administration.'
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
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
  zip.folder('_rels');
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
  zip.folder('word');
  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphs.join('\n    ')}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`);

  const blob = zip.generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  const safeName = (data.borrowerName || 'LOI').replace(/[^a-z0-9]/gi, '_');
  saveAs(blob, `LOI_7a_${safeName}_${Date.now()}.docx`);
}

interface Simple7aLOIProps {
  onBack: () => void;
}

export default function Simple7aLOI({ onBack }: Simple7aLOIProps) {
  const { data: appData } = useApplication();
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
        interimInterestReserve: 'Interim Interest Reserve',
        constructionContingency: 'Construction Contingency',
        otherConstructionSoftCosts: 'Other Construction Soft Costs',
        closingCosts: 'Closing Costs',
        sbaGtyFee: 'SBA Gty Fee',
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

  const [formData, setFormData] = useState<Simple7aLOIData>(initialData);

  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  const updateField = (field: keyof Simple7aLOIData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerate = () => {
    try {
      generateSimple7aDocx(formData);
      toast({ title: "Success", description: "7(a) LOI document generated." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to generate document.", variant: "destructive" });
    }
  };

  const handleReloadFromProject = () => {
    setFormData(initialData);
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

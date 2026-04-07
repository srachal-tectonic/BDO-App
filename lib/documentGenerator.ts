import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import PizZip from 'pizzip';

interface ProposalData {
  loanOfficer: {
    letterDate: string;
    name: string;
    title: string;
    email: string;
    phone: string;
  };
  borrower: {
    contactName: string;
    contactTitle: string;
    contactEmail: string;
    businessLegalName: string;
    businessDBA: string;
    mailingAddress: string;
  };
  loanTypes: {
    sba7a: boolean;
    sba504: boolean;
    usdaBI: boolean;
  };
  loan7a?: any;
  loan504?: any;
  loan504Simple?: any;
  loanUSDA?: any;
  loanUsdaSimple?: any;
  guarantors: any[];
  affiliateGuarantors?: any[];
  useOfProceeds: any[];
  fees: any[];
  documentRequirements: any[];
  customDocRequirements: any[];
  depositAmount?: number;
  depositAllocation?: any;
  standardProvisions: any;
  customConditions: any[];
  expirationDays: number;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 2 
  }).format(value);
};

const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

const formatPercent = (value: number | string): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return '0.000%';
  return `${numValue.toFixed(3)}%`;
};

const safeNumber = (value: any): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

// Generate Word document with proper .docx structure
export const generateWordDocument = async (data: ProposalData): Promise<void> => {
  try {
    // Build document content as XML paragraphs
    let paragraphs = '';
    
    // Helper to create a paragraph
    const p = (text: string, bold = false) => {
      const run = bold 
        ? `<w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`
        : `<w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
      return `<w:p>${run}</w:p>`;
    };
    
    // Title
    paragraphs += p('SBA/USDA LOAN PROPOSAL', true);
    paragraphs += p('');
    
    // Loan Officer Information
    paragraphs += p('LOAN OFFICER:', true);
    if (data.loanOfficer.name) paragraphs += p(`  ${data.loanOfficer.name}${data.loanOfficer.title ? `, ${data.loanOfficer.title}` : ''}`);
    if (data.loanOfficer.email) paragraphs += p(`  Email: ${data.loanOfficer.email}`);
    if (data.loanOfficer.phone) paragraphs += p(`  Phone: ${data.loanOfficer.phone}`);
    paragraphs += p('');
    
    // Letter Details
    paragraphs += p(`Date: ${formatDate(data.loanOfficer.letterDate)}`);
    if (data.expirationDays) {
      const expirationDate = new Date(data.loanOfficer.letterDate);
      expirationDate.setDate(expirationDate.getDate() + data.expirationDays);
      paragraphs += p(`Proposal Valid Until: ${formatDate(expirationDate.toISOString())}`);
    }
    paragraphs += p('');
    
    // Borrower Information
    paragraphs += p('BORROWER INFORMATION:', true);
    if (data.borrower.contactName) paragraphs += p(`  Contact: ${data.borrower.contactName}${data.borrower.contactTitle ? `, ${data.borrower.contactTitle}` : ''}`);
    if (data.borrower.contactEmail) paragraphs += p(`  Email: ${data.borrower.contactEmail}`);
    if (data.borrower.businessLegalName) paragraphs += p(`  Legal Name: ${data.borrower.businessLegalName}`);
    if (data.borrower.businessDBA && data.borrower.businessDBA !== data.borrower.businessLegalName) {
      paragraphs += p(`  DBA: ${data.borrower.businessDBA}`);
    }
    if (data.borrower.mailingAddress) paragraphs += p(`  Address: ${data.borrower.mailingAddress}`);
    paragraphs += p('');
    
    // Loan types
    const loanTypes: string[] = [];
    if (data.loanTypes.sba7a) loanTypes.push('SBA 7(a)');
    if (data.loanTypes.sba504) loanTypes.push('SBA 504');
    if (data.loanTypes.usdaBI) loanTypes.push('USDA B&I');
    paragraphs += p(`LOAN TYPE(S): ${loanTypes.join(', ')}`, true);
    paragraphs += p('');
    
    // 7(a) details
    if (data.loanTypes.sba7a && data.loan7a) {
      paragraphs += p('SBA 7(a) LOAN TERMS:', true);
      paragraphs += p(`  Loan Amount: ${formatCurrency(safeNumber(data.loan7a.loanAmount))}`);
      if (data.loan7a.companionLoan) paragraphs += p(`  Companion Loan: ${formatCurrency(safeNumber(data.loan7a.companionLoan))}`);
      if (data.loan7a.equityInjection) paragraphs += p(`  Equity Injection: ${formatCurrency(safeNumber(data.loan7a.equityInjection))}`);
      paragraphs += p(`  Interest Rate: ${formatPercent(data.loan7a.interestRate)}`);
      if (data.loan7a.rateType) paragraphs += p(`  Rate Type: ${data.loan7a.rateType}`);
      if (data.loan7a.rateAdjustmentPeriod) paragraphs += p(`  Rate Adjustment: ${data.loan7a.rateAdjustmentPeriod}`);
      paragraphs += p(`  Term: ${safeNumber(data.loan7a.termMonths)} months`);
      if (data.loan7a.monthlyPayment) paragraphs += p(`  Monthly Payment: ${formatCurrency(safeNumber(data.loan7a.monthlyPayment))}`);
      if (data.loan7a.guaranteePercentage) paragraphs += p(`  SBA Guarantee: ${safeNumber(data.loan7a.guaranteePercentage)}%`);
      if (data.loan7a.loanPurpose) {
        paragraphs += p(`  Purpose: ${data.loan7a.loanPurpose}`);
      }
      if (data.loan7a.collateralDescription) {
        paragraphs += p(`  Collateral: ${data.loan7a.collateralDescription}`);
      }
      if (data.loan7a.prepaymentPenalty) {
        paragraphs += p(`  Prepayment Penalty: ${data.loan7a.prepaymentPenalty}`);
      }
      if (data.loan7a.insuranceRequirements && data.loan7a.insuranceRequirements.length > 0) {
        paragraphs += p(`  Insurance Requirements: ${data.loan7a.insuranceRequirements.join(', ')}`);
      }
      if (data.loan7a.thirdPartyReports) {
        paragraphs += p(`  Third Party Reports: ${data.loan7a.thirdPartyReports}`);
      }
      if (data.loan7a.targetClosingDate) {
        paragraphs += p(`  Target Closing: ${formatDate(data.loan7a.targetClosingDate)}`);
      }
      if (data.loan7a.specialConditions) {
        paragraphs += p(`  Special Conditions: ${data.loan7a.specialConditions}`);
      }
      paragraphs += p('');
    }
    
    // 504 details
    const loan504Data = (data as any).loan504Simple;
    if (data.loanTypes.sba504 && loan504Data) {
      paragraphs += p('SBA 504 LOAN STRUCTURE:', true);
      if (loan504Data.interim) {
        paragraphs += p(`  Interim Loan: ${formatCurrency(safeNumber(loan504Data.interim.loanAmount))}`);
      }
      if (loan504Data.permanent) {
        paragraphs += p(`  Permanent First: ${formatCurrency(safeNumber(loan504Data.permanent.loanAmount))}`);
      }
      if (loan504Data.cdc) {
        paragraphs += p(`  CDC Second: ${formatCurrency(safeNumber(loan504Data.cdc.loanAmount))}`);
      }
      paragraphs += p('');
    }
    
    // USDA details - check both loanUsdaSimple and loanUSDA
    const loanUsdaData = (data as any).loanUsdaSimple || data.loanUSDA;
    if (data.loanTypes.usdaBI && loanUsdaData) {
      paragraphs += p('USDA B&I LOAN TERMS:', true);
      paragraphs += p(`  Loan Amount: ${formatCurrency(safeNumber(loanUsdaData.loanAmount))}`);
      paragraphs += p(`  Interest Rate: ${formatPercent(loanUsdaData.interestRate)}`);
      if (loanUsdaData.termYears || loanUsdaData.termMonths) {
        paragraphs += p(`  Term: ${loanUsdaData.termYears || safeNumber(loanUsdaData.termMonths)} ${loanUsdaData.termYears ? 'years' : 'months'}`);
      }
      if (loanUsdaData.amortizationYears) paragraphs += p(`  Amortization: ${loanUsdaData.amortizationYears} years`);
      if (loanUsdaData.guaranteePercentage) paragraphs += p(`  USDA Guarantee: ${safeNumber(loanUsdaData.guaranteePercentage)}%`);
      if (loanUsdaData.ruralEligible !== undefined) paragraphs += p(`  Rural Eligible: ${loanUsdaData.ruralEligible ? 'Yes' : 'No'}`);
      if (loanUsdaData.purpose) paragraphs += p(`  Purpose: ${loanUsdaData.purpose}`);
      if (loanUsdaData.collateral) paragraphs += p(`  Collateral: ${loanUsdaData.collateral}`);
      if (loanUsdaData.personalGuarantee) paragraphs += p(`  Personal Guarantee: ${loanUsdaData.personalGuarantee}`);
      if (loanUsdaData.lienPosition) paragraphs += p(`  Lien Position: ${loanUsdaData.lienPosition}`);
      if (loanUsdaData.tangibleBalanceSheetEquity) paragraphs += p(`  Tangible Balance Sheet Equity: ${loanUsdaData.tangibleBalanceSheetEquity}`);
      if (loanUsdaData.projectLocation) paragraphs += p(`  Project Location: ${loanUsdaData.projectLocation}`);
      if (loanUsdaData.jobsCreatedRetained) paragraphs += p(`  Jobs Created/Retained: ${loanUsdaData.jobsCreatedRetained}`);
      if (loanUsdaData.communityBenefit) paragraphs += p(`  Community Benefit: ${loanUsdaData.communityBenefit}`);
      if (loanUsdaData.guaranteeFee) paragraphs += p(`  Guarantee Fee: ${loanUsdaData.guaranteeFee}`);
      if (loanUsdaData.annualRenewalFee) paragraphs += p(`  Annual Renewal Fee: ${loanUsdaData.annualRenewalFee}`);
      if (loanUsdaData.equityInjectionRequired) paragraphs += p(`  Equity Injection Required: ${loanUsdaData.equityInjectionRequired}`);
      if (loanUsdaData.equitySource) paragraphs += p(`  Equity Source: ${loanUsdaData.equitySource}`);
      if (loanUsdaData.environmentalReview) paragraphs += p(`  Environmental Review: ${loanUsdaData.environmentalReview}`);
      if (loanUsdaData.feasibilityStudy) paragraphs += p(`  Feasibility Study: ${loanUsdaData.feasibilityStudy}`);
      if (loanUsdaData.workingCapitalRequirements) paragraphs += p(`  Working Capital: ${loanUsdaData.workingCapitalRequirements}`);
      if (loanUsdaData.debtServiceCoverage) paragraphs += p(`  Debt Service Coverage: ${loanUsdaData.debtServiceCoverage}`);
      if (loanUsdaData.disbursementTerms) paragraphs += p(`  Disbursement Terms: ${loanUsdaData.disbursementTerms}`);
      if (loanUsdaData.specialConditions) paragraphs += p(`  Special Conditions: ${loanUsdaData.specialConditions}`);
      paragraphs += p('');
    }
    
    // Guarantors
    if (data.guarantors && data.guarantors.length > 0) {
      paragraphs += p('GUARANTORS:', true);
      data.guarantors.forEach((g, idx) => {
        paragraphs += p(`  ${idx + 1}. ${g.name} - ${safeNumber(g.ownershipPercentage)}% ownership`);
      });
      paragraphs += p('');
    }
    
    // Use of Proceeds
    if (data.useOfProceeds && data.useOfProceeds.length > 0) {
      paragraphs += p('EXHIBIT A - USE OF PROCEEDS:', true);
      let totalUse = 0;
      data.useOfProceeds.forEach(item => {
        const amount = safeNumber(item.amount);
        paragraphs += p(`  ${item.description}: ${formatCurrency(amount)}`);
        totalUse += amount;
      });
      paragraphs += p(`  TOTAL: ${formatCurrency(totalUse)}`, true);
      paragraphs += p('');
    }
    
    // Fees
    if (data.fees && data.fees.length > 0) {
      paragraphs += p('EXHIBIT B - ESTIMATED CLOSING COSTS:', true);
      let totalFees = 0;
      data.fees.forEach(fee => {
        const amount = safeNumber(fee.amount);
        paragraphs += p(`  ${fee.feeType}: ${formatCurrency(amount)}`);
        totalFees += amount;
      });
      paragraphs += p(`  TOTAL: ${formatCurrency(totalFees)}`, true);
      paragraphs += p('');
    }
    
    // Document Requirements
    if (data.documentRequirements && data.documentRequirements.length > 0) {
      const checkedDocs = data.documentRequirements.filter(d => d.checked);
      if (checkedDocs.length > 0) {
        paragraphs += p('EXHIBIT C - DOCUMENT REQUIREMENTS:', true);
        checkedDocs.forEach(doc_item => {
          paragraphs += p(`  • ${doc_item.requirement}`);
        });
        paragraphs += p('');
      }
    }
    
    // Standard Provisions
    if (data.standardProvisions) {
      const hasAnyStandardProvision = data.standardProvisions.covidContingency || 
                                      data.standardProvisions.irsVerification || 
                                      data.standardProvisions.usdaFinancialReporting || 
                                      data.standardProvisions.usdaTaxReturnFiling;
      if (hasAnyStandardProvision) {
        paragraphs += p('STANDARD PROVISIONS:', true);
        if (data.standardProvisions.covidContingency) {
          paragraphs += p('  • COVID-19 Contingency Provisions');
        }
        if (data.standardProvisions.irsVerification) {
          paragraphs += p('  • IRS Verification Requirements');
        }
        if (data.standardProvisions.usdaFinancialReporting) {
          paragraphs += p('  • USDA Financial Reporting Requirements');
        }
        if (data.standardProvisions.usdaTaxReturnFiling) {
          paragraphs += p('  • USDA Tax Return Filing Requirements');
        }
        paragraphs += p('');
      }
    }
    
    // Special Terms & Custom Conditions
    if (data.customConditions && data.customConditions.length > 0) {
      paragraphs += p('SPECIAL TERMS & CONDITIONS:', true);
      data.customConditions.forEach((condition, idx) => {
        paragraphs += p(`  ${idx + 1}. ${condition.condition}`);
      });
      paragraphs += p('');
    }

    // Create minimal valid .docx structure
    const zip = new PizZip();
    
    // [Content_Types].xml
    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
    
    // _rels/.rels
    zip.folder('_rels');
    zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
    
    // word/document.xml with content and required section properties
    zip.folder('word');
    zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphs}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
      <w:cols w:space="720"/>
    </w:sectPr>
  </w:body>
</w:document>`);

    const blob = zip.generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    const businessName = (data.borrower.businessDBA || data.borrower.businessLegalName || 'Proposal').replace(/[^a-z0-9]/gi, '_');
    const fileName = `Proposal_${businessName}_${new Date().getTime()}.docx`;
    saveAs(blob, fileName);
  } catch (error) {
    console.error('Error generating Word document:', error);
    throw new Error('Failed to generate Word document. Please check your data and try again.');
  }
};

// Helper to escape XML special characters
const escapeXml = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

// Generate PDF document using jsPDF
export const generatePDFDocument = (data: ProposalData): void => {
  try {
    const doc = new jsPDF();
    let yPosition = 20;
    const lineHeight = 7;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;

    // Helper function to add new page if needed
    const checkPageBreak = () => {
      if (yPosition > pageHeight - margin) {
        doc.addPage();
        yPosition = 20;
      }
    };

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('SBA/USDA LOAN PROPOSAL', margin, yPosition);
    yPosition += lineHeight * 2;

    // Loan Officer Information
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('LOAN OFFICER', margin, yPosition);
    yPosition += lineHeight;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    if (data.loanOfficer.name) {
      doc.text(`${data.loanOfficer.name}${data.loanOfficer.title ? `, ${data.loanOfficer.title}` : ''}`, margin, yPosition);
      yPosition += lineHeight;
    }
    if (data.loanOfficer.email) {
      doc.text(`Email: ${data.loanOfficer.email}`, margin, yPosition);
      yPosition += lineHeight;
    }
    if (data.loanOfficer.phone) {
      doc.text(`Phone: ${data.loanOfficer.phone}`, margin, yPosition);
      yPosition += lineHeight;
    }
    yPosition += lineHeight;

    checkPageBreak();

    // Letter Details
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('PROPOSAL DETAILS', margin, yPosition);
    yPosition += lineHeight;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${formatDate(data.loanOfficer.letterDate)}`, margin, yPosition);
    yPosition += lineHeight;
    if (data.expirationDays) {
      const expirationDate = new Date(data.loanOfficer.letterDate);
      expirationDate.setDate(expirationDate.getDate() + data.expirationDays);
      doc.text(`Proposal Valid Until: ${formatDate(expirationDate.toISOString())}`, margin, yPosition);
      yPosition += lineHeight;
    }
    yPosition += lineHeight;

    checkPageBreak();

    // Borrower Information
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('BORROWER INFORMATION', margin, yPosition);
    yPosition += lineHeight;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    if (data.borrower.contactName) {
      doc.text(`Contact: ${data.borrower.contactName}${data.borrower.contactTitle ? `, ${data.borrower.contactTitle}` : ''}`, margin, yPosition);
      yPosition += lineHeight;
    }
    if (data.borrower.contactEmail) {
      doc.text(`Email: ${data.borrower.contactEmail}`, margin, yPosition);
      yPosition += lineHeight;
    }
    if (data.borrower.businessLegalName) {
      doc.text(`Legal Name: ${data.borrower.businessLegalName}`, margin, yPosition);
      yPosition += lineHeight;
    }
    if (data.borrower.businessDBA && data.borrower.businessDBA !== data.borrower.businessLegalName) {
      doc.text(`DBA: ${data.borrower.businessDBA}`, margin, yPosition);
      yPosition += lineHeight;
    }
    if (data.borrower.mailingAddress) {
      doc.text(`Address: ${data.borrower.mailingAddress}`, margin, yPosition);
      yPosition += lineHeight;
    }
    yPosition += lineHeight;

    checkPageBreak();

    // Loan Types
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('LOAN STRUCTURE', margin, yPosition);
    yPosition += lineHeight;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const loanTypes: string[] = [];
    if (data.loanTypes.sba7a) loanTypes.push('SBA 7(a)');
    if (data.loanTypes.sba504) loanTypes.push('SBA 504');
    if (data.loanTypes.usdaBI) loanTypes.push('USDA B&I');
    doc.text(`Loan Type(s): ${loanTypes.join(', ')}`, margin, yPosition);
    yPosition += lineHeight * 2;

    checkPageBreak();

    // 7(a) Loan Details
    if (data.loanTypes.sba7a && data.loan7a) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('SBA 7(a) LOAN TERMS', margin, yPosition);
      yPosition += lineHeight;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Loan Amount: ${formatCurrency(safeNumber(data.loan7a.loanAmount))}`, margin, yPosition);
      yPosition += lineHeight;
      if (data.loan7a.companionLoan) {
        doc.text(`Companion Loan: ${formatCurrency(safeNumber(data.loan7a.companionLoan))}`, margin, yPosition);
        yPosition += lineHeight;
      }
      if (data.loan7a.equityInjection) {
        doc.text(`Equity Injection: ${formatCurrency(safeNumber(data.loan7a.equityInjection))}`, margin, yPosition);
        yPosition += lineHeight;
      }
      doc.text(`Interest Rate: ${formatPercent(data.loan7a.interestRate)}`, margin, yPosition);
      yPosition += lineHeight;
      if (data.loan7a.rateType) {
        doc.text(`Rate Type: ${data.loan7a.rateType}`, margin, yPosition);
        yPosition += lineHeight;
      }
      if (data.loan7a.rateAdjustmentPeriod) {
        doc.text(`Rate Adjustment: ${data.loan7a.rateAdjustmentPeriod}`, margin, yPosition);
        yPosition += lineHeight;
      }
      doc.text(`Term: ${safeNumber(data.loan7a.termMonths)} months`, margin, yPosition);
      yPosition += lineHeight;
      if (data.loan7a.monthlyPayment) {
        doc.text(`Monthly Payment: ${formatCurrency(safeNumber(data.loan7a.monthlyPayment))}`, margin, yPosition);
        yPosition += lineHeight;
      }
      if (data.loan7a.guaranteePercentage) {
        doc.text(`SBA Guarantee: ${safeNumber(data.loan7a.guaranteePercentage)}%`, margin, yPosition);
        yPosition += lineHeight;
      }
      checkPageBreak();
      if (data.loan7a.loanPurpose) {
        doc.text(`Purpose: ${data.loan7a.loanPurpose}`, margin, yPosition);
        yPosition += lineHeight;
      }
      if (data.loan7a.collateralDescription) {
        doc.text(`Collateral: ${data.loan7a.collateralDescription}`, margin, yPosition);
        yPosition += lineHeight;
      }
      if (data.loan7a.prepaymentPenalty) {
        doc.text(`Prepayment Penalty: ${data.loan7a.prepaymentPenalty}`, margin, yPosition);
        yPosition += lineHeight;
      }
      if (data.loan7a.insuranceRequirements && data.loan7a.insuranceRequirements.length > 0) {
        doc.text(`Insurance: ${data.loan7a.insuranceRequirements.join(', ')}`, margin, yPosition);
        yPosition += lineHeight;
      }
      if (data.loan7a.thirdPartyReports) {
        doc.text(`Third Party Reports: ${data.loan7a.thirdPartyReports}`, margin, yPosition);
        yPosition += lineHeight;
      }
      if (data.loan7a.targetClosingDate) {
        doc.text(`Target Closing: ${formatDate(data.loan7a.targetClosingDate)}`, margin, yPosition);
        yPosition += lineHeight;
      }
      if (data.loan7a.specialConditions) {
        doc.text(`Special Conditions: ${data.loan7a.specialConditions}`, margin, yPosition);
        yPosition += lineHeight;
      }
      yPosition += lineHeight;
      checkPageBreak();
    }

    // 504 Loan Details - using loan504Simple from form data
    const loan504Data = (data as any).loan504Simple;
    if (data.loanTypes.sba504 && loan504Data) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('SBA 504 LOAN STRUCTURE', margin, yPosition);
      yPosition += lineHeight;
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Interim Loan', margin, yPosition);
      yPosition += lineHeight;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      if (loan504Data.interim) {
        doc.text(`Amount: ${formatCurrency(safeNumber(loan504Data.interim.loanAmount))}`, margin + 5, yPosition);
        yPosition += lineHeight;
        doc.text(`Rate: ${formatPercent(loan504Data.interim.interestRate)}`, margin + 5, yPosition);
        yPosition += lineHeight;
        doc.text(`Term: ${safeNumber(loan504Data.interim.termMonths)} months`, margin + 5, yPosition);
        yPosition += lineHeight;
      }
      yPosition += lineHeight;
      checkPageBreak();

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Permanent First Mortgage', margin, yPosition);
      yPosition += lineHeight;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      if (loan504Data.permanent) {
        doc.text(`Amount: ${formatCurrency(safeNumber(loan504Data.permanent.loanAmount))}`, margin + 5, yPosition);
        yPosition += lineHeight;
        doc.text(`Rate: ${formatPercent(loan504Data.permanent.interestRate)}`, margin + 5, yPosition);
        yPosition += lineHeight;
        doc.text(`Term: ${safeNumber(loan504Data.permanent.termMonths)} months`, margin + 5, yPosition);
        yPosition += lineHeight;
      }
      yPosition += lineHeight;
      checkPageBreak();

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('CDC Second Mortgage', margin, yPosition);
      yPosition += lineHeight;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      if (loan504Data.cdc) {
        doc.text(`Amount: ${formatCurrency(safeNumber(loan504Data.cdc.loanAmount))}`, margin + 5, yPosition);
        yPosition += lineHeight;
        doc.text(`Rate: ${formatPercent(loan504Data.cdc.interestRate)}`, margin + 5, yPosition);
        yPosition += lineHeight;
        doc.text(`Term: ${safeNumber(loan504Data.cdc.termMonths)} months`, margin + 5, yPosition);
        yPosition += lineHeight;
      }
      yPosition += lineHeight * 2;
      checkPageBreak();
    }

    // USDA Loan Details - check both loanUsdaSimple and loanUSDA
    const loanUsdaData = (data as any).loanUsdaSimple || data.loanUSDA;
    if (data.loanTypes.usdaBI && loanUsdaData) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('USDA B&I LOAN TERMS', margin, yPosition);
      yPosition += lineHeight;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Loan Amount: ${formatCurrency(safeNumber(loanUsdaData.loanAmount))}`, margin, yPosition);
      yPosition += lineHeight;
      doc.text(`Interest Rate: ${formatPercent(loanUsdaData.interestRate)}`, margin, yPosition);
      yPosition += lineHeight;
      if (loanUsdaData.termYears || loanUsdaData.termMonths) {
        doc.text(`Term: ${loanUsdaData.termYears || safeNumber(loanUsdaData.termMonths)} ${loanUsdaData.termYears ? 'years' : 'months'}`, margin, yPosition);
        yPosition += lineHeight;
      }
      if (loanUsdaData.amortizationYears) {
        doc.text(`Amortization: ${loanUsdaData.amortizationYears} years`, margin, yPosition);
        yPosition += lineHeight;
      }
      if (loanUsdaData.guaranteePercentage) {
        doc.text(`USDA Guarantee: ${safeNumber(loanUsdaData.guaranteePercentage)}%`, margin, yPosition);
        yPosition += lineHeight;
      }
      if (loanUsdaData.ruralEligible !== undefined) {
        doc.text(`Rural Eligible: ${loanUsdaData.ruralEligible ? 'Yes' : 'No'}`, margin, yPosition);
        yPosition += lineHeight;
      }
      checkPageBreak();
      if (loanUsdaData.purpose) {
        doc.text(`Purpose: ${loanUsdaData.purpose}`, margin, yPosition);
        yPosition += lineHeight;
      }
      if (loanUsdaData.collateral) {
        doc.text(`Collateral: ${loanUsdaData.collateral}`, margin, yPosition);
        yPosition += lineHeight;
      }
      if (loanUsdaData.personalGuarantee) {
        doc.text(`Personal Guarantee: ${loanUsdaData.personalGuarantee}`, margin, yPosition);
        yPosition += lineHeight;
      }
      if (loanUsdaData.lienPosition) {
        doc.text(`Lien Position: ${loanUsdaData.lienPosition}`, margin, yPosition);
        yPosition += lineHeight;
      }
      checkPageBreak();
      if (loanUsdaData.tangibleBalanceSheetEquity) {
        doc.text(`Tangible Balance Sheet Equity: ${loanUsdaData.tangibleBalanceSheetEquity}`, margin, yPosition);
        yPosition += lineHeight;
      }
      if (loanUsdaData.projectLocation) {
        doc.text(`Project Location: ${loanUsdaData.projectLocation}`, margin, yPosition);
        yPosition += lineHeight;
      }
      if (loanUsdaData.jobsCreatedRetained) {
        doc.text(`Jobs Created/Retained: ${loanUsdaData.jobsCreatedRetained}`, margin, yPosition);
        yPosition += lineHeight;
      }
      if (loanUsdaData.communityBenefit) {
        doc.text(`Community Benefit: ${loanUsdaData.communityBenefit}`, margin, yPosition);
        yPosition += lineHeight;
      }
      checkPageBreak();
      if (loanUsdaData.guaranteeFee) {
        doc.text(`Guarantee Fee: ${loanUsdaData.guaranteeFee}`, margin, yPosition);
        yPosition += lineHeight;
      }
      if (loanUsdaData.annualRenewalFee) {
        doc.text(`Annual Renewal Fee: ${loanUsdaData.annualRenewalFee}`, margin, yPosition);
        yPosition += lineHeight;
      }
      if (loanUsdaData.equityInjectionRequired) {
        doc.text(`Equity Injection Required: ${loanUsdaData.equityInjectionRequired}`, margin, yPosition);
        yPosition += lineHeight;
      }
      if (loanUsdaData.equitySource) {
        doc.text(`Equity Source: ${loanUsdaData.equitySource}`, margin, yPosition);
        yPosition += lineHeight;
      }
      if (loanUsdaData.environmentalReview) {
        doc.text(`Environmental Review: ${loanUsdaData.environmentalReview}`, margin, yPosition);
        yPosition += lineHeight;
      }
      if (loanUsdaData.feasibilityStudy) {
        doc.text(`Feasibility Study: ${loanUsdaData.feasibilityStudy}`, margin, yPosition);
        yPosition += lineHeight;
      }
      if (loanUsdaData.workingCapitalRequirements) {
        doc.text(`Working Capital: ${loanUsdaData.workingCapitalRequirements}`, margin, yPosition);
        yPosition += lineHeight;
      }
      if (loanUsdaData.debtServiceCoverage) {
        doc.text(`Debt Service Coverage: ${loanUsdaData.debtServiceCoverage}`, margin, yPosition);
        yPosition += lineHeight;
      }
      if (loanUsdaData.disbursementTerms) {
        doc.text(`Disbursement Terms: ${loanUsdaData.disbursementTerms}`, margin, yPosition);
        yPosition += lineHeight;
      }
      if (loanUsdaData.specialConditions) {
        doc.text(`Special Conditions: ${loanUsdaData.specialConditions}`, margin, yPosition);
        yPosition += lineHeight;
      }
      yPosition += lineHeight;
      checkPageBreak();
    }

    // Guarantors
    if (data.guarantors && data.guarantors.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('GUARANTORS', margin, yPosition);
      yPosition += lineHeight;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      data.guarantors.forEach((g, idx) => {
        doc.text(`${idx + 1}. ${g.name} - ${g.ownershipPercentage}% ownership`, margin, yPosition);
        yPosition += lineHeight;
        checkPageBreak();
      });
      yPosition += lineHeight;
    }

    // Use of Proceeds (Exhibit A)
    if (data.useOfProceeds && data.useOfProceeds.length > 0) {
      checkPageBreak();
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('EXHIBIT A - USE OF PROCEEDS', margin, yPosition);
      yPosition += lineHeight;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      let totalUse = 0;
      data.useOfProceeds.forEach((item) => {
        checkPageBreak();
        const amount = safeNumber(item.amount);
        doc.text(`${item.description}: ${formatCurrency(amount)}`, margin, yPosition);
        yPosition += lineHeight;
        totalUse += amount;
      });
      
      doc.setFont('helvetica', 'bold');
      doc.text(`TOTAL: ${formatCurrency(totalUse)}`, margin, yPosition);
      yPosition += lineHeight * 2;
    }

    // Closing Costs (Exhibit B)
    if (data.fees && data.fees.length > 0) {
      checkPageBreak();
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('EXHIBIT B - ESTIMATED CLOSING COSTS', margin, yPosition);
      yPosition += lineHeight;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      let totalFees = 0;
      data.fees.forEach((fee) => {
        checkPageBreak();
        const amount = safeNumber(fee.amount);
        doc.text(`${fee.feeType}: ${formatCurrency(amount)}`, margin, yPosition);
        yPosition += lineHeight;
        totalFees += amount;
      });
      
      doc.setFont('helvetica', 'bold');
      doc.text(`TOTAL: ${formatCurrency(totalFees)}`, margin, yPosition);
      yPosition += lineHeight * 2;
    }

    // Document Requirements (Exhibit C)
    if (data.documentRequirements && data.documentRequirements.length > 0) {
      checkPageBreak();
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('EXHIBIT C - DOCUMENT REQUIREMENTS', margin, yPosition);
      yPosition += lineHeight;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const checkedDocs = data.documentRequirements.filter(d => d.checked);
      checkedDocs.forEach((doc_item) => {
        checkPageBreak();
        doc.text(`• ${doc_item.requirement}`, margin, yPosition);
        yPosition += lineHeight;
      });
      yPosition += lineHeight;
    }

    // Standard Provisions
    if (data.standardProvisions) {
      const hasAnyStandardProvision = data.standardProvisions.covidContingency || 
                                      data.standardProvisions.irsVerification || 
                                      data.standardProvisions.usdaFinancialReporting || 
                                      data.standardProvisions.usdaTaxReturnFiling;
      if (hasAnyStandardProvision) {
        checkPageBreak();
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('STANDARD PROVISIONS', margin, yPosition);
        yPosition += lineHeight;
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        if (data.standardProvisions.covidContingency) {
          doc.text('• COVID-19 Contingency Provisions', margin, yPosition);
          yPosition += lineHeight;
        }
        if (data.standardProvisions.irsVerification) {
          doc.text('• IRS Verification Requirements', margin, yPosition);
          yPosition += lineHeight;
        }
        if (data.standardProvisions.usdaFinancialReporting) {
          doc.text('• USDA Financial Reporting Requirements', margin, yPosition);
          yPosition += lineHeight;
        }
        if (data.standardProvisions.usdaTaxReturnFiling) {
          doc.text('• USDA Tax Return Filing Requirements', margin, yPosition);
          yPosition += lineHeight;
        }
        yPosition += lineHeight;
      }
    }

    // Special Terms & Custom Conditions
    if (data.customConditions && data.customConditions.length > 0) {
      checkPageBreak();
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('SPECIAL TERMS & CONDITIONS', margin, yPosition);
      yPosition += lineHeight;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      data.customConditions.forEach((condition, idx) => {
        checkPageBreak();
        doc.text(`${idx + 1}. ${condition.condition}`, margin, yPosition);
        yPosition += lineHeight;
      });
      yPosition += lineHeight;
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width / 2, pageHeight - 10, { align: 'center' });
    }

    const businessName = (data.borrower.businessDBA || data.borrower.businessLegalName || 'Proposal').replace(/[^a-z0-9]/gi, '_');
    const fileName = `Proposal_${businessName}_${new Date().getTime()}.pdf`;
    doc.save(fileName);
  } catch (error) {
    console.error('Error generating PDF document:', error);
    throw new Error('Failed to generate PDF document. Please check your data and try again.');
  }
};

// Create a basic Word template structure
const createWordTemplate = (data: ProposalData): string => {
  // For a real implementation, you would load an actual .docx template file
  // This is a simplified version that creates basic XML structure
  const content = `
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>SBA/USDA LOAN PROPOSAL</w:t></w:r></w:p>
  </w:body>
</w:document>
  `.trim();
  
  return content;
};

// Prepare data for template rendering
const prepareTemplateData = (data: ProposalData) => {
  return {
    letterDate: formatDate(data.loanOfficer.letterDate),
    borrowerName: data.borrower.businessLegalName || data.borrower.contactName,
    businessName: data.borrower.businessDBA || data.borrower.businessLegalName,
    mailingAddress: data.borrower.mailingAddress,
    guarantors: data.guarantors,
    useOfProceeds: data.useOfProceeds.map(item => ({
      ...item,
      amountFormatted: formatCurrency(item.amount)
    })),
    fees: data.fees.map(fee => ({
      ...fee,
      amountFormatted: formatCurrency(fee.amount)
    })),
    totalUseOfProceeds: formatCurrency(data.useOfProceeds.reduce((sum, item) => sum + item.amount, 0)),
    totalFees: formatCurrency(data.fees.reduce((sum, fee) => sum + fee.amount, 0)),
  };
};

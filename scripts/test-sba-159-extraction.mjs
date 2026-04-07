/**
 * Test script for SBA Form 159 PDF extraction
 * Usage: node scripts/test-sba-159-extraction.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument } from 'pdf-lib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inline the mapping for testing (copy from sba-159-mapping.ts)
const sba159Mapping = {
  formId: 'sba-159',
  formName: 'SBA Form 159 - Fee Disclosure Form',
  mappings: [
    // Loan Type Selection
    { pdfFieldName: '7a loan', appSection: 'feeDisclosure', appFieldPath: 'loanType7a', confidence: 0.95, label: '7(a) Loan' },
    { pdfFieldName: '504 loan', appSection: 'feeDisclosure', appFieldPath: 'loanType504', confidence: 0.95, label: '504 Loan' },
    // Loan Information
    { pdfFieldName: 'SBA Loan Name', appSection: 'feeDisclosure', appFieldPath: 'sbaLoanName', confidence: 0.95, label: 'SBA Loan Name' },
    { pdfFieldName: 'SBA Loan Number 10 digit number', appSection: 'feeDisclosure', appFieldPath: 'sbaLoanNumber', confidence: 0.95, label: 'SBA Loan Number' },
    { pdfFieldName: 'SBA Location ID 67 digit number', appSection: 'feeDisclosure', appFieldPath: 'sbaLocationId', confidence: 0.95, label: 'SBA Location ID' },
    // Lender Information
    { pdfFieldName: 'SBA Lender Legal Name', appSection: 'feeDisclosure', appFieldPath: 'sbaLenderLegalName', confidence: 0.95, label: 'SBA Lender Legal Name' },
    // Agent Information
    { pdfFieldName: 'Services Performed by Name of Agent', appSection: 'feeDisclosure', appFieldPath: 'agentName', confidence: 0.95, label: 'Agent Name' },
    { pdfFieldName: 'Agent Contact Person', appSection: 'feeDisclosure', appFieldPath: 'agentContactPerson', confidence: 0.95, label: 'Agent Contact Person' },
    { pdfFieldName: 'Agent Address', appSection: 'feeDisclosure', appFieldPath: 'agentAddress', confidence: 0.95, label: 'Agent Address' },
    // Type of Agent
    { pdfFieldName: 'SBA Lender', appSection: 'feeDisclosure', appFieldPath: 'agentTypeSbaLender', confidence: 0.9, label: 'Agent Type: SBA Lender' },
    { pdfFieldName: 'Independent Loan Packager', appSection: 'feeDisclosure', appFieldPath: 'agentTypeIndependentPackager', confidence: 0.95, label: 'Agent Type: Independent Loan Packager' },
    { pdfFieldName: 'Referral AgentBroker', appSection: 'feeDisclosure', appFieldPath: 'agentTypeReferralBroker', confidence: 0.95, label: 'Agent Type: Referral Agent/Broker' },
    { pdfFieldName: 'Consultant', appSection: 'feeDisclosure', appFieldPath: 'agentTypeConsultant', confidence: 0.95, label: 'Agent Type: Consultant' },
    { pdfFieldName: 'Accountant preparing financial', appSection: 'feeDisclosure', appFieldPath: 'agentTypeAccountant', confidence: 0.95, label: 'Agent Type: Accountant' },
    { pdfFieldName: 'Third Party Lender TPL', appSection: 'feeDisclosure', appFieldPath: 'agentTypeThirdPartyLender', confidence: 0.95, label: 'Agent Type: Third Party Lender' },
    { pdfFieldName: 'Other', appSection: 'feeDisclosure', appFieldPath: 'agentTypeOther', confidence: 0.85, label: 'Agent Type: Other' },
    { pdfFieldName: 'other type of agent', appSection: 'feeDisclosure', appFieldPath: 'agentTypeOtherDescription', confidence: 0.95, label: 'Agent Type: Other Description' },
    // Service Fees - Applicant
    { pdfFieldName: 'Amount Paid by ApplicantLoan packaging', appSection: 'feeDisclosure', appFieldPath: 'loanPackagingFeeApplicant', confidence: 0.95, label: 'Loan Packaging Fee (Applicant)' },
    { pdfFieldName: 'Amount Paid by ApplicantFinancial statement preparation for loan application', appSection: 'feeDisclosure', appFieldPath: 'financialStatementFeeApplicant', confidence: 0.95, label: 'Financial Statement Fee (Applicant)' },
    { pdfFieldName: 'Amount Paid by ApplicantBroker or Referral services', appSection: 'feeDisclosure', appFieldPath: 'brokerReferralFeeApplicant', confidence: 0.95, label: 'Broker/Referral Fee (Applicant)' },
    { pdfFieldName: 'Amount Paid by ApplicantConsultant services', appSection: 'feeDisclosure', appFieldPath: 'consultantFeeApplicant', confidence: 0.95, label: 'Consultant Fee (Applicant)' },
    { pdfFieldName: 'Amount Paid by ApplicantOther', appSection: 'feeDisclosure', appFieldPath: 'otherFeeApplicant', confidence: 0.95, label: 'Other Fee (Applicant)' },
    // Service Fees - SBA Lender
    { pdfFieldName: 'Amount Paid by SBA LenderLoan packaging', appSection: 'feeDisclosure', appFieldPath: 'loanPackagingFeeLender', confidence: 0.95, label: 'Loan Packaging Fee (SBA Lender)' },
    { pdfFieldName: 'Amount Paid by SBA LenderFinancial statement preparation for loan application', appSection: 'feeDisclosure', appFieldPath: 'financialStatementFeeLender', confidence: 0.95, label: 'Financial Statement Fee (SBA Lender)' },
    { pdfFieldName: 'Amount Paid by SBA LenderBroker or Referral services', appSection: 'feeDisclosure', appFieldPath: 'brokerReferralFeeLender', confidence: 0.95, label: 'Broker/Referral Fee (SBA Lender)' },
    { pdfFieldName: 'Amount Paid by SBA LenderConsultant services', appSection: 'feeDisclosure', appFieldPath: 'consultantFeeLender', confidence: 0.95, label: 'Consultant Fee (SBA Lender)' },
    { pdfFieldName: 'Amount Paid by SBA LenderOther', appSection: 'feeDisclosure', appFieldPath: 'otherFeeLender', confidence: 0.95, label: 'Other Fee (SBA Lender)' },
    // Other Service Description
    { pdfFieldName: 'Other_2', appSection: 'feeDisclosure', appFieldPath: 'otherServiceDescription', confidence: 0.9, label: 'Other Service Description' },
    // Compensation Totals
    { pdfFieldName: 'Applicant', appSection: 'feeDisclosure', appFieldPath: 'totalCompensationApplicant', confidence: 0.9, label: 'Total Compensation (Applicant)' },
    { pdfFieldName: 'SBA Lender_2', appSection: 'feeDisclosure', appFieldPath: 'totalCompensationLender', confidence: 0.9, label: 'Total Compensation (SBA Lender)' },
    // Itemization
    { pdfFieldName: 'Itemization and supporting documentation is attached', appSection: 'feeDisclosure', appFieldPath: 'itemizationAttached', confidence: 0.95, label: 'Itemization Attached' },
    // 504 Loan Only
    { pdfFieldName: 'CDC received referral fee from a TPL', appSection: 'feeDisclosure', appFieldPath: 'cdcReceivedReferralFee', confidence: 0.95, label: 'CDC Received Referral Fee' },
    { pdfFieldName: 'Amount of Fee', appSection: 'feeDisclosure', appFieldPath: 'cdcReferralFeeAmount', confidence: 0.95, label: 'CDC Referral Fee Amount' },
    { pdfFieldName: 'TPL Name', appSection: 'feeDisclosure', appFieldPath: 'tplName', confidence: 0.95, label: 'Third Party Lender Name' },
    { pdfFieldName: 'TPL Address', appSection: 'feeDisclosure', appFieldPath: 'tplAddress', confidence: 0.95, label: 'Third Party Lender Address' },
    // Applicant Signature Block
    { pdfFieldName: 'Signature of Authorized Representative of Applicant', appSection: 'feeDisclosure', appFieldPath: 'applicantSignature', confidence: 0.9, label: 'Applicant Signature' },
    { pdfFieldName: 'Date 1 mm/dd/yyyy', appSection: 'feeDisclosure', appFieldPath: 'applicantSignatureDate', confidence: 0.95, label: 'Applicant Signature Date' },
    { pdfFieldName: 'Print Name', appSection: 'feeDisclosure', appFieldPath: 'applicantPrintName', confidence: 0.9, label: 'Applicant Print Name' },
    { pdfFieldName: 'Title', appSection: 'feeDisclosure', appFieldPath: 'applicantTitle', confidence: 0.9, label: 'Applicant Title' },
    // Agent Signature Block
    { pdfFieldName: 'Signature of Authorized Representative of Agent', appSection: 'feeDisclosure', appFieldPath: 'agentSignature', confidence: 0.9, label: 'Agent Signature' },
    { pdfFieldName: 'Date 2 mm/dd/yyyy', appSection: 'feeDisclosure', appFieldPath: 'agentSignatureDate', confidence: 0.95, label: 'Agent Signature Date' },
    { pdfFieldName: 'Print Name_2', appSection: 'feeDisclosure', appFieldPath: 'agentPrintName', confidence: 0.9, label: 'Agent Print Name' },
    { pdfFieldName: 'Title_2', appSection: 'feeDisclosure', appFieldPath: 'agentTitle', confidence: 0.9, label: 'Agent Title' },
    // SBA Lender Signature Block
    { pdfFieldName: 'Signature of Authorized Representative of SBA Lender', appSection: 'feeDisclosure', appFieldPath: 'lenderSignature', confidence: 0.9, label: 'SBA Lender Signature' },
    { pdfFieldName: 'Date 3 mm/dd/yyyy', appSection: 'feeDisclosure', appFieldPath: 'lenderSignatureDate', confidence: 0.95, label: 'SBA Lender Signature Date' },
    { pdfFieldName: 'Print Name_3', appSection: 'feeDisclosure', appFieldPath: 'lenderPrintName', confidence: 0.9, label: 'SBA Lender Print Name' },
    { pdfFieldName: 'Title_3', appSection: 'feeDisclosure', appFieldPath: 'lenderTitle', confidence: 0.9, label: 'SBA Lender Title' },
  ]
};

async function testExtraction() {
  const pdfPath = path.resolve(__dirname, '../pdfs/SBA_Form_159_-_Fee_Disclosure_Form (1).pdf');

  console.log('\n' + '='.repeat(80));
  console.log('SBA Form 159 Extraction Test');
  console.log('='.repeat(80));
  console.log(`\nPDF Path: ${pdfPath}`);
  console.log(`Mapping has ${sba159Mapping.mappings.length} field definitions`);

  // Read the PDF
  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  console.log(`PDF has ${fields.length} fillable fields`);
  console.log('\n' + '-'.repeat(80));

  // Extract and match fields
  let matchedCount = 0;
  let unmatchedCount = 0;
  const matchedFields = [];
  const unmatchedFields = [];

  for (const field of fields) {
    const name = field.getName();
    const fieldType = field.constructor.name;
    let rawValue = null;
    let pdfFieldType = 'unknown';

    try {
      if (fieldType === 'PDFTextField') {
        const textField = form.getTextField(name);
        rawValue = textField.getText() || null;
        pdfFieldType = 'text';
      } else if (fieldType === 'PDFCheckBox') {
        const checkBox = form.getCheckBox(name);
        rawValue = checkBox.isChecked();
        pdfFieldType = 'checkbox';
      } else if (fieldType === 'PDFDropdown') {
        const dropdown = form.getDropdown(name);
        const selected = dropdown.getSelected();
        rawValue = selected.length > 0 ? selected[0] : null;
        pdfFieldType = 'dropdown';
      } else if (fieldType === 'PDFRadioGroup') {
        const radioGroup = form.getRadioGroup(name);
        rawValue = radioGroup.getSelected() || null;
        pdfFieldType = 'radio';
      } else {
        pdfFieldType = 'signature';
      }
    } catch (e) {
      // Skip
    }

    // Find mapping
    const mapping = sba159Mapping.mappings.find(m =>
      m.pdfFieldName.toLowerCase() === name.toLowerCase()
    );

    if (mapping) {
      matchedCount++;
      matchedFields.push({ name, pdfFieldType, rawValue, mapping });
    } else {
      unmatchedCount++;
      unmatchedFields.push({ name, pdfFieldType, rawValue });
    }
  }

  // Print matched fields
  console.log(`\n## MATCHED FIELDS (${matchedCount}/${fields.length})\n`);
  for (const f of matchedFields) {
    const value = f.rawValue === null ? '(empty)' :
                  typeof f.rawValue === 'boolean' ? (f.rawValue ? 'YES' : 'NO') :
                  f.rawValue;
    console.log(`✓ "${f.name}"`);
    console.log(`  → ${f.mapping.appSection}.${f.mapping.appFieldPath}`);
    console.log(`  Label: ${f.mapping.label} | Confidence: ${(f.mapping.confidence * 100).toFixed(0)}%`);
    console.log(`  Value: ${value}\n`);
  }

  // Print unmatched fields
  if (unmatchedCount > 0) {
    console.log(`\n## UNMATCHED FIELDS (${unmatchedCount})\n`);
    for (const f of unmatchedFields) {
      console.log(`✗ "${f.name}" (${f.pdfFieldType})`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total PDF fields:     ${fields.length}`);
  console.log(`Mapping definitions:  ${sba159Mapping.mappings.length}`);
  console.log(`Matched fields:       ${matchedCount} (${((matchedCount / fields.length) * 100).toFixed(1)}%)`);
  console.log(`Unmatched fields:     ${unmatchedCount}`);

  const success = matchedCount === fields.length;
  console.log(`\n${success ? '✓ ALL FIELDS MAPPED SUCCESSFULLY!' : '⚠ Some fields are not mapped'}\n`);

  return { matchedCount, unmatchedCount, total: fields.length };
}

testExtraction()
  .then(result => {
    process.exit(result.unmatchedCount > 0 ? 1 : 0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });

/**
 * Test script for SBA Form 159 PDF extraction
 * Usage: npx ts-node scripts/test-sba-159-extraction.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { PDFDocument } from 'pdf-lib';

// Import the mapping directly
import { sba159Mapping } from '../lib/pdf-extraction/sba-159-mapping';

interface ExtractedField {
  pdfFieldName: string;
  pdfFieldType: string;
  rawValue: string | boolean | null;
  mappedSection?: string;
  mappedPath?: string;
  mappedLabel?: string;
  confidence: number;
  matched: boolean;
}

async function testExtraction() {
  const pdfPath = path.resolve(__dirname, '../pdfs/SBA_Form_159_-_Fee_Disclosure_Form (1).pdf');

  console.log('\n' + '='.repeat(80));
  console.log('SBA Form 159 Extraction Test');
  console.log('='.repeat(80));
  console.log(`\nPDF Path: ${pdfPath}`);
  console.log(`Mapping has ${sba159Mapping.mappings.length} field definitions`);
  console.log('\n' + '-'.repeat(80));

  // Read the PDF
  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  console.log(`\nPDF has ${fields.length} fillable fields`);
  console.log('\n' + '-'.repeat(80));

  // Extract and match fields
  const results: ExtractedField[] = [];
  let matchedCount = 0;
  let unmatchedCount = 0;

  for (const field of fields) {
    const name = field.getName();
    const fieldType = field.constructor.name;
    let rawValue: string | boolean | null = null;
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
      // Skip unreadable fields
    }

    // Find mapping for this field
    const mapping = sba159Mapping.mappings.find(m => {
      // Exact match
      if (m.pdfFieldName.toLowerCase() === name.toLowerCase()) {
        return true;
      }
      // Pattern match
      if (m.pdfFieldPattern && m.pdfFieldPattern.test(name)) {
        return true;
      }
      return false;
    });

    const matched = !!mapping;
    if (matched) {
      matchedCount++;
    } else {
      unmatchedCount++;
    }

    results.push({
      pdfFieldName: name,
      pdfFieldType,
      rawValue,
      mappedSection: mapping?.appSection,
      mappedPath: mapping?.appFieldPath,
      mappedLabel: mapping?.label,
      confidence: mapping?.confidence || 0,
      matched,
    });
  }

  // Print results
  console.log('\n## MATCHED FIELDS (' + matchedCount + '/' + fields.length + ')\n');

  const matchedFields = results.filter(r => r.matched);
  for (const field of matchedFields) {
    const value = field.rawValue === null ? '(empty)' :
                  typeof field.rawValue === 'boolean' ? (field.rawValue ? 'YES' : 'NO') :
                  field.rawValue;
    console.log(`✓ "${field.pdfFieldName}"`);
    console.log(`  → ${field.mappedSection}.${field.mappedPath}`);
    console.log(`  Label: ${field.mappedLabel}`);
    console.log(`  Type: ${field.pdfFieldType} | Confidence: ${(field.confidence * 100).toFixed(0)}%`);
    console.log(`  Value: ${value}`);
    console.log('');
  }

  if (unmatchedCount > 0) {
    console.log('\n## UNMATCHED FIELDS (' + unmatchedCount + ')\n');

    const unmatchedFields = results.filter(r => !r.matched);
    for (const field of unmatchedFields) {
      console.log(`✗ "${field.pdfFieldName}" (${field.pdfFieldType})`);
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
  console.log('='.repeat(80));

  // Field type breakdown
  console.log('\nField Type Breakdown:');
  const typeCount: Record<string, number> = {};
  for (const r of results) {
    typeCount[r.pdfFieldType] = (typeCount[r.pdfFieldType] || 0) + 1;
  }
  for (const [type, count] of Object.entries(typeCount)) {
    console.log(`  ${type}: ${count}`);
  }

  // Return success/failure
  const success = matchedCount === fields.length;
  console.log(`\n${success ? '✓ ALL FIELDS MAPPED SUCCESSFULLY!' : '⚠ Some fields are not mapped'}\n`);

  return { matchedCount, unmatchedCount, total: fields.length };
}

// Run the test
testExtraction()
  .then(result => {
    process.exit(result.unmatchedCount > 0 ? 1 : 0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });

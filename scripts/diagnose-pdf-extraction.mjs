/**
 * Diagnostic script for PDF field extraction
 *
 * Usage: node scripts/diagnose-pdf-extraction.mjs <path-to-pdf>
 *
 * This script analyzes a PDF and reports detailed information about:
 * - Form type (AcroForm vs XFA)
 * - All form fields and their properties
 * - Why values might be empty
 */

import { PDFDocument, PDFName, PDFDict, PDFString, PDFHexString } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

async function diagnosePdf(pdfPath) {
  console.log('\n=== PDF EXTRACTION DIAGNOSTIC ===\n');
  console.log(`File: ${pdfPath}\n`);

  // Read the PDF file
  const pdfBytes = fs.readFileSync(pdfPath);
  console.log(`File size: ${(pdfBytes.length / 1024).toFixed(2)} KB\n`);

  // Load the PDF
  let pdfDoc;
  try {
    pdfDoc = await PDFDocument.load(pdfBytes, {
      ignoreEncryption: true,
    });
    console.log('✓ PDF loaded successfully\n');
  } catch (error) {
    console.error('✗ Failed to load PDF:', error.message);
    return;
  }

  // Check for XFA forms
  console.log('--- PDF Structure Analysis ---\n');

  const catalog = pdfDoc.catalog;
  const acroFormRef = catalog.get(PDFName.of('AcroForm'));

  if (acroFormRef) {
    const acroForm = catalog.lookup(PDFName.of('AcroForm'));
    if (acroForm instanceof PDFDict) {
      const xfa = acroForm.get(PDFName.of('XFA'));
      if (xfa) {
        console.log('⚠️  WARNING: This PDF contains XFA form data');
        console.log('   XFA forms store data differently and may not be fully readable.\n');
      } else {
        console.log('✓ Standard AcroForm (no XFA)\n');
      }
    }
  } else {
    console.log('⚠️  No AcroForm found in PDF catalog\n');
  }

  // Get form fields
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  console.log(`--- Form Fields: ${fields.length} total ---\n`);

  if (fields.length === 0) {
    console.log('⚠️  No fillable form fields found!');
    console.log('   This PDF may be flattened (fields converted to static content).\n');
    return;
  }

  // Analyze each field
  let emptyCount = 0;
  let filledCount = 0;
  const fieldDetails = [];

  for (const field of fields) {
    const name = field.getName();
    const fieldType = field.constructor.name;

    const detail = {
      name,
      type: fieldType,
      value: null,
      defaultValue: null,
      hasAppearance: false,
      widgetCount: 0,
      issues: [],
    };

    try {
      // Get the underlying acroField for more details
      const acroField = field.acroField;

      // Check widgets
      const widgets = acroField.getWidgets();
      detail.widgetCount = widgets.length;

      // Check appearances
      if (widgets.length > 0) {
        const firstWidget = widgets[0];
        const ap = firstWidget.dict.get(PDFName.of('AP'));
        detail.hasAppearance = !!ap;
      }

      // Try to get value based on field type
      if (fieldType === 'PDFTextField') {
        const textField = form.getTextField(name);
        const textValue = textField.getText();
        detail.value = textValue || null;

        // Try to get the V (value) entry directly from acroField
        const vEntry = acroField.dict.get(PDFName.of('V'));
        if (vEntry) {
          if (vEntry instanceof PDFString) {
            detail.defaultValue = vEntry.decodeText();
          } else if (vEntry instanceof PDFHexString) {
            detail.defaultValue = vEntry.decodeText();
          } else {
            detail.defaultValue = `[${vEntry.constructor.name}]`;
          }
        }

        // Check DV (default value) entry
        const dvEntry = acroField.dict.get(PDFName.of('DV'));
        if (dvEntry && !detail.defaultValue) {
          if (dvEntry instanceof PDFString) {
            detail.defaultValue = dvEntry.decodeText();
          }
        }

      } else if (fieldType === 'PDFCheckBox') {
        const checkBox = form.getCheckBox(name);
        detail.value = checkBox.isChecked();
      } else if (fieldType === 'PDFDropdown') {
        const dropdown = form.getDropdown(name);
        const selected = dropdown.getSelected();
        detail.value = selected.length > 0 ? selected[0] : null;
      } else if (fieldType === 'PDFRadioGroup') {
        const radioGroup = form.getRadioGroup(name);
        detail.value = radioGroup.getSelected() || null;
      }

      // Track filled vs empty
      if (detail.value === null || detail.value === '' || detail.value === false) {
        emptyCount++;
        if (detail.hasAppearance) {
          detail.issues.push('Has appearance but no value - may be visually filled');
        }
      } else {
        filledCount++;
      }

    } catch (error) {
      detail.issues.push(`Error reading field: ${error.message}`);
      emptyCount++;
    }

    fieldDetails.push(detail);
  }

  // Print summary
  console.log(`Filled fields: ${filledCount}`);
  console.log(`Empty fields: ${emptyCount}\n`);

  // Print field details (first 20 or all if less)
  const showCount = Math.min(fields.length, 20);
  console.log(`--- First ${showCount} Field Details ---\n`);

  for (let i = 0; i < showCount; i++) {
    const d = fieldDetails[i];
    console.log(`[${i + 1}] ${d.name}`);
    console.log(`    Type: ${d.type}`);
    console.log(`    Value: ${d.value === null ? '(null)' : d.value === '' ? '(empty string)' : JSON.stringify(d.value)}`);
    if (d.defaultValue) {
      console.log(`    V/DV Entry: ${JSON.stringify(d.defaultValue)}`);
    }
    console.log(`    Has Appearance: ${d.hasAppearance}`);
    console.log(`    Widget Count: ${d.widgetCount}`);
    if (d.issues.length > 0) {
      console.log(`    ⚠️  Issues: ${d.issues.join(', ')}`);
    }
    console.log('');
  }

  if (fields.length > showCount) {
    console.log(`... and ${fields.length - showCount} more fields\n`);
  }

  // Diagnosis
  console.log('--- DIAGNOSIS ---\n');

  if (filledCount === 0 && emptyCount > 0) {
    console.log('⚠️  ALL FIELDS ARE EMPTY\n');
    console.log('Possible causes:');
    console.log('1. The PDF form was not filled out before uploading');
    console.log('2. The PDF was "flattened" - form data converted to static graphics');
    console.log('3. The PDF editor saved values in appearance streams only');
    console.log('4. The values are stored in a format pdf-lib cannot read\n');

    const hasAppearances = fieldDetails.some(d => d.hasAppearance);
    if (hasAppearances) {
      console.log('NOTE: Some fields have appearance streams, which may contain visible');
      console.log('      text that pdf-lib cannot extract as field values.\n');
    }
  } else if (filledCount > 0) {
    console.log(`✓ Found ${filledCount} fields with values\n`);

    // Show filled fields
    const filledFields = fieldDetails.filter(d => d.value !== null && d.value !== '' && d.value !== false);
    console.log('Fields with values:');
    for (const f of filledFields.slice(0, 10)) {
      console.log(`  - ${f.name}: ${JSON.stringify(f.value)}`);
    }
    if (filledFields.length > 10) {
      console.log(`  ... and ${filledFields.length - 10} more`);
    }
  }
}

// Main execution
const pdfPath = process.argv[2];

if (!pdfPath) {
  console.log('Usage: node scripts/diagnose-pdf-extraction.mjs <path-to-pdf>');
  console.log('');
  console.log('Example:');
  console.log('  node scripts/diagnose-pdf-extraction.mjs ./pdf/SBA_Form_159.pdf');
  process.exit(1);
}

if (!fs.existsSync(pdfPath)) {
  console.error(`Error: File not found: ${pdfPath}`);
  process.exit(1);
}

diagnosePdf(pdfPath).catch(console.error);

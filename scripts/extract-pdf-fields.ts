/**
 * Script to extract all field names from a PDF form
 * Usage: npx ts-node scripts/extract-pdf-fields.ts <path-to-pdf>
 */

import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

async function extractPdfFieldNames(pdfPath: string) {
  console.log(`\nExtracting fields from: ${pdfPath}\n`);
  console.log('='.repeat(80));

  // Read the PDF file
  const pdfBytes = fs.readFileSync(pdfPath);

  // Load the PDF document
  const pdfDoc = await PDFDocument.load(pdfBytes, {
    ignoreEncryption: true,
  });

  // Get form fields
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  console.log(`\nTotal fields found: ${fields.length}\n`);
  console.log('='.repeat(80));

  // Group fields by type
  const fieldsByType: Record<string, Array<{ name: string; value: string | boolean | null }>> = {
    text: [],
    checkbox: [],
    dropdown: [],
    radio: [],
    other: [],
  };

  for (const field of fields) {
    const name = field.getName();
    const fieldType = field.constructor.name;
    let value: string | boolean | null = null;
    let typeKey = 'other';

    try {
      if (fieldType === 'PDFTextField') {
        const textField = form.getTextField(name);
        value = textField.getText() || null;
        typeKey = 'text';
      } else if (fieldType === 'PDFCheckBox') {
        const checkBox = form.getCheckBox(name);
        value = checkBox.isChecked();
        typeKey = 'checkbox';
      } else if (fieldType === 'PDFDropdown') {
        const dropdown = form.getDropdown(name);
        const selected = dropdown.getSelected();
        value = selected.length > 0 ? selected[0] : null;
        typeKey = 'dropdown';
      } else if (fieldType === 'PDFRadioGroup') {
        const radioGroup = form.getRadioGroup(name);
        value = radioGroup.getSelected() || null;
        typeKey = 'radio';
      }
    } catch (e) {
      // Skip fields that can't be read
    }

    fieldsByType[typeKey].push({ name, value });
  }

  // Output fields by type
  for (const [type, typeFields] of Object.entries(fieldsByType)) {
    if (typeFields.length > 0) {
      console.log(`\n## ${type.toUpperCase()} FIELDS (${typeFields.length})\n`);
      console.log('-'.repeat(80));

      for (let i = 0; i < typeFields.length; i++) {
        const { name, value } = typeFields[i];
        const displayValue = value === null ? '(empty)' :
                            typeof value === 'boolean' ? (value ? 'CHECKED' : 'unchecked') :
                            value.length > 50 ? value.substring(0, 47) + '...' : value;
        console.log(`${(i + 1).toString().padStart(2)}. "${name}"`);
        console.log(`    Value: ${displayValue}`);
      }
    }
  }

  // Output as JSON for easy copying
  console.log('\n' + '='.repeat(80));
  console.log('\n## JSON OUTPUT (for mapping file)\n');

  const allFields = fields.map(f => {
    const fieldType = f.constructor.name;
    let type = 'unknown';
    if (fieldType === 'PDFTextField') type = 'text';
    else if (fieldType === 'PDFCheckBox') type = 'checkbox';
    else if (fieldType === 'PDFDropdown') type = 'dropdown';
    else if (fieldType === 'PDFRadioGroup') type = 'radio';

    return {
      name: f.getName(),
      type,
    };
  });

  console.log(JSON.stringify(allFields, null, 2));
}

// Main execution
const pdfPath = process.argv[2];

if (!pdfPath) {
  console.log('Usage: npx ts-node scripts/extract-pdf-fields.ts <path-to-pdf>');
  console.log('\nExample:');
  console.log('  npx ts-node scripts/extract-pdf-fields.ts pdfs/SBA_Form_159.pdf');
  process.exit(1);
}

const fullPath = path.resolve(pdfPath);

if (!fs.existsSync(fullPath)) {
  console.error(`File not found: ${fullPath}`);
  process.exit(1);
}

extractPdfFieldNames(fullPath)
  .then(() => {
    console.log('\n\nExtraction complete!');
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });

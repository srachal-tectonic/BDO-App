/**
 * Test that mimics exactly what the upload endpoint does:
 * 1. Read file as ArrayBuffer (like browser File.arrayBuffer())
 * 2. Convert to Buffer
 * 3. Run extraction
 */
import fs from 'fs';
import { PDFDocument } from 'pdf-lib';

const pdfPath = process.argv[2] || 'pdfs/Testing.pdf';
console.log(`Testing upload-style extraction on: ${pdfPath}\n`);

// Step 1: Read file (simulating browser file read)
const fileData = fs.readFileSync(pdfPath);
console.log(`Original file size: ${fileData.length} bytes`);

// Step 2: Convert to ArrayBuffer then back to Buffer (like the upload route does)
const arrayBuffer = fileData.buffer.slice(
  fileData.byteOffset,
  fileData.byteOffset + fileData.byteLength
);
const buffer = Buffer.from(arrayBuffer);
console.log(`Buffer size after conversion: ${buffer.length} bytes`);

// Step 3: Load PDF and extract (like extractPdfFields does)
const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
const form = pdfDoc.getForm();
const fields = form.getFields();

console.log(`\nTotal fields found: ${fields.length}`);

let filledCount = 0;
const filledFields = [];

for (const field of fields) {
  const name = field.getName();
  const type = field.constructor.name;
  let value = null;

  try {
    if (type === 'PDFTextField') {
      const textField = form.getTextField(name);
      value = textField.getText();
      // Match the extractor logic: getText() || null
      value = value || null;
    } else if (type === 'PDFCheckBox') {
      const checkBox = form.getCheckBox(name);
      value = checkBox.isChecked();
    } else if (type === 'PDFDropdown') {
      const dropdown = form.getDropdown(name);
      const selected = dropdown.getSelected();
      value = selected.length > 0 ? selected[0] : null;
    } else if (type === 'PDFRadioGroup') {
      const radioGroup = form.getRadioGroup(name);
      value = radioGroup.getSelected() || null;
    }
  } catch (e) {
    console.log(`Error reading ${name}: ${e.message}`);
    continue;
  }

  // Count as filled if has actual value (not null, not empty string, not false for checkboxes)
  if (value !== null && value !== '' && value !== false) {
    filledCount++;
    filledFields.push({ name, value, type });
  }
}

console.log(`\nFilled fields: ${filledCount} / ${fields.length}`);

if (filledCount > 0) {
  console.log('\nFields with values:');
  for (const f of filledFields) {
    console.log(`  ✓ ${f.name}: ${JSON.stringify(f.value)}`);
  }
} else {
  console.log('\n⚠️  ALL FIELDS ARE EMPTY!');
  console.log('\nFirst 5 fields (for debugging):');
  for (let i = 0; i < Math.min(5, fields.length); i++) {
    const field = fields[i];
    const name = field.getName();
    const type = field.constructor.name;
    let rawValue = 'N/A';

    try {
      if (type === 'PDFTextField') {
        rawValue = form.getTextField(name).getText();
      } else if (type === 'PDFCheckBox') {
        rawValue = form.getCheckBox(name).isChecked();
      }
    } catch (e) {}

    console.log(`  - ${name} (${type}): ${JSON.stringify(rawValue)}`);
  }
}

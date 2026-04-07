/**
 * Test script to verify the base64 encoding/decoding flow
 * This simulates what happens when a file is uploaded through the browser
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument } from 'pdf-lib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testBase64Flow() {
  const pdfPath = path.join(__dirname, '..', 'pdfs', 'Testing.pdf');

  console.log('=== Testing Base64 Encoding/Decoding Flow ===\n');

  // Step 1: Read the original file
  console.log('1. Reading original file:', pdfPath);
  const originalBuffer = fs.readFileSync(pdfPath);
  console.log('   Original size:', originalBuffer.length, 'bytes');
  console.log('   Original header:', originalBuffer.slice(0, 8).toString('ascii'));

  // Step 2: Simulate browser's FileReader.readAsDataURL()
  // This is what the browser does
  console.log('\n2. Converting to base64 (simulating browser FileReader)...');
  const base64Data = originalBuffer.toString('base64');
  console.log('   Base64 length:', base64Data.length);
  console.log('   First 50 chars:', base64Data.substring(0, 50));

  // Step 3: Simulate server decoding
  console.log('\n3. Decoding base64 on server (simulating server)...');
  const decodedBuffer = Buffer.from(base64Data, 'base64');
  console.log('   Decoded size:', decodedBuffer.length, 'bytes');
  console.log('   Decoded header:', decodedBuffer.slice(0, 8).toString('ascii'));
  console.log('   Size match:', decodedBuffer.length === originalBuffer.length ? '✓ YES' : '✗ NO');

  // Step 4: Verify buffers are identical
  console.log('\n4. Verifying buffers are identical...');
  const buffersEqual = originalBuffer.equals(decodedBuffer);
  console.log('   Buffers identical:', buffersEqual ? '✓ YES' : '✗ NO');

  if (!buffersEqual) {
    // Find first difference
    for (let i = 0; i < Math.min(originalBuffer.length, decodedBuffer.length); i++) {
      if (originalBuffer[i] !== decodedBuffer[i]) {
        console.log(`   First difference at byte ${i}: original=${originalBuffer[i]}, decoded=${decodedBuffer[i]}`);
        break;
      }
    }
  }

  // Step 5: Extract fields from ORIGINAL buffer
  console.log('\n5. Extracting fields from ORIGINAL buffer...');
  await extractAndLogFields(originalBuffer, 'original');

  // Step 6: Extract fields from DECODED buffer
  console.log('\n6. Extracting fields from DECODED buffer (after base64 round-trip)...');
  await extractAndLogFields(decodedBuffer, 'decoded');

  console.log('\n=== Test Complete ===');
}

async function extractAndLogFields(buffer, label) {
  try {
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    console.log(`   [${label}] PDF loaded, pages:`, pdfDoc.getPageCount());

    const form = pdfDoc.getForm();
    const fields = form.getFields();
    console.log(`   [${label}] Total fields:`, fields.length);

    let filledCount = 0;
    const fieldValues = [];

    for (const field of fields) {
      const name = field.getName();
      const fieldType = field.constructor.name;
      let value = null;

      try {
        if (fieldType === 'PDFTextField') {
          const textField = form.getTextField(name);
          value = textField.getText();
        } else if (fieldType === 'PDFCheckBox') {
          const checkBox = form.getCheckBox(name);
          value = checkBox.isChecked();
        } else if (fieldType === 'PDFDropdown') {
          const dropdown = form.getDropdown(name);
          const selected = dropdown.getSelected();
          value = selected.length > 0 ? selected[0] : null;
        }
      } catch (e) {
        // ignore
      }

      if (value !== null && value !== '' && value !== false) {
        filledCount++;
        fieldValues.push({ name, value });
      }
    }

    console.log(`   [${label}] Fields with values:`, filledCount);

    if (fieldValues.length > 0) {
      console.log(`   [${label}] Sample values:`);
      fieldValues.slice(0, 5).forEach(f => {
        console.log(`      - ${f.name}: "${f.value}"`);
      });
    } else {
      console.log(`   [${label}] ⚠️  NO FIELDS HAVE VALUES!`);
    }

  } catch (error) {
    console.error(`   [${label}] Error:`, error.message);
  }
}

testBase64Flow().catch(console.error);

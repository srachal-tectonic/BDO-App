# Design: Fix PDF Extraction Empty Fields

## Investigation Strategy

Since multiple buffer conversion approaches have failed, the issue is likely not in the buffer conversion. We need to investigate other parts of the system.

## Diagnostic Additions

### 1. Enhanced Logging in Upload Route

Add logging after extraction to see actual field values:

```typescript
// In app/api/forms/[token]/upload/route.ts after extraction
console.log('[Forms Portal Upload] Extraction result:', {
  success: extractionResult.success,
  formType: extractionResult.formType,
  totalFields: extractionResult.totalFields,
  filledFields: extractionResult.filledFields,
  firstThreeFields: extractionResult.fields.slice(0, 3).map(f => ({
    name: f.pdfFieldName,
    rawValue: f.rawValue,
    type: f.pdfFieldType,
  })),
});
```

### 2. Verify What's Being Stored

Log the exact data being written to Firestore:

```typescript
console.log('[Forms Portal Upload] Storing extraction:', {
  uploadId: uploadRef.id,
  fieldsCount: extractedFields.length,
  fieldsWithValues: extractedFields.filter(f => f.rawValue !== null && f.rawValue !== '').length,
  sampleFields: extractedFields.slice(0, 3),
});
```

### 3. Check pdf-lib Version

Ensure production uses same pdf-lib version as local:

```bash
# Check local version
npm list pdf-lib

# Verify in package-lock.json for production
```

## Potential Root Causes and Fixes

### Cause A: pdf-lib AcroForm vs XFA

pdf-lib only supports AcroForms. If the PDF uses XFA (XML Forms Architecture), fields will appear empty.

**Detection:**
```typescript
// Check for XFA in PDF
const acroForm = pdfDoc.catalog.lookup(PDFName.of('AcroForm'));
const xfa = acroForm?.lookup(PDFName.of('XFA'));
if (xfa) {
  console.log('[PDF Extraction] WARNING: PDF uses XFA forms, not supported by pdf-lib');
}
```

**Fix:** Use a different library like `pdf-parse` or `pdfjs-dist` for XFA forms.

### Cause B: Appearance Streams Without Values

Some PDFs have appearance streams (visual representation) but no actual form field values. The visual data is baked into the appearance, not stored as field values.

**Detection:**
```typescript
// In extractor.ts
const textField = form.getTextField(name);
const appearances = textField.acroField.getAppearances();
console.log('[PDF Extraction] Field appearances:', {
  name,
  hasNormalAppearance: !!appearances?.normal,
  getText: textField.getText(),
});
```

**Fix:** Extract text from appearance streams if field values are empty.

### Cause C: PDF Flattening

If the PDF was "flattened" (form fields converted to static content), there are no editable fields to extract.

**Detection:**
```typescript
// Check if fields are read-only or have been flattened
const field = form.getFields()[0];
console.log('[PDF Extraction] Field info:', {
  name: field.getName(),
  isReadOnly: field.acroField.hasFlag(/* read-only flag */),
});
```

### Cause D: Different PDF Versions

The PDF uploaded might be a different file than the one tested locally, or might have been saved differently by the browser.

**Detection:**
- Add MD5 hash logging of uploaded file
- Compare with local file hash

## Alternative Extraction Approach

If pdf-lib continues to fail, consider using `pdf-parse` or `pdfjs-dist`:

```typescript
import * as pdfjsLib from 'pdfjs-dist';

async function extractWithPdfJs(buffer: Buffer) {
  const data = new Uint8Array(buffer);
  const doc = await pdfjsLib.getDocument({ data }).promise;

  // Get form fields via annotations
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const annotations = await page.getAnnotations();

    for (const annotation of annotations) {
      if (annotation.subtype === 'Widget') {
        console.log('Field:', annotation.fieldName, 'Value:', annotation.fieldValue);
      }
    }
  }
}
```

## Testing Plan

1. Deploy with enhanced logging
2. Upload Testing.pdf
3. Check Cloud Logs for:
   - Buffer size match
   - PDF header verification
   - Extraction result with field values
   - Firestore write data
4. If extraction shows empty, check PDF characteristics (XFA, flattened, etc.)
5. If extraction shows values but UI shows empty, trace data retrieval

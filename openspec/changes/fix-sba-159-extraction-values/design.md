# Design: Fix SBA Form 159 Field Value Extraction

## Context

The PDF extraction feature uses pdf-lib to read form field values. While field detection works correctly (47/47 fields mapped), the actual values return as empty/null, displaying "-" in the UI.

**Current Implementation:**
```typescript
// lib/pdf-extraction/extractor.ts
const textField = form.getTextField(name);
rawValue = textField.getText() || null;  // Returns null for filled fields
```

## Investigation Approach

### Step 1: Diagnostic Logging

Add comprehensive logging to understand what pdf-lib sees:

```typescript
// For each field, log:
console.log('[PDF Debug]', {
  fieldName: name,
  fieldType: field.constructor.name,
  getText: textField.getText(),
  getDefaultValue: textField.acroField?.getDefaultValue?.(),
  hasAppearances: !!textField.acroField.getAppearances(),
  widgetCount: textField.acroField.getWidgets().length,
});
```

### Step 2: Alternative Value Sources

pdf-lib fields may have values stored in different places:

1. **getText()** - Standard field value
2. **getDefaultValue()** - Default/initial value (via acroField)
3. **Appearance streams** - Visual representation that may contain text
4. **Widget annotations** - May have separate value storage

### Step 3: Detect PDF Type Issues

```typescript
function detectPdfIssues(pdfDoc: PDFDocument): string[] {
  const issues: string[] = [];

  // Check for XFA
  const acroForm = pdfDoc.catalog.lookup(PDFName.of('AcroForm'));
  if (acroForm && acroForm.has(PDFName.of('XFA'))) {
    issues.push('XFA_FORM');
  }

  // Check if form has fields but all values empty
  const form = pdfDoc.getForm();
  const fields = form.getFields();
  const allEmpty = fields.every(f => {
    if (f.constructor.name === 'PDFTextField') {
      return !form.getTextField(f.getName()).getText();
    }
    return false;
  });

  if (fields.length > 0 && allEmpty) {
    issues.push('POSSIBLY_FLATTENED');
  }

  return issues;
}
```

## Potential Solutions

### Solution A: Enhanced Value Reading

Try multiple methods to get field value:

```typescript
function getFieldValue(form: PDFForm, fieldName: string): string | null {
  const textField = form.getTextField(fieldName);

  // Try standard getText
  let value = textField.getText();
  if (value) return value;

  // Try acroField methods
  const acroField = textField.acroField;

  // Check default value
  const defaultValue = acroField.V();
  if (defaultValue) {
    return defaultValue.decodeText();
  }

  // Check appearance stream for text
  const appearances = acroField.getAppearances();
  if (appearances?.normal) {
    // Parse appearance stream for text content
    // This is complex and may require custom parsing
  }

  return null;
}
```

### Solution B: Text Extraction Fallback

If form fields are empty but PDF has text, use pdf-parse:

```typescript
import pdfParse from 'pdf-parse';

async function extractTextFallback(pdfBytes: Buffer): Promise<string> {
  const data = await pdfParse(pdfBytes);
  return data.text;
}
```

Then attempt to match extracted text to field labels/positions.

### Solution C: OCR Integration (Last Resort)

For flattened PDFs, use OCR to extract text. This is expensive and less accurate.

## Recommended Approach

1. **First**: Add diagnostic logging to understand the actual PDF structure
2. **Then**: Implement Solution A (enhanced value reading)
3. **If needed**: Add Solution B (text extraction fallback)
4. **Always**: Show clear warnings for unsupported PDF types

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Different PDF editors save differently | Some PDFs won't extract | Test with multiple editors, document limitations |
| Flattened PDFs common from borrowers | Can't extract structured data | Detect and warn user, suggest re-uploading fillable version |
| Complex appearance stream parsing | Development time | Start with simple cases, iterate |

## Testing Strategy

1. Create test PDFs filled with:
   - Adobe Acrobat
   - Adobe Reader
   - Chrome PDF viewer
   - macOS Preview
   - Foxit Reader

2. For each, verify:
   - Field detection works
   - Values are extracted correctly
   - Confidence scores are appropriate

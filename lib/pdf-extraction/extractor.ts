import { PDFDocument, PDFName, PDFTextField, PDFCheckBox, PDFDropdown, PDFRadioGroup } from 'pdf-lib';
import { SbaFormType } from '@/types';
import { ExtractionResult, ExtractedPdfField, FormFieldMapping } from './types';
import { detectFormType, getFormMapping } from './form-detector';

/**
 * Check if PDF uses XFA forms (which pdf-lib doesn't support)
 */
function checkForXFA(pdfDoc: PDFDocument): boolean {
  try {
    const catalog = pdfDoc.catalog;
    const acroForm = catalog.lookup(PDFName.of('AcroForm'));
    if (acroForm && typeof acroForm === 'object' && 'lookup' in acroForm) {
      const xfa = (acroForm as { lookup: (name: PDFName) => unknown }).lookup(PDFName.of('XFA'));
      if (xfa) {
        console.warn('[PDF Extraction] WARNING: PDF contains XFA forms - these are NOT supported by pdf-lib!');
        return true;
      }
    }
  } catch (e) {
    // Ignore errors checking for XFA
  }
  return false;
}

/**
 * Transform a raw value based on the specified transform type
 */
function transformValue(
  rawValue: string | boolean | null,
  transform?: FormFieldMapping['transform']
): unknown {
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return rawValue;
  }

  if (typeof rawValue === 'boolean') {
    return rawValue;
  }

  const strValue = String(rawValue).trim();

  switch (transform) {
    case 'date': {
      // Try to parse various date formats
      const datePatterns = [
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // MM/DD/YYYY
        /(\d{1,2})-(\d{1,2})-(\d{4})/, // MM-DD-YYYY
        /(\d{4})-(\d{1,2})-(\d{1,2})/, // YYYY-MM-DD
      ];
      for (const pattern of datePatterns) {
        const match = strValue.match(pattern);
        if (match) {
          const parsed = new Date(strValue);
          if (!isNaN(parsed.getTime())) {
            return parsed.toISOString().split('T')[0]; // Return YYYY-MM-DD
          }
        }
      }
      return strValue;
    }

    case 'currency': {
      // Remove currency symbols, commas, and parse as number
      const cleaned = strValue.replace(/[$,\s]/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? strValue : num;
    }

    case 'phone': {
      // Normalize phone number - keep only digits
      const digits = strValue.replace(/\D/g, '');
      if (digits.length === 10) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
      }
      if (digits.length === 11 && digits[0] === '1') {
        return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
      }
      return strValue;
    }

    case 'ssn': {
      // Format as XXX-XX-XXXX
      const digits = strValue.replace(/\D/g, '');
      if (digits.length === 9) {
        return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
      }
      return strValue;
    }

    case 'ein': {
      // Format as XX-XXXXXXX
      const digits = strValue.replace(/\D/g, '');
      if (digits.length === 9) {
        return `${digits.slice(0, 2)}-${digits.slice(2)}`;
      }
      return strValue;
    }

    case 'percentage': {
      // Parse percentage value
      const cleaned = strValue.replace(/[%\s]/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? strValue : num;
    }

    case 'boolean': {
      // Convert various boolean representations
      const lower = strValue.toLowerCase();
      if (['yes', 'true', '1', 'x', 'checked'].includes(lower)) {
        return true;
      }
      if (['no', 'false', '0', '', 'unchecked'].includes(lower)) {
        return false;
      }
      return strValue;
    }

    case 'uppercase':
      return strValue.toUpperCase();

    case 'lowercase':
      return strValue.toLowerCase();

    default:
      return strValue;
  }
}

/**
 * Calculate confidence for an extracted field
 */
function calculateFieldConfidence(
  pdfFieldName: string,
  mapping: FormFieldMapping | undefined,
  rawValue: string | boolean | null
): number {
  if (!mapping) {
    return 0; // No mapping = zero confidence
  }

  let confidence = mapping.confidence;

  // Reduce confidence if value is empty
  if (rawValue === null || rawValue === '' || rawValue === undefined) {
    confidence *= 0.3;
  }

  // Reduce confidence for very short values
  if (typeof rawValue === 'string' && rawValue.length < 2) {
    confidence *= 0.7;
  }

  // Check if field name matches exactly vs pattern match
  if (mapping.pdfFieldPattern) {
    if (!mapping.pdfFieldPattern.test(pdfFieldName)) {
      confidence *= 0.8;
    }
  } else if (mapping.pdfFieldName.toLowerCase() !== pdfFieldName.toLowerCase()) {
    // Partial match - reduce confidence
    confidence *= 0.9;
  }

  return Math.min(Math.max(confidence, 0), 1);
}

/**
 * Find the best mapping for a PDF field
 */
function findFieldMapping(
  pdfFieldName: string,
  formType: SbaFormType | null
): FormFieldMapping | undefined {
  if (!formType || formType === 'unknown') {
    return undefined;
  }

  const formMapping = getFormMapping(formType);
  if (!formMapping) {
    return undefined;
  }

  const normalizedFieldName = pdfFieldName.toLowerCase().replace(/[^a-z0-9]/g, '');

  // First, try exact match
  let mapping = formMapping.mappings.find(
    (m) => m.pdfFieldName.toLowerCase() === pdfFieldName.toLowerCase()
  );

  if (mapping) {
    return mapping;
  }

  // Then try pattern match if defined
  mapping = formMapping.mappings.find((m) => {
    if (m.pdfFieldPattern) {
      return m.pdfFieldPattern.test(pdfFieldName);
    }
    return false;
  });

  if (mapping) {
    return mapping;
  }

  // Finally, try fuzzy match (contains)
  mapping = formMapping.mappings.find((m) => {
    const normalizedMappingName = m.pdfFieldName.toLowerCase().replace(/[^a-z0-9]/g, '');
    return (
      normalizedFieldName.includes(normalizedMappingName) ||
      normalizedMappingName.includes(normalizedFieldName)
    );
  });

  return mapping;
}

/**
 * Extract form fields from a PDF buffer
 */
export async function extractPdfFields(pdfBytes: Buffer): Promise<ExtractionResult> {
  console.log('[PDF Extraction] Starting extraction, buffer size:', pdfBytes.length);

  // Verify PDF header
  const header = pdfBytes.slice(0, 8).toString('ascii');
  console.log('[PDF Extraction] PDF header:', header);
  if (!header.startsWith('%PDF')) {
    console.error('[PDF Extraction] Invalid PDF header - file may be corrupted');
  }

  try {
    // Load the PDF document
    let pdfDoc: PDFDocument;
    try {
      pdfDoc = await PDFDocument.load(pdfBytes, {
        ignoreEncryption: true,
      });
      console.log('[PDF Extraction] PDF loaded successfully, page count:', pdfDoc.getPageCount());
    } catch (loadError) {
      console.error('[PDF Extraction] Failed to load PDF:', loadError);
      return {
        success: false,
        formType: null,
        formName: null,
        fields: [],
        totalFields: 0,
        mappedFields: 0,
        filledFields: 0,
        averageConfidence: 0,
        possibleIssues: [],
        error: 'Failed to load PDF. The file may be corrupted or password-protected.',
      };
    }

    // Check for XFA forms (not supported)
    const hasXFA = checkForXFA(pdfDoc);
    if (hasXFA) {
      console.error('[PDF Extraction] PDF uses XFA forms which are not supported!');
    }

    // Get form fields
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    console.log('[PDF Extraction] Found', fields.length, 'form fields');

    if (fields.length === 0) {
      return {
        success: true,
        formType: null,
        formName: null,
        fields: [],
        totalFields: 0,
        mappedFields: 0,
        filledFields: 0,
        averageConfidence: 0,
        possibleIssues: ['NO_FORM_FIELDS'],
        error: 'No fillable form fields found in PDF.',
      };
    }

    // Extract field names for form detection
    const fieldNames = fields.map((f) => f.getName());

    // Detect form type
    const detectedForm = detectFormType(fieldNames);
    const formType = detectedForm.confidence >= 0.3 ? detectedForm.formType : 'unknown';
    const formName = detectedForm.confidence >= 0.3 ? detectedForm.formName : null;

    // Extract field values
    const extractedFields: ExtractedPdfField[] = [];
    let totalConfidence = 0;
    let mappedCount = 0;
    let filledCount = 0;

    for (const field of fields) {
      const name = field.getName();
      let rawValue: string | boolean | null = null;
      let pdfFieldType = 'text';

      try {
        // Use instanceof checks instead of constructor.name comparisons.
        // constructor.name gets mangled by bundlers (Turbopack/Webpack),
        // causing all fields to be skipped and read as null.
        if (field instanceof PDFTextField) {
          const textValue = field.getText();
          rawValue = textValue || null;
          pdfFieldType = 'text';
        } else if (field instanceof PDFCheckBox) {
          rawValue = field.isChecked();
          pdfFieldType = 'checkbox';
        } else if (field instanceof PDFDropdown) {
          const selected = field.getSelected();
          rawValue = selected.length > 0 ? selected[0] : null;
          pdfFieldType = 'dropdown';
        } else if (field instanceof PDFRadioGroup) {
          rawValue = field.getSelected() || null;
          pdfFieldType = 'radio';
        }
      } catch (e) {
        console.warn(`[PDF Extraction] Could not read field ${name}:`, e);
        continue;
      }

      // Find mapping for this field
      const mapping = findFieldMapping(name, formType);
      const confidence = calculateFieldConfidence(name, mapping, rawValue);
      const transformedValue = mapping
        ? transformValue(rawValue, mapping.transform)
        : rawValue;

      extractedFields.push({
        pdfFieldName: name,
        pdfFieldType,
        rawValue,
        mappedSection: mapping?.appSection,
        mappedPath: mapping?.appFieldPath,
        mappedLabel: mapping?.label,
        transformedValue,
        confidence,
      });

      totalConfidence += confidence;
      if (mapping) {
        mappedCount++;
      }
      // Count fields that have actual values
      if (rawValue !== null && rawValue !== '' && rawValue !== false) {
        filledCount++;
      }
    }

    const averageConfidence =
      extractedFields.length > 0 ? totalConfidence / extractedFields.length : 0;

    // Detect possible issues with the PDF
    const possibleIssues: string[] = [];
    const emptyRatio = mappedCount > 0 ? (mappedCount - filledCount) / mappedCount : 0;

    if (mappedCount > 0 && filledCount === 0) {
      possibleIssues.push('ALL_FIELDS_EMPTY');
    } else if (emptyRatio > 0.8) {
      possibleIssues.push('MOSTLY_EMPTY');
    }

    console.log('[PDF Extraction] Results:', {
      totalFields: extractedFields.length,
      mappedFields: mappedCount,
      filledFields: filledCount,
      averageConfidence: Math.round(averageConfidence * 100) / 100,
      possibleIssues,
    });

    // Log first few fields with values for debugging
    const fieldsWithValues = extractedFields.filter(f => f.rawValue !== null && f.rawValue !== '' && f.rawValue !== false);
    if (fieldsWithValues.length > 0) {
      console.log('[PDF Extraction] Sample filled fields:', fieldsWithValues.slice(0, 5).map(f => ({
        name: f.pdfFieldName,
        rawValue: f.rawValue,
        transformedValue: f.transformedValue,
      })));
    } else {
      console.log('[PDF Extraction] WARNING: No fields have values!');
      // Log first few fields for debugging
      console.log('[PDF Extraction] First 3 fields:', extractedFields.slice(0, 3).map(f => ({
        name: f.pdfFieldName,
        type: f.pdfFieldType,
        rawValue: f.rawValue,
      })));
    }

    return {
      success: true,
      formType,
      formName,
      fields: extractedFields,
      totalFields: extractedFields.length,
      mappedFields: mappedCount,
      filledFields: filledCount,
      averageConfidence: Math.round(averageConfidence * 100) / 100,
      possibleIssues,
    };
  } catch (error) {
    console.error('[PDF Extraction] Error:', error);
    return {
      success: false,
      formType: null,
      formName: null,
      fields: [],
      totalFields: 0,
      mappedFields: 0,
      filledFields: 0,
      averageConfidence: 0,
      possibleIssues: [],
      error: error instanceof Error ? error.message : 'Unknown extraction error',
    };
  }
}

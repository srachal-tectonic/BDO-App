import { SbaFormType } from '@/types';
import { DetectedForm, SbaFormMapping } from './types';
import { sba1919Mapping } from './sba-1919-mapping';
import { sba413Mapping } from './sba-413-mapping';
import { sba912Mapping } from './sba-912-mapping';
import { irs4506cMapping } from './irs-4506c-mapping';
import { sba159Mapping } from './sba-159-mapping';

// All form mappings
export const ALL_FORM_MAPPINGS: SbaFormMapping[] = [
  sba1919Mapping,
  sba413Mapping,
  sba912Mapping,
  irs4506cMapping,
  sba159Mapping,
];

/**
 * Detect which SBA form type a PDF is based on field names
 */
export function detectFormType(fieldNames: string[]): DetectedForm {
  const normalizedFieldNames = fieldNames.map((name) =>
    name.toLowerCase().replace(/[^a-z0-9\s]/g, '')
  );

  let bestMatch: DetectedForm = {
    formType: 'unknown',
    formName: 'Unknown Form',
    confidence: 0,
    matchedSignatures: [],
  };

  for (const mapping of ALL_FORM_MAPPINGS) {
    const matchedSignatures: string[] = [];
    let matchCount = 0;

    for (const signature of mapping.fieldSignatures) {
      const normalizedSignature = signature.toLowerCase().replace(/[^a-z0-9\s]/g, '');

      // Check if any field name contains the signature (partial match)
      const found = normalizedFieldNames.some(
        (fieldName) =>
          fieldName.includes(normalizedSignature) ||
          normalizedSignature.includes(fieldName)
      );

      if (found) {
        matchCount++;
        matchedSignatures.push(signature);
      }
    }

    // Calculate confidence based on percentage of signatures matched
    const confidence = mapping.fieldSignatures.length > 0
      ? matchCount / mapping.fieldSignatures.length
      : 0;

    // Need at least 2 matches and better than current best
    if (matchCount >= 2 && confidence > bestMatch.confidence) {
      bestMatch = {
        formType: mapping.formId,
        formName: mapping.formName,
        confidence: Math.min(confidence * 1.2, 1), // Boost confidence slightly but cap at 1
        matchedSignatures,
      };
    }
  }

  return bestMatch;
}

/**
 * Get the mapping configuration for a specific form type
 */
export function getFormMapping(formType: SbaFormType): SbaFormMapping | null {
  return ALL_FORM_MAPPINGS.find((m) => m.formId === formType) || null;
}

/**
 * Get all available form mappings
 */
export function getAllFormMappings(): SbaFormMapping[] {
  return ALL_FORM_MAPPINGS;
}

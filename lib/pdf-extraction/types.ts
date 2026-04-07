import { SbaFormType } from '@/types';

export interface FormFieldMapping {
  pdfFieldName: string;
  pdfFieldPattern?: RegExp;
  appSection: string;
  appFieldPath: string;
  transform?: 'date' | 'currency' | 'phone' | 'ssn' | 'ein' | 'percentage' | 'boolean' | 'uppercase' | 'lowercase';
  confidence: number;
  label?: string;
}

export interface SbaFormMapping {
  formId: SbaFormType;
  formName: string;
  formNumber: string;
  fieldSignatures: string[];
  mappings: FormFieldMapping[];
}

export interface DetectedForm {
  formType: SbaFormType;
  formName: string;
  confidence: number;
  matchedSignatures: string[];
}

export interface ExtractionResult {
  success: boolean;
  formType: SbaFormType | null;
  formName: string | null;
  fields: ExtractedPdfField[];
  totalFields: number;
  mappedFields: number;
  filledFields: number;
  averageConfidence: number;
  possibleIssues: string[];
  error?: string;
}

export interface ExtractedPdfField {
  pdfFieldName: string;
  pdfFieldType: string;
  rawValue: string | boolean | null;
  mappedSection?: string;
  mappedPath?: string;
  mappedLabel?: string;
  transformedValue?: unknown;
  confidence: number;
}

// Types
export * from './types';

// Form mappings
export { sba1919Mapping } from './sba-1919-mapping';
export { sba413Mapping } from './sba-413-mapping';
export { sba912Mapping } from './sba-912-mapping';
export { irs4506cMapping } from './irs-4506c-mapping';
export { sba159Mapping } from './sba-159-mapping';

// Form detection
export {
  detectFormType,
  getFormMapping,
  getAllFormMappings,
  ALL_FORM_MAPPINGS,
} from './form-detector';

// Extraction
export { extractPdfFields } from './extractor';

## Context
Borrowers upload completed PDF forms through the public portal. Currently, these files are stored but the data must be manually extracted by BDOs. The system already has PDF parsing capabilities using `pdf-lib` for the PDF import feature, which extracts form field data from fillable PDFs. We can leverage this existing infrastructure to automatically process borrower uploads.

## Goals / Non-Goals

### Goals
- Automatically extract form field data from uploaded PDFs
- Provide predefined mappings for the 5 standard SBA forms
- Allow BDOs to review extracted data before applying
- Support editing extracted values before application
- Create audit trail of data applied from uploads
- Handle non-fillable PDFs gracefully (mark as manual review required)

### Non-Goals
- OCR for scanned/image-based PDFs (future enhancement)
- Automatic application without BDO review
- Support for arbitrary PDF forms (only the 5 standard SBA forms)
- Real-time extraction during upload (async processing is acceptable)

## Decisions

### Decision 1: Extraction Timing
Extract data asynchronously after upload completes, not during the upload request.

**Rationale**: PDF parsing can be slow for large files. Processing asynchronously prevents upload timeouts and provides a better user experience. The extraction can be triggered immediately after upload but runs as a background process.

**Implementation**:
- Upload API stores file and returns immediately
- Extraction runs as a follow-up server action or via a trigger
- Status updates from 'uploaded' → 'extracting' → 'extracted' or 'extraction_failed'

### Decision 2: Form Type Detection
Detect which SBA form was uploaded by checking PDF metadata and field names.

**Rationale**: Each SBA form has distinct field names. By checking for signature fields or specific field patterns, we can identify the form type and apply the correct field mappings.

**Detection Strategy**:
```typescript
const FORM_SIGNATURES = {
  'sba-1919': ['Business Legal Name', 'DUNS Number', 'Business TIN'],
  'sba-413': ['ASSETS', 'LIABILITIES', 'Net Worth'],
  'sba-912': ['Have you ever been arrested', 'criminal offense'],
  'irs-4506c': ['Tax form number', 'Return Transcript'],
  'sba-159': ['Fee Amount', 'Compensation Agreement'],
};
```

### Decision 3: Field Mapping Structure
Create a mapping configuration file for each SBA form that maps PDF field names to loan application field paths.

**Rationale**: Centralizes mapping logic, makes it easy to update if form fields change, and allows for confidence scoring.

**Structure**:
```typescript
interface FormFieldMapping {
  pdfFieldName: string;        // Exact or pattern match
  appSection: string;          // Target section in loan application
  appFieldPath: string;        // Dot notation path
  transform?: 'date' | 'currency' | 'phone' | 'ssn' | 'ein';
  confidence: number;          // 0-1 confidence score
}

interface SbaFormMapping {
  formId: string;
  formName: string;
  fieldSignatures: string[];   // Fields that identify this form
  mappings: FormFieldMapping[];
}
```

### Decision 4: Extracted Data Storage
Store extracted data in a subcollection under the borrower upload document.

**Rationale**: Keeps extracted data associated with its source document, allows for multiple extraction attempts, and maintains clear ownership.

**Storage Path**: `projects/{projectId}/borrowerUploads/{uploadId}/extractions/{extractionId}`

**Schema**:
```typescript
interface ExtractionRecord {
  id: string;
  uploadId: string;
  formType: string | null;      // Detected form type
  extractedAt: Date;
  status: 'pending' | 'extracted' | 'reviewed' | 'applied' | 'failed';
  fields: ExtractedFieldValue[];
  reviewedBy?: string;
  reviewedAt?: Date;
  appliedBy?: string;
  appliedAt?: Date;
  error?: string;
}

interface ExtractedFieldValue {
  pdfFieldName: string;
  rawValue: string | boolean | null;
  mappedSection?: string;
  mappedPath?: string;
  transformedValue?: unknown;
  confidence: number;
  status: 'pending' | 'approved' | 'rejected' | 'edited';
  editedValue?: unknown;
}
```

### Decision 5: BDO Review Interface
Add an expandable review panel in the Borrower Uploads section of BorrowerFormsSection.

**Rationale**: Keeps extraction review in context with the uploads, doesn't require navigating to a separate page.

**UI Components**:
- Extraction status badge on each upload
- Expandable panel showing extracted fields
- Field-by-field approve/reject/edit controls
- "Apply All Approved" button
- Warning for low-confidence extractions

### Decision 6: Apply to Loan Application
When BDO applies extracted data, merge into loan application with conflict resolution.

**Rationale**: Extracted data should enhance, not overwrite, existing loan application data unless explicitly approved.

**Conflict Resolution**:
- If target field is empty: apply extracted value
- If target field has value: show conflict, require explicit approval to overwrite
- Track all changes with before/after values in audit log

## Risks / Trade-offs

### Risk: PDF Format Variations
Different PDF viewers/editors may save form data differently.

**Mitigation**:
- Test with PDFs from multiple sources
- Use fuzzy matching for field names
- Fall back to manual review if extraction confidence is low

### Risk: Extraction Errors
Malformed PDFs or non-fillable PDFs will fail extraction.

**Mitigation**:
- Graceful error handling with clear status
- Allow manual data entry as fallback
- Log extraction errors for debugging

### Risk: Data Accuracy
Extracted data may contain errors or unexpected formats.

**Mitigation**:
- Require BDO review before application
- Show confidence scores
- Highlight fields that need attention
- Never auto-apply without human review

## Data Model Changes

### Modified: `projects/{projectId}/borrowerUploads/{uploadId}`
Add fields:
```typescript
{
  extractionStatus: 'pending' | 'extracting' | 'extracted' | 'reviewed' | 'applied' | 'failed' | 'not_applicable';
  detectedFormType: string | null;
  extractionId: string | null;  // Reference to latest extraction
}
```

### New: `projects/{projectId}/borrowerUploads/{uploadId}/extractions/{extractionId}`
Full extraction record as defined above.

### New: `projects/{projectId}/extractionHistory`
Audit log of all data applied from extractions:
```typescript
{
  extractionId: string;
  uploadId: string;
  appliedBy: string;
  appliedAt: Date;
  changes: Array<{
    section: string;
    fieldPath: string;
    oldValue: unknown;
    newValue: unknown;
  }>;
}
```

## Migration Plan
No migration needed - this is a new capability. Existing borrower uploads will have `extractionStatus: 'not_applicable'` by default. BDOs can manually trigger extraction for existing uploads if desired.

## Open Questions
1. Should extraction run automatically on upload or require manual trigger? (Recommendation: auto-trigger but allow re-extraction)
2. How long to retain extraction data after application? (Recommendation: indefinitely for audit purposes)
3. Should we support bulk extraction for multiple uploads? (Recommendation: defer to future enhancement)

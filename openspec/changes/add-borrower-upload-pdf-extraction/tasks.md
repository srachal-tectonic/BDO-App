## 1. Data Model & Types

- [ ] 1.1 Add TypeScript types for extraction records and field values in `types/index.ts`
- [ ] 1.2 Add extraction status enum type
- [ ] 1.3 Add Firestore helper functions for extraction records (create, get, update)
- [ ] 1.4 Add Firestore helper function for extraction history/audit log
- [ ] 1.5 Update BorrowerUpload type to include extraction fields

## 2. SBA Form Field Mappings

- [ ] 2.1 Create `lib/pdf-extraction/types.ts` with mapping interfaces
- [ ] 2.2 Create `lib/pdf-extraction/sba-1919-mapping.ts` for Borrower Information Form
- [ ] 2.3 Create `lib/pdf-extraction/sba-413-mapping.ts` for Personal Financial Statement
- [ ] 2.4 Create `lib/pdf-extraction/sba-912-mapping.ts` for Statement of Personal History
- [ ] 2.5 Create `lib/pdf-extraction/irs-4506c-mapping.ts` for Tax Transcript Request
- [ ] 2.6 Create `lib/pdf-extraction/sba-159-mapping.ts` for Fee Disclosure Form
- [ ] 2.7 Create `lib/pdf-extraction/form-detector.ts` for form type detection
- [ ] 2.8 Create `lib/pdf-extraction/index.ts` to export all mappings

## 3. PDF Extraction Engine

- [ ] 3.1 Create `lib/pdf-extraction/extractor.ts` with core extraction logic
- [ ] 3.2 Implement field value transformation (date, currency, phone, SSN, EIN)
- [ ] 3.3 Implement confidence scoring for extracted values
- [ ] 3.4 Add error handling for malformed/non-fillable PDFs
- [ ] 3.5 Add extraction logging for debugging

## 4. API Endpoints

- [ ] 4.1 Update `app/api/forms/[token]/upload/route.ts` to trigger extraction after upload
- [ ] 4.2 Create `app/api/projects/[id]/borrower-uploads/[uploadId]/extract/route.ts` for manual extraction trigger
- [ ] 4.3 Create `app/api/projects/[id]/borrower-uploads/[uploadId]/extraction/route.ts` GET for extraction data
- [ ] 4.4 Create `app/api/projects/[id]/borrower-uploads/[uploadId]/extraction/route.ts` PATCH for field status updates
- [ ] 4.5 Create `app/api/projects/[id]/borrower-uploads/[uploadId]/apply/route.ts` to apply extracted data

## 5. BDO Review Interface

- [ ] 5.1 Add extraction status badge component to borrower uploads list
- [ ] 5.2 Create expandable extraction review panel component
- [ ] 5.3 Implement field-by-field display with confidence indicators
- [ ] 5.4 Add approve/reject/edit controls for each field
- [ ] 5.5 Implement inline field editing
- [ ] 5.6 Add "Apply Approved Fields" button with confirmation
- [ ] 5.7 Show conflict warnings when target fields have existing values
- [ ] 5.8 Add "Re-extract" button for failed or updated uploads
- [ ] 5.9 Display extraction history/audit log

## 6. Integration & Polish

- [ ] 6.1 Update BorrowerFormsSection to integrate extraction review
- [ ] 6.2 Add loading states for extraction operations
- [ ] 6.3 Add success/error toast notifications
- [ ] 6.4 Handle edge cases (empty PDFs, unsupported forms)
- [ ] 6.5 Add extraction metrics (fields extracted, confidence averages)

## 7. Testing & Validation

- [ ] 7.1 Test extraction with sample SBA Form 1919
- [ ] 7.2 Test extraction with sample SBA Form 413
- [ ] 7.3 Test extraction with sample SBA Form 912
- [ ] 7.4 Test extraction with sample IRS Form 4506-C
- [ ] 7.5 Test extraction with sample SBA Form 159
- [ ] 7.6 Test form type detection accuracy
- [ ] 7.7 Test extraction failure handling
- [ ] 7.8 Test apply to loan application flow
- [ ] 7.9 Test conflict resolution when overwriting existing values
- [ ] 7.10 Verify audit log captures all changes

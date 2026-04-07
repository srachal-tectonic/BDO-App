## ADDED Requirements

### Requirement: Automatic PDF Extraction on Upload
The system SHALL automatically extract form field data from PDF files uploaded by borrowers through the public portal.

#### Scenario: Successful extraction of fillable PDF
- **WHEN** a borrower uploads a fillable PDF form through the portal
- **THEN** the system extracts all form field values and stores them in Firestore
- **AND** the upload record is updated with extraction status 'extracted'
- **AND** the detected form type is stored with the upload

#### Scenario: Extraction of non-fillable PDF
- **WHEN** a borrower uploads a non-fillable (flat) PDF
- **THEN** the system marks extraction status as 'not_applicable'
- **AND** no extraction error is raised
- **AND** the BDO can still view and download the file

#### Scenario: Extraction failure
- **WHEN** PDF extraction fails due to file corruption or other error
- **THEN** the system marks extraction status as 'failed'
- **AND** the error message is stored for debugging
- **AND** the BDO is notified that manual review is required

---

### Requirement: SBA Form Type Detection
The system SHALL detect which SBA form was uploaded based on PDF field signatures.

#### Scenario: Detect SBA Form 1919
- **WHEN** an uploaded PDF contains fields matching SBA Form 1919 signatures
- **THEN** the system identifies the form as 'sba-1919'
- **AND** applies the SBA 1919 field mappings for data extraction

#### Scenario: Detect SBA Form 413
- **WHEN** an uploaded PDF contains fields matching SBA Form 413 signatures
- **THEN** the system identifies the form as 'sba-413'
- **AND** applies the SBA 413 field mappings for data extraction

#### Scenario: Unknown form type
- **WHEN** an uploaded PDF does not match any known SBA form signatures
- **THEN** the system marks form type as 'unknown'
- **AND** extracts all fields without predefined mappings
- **AND** the BDO must manually map fields if needed

---

### Requirement: Extracted Data Storage
The system SHALL store extracted field values with metadata in Firestore.

#### Scenario: Store extraction record
- **WHEN** PDF extraction completes successfully
- **THEN** an extraction record is created in `borrowerUploads/{uploadId}/extractions`
- **AND** each extracted field includes raw value, mapped path, confidence score, and status

#### Scenario: Multiple extraction attempts
- **WHEN** a BDO triggers re-extraction for an upload
- **THEN** a new extraction record is created
- **AND** the upload references the latest extraction ID
- **AND** previous extraction records are preserved for history

---

### Requirement: BDO Extraction Review Interface
The system SHALL provide BDOs with an interface to review extracted data before applying to the loan application.

#### Scenario: View extracted fields
- **WHEN** a BDO views a borrower upload with extraction status 'extracted'
- **THEN** the system displays an expandable panel showing all extracted fields
- **AND** each field shows the PDF field name, extracted value, target field, and confidence

#### Scenario: Approve individual field
- **WHEN** a BDO clicks approve on an extracted field
- **THEN** the field status changes to 'approved'
- **AND** the field is ready to be applied to the loan application

#### Scenario: Reject individual field
- **WHEN** a BDO clicks reject on an extracted field
- **THEN** the field status changes to 'rejected'
- **AND** the field will not be applied to the loan application

#### Scenario: Edit extracted value
- **WHEN** a BDO edits an extracted field value
- **THEN** the edited value is stored separately from the raw extracted value
- **AND** the field status changes to 'edited'
- **AND** the edited value will be used when applying to loan application

---

### Requirement: Confidence Scoring
The system SHALL provide confidence scores for extracted field values.

#### Scenario: High confidence extraction
- **WHEN** a field is extracted with high confidence (>0.8)
- **THEN** the field is displayed with a green confidence indicator
- **AND** no special attention is required from the BDO

#### Scenario: Low confidence extraction
- **WHEN** a field is extracted with low confidence (<0.5)
- **THEN** the field is displayed with a yellow/orange warning indicator
- **AND** the BDO is prompted to verify the extracted value

#### Scenario: No mapping available
- **WHEN** a field is extracted but has no predefined mapping
- **THEN** the confidence is set to 0
- **AND** the field is displayed without a target mapping
- **AND** the BDO can manually assign a target field

---

### Requirement: Apply Extracted Data to Loan Application
The system SHALL allow BDOs to apply approved extracted data to the loan application.

#### Scenario: Apply approved fields
- **WHEN** a BDO clicks "Apply Approved Fields"
- **THEN** all fields with status 'approved' or 'edited' are applied to the loan application
- **AND** the extraction status is updated to 'applied'
- **AND** an audit record is created with before/after values

#### Scenario: Conflict with existing data
- **WHEN** an extracted field targets a loan application field that already has a value
- **THEN** the system shows a conflict warning
- **AND** the BDO must explicitly confirm to overwrite the existing value
- **AND** the overwrite is logged in the audit trail

#### Scenario: Partial application
- **WHEN** a BDO applies extracted data and some fields are rejected
- **THEN** only approved/edited fields are applied
- **AND** rejected fields are not modified in the loan application
- **AND** the extraction record tracks which fields were applied vs rejected

---

### Requirement: Extraction Audit Trail
The system SHALL maintain an audit trail of all data applied from PDF extractions.

#### Scenario: Record extraction application
- **WHEN** extracted data is applied to a loan application
- **THEN** an audit record is created in `extractionHistory`
- **AND** the record includes the extraction ID, upload ID, user, timestamp
- **AND** the record includes before/after values for each changed field

#### Scenario: View extraction history
- **WHEN** a BDO views the extraction history for a project
- **THEN** the system displays all extraction applications with timestamps and users
- **AND** the BDO can see what data came from which uploaded document

---

### Requirement: Manual Extraction Trigger
The system SHALL allow BDOs to manually trigger or re-trigger PDF extraction.

#### Scenario: Trigger extraction for existing upload
- **WHEN** a BDO clicks "Extract Data" on a borrower upload without extraction
- **THEN** the system initiates PDF extraction for that upload
- **AND** the extraction status changes to 'extracting' during processing

#### Scenario: Re-extract after failure
- **WHEN** a BDO clicks "Retry Extraction" on a failed extraction
- **THEN** the system attempts extraction again
- **AND** the new extraction result replaces the failed status

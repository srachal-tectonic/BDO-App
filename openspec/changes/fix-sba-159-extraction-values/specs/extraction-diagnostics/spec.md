# Spec: PDF Extraction Diagnostics

## Requirements

### Requirement: Diagnostic Logging for PDF Extraction

The system SHALL log detailed information about PDF field extraction to aid debugging.

#### Scenario: Log field details during extraction
- **WHEN** extracting fields from a PDF
- **THEN** the system logs for each field:
  - Field name and type
  - Raw value from getText()
  - Whether field has appearance streams
  - Number of widgets
  - Any default values

### Requirement: PDF Type Detection

The system SHALL detect and report PDF format issues that prevent extraction.

#### Scenario: Detect XFA forms
- **WHEN** a PDF contains XFA form data
- **THEN** the system returns an error indicating XFA forms are not supported
- **AND** suggests the user flatten the form or use a standard AcroForm version

#### Scenario: Detect flattened forms
- **WHEN** a PDF has form fields with no extractable values but visible content
- **THEN** the system warns that the PDF may be flattened
- **AND** suggests the user upload the original fillable version

### Requirement: Enhanced Value Extraction

The system SHALL try multiple methods to extract field values.

#### Scenario: Primary extraction succeeds
- **WHEN** getText() returns a value
- **THEN** use that value directly

#### Scenario: Try default value
- **WHEN** getText() returns empty
- **AND** the field has a default value (V entry)
- **THEN** use the default value

#### Scenario: All extraction methods fail
- **WHEN** no value can be extracted from the field
- **THEN** set rawValue to null
- **AND** set confidence to reduced level
- **AND** display "-" in the UI

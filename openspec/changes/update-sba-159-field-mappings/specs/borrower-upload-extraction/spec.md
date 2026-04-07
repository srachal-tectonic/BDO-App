# Spec Delta: Borrower Upload Extraction - SBA Form 159 Field Mappings

## MODIFIED Requirements

### Requirement: SBA Form 159 Field Extraction
The system SHALL extract all fillable fields from SBA Form 159 (Fee Disclosure and Compensation Agreement) PDFs and map them to the loan application data model.

#### Scenario: Complete field extraction from uploaded Form 159
- **WHEN** a borrower uploads a completed SBA Form 159 PDF
- **THEN** the system extracts all 47 fillable fields from the document
- **AND** maps each field to the corresponding `feeDisclosure` section in the loan application
- **AND** applies appropriate value transforms (currency, date, boolean) to each field
- **AND** calculates confidence scores for each extracted field

#### Scenario: Loan type checkbox extraction
- **WHEN** the system extracts loan type fields
- **THEN** it correctly identifies whether 7(a) Loan or 504 Loan checkbox is selected
- **AND** stores the selection as boolean values in `loanType7a` and `loanType504`

#### Scenario: Agent type checkbox extraction
- **WHEN** the system extracts agent type fields
- **THEN** it correctly identifies which agent type checkboxes are selected
- **AND** extracts "Other" description if the Other checkbox is selected
- **AND** stores all selections as boolean values with appropriate field names

#### Scenario: Service fee table extraction
- **WHEN** the system extracts the service fee table
- **THEN** it correctly maps each service type (Loan packaging, Financial statement, Broker/Referral, Consultant, Other) to separate fields
- **AND** distinguishes between amounts paid by Applicant vs SBA Lender
- **AND** applies currency transform to convert dollar amounts to numeric values
- **AND** extracts the "Other" service description if provided

#### Scenario: Compensation totals extraction
- **WHEN** the system extracts compensation total fields
- **THEN** it correctly maps total compensation paid by Applicant
- **AND** correctly maps total compensation paid by SBA Lender
- **AND** applies currency transform to both values

#### Scenario: 504 Loan specific field extraction
- **WHEN** the system extracts 504 Loan specific fields
- **THEN** it correctly identifies if CDC received referral fee from TPL
- **AND** extracts the amount of fee if provided
- **AND** extracts TPL Name and TPL Address

#### Scenario: Signature block extraction
- **WHEN** the system extracts signature block fields
- **THEN** it extracts Date, Print Name, and Title for each party (Applicant, Agent, SBA Lender)
- **AND** applies date transform to date fields
- **AND** stores each party's information separately

#### Scenario: Pattern-based field matching
- **WHEN** PDF field names don't exactly match predefined names
- **THEN** the system uses pattern matching as a fallback
- **AND** reduces confidence score by 10-20% for pattern-matched fields
- **AND** selects the most specific pattern match when multiple patterns match

## ADDED Requirements

### Requirement: Form 159 Detection Signatures
The system SHALL use enhanced field signatures to accurately detect SBA Form 159 PDFs.

#### Scenario: Accurate form type detection
- **WHEN** a PDF is uploaded containing Form 159 field patterns
- **THEN** the system identifies it as `sba-159` form type
- **AND** uses signatures including: `FEE DISCLOSURE`, `COMPENSATION AGREEMENT`, `SBA Form 159`, `Total Compensation`, `Type of Agent`, `Amount Paid by Applicant`, `Amount Paid by SBA Lender`
- **AND** achieves minimum 30% signature match threshold for positive identification

### Requirement: Fee Disclosure Data Structure
The system SHALL store extracted Form 159 data in a structured `feeDisclosure` section.

#### Scenario: Structured fee disclosure storage
- **WHEN** extracted Form 159 data is applied to loan application
- **THEN** all fee-related fields are stored under the `feeDisclosure` section
- **AND** service fees are broken down by service type and payer
- **AND** agent information is stored with type flags and contact details
- **AND** signature information is stored for audit purposes

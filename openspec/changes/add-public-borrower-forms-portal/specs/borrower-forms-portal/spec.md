## ADDED Requirements

### Requirement: Public Forms Portal Access
The system SHALL provide a public URL (`/forms/[token]`) that allows borrowers to access generated forms without authentication.

#### Scenario: Valid token access
- **WHEN** a borrower navigates to `/forms/[token]` with a valid, non-expired token
- **THEN** the system displays the forms portal page with project information and downloadable forms

#### Scenario: Invalid token access
- **WHEN** a borrower navigates to `/forms/[token]` with an invalid token
- **THEN** the system displays an error message indicating the link is invalid or has expired

#### Scenario: Expired token access
- **WHEN** a borrower navigates to `/forms/[token]` with an expired token
- **THEN** the system displays an error message instructing them to contact their loan officer for a new link

---

### Requirement: Magic Link Token Generation
The system SHALL generate cryptographically secure tokens for form portal access when forms are generated or when a BDO requests a portal link.

#### Scenario: Token generation on form generation
- **WHEN** a BDO generates forms for a project
- **THEN** the system creates a unique 32-character URL-safe token and stores it with the project

#### Scenario: Token regeneration
- **WHEN** a BDO clicks "Regenerate Link" in the Borrower Forms section
- **THEN** the system generates a new token, invalidates the previous token, and displays the new portal URL

---

### Requirement: Form Download from Public Portal
The system SHALL allow borrowers to download generated PDF forms from the public portal.

#### Scenario: Successful form download
- **WHEN** a borrower clicks a download button for a form on the public portal
- **THEN** the system serves the PDF file and records the download timestamp

#### Scenario: Download tracking visible to BDO
- **WHEN** a borrower downloads a form from the public portal
- **THEN** the BDO can see the download timestamp in the Borrower Forms admin section

---

### Requirement: One-Way Document Upload
The system SHALL allow borrowers to upload completed documents through the public portal without the ability to retrieve previously uploaded files.

#### Scenario: Successful file upload
- **WHEN** a borrower uploads a valid file (PDF, image, or document) under 25MB
- **THEN** the system stores the file, displays a success message, and does not show the uploaded file in the portal

#### Scenario: Invalid file type rejection
- **WHEN** a borrower attempts to upload an unsupported file type
- **THEN** the system rejects the upload and displays an error message listing accepted file types

#### Scenario: File size limit enforcement
- **WHEN** a borrower attempts to upload a file larger than 25MB
- **THEN** the system rejects the upload and displays an error message about the size limit

#### Scenario: One-way upload enforcement
- **WHEN** a borrower has uploaded files and revisits the portal
- **THEN** the system does not display any previously uploaded files (upload only, no retrieval)

---

### Requirement: BDO Upload Visibility
The system SHALL allow BDOs to view and download files uploaded by borrowers through the public portal.

#### Scenario: View borrower uploads
- **WHEN** a BDO views the Borrower Forms section for a project with borrower uploads
- **THEN** the system displays a list of uploaded files with filename, upload date, and file size

#### Scenario: Download borrower upload
- **WHEN** a BDO clicks download on a borrower-uploaded file
- **THEN** the system serves the file for download

---

### Requirement: Portal Link Management
The system SHALL provide BDOs with tools to manage and share the borrower portal link.

#### Scenario: Copy portal link
- **WHEN** a BDO clicks "Copy Portal Link" in the Borrower Forms section
- **THEN** the system copies the full portal URL (with token) to the clipboard

#### Scenario: Open portal preview
- **WHEN** a BDO clicks "Open Portal" in the Borrower Forms section
- **THEN** the system opens the public portal page in a new browser tab

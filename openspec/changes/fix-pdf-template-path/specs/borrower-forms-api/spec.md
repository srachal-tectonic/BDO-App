## MODIFIED Requirements

### Requirement: PDF Template Storage Location
The system SHALL store PDF templates in the `/public/pdfs` directory to ensure they are included in the deployment bundle and accessible at runtime in all environments.

#### Scenario: PDF templates accessible in development
- **WHEN** the application runs in development mode
- **THEN** PDF templates are readable from `/public/pdfs/`
- **AND** the download endpoint successfully serves the PDF files

#### Scenario: PDF templates accessible in production
- **WHEN** the application runs in production/deployed environment
- **THEN** PDF templates are readable from the `public/pdfs/` path relative to the build output
- **AND** the download endpoint successfully serves the PDF files

#### Scenario: Path resolution for PDF files
- **WHEN** the download endpoint resolves the PDF file path
- **THEN** it constructs the path as `{process.cwd()}/public/pdfs/{filename}`
- **AND** this path is valid in both development and production environments

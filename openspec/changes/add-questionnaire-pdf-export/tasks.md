# Tasks: Add Export to PDF Button to Business Questionnaire

## 1. Add Export Button to Page Header
- [x] 1.1 Import `FileDown` icon from lucide-react
- [x] 1.2 Add state for PDF generation loading (`isExporting`)
- [x] 1.3 Add "Export to PDF" button next to the title in the header section
- [x] 1.4 Style button as outline/secondary variant with FileDown icon

## 2. Implement PDF Generation Function
- [x] 2.1 Import `PDFDocument`, `rgb`, `StandardFonts` from pdf-lib
- [x] 2.2 Create `generateQuestionnairePdf` async function with parameters:
  - `projectName: string`
  - `rules: QuestionnaireRule[]`
  - `responses: QuestionnaireResponse[]`
  - `primaryProjectPurpose?: string`
- [x] 2.3 Create PDF document with Letter size pages (612 x 792)
- [x] 2.4 Embed Helvetica and HelveticaBold fonts

## 3. Implement PDF Header Section
- [x] 3.1 Draw "Business Questionnaire" title (large, bold, ~24pt)
- [x] 3.2 Draw project name subtitle (~14pt, gray)
- [x] 3.3 Draw export date line (~10pt, gray): "Exported: {date}"

## 4. Implement Category Sections
- [x] 4.1 Group rules by `mainCategory`
- [x] 4.2 Define category order: Business Overview, Project Purpose, Industry
- [x] 4.3 For each category section:
  - Draw section header (bold, blue color ~18pt)
  - For "Project Purpose", append primary project purpose (e.g., "Project Purpose - Business Acquisition")
  - Draw blue underline below section header
- [x] 4.4 Track question number across all sections (sequential)

## 5. Implement Question and Answer Rendering
- [x] 5.1 For each question in category:
  - Draw numbered question text in bold (e.g., "1. Question text here")
  - Handle text wrapping for long questions
- [x] 5.2 Create fillable text field for answer:
  - Gray background color
  - Pre-fill with response content if exists
  - Set appropriate height (multi-line field ~100pt)
- [x] 5.3 Handle page breaks when content exceeds page height

## 6. Implement PDF Download
- [x] 6.1 Generate PDF bytes with `pdfDoc.save()`
- [x] 6.2 Create blob and download link
- [x] 6.3 Trigger download with filename: `{ProjectName}_Business_Questionnaire.pdf`
- [x] 6.4 Clean up URL after download

## 7. Wire Up Export Button Handler
- [x] 7.1 Create `handleExportPdf` function
- [x] 7.2 Set loading state during generation
- [x] 7.3 Call `generateQuestionnairePdf` with current data
- [x] 7.4 Handle errors with appropriate user feedback
- [x] 7.5 Clear loading state on completion

## 8. Validation
- [x] 8.1 Run TypeScript compilation to verify no errors
- [ ] 8.2 Test export with questions in multiple categories
- [ ] 8.3 Test export with empty responses
- [ ] 8.4 Test export with long question/answer text (verify wrapping)
- [ ] 8.5 Verify PDF matches provided example styling

## Notes
- Used existing pdf-lib patterns from `app/api/pdf-exports/[id]/route.ts`
- Strip HTML tags from responses before adding to PDF (responses may contain Tiptap HTML)
- Category section header for "Project Purpose" includes the primary project purpose from application data

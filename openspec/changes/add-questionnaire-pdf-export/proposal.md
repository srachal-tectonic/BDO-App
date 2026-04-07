# Add Export to PDF Button to Business Questionnaire

**Change ID:** `add-questionnaire-pdf-export`
**Status:** Completed
**Author:** Claude
**Date:** 2026-01-07

## Summary

Add an "Export to PDF" button to the Business Questionnaire page that generates a professional PDF document containing all questions and their responses, grouped by category with fillable form fields.

## Motivation

BDOs need the ability to export the completed Business Questionnaire as a PDF document for:
- Sharing with loan committees and underwriters
- Including in loan documentation packages
- Printing for physical file retention
- Sending to borrowers for review/signature

## Current Implementation

The Business Questionnaire page (`app/bdo/borrower-portal/[id]/questionnaire/page.tsx`) displays:
- Questions loaded from `questionnaireRules` Firestore collection
- Responses stored in `questionnaireResponses` collection
- Rules have a `mainCategory` field: 'Business Overview' | 'Project Purpose' | 'Industry'
- No export functionality exists

## Proposed Implementation

### PDF Structure (based on provided example)

1. **Header**
   - Title: "Business Questionnaire" (large, bold)
   - Subtitle: Project name (e.g., "Test Project - Anna")
   - Export date: "Exported: January 7, 2026"

2. **Content Sections** (grouped by mainCategory)
   - Section headers with blue underline (e.g., "Business Overview")
   - For "Project Purpose" category, append the primary project purpose from application data (e.g., "Project Purpose - Business Acquisition")
   - Numbered questions in bold
   - Gray-background fillable text areas containing responses

3. **Question Numbering**
   - Sequential numbering across all sections (1, 2, 3... not restarting per section)

### Technical Approach

Use existing `pdf-lib` library (already in project) for PDF generation:
- Client-side generation in the questionnaire page
- No new API route needed (simpler approach)
- Match styling from provided example PDF

### UI Changes

Add "Export to PDF" button in the page header:
- Position: Top right of the questionnaire card, next to the title
- Icon: FileDown from lucide-react
- Style: Secondary/outline variant to not compete with primary actions
- Loading state while PDF generates

## Impact

### Files to Modify
| File | Change |
|------|--------|
| `app/bdo/borrower-portal/[id]/questionnaire/page.tsx` | Add Export button, PDF generation function |

### Dependencies
- `pdf-lib` (already installed)

### No Breaking Changes
- Additive feature only
- No changes to existing data structures

## Acceptance Criteria

1. "Export to PDF" button visible in questionnaire page header
2. Clicking button generates and downloads a PDF file
3. PDF filename format: `{ProjectName}_Business_Questionnaire.pdf`
4. PDF contains:
   - "Business Questionnaire" title
   - Project name subtitle
   - Export date
   - Questions grouped by mainCategory with section headers
   - Blue underline under section headers
   - Numbered questions (sequential across all sections)
   - Fillable text fields with gray background containing responses
5. Button shows loading state during PDF generation
6. Empty responses show empty fillable fields
7. TypeScript compiles without errors

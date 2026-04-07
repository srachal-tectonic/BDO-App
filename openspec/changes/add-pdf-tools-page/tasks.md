# Tasks: Add PDF Tools Page

## 1. Add Types and Interfaces
- [x] 1.1 Add `PdfMappingTemplate` type to `types/index.ts`
- [x] 1.2 Add `PdfImportSession` type to `types/index.ts`
- [x] 1.3 Add `PdfFieldMapping` type to `types/index.ts`
- [x] 1.4 Add `ExtractedField` interface to `types/index.ts`

## 2. Add PDF Tools Button to BDO View
- [x] 2.1 Import `FileUp` icon from lucide-react in `app/bdo/projects/[id]/page.tsx`
- [x] 2.2 Add "PDF Tools" button after the TabsList (styled as button not tab)
- [x] 2.3 Add click handler to navigate to `/bdo/projects/${projectId}/pdf-tools`

## 3. Create Toast Hook (if not exists)
- [x] 3.1 Check if `hooks/use-toast.ts` exists (it does)
- [x] 3.2 Toast hook already exists - no action needed
- [x] 3.3 Toast uses simple alert pattern - no Toaster component needed

## 4. Create Firestore Operations
- [x] 4.1 Add `createPdfImportSession` function to `services/firestore.ts`
- [x] 4.2 Add `getPdfImportSessions` function (get sessions by projectId)
- [x] 4.3 Add `updatePdfImportSession` function
- [x] 4.4 Add `createPdfTemplate` function
- [x] 4.5 Add `getPdfTemplates` function
- [x] 4.6 Add `deletePdfTemplate` function

## 5. Create API Routes
- [x] 5.1 Create `app/api/pdf-templates/route.ts` (GET all templates, POST new template)
- [x] 5.2 Create `app/api/pdf-templates/[id]/route.ts` (DELETE template)
- [x] 5.3 Create `app/api/pdf-imports/upload/route.ts` (POST - upload and extract fields)
- [x] 5.4 Create `app/api/pdf-imports/[id]/mappings/route.ts` (PUT - save mappings)
- [x] 5.5 Create `app/api/pdf-imports/[id]/apply/route.ts` (POST - apply import to loan app)
- [x] 5.6 Create `app/api/pdf-imports/app-fields/route.ts` (GET - return app field definitions)
- [x] 5.7 Create `app/api/projects/[id]/pdf-imports/route.ts` (GET - list sessions for project)
- [x] 5.8 Create `app/api/pdf-exports/[id]/route.ts` (POST - generate PDF)

## 6. Create PDF Tools Page
- [x] 6.1 Create `app/bdo/projects/[id]/pdf-tools/page.tsx`
- [x] 6.2 Convert Replit code to Next.js patterns:
  - Replaced `wouter` imports with Next.js (`useParams`, `useRouter`, `Link`)
  - Replaced `apiRequest` calls with `authenticatedFetch`/`authenticatedPost`
  - Replaced `@tanstack/react-query` with useState + useEffect patterns
  - Replaced hardcoded hex colors with Tailwind CSS variables
  - Updated back button to link to `/bdo/projects/${projectId}`
- [x] 6.3 Add proper error handling and loading states
- [x] 6.4 Add authentication check using `useFirebaseAuth`

## 7. PDF Processing Library
- [x] 7.1 Add `pdf-lib` package to `package.json` (user needs to run `npm install`)
- [x] 7.2 Using pdf-lib's form API for field extraction (pdf-parse not needed)
- [x] 7.3 Implement PDF field extraction logic in upload API route
- [x] 7.4 Implement PDF form filling logic in export API route

## 8. Testing and Validation
- [ ] 8.1 Test PDF upload with sample SBA form
- [ ] 8.2 Test field extraction accuracy
- [ ] 8.3 Test mapping flow end-to-end
- [ ] 8.4 Test PDF export (blank and pre-filled)
- [ ] 8.5 Test template save/load functionality
- [ ] 8.6 Test navigation from BDO view to PDF Tools and back

## Post-Implementation Notes
- **IMPORTANT**: Run `npm install` to install `pdf-lib` before building
- The implementation uses pdf-lib for both PDF field extraction and form filling
- AI-based field mapping suggestions are implemented based on common field name patterns
- The app fields definition in the API matches the loan application sections

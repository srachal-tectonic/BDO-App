# Change: Add PDF Tools Page to BDO View

## Why
BDOs need to import data from fillable PDF forms (SBA forms, IRS forms) into loan applications and export application data to pre-filled PDFs. Currently, this requires manual data entry which is time-consuming and error-prone.

## What Changes
- Add a "PDF Tools" button (not a tab) to the right of the "Notes" tab in the BDO project view
- Create a new PDF Tools page at `/bdo/projects/[id]/pdf-tools`
- Implement PDF import functionality: upload fillable PDFs, extract form fields, map to application fields, apply data
- Implement PDF export functionality: generate blank or pre-filled SBA/IRS forms
- Add mapping templates feature to save and reuse field mappings
- Adapt Replit-generated code to Next.js App Router patterns

## Impact
- Affected specs: `pdf-tools` (new capability)
- Affected code:
  - `app/bdo/projects/[id]/page.tsx` - Add PDF Tools button
  - `app/bdo/projects/[id]/pdf-tools/page.tsx` - New PDF Tools page
  - `types/index.ts` - Add PDF-related types
  - `services/firestore.ts` - Add PDF import/template CRUD operations
  - `app/api/pdf-*` - New API routes (8 endpoints)
  - `hooks/use-toast.ts` - Toast notification hook (if not exists)

## Code Adaptation Notes
The provided Replit code requires significant adaptation:

| Replit Pattern | This Project's Pattern |
|----------------|------------------------|
| `wouter` routing | Next.js App Router (`useParams`, `useRouter`) |
| `@tanstack/react-query` | Direct fetch with `authenticatedPost` |
| `@shared/schema` types | `types/index.ts` |
| Hardcoded hex colors | Tailwind CSS variables |
| `apiRequest` helper | `authenticatedPost` from `@/lib/authenticatedFetch` |

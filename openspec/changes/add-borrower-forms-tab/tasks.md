# Tasks: Add Borrower Forms Tab

## 1. Data Model
- [x] 1.1 Define `GeneratedForm` TypeScript interface with fields: id, projectId, formName, status, generatedAt, downloadedAt, uploadedAt, importedAt
- [x] 1.2 Define form status types: 'pending' | 'downloaded' | 'uploaded' | 'imported' | 'error'

## 2. BorrowerFormsSection Component
- [x] 2.1 Create `components/loan-sections/BorrowerFormsSection.tsx` component
- [x] 2.2 Add page header with title "Borrower Forms" and description
- [x] 2.3 Create "Generate Forms for Borrower" card with generate button
- [x] 2.4 Add loading state for forms list
- [x] 2.5 Add empty state when no forms exist
- [x] 2.6 Create generated forms list with status badges
- [x] 2.7 Implement status badge styling (Pending, Downloaded, Uploaded, Completed, Error)
- [x] 2.8 Add download button for each form
- [x] 2.9 Add portal link sharing card with copy functionality
- [x] 2.10 Add "Copy Portal Link" and "Open Portal" buttons

## 3. Tab Integration
- [x] 3.1 Import BorrowerFormsSection in project page
- [x] 3.2 Add "Borrower Forms" TabsTrigger after Notes tab with FileText icon
- [x] 3.3 Add corresponding TabsContent with BorrowerFormsSection component

## 4. Firestore Functions
- [x] 4.1 Create `getGeneratedForms` function in firestore.ts
- [x] 4.2 Create `generateFormsForProject` function in firestore.ts
- [ ] 4.3 Create `app/api/generated-forms/[id]/download/route.ts` GET endpoint (optional - for actual PDF download)

## 5. State Management
- [x] 5.1 Implement useState for forms list and loading state
- [x] 5.2 Implement form generation with loading state
- [x] 5.3 Add alert notifications for success/error states

## 6. Testing
- [ ] 6.1 Verify tab appears after Notes tab
- [ ] 6.2 Test generate forms functionality
- [ ] 6.3 Test copy portal link functionality
- [ ] 6.4 Test form download functionality
- [ ] 6.5 Verify status badges display correctly

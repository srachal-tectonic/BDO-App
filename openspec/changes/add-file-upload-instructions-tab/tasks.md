# Tasks: Add File Upload Instructions Tab to Admin Settings

## 1. Implementation

- [x] 1.1 Import `FileUp` icon from lucide-react in `app/bdo/admin/page.tsx`
- [x] 1.2 Add `TabsTrigger` for "file-upload-instructions" in the TabsList (after "Note Tags", before "Risk Assessment")

## 2. Verification

- [ ] 2.1 Navigate to Admin Settings page (`/bdo/admin`)
- [ ] 2.2 Verify "File Upload Instructions" tab appears in the tab bar
- [ ] 2.3 Click the tab and verify the four instruction textareas are displayed (Business Applicant, Individual Applicants, Other Businesses, Project Files)
- [ ] 2.4 Test saving instructions and verify they persist after page reload

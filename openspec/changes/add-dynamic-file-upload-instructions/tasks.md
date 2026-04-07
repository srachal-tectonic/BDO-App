# Tasks: Add Dynamic File Upload Instructions from Admin Settings

## 1. Create Firestore Helper Function
- [x] 1.1 Add `getFileUploadInstructions()` function to `services/firestore.ts`
- [x] 1.2 Function should fetch from `adminSettings/config` document
- [x] 1.3 Return the `fileUploadInstructions` object with all four fields

## 2. Update CombinedFilesSection Component
- [x] 2.1 Add state for file upload instructions
- [x] 2.2 Fetch instructions on component mount using useEffect
- [x] 2.3 Replace hardcoded Business Applicant instructions with dynamic content
- [x] 2.4 Replace hardcoded Individual Applicants instructions with dynamic content
- [x] 2.5 Replace hardcoded Other Businesses instructions with dynamic content
- [x] 2.6 Replace hardcoded Project Files instructions with dynamic content

## 3. Update BDO Project Page (Step 8)
- [x] 3.1 Rename Step 8 from "Other Uploads" to "File Uploads" in `app/bdo/projects/[id]/page.tsx`
- [x] 3.2 Import CombinedFilesSection component
- [x] 3.3 Replace BusinessFilesSection with CombinedFilesSection for case 8

## 4. Handle Loading and Fallback States
- [x] 4.1 Provide default empty instructions if Admin Settings not configured
- [x] 4.2 Handle error cases gracefully

## 5. Testing
- [ ] 5.1 Verify Step 8 now shows "File Uploads" title
- [ ] 5.2 Verify four sections display: Business Applicant, Individual Applicants, Other Businesses, Project Files
- [ ] 5.3 Verify instructions load from Admin Settings
- [ ] 5.4 Verify instructions display correctly for each section

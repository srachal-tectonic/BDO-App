# Change: Add File Upload Instructions Tab to Admin Settings

## Why

The File Upload Instructions functionality is fully implemented (Firestore service, schema, and TabsContent UI), but the tab is not visible in the Admin Settings page because the corresponding `TabsTrigger` is missing from the `TabsList`. Users cannot access or configure file upload instructions for the loan application sections.

## What Changes

- Add a `TabsTrigger` for "File Upload Instructions" to the Admin Settings TabsList
- Import appropriate icon (e.g., `FileUp` or `FileText`) from lucide-react
- Position the tab logically among the existing tabs (after "Note Tags" and before "Risk Assessment")

## Impact

- Affected code: `app/bdo/admin/page.tsx` (lines 728-757 TabsList)
- User impact: Admins will be able to access and configure file upload instructions for each upload section (Business Applicant, Individual Applicants, Other Businesses, Project Files)
- No breaking changes - the TabsContent already exists at line 1956
- No backend changes needed - Firestore service already supports `fileUploadInstructions`

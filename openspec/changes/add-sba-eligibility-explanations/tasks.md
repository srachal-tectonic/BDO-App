# Tasks: Add SBA Eligibility Explanation Fields

## 1. Update Data Schema
- [x] 1.1 Update `SBAEligibility` interface in `lib/schema.ts` to add explanation fields for each question (e.g., `convictedExplanation?: string`, `arrestedExplanation?: string`, etc.)

## 2. Update Application Store
- [x] 2.1 Update the default state in `lib/applicationStore.ts` to include the new explanation fields
- [x] 2.2 Ensure `updateSBAEligibility` action handles the explanation field updates

## 3. Update SBA Eligibility Component
- [x] 3.1 Add conditional text area component that appears when "Yes" is selected for a question
- [x] 3.2 Style the text area to match existing form field styling (Tailwind CSS classes)
- [x] 3.3 Wire up the text area onChange handler to update the store with explanation text
- [x] 3.4 Add appropriate placeholder text (e.g., "Please provide details about the circumstances...")
- [x] 3.5 Ensure text area is properly labeled for accessibility

## 4. Testing and Verification
- [ ] 4.1 Verify text areas appear/disappear correctly based on Yes/No selection
- [ ] 4.2 Verify explanation data persists when navigating between steps
- [ ] 4.3 Verify explanation data is saved to Firestore with the application
- [ ] 4.4 Verify BDO portal can view the explanations when reviewing applications

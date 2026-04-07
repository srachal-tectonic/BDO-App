# Change: Update Risk Assessment UI to Radio Buttons with Heat Map

## Why
The current Risk Assessment section uses dropdown selects for classification questions. The Replit reference implementation uses a more user-friendly design with:
- Radio buttons in card-style containers for easier scanning and selection
- A visual risk heat map with gradient bar and position indicator
- Better visual feedback for the resolved project type and risk level

## What Changes
- Replace dropdown selects with radio button groups in card-style containers
- Add visual risk heat map with gradient bar (green → amber → red)
- Update the computed result display to show project type with CheckCircle icon
- Add animated position indicator on the risk gradient bar
- Update classification state to use 'yes'/'no' string values instead of boolean

## Impact
- **Affected code:**
  - `components/loan-sections/RiskAssessmentSection.tsx` - Complete UI redesign
  - `lib/schema.ts` - Update RiskAssessmentAnswers to use string values ('yes'/'no')
- **No backend changes required** - Firestore structure remains the same
- **No admin page changes** - Rule configuration unchanged

## UI Changes Summary
1. Classification questions displayed in bordered cards with gray background
2. Radio buttons with Yes/No options side-by-side
3. CRE scope question conditionally shown when real estate = 'yes'
4. Computed result shows:
   - CheckCircle icon (green) with project type name
   - Risk level badge (Low/Medium/High)
   - Gradient heat map bar with animated position indicator
5. Warning state with AlertCircle when not all questions answered

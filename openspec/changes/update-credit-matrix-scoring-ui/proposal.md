# Change: Update Credit Matrix Scoring UI

## Why
The CreditMatrixScoring component needs to be updated to match the Replit version which has:
- Detailed score criteria definitions for each category (0-5 scale with specific requirements)
- Expandable/collapsible sections to show all score definitions
- Cleaner summary header with total score /27
- Score badge coloring based on risk level
- Better organized category cards with score buttons and criteria display

## What Changes
- Replace current simple category descriptions with detailed `matrixCategories` definitions
- Add expandable sections to view all score criteria for each category
- Update total score display to show /27 max (not /30)
- Add score badge color coding (green for 4-5, yellow for 3, orange for 2, red for 0-1)
- Show selected score's criteria description prominently
- Update explanation field styling (use textarea, TiptapBlock not available)
- Add N/A handling for scores that don't apply to certain categories

## Impact
- Affected specs: credit-matrix-ui (update)
- Affected code:
  - `components/CreditMatrixScoring.tsx` - complete UI overhaul
- No new dependencies required (TiptapBlock will be replaced with textarea)

## Notes
- The Replit version uses TiptapBlock for rich text explanations, but this component doesn't exist in the codebase. Will use standard textarea instead.
- Max score is 27 (not 30) because some categories cap at 4 or 3

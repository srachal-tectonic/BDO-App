# Change: Update PQ Memo Risk Scores Section

## Why
The PQ Memo's Risk Scores tab needs to be updated to use a new `CreditMatrixScoring` component that provides a cleaner interface for scoring loan applications across six key risk categories. The new design includes explanation fields for each score category and uses `pqMemo.creditScoring` and `pqMemo.scoreExplanations` data structures instead of the current `projectOverview.risk*` fields.

## What Changes
- Create new `CreditMatrixScoring` component that accepts:
  - `scores` - object with 6 category scores (repayment, management, equity, collateral, credit, liquidity)
  - `explanations` - object with explanation text for each category
  - `onScoreChange` - callback for score updates
  - `onExplanationChange` - callback for explanation updates
  - `disabled` - boolean to disable editing
- Update `PQMemoForm.tsx` Risk Scores tab to:
  - Add section header "Credit Matrix Scoring" with descriptive text
  - Use the new `CreditMatrixScoring` component
  - Wire up data from `data.pqMemo.creditScoring` and `data.pqMemo.scoreExplanations`
  - Connect `updatePQMemo` callback for state updates
- Add `updatePQMemo` function to handle pqMemo state updates

## Impact
- Affected specs: pq-memo-risk-scores (new capability)
- Affected code:
  - `components/PQMemoForm.tsx` - update Risk Scores tab content
  - `components/CreditMatrixScoring.tsx` - new component to create
  - May need to update application store for pqMemo persistence

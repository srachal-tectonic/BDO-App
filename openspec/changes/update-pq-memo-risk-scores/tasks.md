# Tasks: Update PQ Memo Risk Scores Section

## 1. Create CreditMatrixScoring Component
- [x] 1.1 Create `components/CreditMatrixScoring.tsx` with props interface
- [x] 1.2 Implement score buttons for each of the 6 risk categories (1-5 scale)
- [x] 1.3 Add explanation textarea field for each category
- [x] 1.4 Implement score selection with visual feedback (selected state styling)
- [x] 1.5 Display category labels and descriptions
- [x] 1.6 Calculate and display total score
- [x] 1.7 Support disabled state for read-only mode

## 2. Update PQMemoForm Risk Scores Tab
- [x] 2.1 Add section header "Credit Matrix Scoring" with blue underline
- [x] 2.2 Add descriptive paragraph explaining the scoring system
- [x] 2.3 Import and use CreditMatrixScoring component
- [x] 2.4 Wire up scores from `data.pqMemo.creditScoring`
- [x] 2.5 Wire up explanations from `data.pqMemo.scoreExplanations`
- [x] 2.6 Implement `onScoreChange` callback to update creditScoring
- [x] 2.7 Implement `onExplanationChange` callback to update scoreExplanations
- [x] 2.8 Add default empty values for scoreExplanations

## 3. Add updatePQMemo Function
- [x] 3.1 Create `updatePQMemo` function in PQMemoForm to handle state updates
- [x] 3.2 Support partial updates to pqMemo object

## 4. Testing and Validation
- [x] 4.1 Verify score selection updates correctly
- [x] 4.2 Verify explanation text saves correctly
- [x] 4.3 Verify total score calculation
- [x] 4.4 Verify disabled mode prevents editing

# Tasks: Update Credit Matrix Scoring UI

## 1. Update Category Definitions
- [x] 1.1 Replace simple category descriptions with detailed `matrixCategories` array
- [x] 1.2 Add score criteria text for each score level (0-5) per category
- [x] 1.3 Handle N/A scores for categories that don't use all score levels

## 2. Update Summary Header
- [x] 2.1 Change from gradient header to white bordered card
- [x] 2.2 Update total score display to show /27 max
- [x] 2.3 Display individual category scores inline

## 3. Add Expandable Score Criteria
- [x] 3.1 Add `expandedCategory` state to track which category is expanded
- [x] 3.2 Add toggle button with ChevronDown icon to expand/collapse
- [x] 3.3 Show all score criteria when expanded

## 4. Update Score Button UI
- [x] 4.1 Add score badge color coding based on risk level
- [x] 4.2 Show selected score's criteria description below buttons
- [x] 4.3 Support N/A display for unavailable scores

## 5. Update Category Card Layout
- [x] 5.1 White background with border styling
- [x] 5.2 Category label and score buttons in header row
- [x] 5.3 Selected criteria description prominently displayed
- [x] 5.4 Explanation textarea at bottom of each card

## 6. Testing and Validation
- [x] 6.1 Verify score selection highlights correct button
- [x] 6.2 Verify expand/collapse works correctly
- [x] 6.3 Verify total score calculates correctly (/27)
- [x] 6.4 Verify explanation changes persist

# PQ Memo Risk Scores Section

## MODIFIED Requirements

### Requirement: Risk Score Category Layout
Each risk score category MUST display only the category label, score buttons, "View all criteria" button, and Explanation textarea.

#### Scenario: User views a risk score category
Given the user is on the PQ Memo Risk Scores section
When the user views any risk score category
Then the category displays the category label
And the category displays score buttons (0-5)
And the category displays a "View all criteria" button with chevron icon
And the category displays an Explanation textarea
And no selected criteria description box is shown

### Requirement: N/A Score Buttons Disabled
Score buttons that represent "N/A" values MUST be disabled and not clickable.

#### Scenario: User attempts to click an N/A score button
Given the user is on the PQ Memo Risk Scores section
When the user views a category with N/A scores (e.g., Credit score 5, Liquidity scores 4 and 5)
Then the N/A score buttons display "-" instead of the number
And the N/A score buttons are visually disabled (grayed out)
And clicking the N/A score buttons has no effect

#### Scenario: User views non-N/A score buttons
Given the user is on the PQ Memo Risk Scores section
When the user views score buttons that are not N/A
Then the score buttons are clickable
And clicking a score button selects that score

### Requirement: Selected Score Color
All selected score buttons MUST display with a consistent blue color regardless of score value.

#### Scenario: User selects a low score (0-2)
Given the user is on the PQ Memo Risk Scores section
When the user selects a score of 0, 1, or 2
Then the selected score button displays with blue background (#2563eb)
And the selected score button displays with white text

#### Scenario: User selects a mid score (3)
Given the user is on the PQ Memo Risk Scores section
When the user selects a score of 3
Then the selected score button displays with blue background (#2563eb)
And the selected score button displays with white text

#### Scenario: User selects a high score (4-5)
Given the user is on the PQ Memo Risk Scores section
When the user selects a score of 4 or 5
Then the selected score button displays with blue background (#2563eb)
And the selected score button displays with white text

### Requirement: Expanded Criteria List Excludes N/A
The "View all criteria" expanded list MUST NOT display entries for N/A scores.

#### Scenario: User expands criteria for a category with N/A scores
Given the user is on the PQ Memo Risk Scores section
When the user clicks "View all criteria" for a category that has N/A scores (e.g., Credit, Liquidity)
Then only non-N/A score criteria are displayed in the expanded list
And N/A score entries are not shown

#### Scenario: User expands criteria for a category without N/A scores
Given the user is on the PQ Memo Risk Scores section
When the user clicks "View all criteria" for a category with no N/A scores (e.g., Repayment, Management)
Then all score criteria (0-5) are displayed in the expanded list

## REMOVED Requirements

### Requirement: Selected Criteria Description Display
The blue box showing the description of the currently selected score is removed.

#### Scenario: User selects any score
Given the user has selected a score for any category
When the user views the category
Then no description box is shown below the score buttons
And the user can click "View all criteria" to see all score descriptions

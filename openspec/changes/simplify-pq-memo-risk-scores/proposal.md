# Change: Simplify PQ Memo Risk Scores UI

## Why
The Risk Scores section in the PQ Memo currently displays the selected score's criteria description directly below the score buttons. This adds visual clutter and the information is already available via "View all criteria". Additionally:
- N/A scores (shown as "-") are currently clickable, which can lead to user confusion
- Selected scores use different colors (red, orange, green) based on score value, which can be visually distracting

## What Changes

### Change 1: Remove Selected Criteria Description
- Remove the blue box that shows the description of the currently selected score
- Users can still view all criteria by clicking "View all criteria"

### Change 2: Disable N/A Score Buttons
- Score buttons that represent "N/A" (shown as "-") should be disabled and not clickable
- This prevents users from accidentally selecting N/A scores

### Change 3: Standardize Selected Score Color to Blue
- Change all selected score button colors from the current color scheme (red/orange/green based on score value) to a consistent blue color
- This applies to both the score buttons and the score badges in the expanded criteria list

### Change 4: Remove N/A Criteria from Expanded List
- In the "View all criteria" expanded section, do not display criteria entries for N/A scores
- Only show criteria for scores that have actual descriptions (not "N/A")

## Impact
- **Affected code:**
  - `components/CreditMatrixScoring.tsx` - Main component for PQ Memo risk scores

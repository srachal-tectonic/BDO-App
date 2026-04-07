# Tasks

## UI Updates
- [x] Remove the selected criteria description box (blue box showing current score's description)
- [x] Disable N/A score buttons so they cannot be clicked (scores with "-" display)
- [x] Change selected score button color from dynamic (red/orange/green) to consistent blue (`#2563eb`)
- [x] Update expanded criteria list to use blue for selected score badges instead of dynamic colors
- [x] Remove N/A criteria entries from the "View all criteria" expanded list

## Cleanup
- [x] Remove `getScoreBadgeColor` function

## Validation
- [ ] Verify each category shows: label, score buttons (0-5), "View all criteria" button, and Explanation textarea
- [ ] Verify selected criteria description box is removed
- [ ] Verify N/A score buttons are disabled and show "-" but cannot be clicked
- [ ] Verify all selected scores display as blue regardless of score value
- [ ] Verify "View all criteria" works and shows only non-N/A score options
- [ ] Verify N/A criteria entries are not shown in expanded criteria list

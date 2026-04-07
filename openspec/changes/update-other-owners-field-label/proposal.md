# Change: Update "Other Owners" Field Label and Placeholder in Step 7

## Why
The current field label "Please describe the other owners" is vague. Updating it to "List the other owners of the business post-acquisition, including their ownership percentages." provides clearer guidance to users about what information is expected, specifically emphasizing the post-acquisition context and the need for ownership percentages.

## What Changes
- Update the label text from "Please describe the other owners" to "List the other owners of the business post-acquisition, including their ownership percentages."
- Update the placeholder text from "Describe who else will own part of the business and their ownership percentages..." to "List the other owners and their ownership percentages..."

## Impact
- **Primary file**: `components/loan-sections/SellerInfoSection.tsx`
- **Lines affected**: 230 (label), 235 (placeholder)
- **No breaking changes** - purely a UI text update

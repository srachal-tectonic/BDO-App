# Change: Update Project Information Layout

## Why
The current Project Information section has a vertical single-column layout that doesn't make efficient use of screen space. Grouping related fields side-by-side improves readability and reduces vertical scrolling.

## What Changes
- Place "Legal Name of Business Being Acquired" and "DBA Name of Business Being Acquired" fields side-by-side on the same row
- Place "Business Address" and "Business Website" fields side-by-side on the next row
- Place "Type of Acquisition" and "Are You Purchasing 100%?" radio button fields side-by-side
- Update field labels to clarify they refer to the business being acquired
- Remove the "Real Estate Purchase" section entirely

## Impact
- Affected specs: loan-application (Project Information step)
- Affected code:
  - `components/loan-sections/SellerInfoSection.tsx` - Layout changes
  - `lib/schema.ts` - Remove `realEstatePurchaseDescription` field (optional cleanup)

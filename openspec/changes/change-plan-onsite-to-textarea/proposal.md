# Change: Change Plan to be On-Site Field to Textarea

## Why
The "Plan to be On-Site" field currently uses a Yes/No dropdown, but users need to provide detailed explanations about how they plan to manage the distance to the business location. A textarea allows for more comprehensive responses.

## What Changes
Convert the "Plan to be On-Site" field from a dropdown select to a textarea input:

- **Current:** Dropdown with options "Yes" / "No"
- **New:** Textarea with placeholder "Please explain how you plan to manage the distance"

## Impact
- **Affected code:**
  - `components/loan-sections/IndividualApplicantsSection.tsx` - Change field type from select to textarea

## Field Specification

| Property | Value |
|----------|-------|
| Field Name | Plan to be On-Site |
| Field Type | textarea |
| Placeholder | Please explain how you plan to manage the distance |
| Rows | 3 |
| Data Field | `planToBeOnSite` (existing) |

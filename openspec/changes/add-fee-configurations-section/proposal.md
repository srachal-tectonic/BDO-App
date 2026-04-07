# Change: Add Fee Configurations Section to Admin Default Values Tab

## Why
Loan officers need to configure standard fee types (Good Faith Deposit, SBA Guarantee Fee, Packaging Fee, etc.) with default amounts and conditions. Currently, there is no centralized place to manage these fee configurations, requiring manual entry on each loan application.

## What Changes
- Add a new "Fee Configurations" section to the Default Values tab in Admin Settings
- Add a table displaying all configured fees with columns for name, amount, condition, description, and active status
- Add an "Add Fee Configuration" button that opens a modal form
- Modal form includes:
  - Fee Name dropdown (predefined fee types)
  - Amount input field
  - "Condition: Includes Real Estate?" dropdown (Yes/No)
  - Description text field
  - Active toggle switch (Yes/No)
- Store fee configurations in Firebase adminSettings document
- Support CRUD operations for fee configurations

## Impact
- Affected specs: `admin-settings` (new capability)
- Affected code:
  - `app/bdo/admin/page.tsx` - Main admin settings page
  - `services/firestore.ts` - May need new types for fee configurations
- Data model: New `feeConfigurations` array in `adminSettings/config` document

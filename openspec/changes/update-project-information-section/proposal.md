# Change: Update Project Information Section

## Why
The current Project Information (SellerInfoSection) component has limited fields and styling compared to the Replit application. The Replit version includes comprehensive business acquisition details, contract status tracking, and seller carry note fields that are essential for SBA loan processing.

## What Changes
- Add "Business Acquisition Details" section header with description
- Add DBA Name field
- Add Type of Acquisition (Stock vs Asset) radio buttons with learn more panel
- Add "Purchasing 100%?" question with conditional other owners textarea
- Add Purchase Contract Status dropdown
- Add Seller Carry Note question with conditional terms textarea
- Add LOI/Purchase Contract file upload section
- Add Real Estate Purchase description section
- Integrate LearnMorePanel component for contextual help
- Remove Primary Contact fields (name, phone, email) that aren't in Replit version
- Update schema with new SellerInfo fields

## Impact
- Affected specs: loan-application (Project Information step)
- Affected code:
  - `components/loan-sections/SellerInfoSection.tsx` - Major rewrite
  - `lib/schema.ts` - Add new SellerInfo fields
  - `lib/applicationStore.ts` - May need store updates for new fields

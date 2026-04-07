# Tasks: Update Project Information Section

## 1. Update Schema
- [x] 1.1 Add `dbaName` field to SellerInfo interface
- [x] 1.2 Add `acquisitionType` field (stock | asset)
- [x] 1.3 Add `isPurchasing100Percent` field (yes | no)
- [x] 1.4 Add `otherOwnersDescription` field
- [x] 1.5 Add `contractStatus` field
- [x] 1.6 Add `hasSellerCarryNote` field (yes | no)
- [x] 1.7 Add `sellerCarryNoteTerms` field
- [x] 1.8 Add `realEstatePurchaseDescription` field

## 2. Update SellerInfoSection Component
- [x] 2.1 Add LearnMorePanel state management
- [x] 2.2 Add "Business Acquisition Details" section header with description
- [x] 2.3 Update Legal Business Name field styling
- [x] 2.4 Add DBA Name field
- [x] 2.5 Add Type of Acquisition radio buttons (Stock/Asset)
- [x] 2.6 Add learn more button and content for acquisition type
- [x] 2.7 Add "Purchasing 100%?" radio buttons
- [x] 2.8 Add conditional "Other Owners" textarea
- [x] 2.9 Add Purchase Contract Status dropdown
- [x] 2.10 Add "Seller Carry Note" radio buttons
- [x] 2.11 Add conditional "Seller Carry Note Terms" textarea
- [x] 2.12 Keep Business Address field
- [x] 2.13 Keep Website field
- [x] 2.14 Remove Primary Contact Name field
- [x] 2.15 Remove Primary Contact Phone field
- [x] 2.16 Remove Primary Contact Email field
- [x] 2.17 Keep Business Description with AI generation

## 3. Add File Upload Sections
- [x] 3.1 Add LOI/Purchase Contract file upload section
- [x] 3.2 Keep Business Federal Tax Returns upload
- [x] 3.3 Update Other Files upload section

## 4. Add Real Estate Purchase Section
- [x] 4.1 Add Real Estate Purchase description textarea

## 5. Integrate LearnMorePanel
- [x] 5.1 Import LearnMorePanel component
- [x] 5.2 Add learn more content for Type of Acquisition
- [x] 5.3 Add HelpCircle icons for learn more triggers

## Notes
- Adapt Replit styling patterns to existing component conventions
- Ensure all new fields save to Firestore via updateSellerInfo
- Preserve existing auto-save behavior
- Use existing FileUploadWithYearTags component for file uploads

# Tasks: Update Project Information Layout

## 1. Update Field Labels
- [x] 1.1 Update "Legal Business Name" label to "Legal Name of Business Being Acquired"
- [x] 1.2 Update "DBA Name (if different)" label to "DBA Name of Business Being Acquired"

## 2. Create Two-Column Layout for Business Info
- [x] 2.1 Wrap Legal Name and DBA Name fields in a responsive grid (2 columns on md+)
- [x] 2.2 Wrap Business Address and Business Website fields in a responsive grid (2 columns on md+)

## 3. Create Two-Column Layout for Radio Fields
- [x] 3.1 Wrap "Type of Acquisition" and "Are You Purchasing 100%?" in a responsive grid (2 columns on md+)
- [x] 3.2 Ensure conditional "Other Owners" textarea spans full width when visible

## 4. Remove Real Estate Purchase Section
- [x] 4.1 Remove Real Estate Purchase section from SellerInfoSection component
- [x] 4.2 Remove realEstatePurchaseDescription from sellerInfo defaults

## Notes
- Use `grid grid-cols-1 md:grid-cols-2 gap-4` pattern for responsive two-column layouts
- Ensure mobile responsiveness (single column on small screens)
- Keep existing styling and functionality for individual fields

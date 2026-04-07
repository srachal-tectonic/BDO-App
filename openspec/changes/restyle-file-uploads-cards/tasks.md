# Tasks: Restyle File Uploads Section with Card Layout

## 1. Update Section Container Styling
- [x] 1.1 Wrap each section in a card container with `bg-white border border-[#e5e7eb] rounded-lg p-6`
- [x] 1.2 Update section headers to use gray bottom border instead of blue underline
- [x] 1.3 Adjust spacing between sections (margin between cards)

## 2. Add Required Uploads Subsection for Business Applicant
- [x] 2.1 Add "Required Uploads" heading with appropriate styling
- [x] 2.2 Pull business entity name from application store
- [x] 2.3 Display "Please upload the following documents for **[Business Name]**:" with dynamic name
- [x] 2.4 Add bullet list with required documents (Tax Returns, Income Statement/Balance Sheet, AP/AR Reports, Debt Schedule)
- [x] 2.5 Handle case where business name is not available (show generic text)

## 3. Add Required Uploads Subsection for Individual Applicants
- [x] 3.1 Add "Required Uploads" heading for Individual Applicants section
- [x] 3.2 Add bullet list with required documents (Tax Returns, Financial Statement, Income/Expense Analysis)

## 4. Remove File Removal Capability
- [x] 4.1 Remove the `handleRemoveFile` function calls from file list rendering
- [x] 4.2 Remove the X button from the file item component
- [x] 4.3 Remove the `handleRemoveFile` function (cleanup unused code)

## 5. Simplify File Display
- [x] 5.1 Update `renderFileList` to show only filename
- [x] 5.2 Remove file type badge display
- [x] 5.3 Remove SharePoint badge display
- [x] 5.4 Remove year badges display
- [x] 5.5 Remove applicant name display from file items
- [x] 5.6 Ensure files are not clickable/downloadable

## 6. Testing and Verification
- [ ] 6.1 Verify card styling appears correctly for all four sections
- [ ] 6.2 Verify business name displays dynamically in Business Applicant section
- [ ] 6.3 Verify required uploads lists are correct for each section
- [ ] 6.4 Verify X button is not present on uploaded files
- [ ] 6.5 Verify files display only filename without badges

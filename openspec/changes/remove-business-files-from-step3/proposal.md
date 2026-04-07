# Change: Remove Business Files Section from Step 3

## Why
Step 3 "Business Applicant" currently includes both the business applicant form and a Business Files upload section. With the consolidated File Uploads section now available in Step 8, the Business Files section in Step 3 is redundant and should be removed to simplify the workflow and avoid confusion about where to upload business documents.

## What Changes
- Remove the Business Files section from Step 3 "Business Applicant"
- Step 3 will only contain the BusinessApplicantSection component
- Business file uploads will be handled exclusively in Step 8 "File Uploads"

## Impact
- Affected specs: bdo-project-page
- Affected code:
  - `app/bdo/projects/[id]/page.tsx` - Remove BusinessFilesSection from case 3

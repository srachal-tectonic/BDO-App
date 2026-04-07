# Change: Add Dynamic File Upload Instructions from Admin Settings

## Why
The File Uploads section (Step 7) currently has hardcoded instructions for each upload category. Administrators need the ability to customize these instructions without code changes. The Admin Settings already has a "File Upload Instructions" tab where admins can configure instructions for each section.

## What Changes
- Fetch file upload instructions from Admin Settings (Firestore `adminSettings/config` document)
- Display the configured instructions under each file upload section:
  - Business Applicant
  - Individual Applicants
  - Other Businesses
  - Project Files
- Replace hardcoded instruction text with dynamic content from Admin Settings
- Fall back to default instructions if Admin Settings are not configured

## Impact
- Affected specs: file-uploads
- Affected code:
  - `components/loan-sections/CombinedFilesSection.tsx` - Fetch and display dynamic instructions
  - `services/firestore.ts` - May need helper function to fetch file upload instructions

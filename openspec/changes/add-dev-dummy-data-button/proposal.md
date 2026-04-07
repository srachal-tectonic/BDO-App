# Change: Add Dev-Only Dummy Data Button

## Why
During development and testing, BDOs need to quickly populate loan applications with sample data to test features like Zoho Sheets generation, document uploads, and form validation without manually entering data each time.

## What Changes
- Add a "Fill with Dummy Data" button that only appears in development environment (localhost)
- Create a dummy data generator with realistic sample loan application data
- Button populates all form sections (Project Overview, Funding Structure, Business Applicant, Individual Applicants, etc.)

## Impact
- Affected specs: None (dev-only feature)
- Affected code:
  - `app/bdo/projects/[id]/page.tsx` - Add button to UI
  - `lib/dummyData.ts` (new) - Dummy data generator
  - Uses existing Zustand store actions to populate data

# Change: Fix PDF Template Path for Deployed Environment

## Why
The PDF download endpoint returns a 404 error "PDF template file not found" because the `/pdfs` folder is not accessible in the deployed environment. The `process.cwd()` path resolution works in development but fails in production because:
1. The `/pdfs` folder is not included in the Next.js build output
2. Firebase/Cloud hosting doesn't have access to files outside the deployment bundle

## What Changes
- Move PDF templates from `/pdfs` to `/public/pdfs` folder
- Update the download endpoint to read from the `public` directory
- The `public` folder is automatically included in Next.js deployments and accessible at runtime

## Impact
- Affected specs: `borrower-forms-api` (modify existing)
- Affected code:
  - `app/api/generated-forms/[id]/download/route.ts` - Update path resolution
- File system change:
  - Move `/pdfs/*.pdf` to `/public/pdfs/*.pdf`
- No breaking changes - same API contract

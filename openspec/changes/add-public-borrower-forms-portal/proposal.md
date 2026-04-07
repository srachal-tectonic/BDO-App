# Change: Add Public Borrower Forms Portal with Magic Link

## Why
Currently, when BDOs generate fillable PDF forms for borrowers, the portal link points to a non-functional route that redirects to the BDO projects page. Borrowers need a working public URL where they can download the pre-filled PDF forms and upload their completed documents without requiring authentication. This streamlines the document collection process and reduces friction for borrowers.

## What Changes
- Create a public `/forms/[token]` route accessible without authentication
- Generate secure magic tokens when forms are generated (instead of using raw projectId)
- Provide a page where borrowers can:
  - View project/loan information (borrower name, project name)
  - Download the 5 generated fillable PDF forms
  - Upload completed/signed documents
- Implement one-way upload: borrowers cannot download or retrieve previously uploaded files
- Store upload tokens and metadata in Firestore for tracking
- Update BorrowerFormsSection to use the new magic link URL format
- Add form download tracking (mark when borrower downloads each form)
- Add upload status tracking in the BDO admin view

## Impact
- Affected specs: `borrower-forms-portal` (new capability)
- Affected code:
  - `app/forms/[token]/page.tsx` - New public forms portal page
  - `app/api/forms/[token]/route.ts` - API to validate token and get forms data
  - `app/api/forms/[token]/download/[formId]/route.ts` - API to download individual forms (marks as downloaded)
  - `app/api/forms/[token]/upload/route.ts` - API to upload completed documents
  - `components/loan-sections/BorrowerFormsSection.tsx` - Update portal link generation
  - `services/firestore.ts` - Add token generation and storage functions
- Data model changes:
  - Add `portalToken` field to project's generated forms metadata
  - Add `borrowerUploads` subcollection for tracking uploaded documents
  - Add `downloadedAt` timestamp tracking per form

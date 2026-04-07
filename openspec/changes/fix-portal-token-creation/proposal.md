# Change: Fix Portal Token Creation Error

## Why
When BDOs attempt to generate a Borrower Portal link, the system returns `{"error":"Failed to create portal token"}`. This prevents borrowers from accessing the portal to upload documents. The error was not occurring previously, indicating a regression or configuration issue.

## Root Cause Analysis
After investigation, the following issues were identified in `/app/api/projects/[id]/portal-token/route.ts`:

1. **No Authentication Check**: Unlike other similar endpoints (e.g., `/api/broker/tokens`), the portal-token endpoint does not verify the user's authentication. This could cause issues if the Firebase Admin SDK expects authenticated context.

2. **Generic Error Handling**: The catch block (line 151-154) swallows all errors and returns a generic message without logging the actual error details, making debugging impossible.

3. **Missing CSRF Protection**: The endpoint lacks CSRF protection that other protected endpoints use.

4. **Potential Timestamp Issue**: The endpoint uses `Timestamp.fromDate()` which was recently added to exports. If the import fails silently, it could cause the write to fail.

5. **Non-Atomic Two-Step Write**: The endpoint performs two separate Firestore operations (create token, update project) without using a transaction, which could leave data in an inconsistent state if one fails.

## What Changes
- Add detailed error logging to capture the actual failure reason
- Add authentication check using `verifyAuth` (matching broker/tokens pattern)
- Add CSRF protection using `checkCsrf`
- Use Firestore batch/transaction for atomic writes
- Add validation for Firebase Admin SDK initialization
- Return more descriptive error messages in development mode
- Add fallback for Timestamp creation if import issues occur

## Impact
- Affected specs: `borrower-portal` (existing capability)
- Affected code:
  - `app/api/projects/[id]/portal-token/route.ts` - Main fix
  - Potentially `lib/firebaseAdmin.ts` - Verify exports
- No data model changes
- No breaking changes to API contract (same request/response format)

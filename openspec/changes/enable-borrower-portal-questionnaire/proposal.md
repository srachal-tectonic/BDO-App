# Change: Enable Borrower Portal Questionnaire Route

## Why

Clicking "Open Business Questionnaire" from the loan application (Step 9) navigates to `/bdo/borrower-portal/{projectId}/questionnaire`, but this route was intentionally disabled with a hard redirect to `/bdo/projects`. The page loads briefly then immediately redirects back, preventing users from accessing the standalone questionnaire functionality.

## What Changes

- Remove the redirect in `app/bdo/borrower-portal/[id]/questionnaire/page.tsx`
- Restore the original questionnaire implementation (currently commented out at lines 10-851)
- Re-enable full questionnaire functionality including:
  - Rich text editing with TipTap editor
  - AI-powered content generation
  - PDF export capability
  - Auto-save functionality
  - Questionnaire rules and templates management

## Impact

- Affected code: `app/bdo/borrower-portal/[id]/questionnaire/page.tsx`
- User impact: Users will be able to access the standalone Business Questionnaire page from the "Open Business Questionnaire" button
- No breaking changes - restores previously existing functionality

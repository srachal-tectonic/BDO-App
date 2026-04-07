# Change: Fix Steps Sidebar Height Overflow

## Why
The Application Steps sidebar in the BDO project page extends far past the last step when viewing certain sections (e.g., Step 8 "File Uploads" and Step 10 "All Data"). The sidebar should maintain a consistent height that ends after the last step, regardless of the main content height.

## What Changes
- Add CSS constraints to the sidebar Card to prevent it from stretching to match the main content height
- Use `self-start` alignment and/or `h-fit` to ensure the sidebar only takes the height it needs
- Optionally add `sticky` positioning so the sidebar remains visible while scrolling long content

## Impact
- Affected specs: bdo-project-page
- Affected code:
  - `app/bdo/projects/[id]/page.tsx` - Add height constraints to sidebar Card

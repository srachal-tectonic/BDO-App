# Change: Redesign Individual Applicants Section

## Why
The current Individual Applicants section uses expandable accordion cards with all form fields inline. The Replit version introduces a cleaner two-part layout: an ownership summary table at the top for quick data entry, followed by owner cards that show completion status and provide quick actions (send/copy borrower portal links). Detailed editing is moved to a separate detail page, reducing visual clutter.

## What Changes
- Add an "Ownership of Applicant" table at the top showing all owners with Name, Title, Ownership %, and Gender columns
- Replace expandable accordion cards with compact owner cards showing completion status
- Add borrower portal link functionality (send via email, copy to clipboard)
- Remove inline detailed form fields (moved to separate detail page)
- Add `projectId` prop to component for generating portal links
- Add `gender` field to IndividualApplicant type

## Impact
- Affected specs: `individual-applicants-ui` (new capability spec)
- Affected code:
  - `components/loan-sections/IndividualApplicantsSection.tsx` - Complete redesign
  - `lib/schema.ts` - Add `gender` field to IndividualApplicant
  - `app/bdo/projects/[id]/page.tsx` - Pass `projectId` prop to component

## Code Adaptations Required
The Replit code uses patterns that need adaptation for Next.js:

| Replit Pattern | Next.js Adaptation |
|----------------|-------------------|
| `useLocation` from wouter | `useRouter` from next/navigation |
| `setLocation('/path')` | `router.push('/path')` |
| `@shared/schema` import | `@/lib/schema` import |
| `@/hooks/use-toast` | Already exists in codebase |

## New UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Individual Applicant Information                            │
├─────────────────────────────────────────────────────────────┤
│ [Collapsible] About This Section                            │
│   Description text + "Learn More About Indirect Ownership"  │
├─────────────────────────────────────────────────────────────┤
│ Ownership of Applicant                                      │
│ ┌───────────────┬────────┬───────────┬────────┐            │
│ │ Owner Name    │ Title  │ Ownership │ Gender │            │
│ ├───────────────┼────────┼───────────┼────────┤            │
│ │ John Smith    │ Owner  │ 60%       │ Male   │            │
│ │ Jane Doe      │ Partner│ 40%       │ Female │            │
│ │ Click to add..│        │           │        │            │
│ ├───────────────┼────────┼───────────┼────────┤            │
│ │               │        │ 100%      │        │ (Total)    │
│ └───────────────┴────────┴───────────┴────────┘            │
├─────────────────────────────────────────────────────────────┤
│ Individual Owner Details                                    │
│ ┌─────────────────────────┐ ┌─────────────────────────┐    │
│ │ [Avatar] John Smith   > │ │ [Avatar] Jane Doe     > │    │
│ │ Owner • 60% ownership   │ │ Partner • 40% ownership │    │
│ │ ████████░░ 80%          │ │ ██████████ 100%         │    │
│ │ ⚠ Needs attention       │ │ ✓ Complete              │    │
│ ├─────────────────────────┤ ├─────────────────────────┤    │
│ │ [Send Link] [Copy] [Del]│ │ [Send Link] [Copy] [Del]│    │
│ └─────────────────────────┘ └─────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Owner Card Actions
- **Click card**: Opens detail page for full editing
- **Send Link**: Opens mailto with pre-filled borrower portal link
- **Copy Link**: Copies borrower portal URL to clipboard
- **Remove**: Deletes the applicant (only shown if >1 applicants)

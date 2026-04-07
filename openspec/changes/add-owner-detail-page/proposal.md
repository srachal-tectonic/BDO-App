# Change: Add Owner Detail Page

## Why
The redesigned Individual Applicants section now shows compact owner cards instead of inline forms. Users need a dedicated detail page to view and edit complete information for each individual applicant. This page provides a comprehensive form for Personal Information, Project & Business Involvement, and Personal Financials.

## What Changes
- Create new page at `app/bdo/projects/[id]/individual/[applicantId]/page.tsx`
- Add new schema fields for enhanced applicant data
- Create CurrencyInput component for formatted money inputs
- Adapt Replit code to Next.js patterns and existing codebase

## Issues Identified in Replit Code

### Routing Adaptations
| Replit Pattern | Next.js Adaptation |
|----------------|-------------------|
| `useLocation` from wouter | `useRouter` from next/navigation |
| `useParams` from wouter | `useParams` from next/navigation |
| `setLocation('/path')` | `router.push('/path')` |

### Data Fetching Adaptations
| Replit Pattern | Next.js Adaptation |
|----------------|-------------------|
| `@tanstack/react-query` | `useState`/`useEffect` with existing Firestore services |
| `apiRequest('PUT', ...)` | `saveLoanApplication()` from firestore service |
| `useQuery` / `useMutation` | Direct service calls with loading/error states |

### Import Adaptations
| Replit Import | Codebase Import |
|---------------|-----------------|
| `@shared/schema` | `@/lib/schema` |
| `Header` component | Simplified inline header or BDOLayout |
| `BorrowerPortalStepper` | Remove (not needed for BDO view) |
| `getActiveBorrowerSections` | Remove (not needed for BDO view) |

### Schema Field Mismatches
| Replit Field | Current Schema | Action |
|--------------|----------------|--------|
| `estimatedCreditScore` | `creditScore` | Add new field |
| `creditScoreExplanation` | (missing) | Add new field |
| `travelTimeToBusiness` | `travelTime` | Use existing |
| `planToBeOnSite` | (missing) | Add new field |

### Security Considerations
1. **Authentication**: Add Firebase auth check to verify user has access to project
2. **Input Validation**: Sanitize inputs before saving to Firestore
3. **Auto-save Cleanup**: Ensure timeout is cleared on unmount to prevent memory leaks
4. **SSN Handling**: Already uses PasswordToggle component for masking

### Components to Create
1. **CurrencyInput** - Formatted currency input with $ prefix

### Components Available (No Changes Needed)
- `AddressInput` - Already exists at `components/loan-sections/AddressInput.tsx`
- `PasswordToggle` - Already exists at `components/loan-sections/PasswordToggle.tsx`
- `LearnMorePanel` - Already exists at `components/LearnMorePanel.tsx`
- `Select` components - Already exist at `components/ui/select.tsx`

## Impact
- Affected specs: `owner-detail-page` (new capability spec)
- Affected code:
  - `app/bdo/projects/[id]/individual/[applicantId]/page.tsx` (new)
  - `components/ui/currency-input.tsx` (new)
  - `lib/schema.ts` - Add new fields to IndividualApplicant

## Page Structure
```
┌─────────────────────────────────────────────────────────────┐
│ ← Back to Individual Applicants          [Send Link] [Copy] │
│ Individual Applicants › Owner Name                          │
│ Owner Name (h1)                                             │
├─────────────────────────────────────────────────────────────┤
│ Personal Information                                        │
│ ──────────────────────────────────────────────             │
│ [First Name] [Last Name] [SSN] [Credit Score]              │
│ [Credit Score Explanation - conditional]                    │
│ [Phone] [Email] [Home Address]                             │
├─────────────────────────────────────────────────────────────┤
│ Project & Business Involvement                              │
│ ──────────────────────────────────────────────             │
│ [Project Role] [Ownership %] [Ownership Type]              │
│ [Indirect Ownership Description - conditional]              │
│ [Business Role] [Travel Time] [Experience] [Years]          │
│ [Business Role Description - conditional]                   │
│ [Plan to be On-Site - conditional]                         │
├─────────────────────────────────────────────────────────────┤
│ Personal Financials                                         │
│ ──────────────────────────────────────────────             │
│ [Net Worth] [Post-Close Liquidity] [Req Draw] [Equity Inj] │
├─────────────────────────────────────────────────────────────┤
│ [← Done - Back to All Owners]                              │
└─────────────────────────────────────────────────────────────┘
```

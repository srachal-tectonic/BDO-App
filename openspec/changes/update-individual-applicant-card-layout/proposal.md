# Change: Update Individual Applicant Card Layout

## Why
The Individual Applicant cards need to be reorganized to improve data collection flow and align field groupings with SBA requirements. The current layout has fields scattered across sections and includes a "Personal Financials" section that is no longer needed. Additionally, the Credit Score field should use predefined ranges instead of free-form numeric input.

## What Changes
Reorganize each Individual Applicant card into exactly two sections with specific fields:

### Section 1: Personal Information
- First Name
- Middle Name *(new field)*
- Last Name
- Suffix *(new field)*
- Social Security Number
- Date of Birth *(exists in schema, add to UI)*
- Phone
- Email
- Home Address
- Estimated Credit Score *(change from numeric input to dropdown)*
  - Options: 750+, 700-749, 650-699, 600-649, Below 600

### Section 2: Project & Business Involvement
- Project Role
- Ownership %
- Ownership Type
- Title *(exists in schema, add to UI)*
- Indirect Ownership Description *(exists in schema, add to UI)*
- Role in Business Operations
- Travel Time to Business
- Relevant Experience
- Years of Experience
- Describe your role in the business and how your experience qualifies you for it. *(new textarea field)*
- Plan to be On-Site *(exists in schema, add to UI)*

### Removed
- Personal Financials section (Net Worth, Post-Close Liquidity, Required Income from Business, Equity Injection Amount)

## Impact
- **Affected code:**
  - `components/loan-sections/IndividualApplicantsSection.tsx` - Reorganize form fields and sections
  - `lib/schema.ts` - Add `middleName` and `suffix` fields to IndividualApplicant type
  - `lib/applicationStore.ts` - Update default applicant creation to include new fields

## Schema Changes

```typescript
// Add to IndividualApplicant interface in lib/schema.ts
middleName?: string;
suffix?: string;
```

## UI Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ ▼ John Smith                                        [Delete Button] │
├─────────────────────────────────────────────────────────────────────┤
│ ══ Personal Information ════════════════════════════════════════════│
│                                                                     │
│ [First Name] [Middle Name] [Last Name] [Suffix]                     │
│ [SSN       ] [Date of Birth] [Phone    ] [Email]                    │
│ [Home Address                                    ]                  │
│ [Estimated Credit Score ▼]                                          │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│ ══ Project & Business Involvement ══════════════════════════════════│
│                                                                     │
│ [Project Role ▼] [Ownership %] [Ownership Type ▼]                   │
│ [Title         ] [Indirect Ownership Description                  ] │
│ [Role in Business Ops ▼] [Travel Time ▼]                            │
│ [Relevant Experience ▼] [Years of Experience ▼]                     │
│ [Describe your role in the business... (textarea)                 ] │
│ [Plan to be On-Site ▼]                                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Credit Score Dropdown Options

| Option | Display Value |
|--------|---------------|
| 750+   | 750+          |
| 700-749| 700-749       |
| 650-699| 650-699       |
| 600-649| 600-649       |
| Below 600 | Below 600  |

## Context
BDOs need to classify loan projects by type and risk level during the application process. Currently, risk assessment is manual and inconsistent. This change introduces admin-configurable rules that automatically determine project type and risk level based on BDO answers to classification questions.

The feature spans:
- Admin Settings page (new tab for rule management)
- Loan Application Step 1 (new section for classification questions)
- Firestore data model (new rule storage and computed fields)

## Goals / Non-Goals

**Goals:**
- Enable admins to define project type classification rules
- Provide BDOs with clear classification questions in the loan application
- Automatically compute and display project type/risk level based on answers
- Support fallback rules for unmatched scenarios

**Non-Goals:**
- Integration with PQ Memo risk scoring (future work)
- Complex conditional logic (AND/OR rule combinations)
- Rule version history or audit trail
- API-based rule evaluation for external systems

## Decisions

### Decision: Store rules in `adminSettings/config` document
**Rationale:** Follows existing pattern for questionnaireRules and aiBlockTemplates. Single document read on admin page load. Rules array is small enough that document size limits won't be an issue.

**Alternatives considered:**
- Separate `projectTypeRules` collection: More complex querying, unnecessary for small rule set
- Hardcoded rules: No admin flexibility

### Decision: Use tristate conditions (true/false/any)
**Rationale:** "Any" allows rules to match regardless of a condition, enabling flexible rule definitions. A rule with `isStartup: 'any'` matches both startups and non-startups.

**Alternatives considered:**
- Boolean only: Less flexible, would require duplicate rules
- Numeric scoring: Over-engineered for classification use case

### Decision: First-match rule evaluation order
**Rationale:** Simple, predictable behavior. Admins can order rules by specificity (most specific first, fallback last).

**Alternatives considered:**
- Weighted scoring: More complex, harder to understand
- All-match aggregation: Confusing when multiple rules match

### Decision: Classification questions in Step 1 above Project Summary
**Rationale:** Risk classification informs the entire application process. Early placement ensures BDOs answer before detailed data entry.

## Data Model

```typescript
interface ProjectTypeRule {
  id: string;
  name: string;
  description?: string;
  riskLevel: 'low' | 'medium' | 'high';
  isFallback: boolean;
  order: number;
  // Conditions - tristate: true | false | 'any'
  isStartup: boolean | 'any';
  hasExistingCashflow: boolean | 'any';
  hasTransitionRisk: boolean | 'any';
  includesRealEstate: boolean | 'any';
  creScope: 'purchase' | 'improvement' | 'any';
  isPartnerBuyout: boolean | 'any';
  involvesConstruction: boolean | 'any';
}
```

## UI Components

### Admin Tab Structure
```
Risk Assessment Rules
├── Header with "Add Project Type" button
├── Rule list (ordered, draggable future enhancement)
│   └── Rule card
│       ├── Order number, name, risk badge
│       ├── Description (if present)
│       ├── Condition badges (only non-"any" conditions shown)
│       └── Edit/Delete buttons
└── Empty state when no rules
```

### Rule Modal Fields
1. Rule Name (required)
2. Description (optional)
3. Risk Level radio: Low / Medium / High
4. Is Fallback toggle
5. Classification Conditions (each with Yes/No/Any selector):
   - Is this a startup business?
   - Does the business have existing cashflow?
   - Is there transition risk?
   - Does the project include real estate?
   - CRE Scope (if real estate): Purchase / Improvement / Any
   - Is this a partner buyout?
   - Does this involve construction?

### Loan Application Section
```
Risk Assessment (CollapsibleSection)
├── Classification Questions
│   ├── Is this a startup? [Yes/No]
│   ├── Existing cashflow? [Yes/No]
│   ├── Transition risk? [Yes/No]
│   ├── Includes real estate? [Yes/No]
│   │   └── (if yes) CRE Scope: [Purchase/Improvement]
│   ├── Partner buyout? [Yes/No]
│   └── Involves construction? [Yes/No]
└── Computed Result
    ├── Project Type: [rule name]
    └── Risk Level: [Low/Medium/High badge]
```

## Risks / Trade-offs

**Risk:** Rule order matters but UI doesn't make this obvious
**Mitigation:** Display order numbers, add visual hints. Future: drag-to-reorder

**Risk:** Fallback rule not configured leads to "no match" scenarios
**Mitigation:** UI warning when no fallback rule exists. Default "Unknown" display.

**Trade-off:** Tristate adds complexity vs. flexibility
**Accepted:** Flexibility is worth the UI complexity. Use clear "Any" labels.

## Migration Plan

1. Deploy admin tab first (no user impact)
2. Admins configure initial rules
3. Deploy loan application section
4. Existing applications show "Not Classified" until re-saved with answers

**Rollback:** Remove UI components. Data in Firestore is inert without UI.

## Open Questions

1. Should computed risk level affect PQ Memo risk scores? (Deferred to follow-up)
2. Should rule changes trigger re-evaluation of existing applications? (No for v1)
3. Need audit log for rule changes? (Not for v1)

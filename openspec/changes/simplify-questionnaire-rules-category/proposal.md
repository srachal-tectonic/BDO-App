# Simplify Questionnaire Rules with Main Category Dropdown

**Change ID:** `simplify-questionnaire-rules-category`
**Status:** Completed
**Author:** Claude
**Date:** 2026-01-07

## Summary

Replace the complex "Conditions" builder in Questionnaire Rules with a simple "Main Category" dropdown. Instead of configuring field/operator/value conditions, administrators will select a single category that the rule belongs to.

## Motivation

The current conditions system with multiple field/operator/value combinations is complex and may not align with how questionnaire rules are actually used. A simpler category-based approach will:
- Reduce configuration complexity
- Make rule organization more intuitive
- Simplify the rule matching logic

## Current Implementation

### RuleCondition Interface
```typescript
interface RuleCondition {
  field: 'primaryProjectPurpose' | 'industry' | 'naicsCode' | 'sourcesUses';
  operator: 'equals' | 'contains' | 'greaterThan';
  value: string;
}
```

### QuestionnaireRule Interface
```typescript
interface QuestionnaireRule {
  id: string;
  name: string;
  enabled: boolean;
  order: number;
  blockType: 'question' | 'ai-generated';
  conditions: RuleCondition[];  // Array of complex conditions
  questionText?: string;
  aiBlockTemplateId?: string;
}
```

## Proposed Implementation

### New QuestionnaireRule Interface
```typescript
interface QuestionnaireRule {
  id: string;
  name: string;
  enabled: boolean;
  order: number;
  blockType: 'question' | 'ai-generated';
  mainCategory: 'Business Overview' | 'Project Purpose' | 'Industry';  // Simple dropdown
  questionText?: string;
  aiBlockTemplateId?: string;
}
```

## UI Changes

### Before (Conditions Section)
- Multiple condition rows with 3 dropdowns/inputs each:
  - Field dropdown (Primary Project Purpose, Industry, NAICS Code, Sources & Uses)
  - Operator dropdown (Equals, Contains, Greater Than)
  - Value text input
- "Add Condition" button to add more conditions
- Remove button per condition

### After (Main Category Dropdown)
- Single "Main Category" dropdown with options:
  - Business Overview
  - Project Purpose
  - Industry

## Impact

### Files to Modify
| File | Change |
|------|--------|
| `app/bdo/admin/page.tsx` | Replace conditions UI with mainCategory dropdown, update interfaces and handlers |

### Data Migration
- The `conditions` field will be replaced by `mainCategory`
- Existing rules in Firestore will need the new field added
- The `RuleCondition` interface can be removed

## Acceptance Criteria

1. The "Conditions" section is removed from the rule modal
2. A new "Main Category" dropdown is displayed with options: "Business Overview", "Project Purpose", "Industry"
3. The dropdown is required when creating/editing a rule
4. The table displays "Main Category" instead of "Conditions" count
5. Existing rule validation logic is updated to require mainCategory instead of conditions
6. TypeScript compiles without errors

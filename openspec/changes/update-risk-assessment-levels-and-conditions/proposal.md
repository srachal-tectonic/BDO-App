# Change: Expand risk levels, add debt refinance conditions, rename Order to Priority

## Why
The current risk assessment system only supports 3 risk levels (Low, Medium, High), which is too coarse for accurate project classification. We need 6 granular levels with distinct colors. Additionally, two new classification conditions ("Includes Debt Refinance?" and "Debt Refinance Primary?") are needed to differentiate refinance-heavy projects. Finally, the "Order" field should be renamed to "Priority" with clearer semantics: lower number = higher priority, so that when multiple rules have similar criteria the highest-priority (lowest number) rule matches first.

## What Changes

### 1. Expand Risk Levels from 3 to 6
Current: `'low' | 'medium' | 'high'`
New: `'low' | 'low-medium' | 'medium' | 'medium-high' | 'high' | 'very-high'`

Color mapping:
| Level | Label | Color |
|-------|-------|-------|
| `low` | Low | Green (`#22c55e`) |
| `low-medium` | Low-Medium | Olive (`#84cc16` / lime-600) |
| `medium` | Medium | Yellow (`#eab308` / yellow-500) |
| `medium-high` | Medium-High | Orange (`#f97316` / orange-500) |
| `high` | High | Red (`#ef4444`) |
| `very-high` | Very High | Dark Red (`#991b1b` / red-800) |

Affected everywhere risk levels are displayed:
- Admin page: rule list badges, form radio group (`app/bdo/admin/page.tsx`)
- BDO section: result badge, heat map gradient and indicator (`components/loan-sections/RiskAssessmentSection.tsx`)
- Schema type definition (`lib/schema.ts`)

### 2. Add Two New Classification Conditions
- **Includes Debt Refinance?** — TriState dropdown (Any / Yes / No)
- **Debt Refinance Primary?** — TriState dropdown (Any / Yes / No)

These are added to:
- `ProjectTypeRule` interface (new fields: `includesDebtRefinance`, `debtRefinancePrimary`)
- `RiskAssessmentAnswers` interface (new fields: `includesDebtRefinance`, `debtRefinancePrimary`)
- Admin form: two new dropdowns in the Classification Conditions grid
- BDO section: two new yes/no radio questions
- Rule matching logic: two new condition checks in `matchesRule()`
- Admin rule list: two new condition badges

### 3. Rename "Order" to "Priority"
- Field label changes from "Order" to "Priority" in the admin form
- Description text updated to clarify: lower number = higher priority
- The `order` field in `ProjectTypeRule` is renamed to `priority` throughout
- Rule list display changes from `#1`, `#2` to showing "Priority: 1", etc.
- Sort logic remains ascending (lower priority number evaluated first) — same behavior, clearer naming
- **BREAKING**: Firestore field rename from `order` to `priority` — existing rules need migration

## Impact
- Affected specs: risk-assessment
- Affected code:
  - `lib/schema.ts` — `RiskLevel` type, `ProjectTypeRule`, `RiskAssessmentAnswers`, `ProjectOverview.computedRiskLevel`
  - `app/bdo/admin/page.tsx` — form fields, risk level radio/select, badge colors, condition badges, sort logic, field rename
  - `components/loan-sections/RiskAssessmentSection.tsx` — new questions, badge colors, heat map gradient (6 segments), matching logic, condition checks
- Existing Firestore data: rules with `order` field need to be read as `priority`; rules with old risk levels (`low`/`medium`/`high`) remain valid since those values are preserved

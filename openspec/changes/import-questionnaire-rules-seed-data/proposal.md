# Change: Import questionnaire rules from seed data export

## Why
We have a `questionnaire_rules_export.json` file with 144 pre-built questionnaire rules that need to be loaded into the admin settings. These rules include new fields not yet in our data model (`purposeKey`, `naicsCodes`, `questionOrder`) that are essential for filtering which questions apply to a given project based on its purpose and industry. Currently the admin must manually create every rule; this import will seed the system with a curated question bank.

## What Changes

### 1. Extend `QuestionnaireRule` interface with new fields
The export contains fields our current interface lacks:

| Export field | New interface field | Type | Purpose |
|---|---|---|---|
| `purpose_key` | `purposeKey` | `string?` | Groups "Project Purpose" questions (e.g., "Business Acquisition / Change of Ownership", "Debt Refinance"). 14 distinct purpose keys, 7 questions each = 98 rules. |
| `naics_codes` | `naicsCodes` | `string[]?` | Groups "Industry" questions by NAICS prefix (e.g., `["44","45"]` for Retail). 6 industry groups, 7 questions each = 42 rules. |
| `question_order` | `questionOrder` | `number?` | Ordering within a purpose_key/naics group (1-7). Distinct from the top-level `order` which controls overall display order. |

Fields from the export that are **dropped** (not needed):
- `id` — new IDs generated
- `created_at` / `updated_at` — ignored per user request
- `conditions` — all empty in export, not used in our system
- `category` — all null
- `category_order` — all 0
- `always_show` — all false

### 2. Field mapping (snake_case → camelCase)
| Export | Our field |
|---|---|
| `name` | `name` |
| `block_type` | `blockType` |
| `question_text` | `questionText` |
| `ai_block_template_id` | `aiBlockTemplateId` (all null in this export) |
| `order` | `order` (all 0 in export — we'll compute from `questionOrder`) |
| `enabled` | `enabled` |
| `main_category` | `mainCategory` |
| `purpose_key` | `purposeKey` (NEW) |
| `naics_codes` | `naicsCodes` (NEW) |
| `question_order` | `questionOrder` (NEW) |

### 3. Admin "Import Rules" feature
Add an "Import Rules" button to the Questionnaire Rules tab that:
- Reads the embedded seed data (converted to our format at build time)
- Merges with existing rules (avoids duplicates by matching on `name` + `mainCategory`)
- Generates unique IDs for new rules
- Computes `order` values sequentially

### 4. Update admin form and rule list to show new fields
- Show `purposeKey` as a read-only badge or editable dropdown for "Project Purpose" rules
- Show `naicsCodes` as tag badges for "Industry" rules
- Show `questionOrder` in the rule list

### 5. Data summary
- **144 total rules**: 4 Business Overview, 98 Project Purpose (14 purpose keys × 7), 42 Industry (6 NAICS groups × 7)
- All `block_type: 'question'`, all `enabled: true`
- 14 purpose keys: Business Acquisition, CRE Purchase, CRE Improvements, CRE Construction, Debt Refinance, Equipment Acquisition, Existing Business, Expansion, Franchise, Inventory Acquisition, Partner Buyout, Start Up, Transition Risk, Working Capital
- 6 NAICS groups: Construction (23), Manufacturing (31-33), Retail (44-45), Healthcare/Professional (54,62), Hotels (721), Restaurants (722)

## Impact
- Affected code:
  - `app/bdo/admin/page.tsx` — `QuestionnaireRule` interface, empty form defaults, form UI, import button, rule list display
  - `app/bdo/borrower-portal/[id]/questionnaire/page.tsx` — `QuestionnaireRule` interface (keep in sync)
  - New: `lib/questionnaireRulesSeed.ts` — converted seed data and import utility
- Firestore: `adminSettings/config.questionnaireRules` array will grow to ~144+ entries
- No breaking changes — new fields are optional, existing rules continue to work

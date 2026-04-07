# Change: Add Risk Assessment Section to Loan Application Step 1

## Why
BDOs need a configurable way to classify projects by type and risk level based on classification questions. This enables automatic risk assessment during the loan application process based on admin-defined rules, improving consistency in project evaluation.

## What Changes
- Add new "Risk Assessment" section above "Project Summary" in Step 1 (Project Overview)
- Add new "Risk Assessment" tab in Admin Settings page for configuring project type rules
- Add `ProjectTypeRule` interface and `projectTypeRules` array to AdminSettings Firestore structure
- Create modal dialog for adding/editing project type rules with all condition fields
- Display computed project type and risk level in the Risk Assessment section based on BDO answers

## Impact
- **Affected code:**
  - `components/loan-sections/ProjectOverviewSection.tsx` - Add Risk Assessment section
  - `app/bdo/admin/page.tsx` - Add Risk Assessment tab with CRUD operations
  - `lib/schema.ts` - Add ProjectTypeRule interface and extend AdminSettings
  - `services/firestore.ts` - May need helper functions for rule evaluation
- **Affected data:**
  - Firestore `adminSettings/config` document - Add `projectTypeRules` array
  - Firestore `loanApplications` - Store computed project type and risk level

## Risk Assessment Rule Structure
Each rule contains:
- **name**: Rule identifier (e.g., "Startup with Real Estate")
- **description**: Optional explanation
- **riskLevel**: 'low' | 'medium' | 'high'
- **isFallback**: Boolean for default/catch-all rule
- **Conditions** (tristate: true/false/any):
  - `isStartup`: Is this a startup business?
  - `hasExistingCashflow`: Does the business have existing cashflow?
  - `hasTransitionRisk`: Is there transition risk involved?
  - `includesRealEstate`: Does the project include real estate?
  - `creScope`: 'purchase' | 'improvement' | 'any'
  - `isPartnerBuyout`: Is this a partner buyout?
  - `involvesConstruction`: Does this involve construction?

## Out of Scope
- Automatic rule evaluation logic (will be added in follow-up)
- Integration with PQ Memo risk scoring
- Historical rule change tracking

## ADDED Requirements

### Requirement: Questionnaire Rule Extended Fields
Each questionnaire rule SHALL optionally include a `purposeKey` (string), `naicsCodes` (string array), and `questionOrder` (number). The `purposeKey` field SHALL identify which project purpose group a "Project Purpose" rule belongs to (e.g., "Business Acquisition / Change of Ownership", "Debt Refinance"). The `naicsCodes` field SHALL contain NAICS code prefixes that determine which industry group an "Industry" rule applies to (e.g., ["44","45"] for Retail). The `questionOrder` field SHALL define the ordering of questions within their group.

#### Scenario: Project Purpose rule with purposeKey
- **WHEN** a questionnaire rule has `mainCategory` of "Project Purpose"
- **THEN** it SHALL have a `purposeKey` value identifying its purpose group
- **AND** the `purposeKey` is displayed in the admin rule list

#### Scenario: Industry rule with naicsCodes
- **WHEN** a questionnaire rule has `mainCategory` of "Industry"
- **THEN** it SHALL have a `naicsCodes` array with one or more NAICS code prefixes
- **AND** the NAICS codes are displayed as badges in the admin rule list

### Requirement: Seed Data Import
The admin settings Questionnaire Rules tab SHALL provide an "Import Seed Rules" button that loads a curated set of 144 pre-built questionnaire rules. The import SHALL convert the external format (snake_case fields) to the application's camelCase format, generate unique IDs, and merge with existing rules without creating duplicates.

#### Scenario: Import seed rules into empty system
- **WHEN** an admin clicks "Import Seed Rules" and confirms the action
- **AND** no questionnaire rules currently exist
- **THEN** 144 rules are created with correct field mapping
- **AND** the rules include 4 Business Overview, 98 Project Purpose, and 42 Industry rules

#### Scenario: Import seed rules with existing rules
- **WHEN** an admin clicks "Import Seed Rules"
- **AND** some rules already exist with the same `name` and `mainCategory`
- **THEN** existing matching rules are preserved (not duplicated)
- **AND** only new rules not matching existing ones are added

#### Scenario: Imported rules have correct field mapping
- **WHEN** seed data is imported
- **THEN** `block_type` maps to `blockType`
- **AND** `question_text` maps to `questionText`
- **AND** `main_category` maps to `mainCategory`
- **AND** `purpose_key` maps to `purposeKey`
- **AND** `naics_codes` maps to `naicsCodes`
- **AND** `question_order` maps to `questionOrder`
- **AND** `id`, `created_at`, `updated_at` fields are ignored

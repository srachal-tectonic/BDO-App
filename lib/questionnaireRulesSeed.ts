/**
 * Questionnaire Rules Seed Data Utility
 * Converts the exported JSON format (snake_case) to our QuestionnaireRule format (camelCase)
 * and provides a merge utility for importing into admin settings.
 */

import seedDataRaw from '@/questionnaire_rules_export.json';

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

/** Shape of a single row in the export JSON */
interface ExportedRule {
  id: string;
  name: string;
  block_type: 'question' | 'ai-generated';
  conditions: unknown[];
  question_text: string | null;
  ai_block_template_id: string | null;
  order: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  category: string | null;
  category_order: number;
  main_category: 'Business Overview' | 'Project Purpose' | 'Industry';
  purpose_key: string | null;
  naics_codes: string[];
  always_show: boolean;
  question_order: number;
}

/** Our internal QuestionnaireRule shape (mirrors the interface in admin page) */
interface QuestionnaireRule {
  id: string;
  name: string;
  enabled: boolean;
  order: number;
  blockType: 'question' | 'ai-generated';
  mainCategory: 'Business Overview' | 'Project Purpose' | 'Industry';
  questionText?: string;
  aiBlockTemplateId?: string;
  purposeKey?: string;
  naicsCodes?: string[];
  questionOrder?: number;
}

// ------------------------------------------------------------------
// Conversion
// ------------------------------------------------------------------

/**
 * Converts a single exported rule to our QuestionnaireRule format.
 * Generates a deterministic ID based on name + mainCategory.
 */
function convertRule(raw: ExportedRule, index: number): QuestionnaireRule {
  const rule: QuestionnaireRule = {
    id: `seed-rule-${index + 1}-${Date.now()}`,
    name: raw.name,
    enabled: raw.enabled,
    order: index + 1,
    blockType: raw.block_type,
    mainCategory: raw.main_category,
  };

  if (raw.question_text) {
    rule.questionText = raw.question_text;
  }

  if (raw.ai_block_template_id) {
    rule.aiBlockTemplateId = raw.ai_block_template_id;
  }

  if (raw.purpose_key) {
    rule.purposeKey = raw.purpose_key;
  }

  if (raw.naics_codes && raw.naics_codes.length > 0) {
    rule.naicsCodes = raw.naics_codes;
  }

  if (raw.question_order) {
    rule.questionOrder = raw.question_order;
  }

  return rule;
}

/**
 * Returns all seed rules converted to our format.
 * Rules are ordered: Business Overview first, then Project Purpose, then Industry.
 * Within each category, rules are sorted by their original question_order.
 */
export function getSeedRules(): QuestionnaireRule[] {
  const exported = seedDataRaw as ExportedRule[];

  // Sort: Business Overview first, then Project Purpose (grouped by purpose_key),
  // then Industry (grouped by naics_codes). Within groups, sort by question_order.
  const categoryOrder: Record<string, number> = {
    'Business Overview': 0,
    'Project Purpose': 1,
    'Industry': 2,
  };

  const sorted = [...exported].sort((a, b) => {
    // Sort by main_category first
    const catDiff = (categoryOrder[a.main_category] ?? 99) - (categoryOrder[b.main_category] ?? 99);
    if (catDiff !== 0) return catDiff;

    // Within Project Purpose, group by purpose_key
    if (a.main_category === 'Project Purpose') {
      const pkCmp = (a.purpose_key || '').localeCompare(b.purpose_key || '');
      if (pkCmp !== 0) return pkCmp;
    }

    // Within Industry, group by naics_codes (joined)
    if (a.main_category === 'Industry') {
      const naicsCmp = (a.naics_codes || []).join(',').localeCompare((b.naics_codes || []).join(','));
      if (naicsCmp !== 0) return naicsCmp;
    }

    // Within group, sort by question_order
    return (a.question_order || 0) - (b.question_order || 0);
  });

  return sorted.map((raw, index) => convertRule(raw, index));
}

/**
 * Merges seed rules into existing rules, avoiding duplicates.
 * A rule is considered a duplicate if an existing rule has the same name AND mainCategory.
 * Returns the merged array.
 */
export function mergeWithExisting(
  existingRules: QuestionnaireRule[],
  seedRules: QuestionnaireRule[]
): QuestionnaireRule[] {
  // Build a set of existing name+category keys for dedup
  const existingKeys = new Set(
    existingRules.map(r => `${r.name}::${r.mainCategory}`)
  );

  // Determine the next order number
  const maxOrder = existingRules.reduce((max, r) => Math.max(max, r.order || 0), 0);

  // Filter out duplicates and re-number order for new rules
  const newRules: QuestionnaireRule[] = [];
  let nextOrder = maxOrder + 1;

  for (const seed of seedRules) {
    const key = `${seed.name}::${seed.mainCategory}`;
    if (!existingKeys.has(key)) {
      newRules.push({
        ...seed,
        id: `seed-rule-${nextOrder}-${Date.now()}`,
        order: nextOrder,
      });
      nextOrder++;
    }
  }

  return [...existingRules, ...newRules];
}

/**
 * Returns the count of rules that would be imported (not already existing).
 */
export function getImportCount(existingRules: QuestionnaireRule[]): number {
  const seedRules = getSeedRules();
  const existingKeys = new Set(
    existingRules.map(r => `${r.name}::${r.mainCategory}`)
  );
  return seedRules.filter(s => !existingKeys.has(`${s.name}::${s.mainCategory}`)).length;
}

// Shared due-diligence generation logic: loan-application field extraction,
// required-field validation, and prompt composition. Used by both the Claude
// route (app/api/diligence-report) and the Azure OpenAI test route
// (app/api/internal-dd-test) so the two flows stay behavior-identical.
import { getCollection, COLLECTIONS } from '@/lib/cosmosdb';
import { DEFAULT_DILIGENCE_CORE_PROMPT } from '@/lib/diligencePrompts';

const ADMIN_SETTINGS_CONFIG_ID = 'config';
// Legacy single-prompt id, kept as a fallback so admins who customized the
// prompt before the Core/Appendix split don't lose their work until they save
// the new DD Prompts tab.
const LEGACY_DUE_DILIGENCE_PROMPT_ID = 'due-diligence-report';

export interface ExtractedFields {
  legalName: string;
  dba: string;
  entityType: string;
  stateOfFormation: string;
  ein: string;
  businessAddress: string;
  projectAddress: string;
  websiteUrl: string;
  industry: string;
  naicsCode: string;
  primaryProjectPurpose: string;
  secondaryProjectPurposes: string;
  loanAmount: string;
  useOfProceeds: string;
  projectDescription: string;
  yearsInOperation: string;
  businessStage: string;
  ownerNames: string;
}

function s(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
  return '';
}

function formatAddress(addr: any): string {
  if (!addr || typeof addr !== 'object') return '';
  const street = [s(addr.street1), s(addr.street2)].filter(Boolean).join(' ');
  const cityStateZip = [s(addr.city), s(addr.state), s(addr.zipCode)].filter(Boolean).join(', ').replace(/, ([A-Z]{2}), /, ', $1 ');
  return [street, cityStateZip].filter(Boolean).join(', ');
}

function formatCurrency(n: unknown): string {
  if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) return '';
  return `$${n.toLocaleString('en-US')}`;
}

export function extractApplicationFields(loanApp: any, project: any): ExtractedFields {
  const ba = loanApp?.businessApplicant ?? {};
  const po = loanApp?.projectOverview ?? {};

  // Legal name — fall back to project.businessName if the loan app field is empty.
  const legalName = s(ba.legalName) || s(project?.businessName);

  // Address — schema has `address` (full Address) plus optional `businessAddress` / `projectAddress`.
  const businessAddress =
    formatAddress(ba.businessAddress) || formatAddress(ba.address);
  const projectAddress = formatAddress(ba.projectAddress);

  // Industry / NAICS — projectOverview is canonical, businessApplicant is fallback.
  const industry = s(po.industry) || s(ba.industryType);
  const naicsCode = s(po.naicsCode) || s(ba.naicsCode);

  // Purposes — primaryProjectPurpose may be string or string[].
  const primaryRaw = po.primaryProjectPurpose;
  const primaryProjectPurpose = Array.isArray(primaryRaw)
    ? primaryRaw.filter(Boolean).join(', ')
    : s(primaryRaw);
  const secondaryProjectPurposes = Array.isArray(po.secondaryProjectPurposes)
    ? po.secondaryProjectPurposes.filter(Boolean).join(', ')
    : '';

  // Loan amount — try the SBA-program-specific tables, then legacy.
  const loanAmountNum =
    (typeof loanApp?.sourcesUses7a?.loanAmount === 'number' && loanApp.sourcesUses7a.loanAmount) ||
    (typeof loanApp?.sourcesUses504?.loanAmount === 'number' && loanApp.sourcesUses504.loanAmount) ||
    (typeof loanApp?.sourcesUsesExpress?.loanAmount === 'number' && loanApp.sourcesUsesExpress.loanAmount) ||
    (typeof loanApp?.sourcesUses?.loanAmount === 'number' && loanApp.sourcesUses.loanAmount) ||
    (typeof loanApp?.loan1?.loanAmount === 'number' && loanApp.loan1.loanAmount) ||
    (typeof loanApp?.loan1?.amount === 'number' && loanApp.loan1.amount) ||
    (typeof project?.loanAmount === 'number' && project.loanAmount) ||
    0;
  const loanAmount = formatCurrency(loanAmountNum);

  // Use of proceeds — itemize the legacy SourcesUses fields with non-zero amounts.
  const su = loanApp?.sourcesUses7a ?? loanApp?.sourcesUses ?? {};
  const usesParts: string[] = [];
  const pushUse = (label: string, n: unknown) => {
    if (typeof n === 'number' && n > 0) usesParts.push(`${label}: ${formatCurrency(n)}`);
  };
  pushUse('Purchase Price', su.purchasePrice);
  pushUse('Working Capital', su.workingCapital);
  pushUse('Closing Costs', su.closingCosts);
  pushUse('Contingency', su.contingency);
  pushUse('Other Uses', su.otherUses);
  const useOfProceeds = usesParts.join('; ');

  // Years in operation / startup vs existing.
  const yearsInOpRaw = ba.yearsInOperation;
  const yearsInOperation =
    typeof yearsInOpRaw === 'number' && yearsInOpRaw > 0
      ? `${yearsInOpRaw} year${yearsInOpRaw === 1 ? '' : 's'}`
      : s(ba.yearEstablished)
      ? `Established ${s(ba.yearEstablished)}`
      : '';

  const stage = s(po.classification?.businessStage);
  const isStartup = po.riskAssessment?.isStartup === true;
  const businessStage = stage
    ? stage.charAt(0).toUpperCase() + stage.slice(1)
    : isStartup
    ? 'Startup'
    : '';

  // Owners — full name + ownership %.
  const owners: string[] = Array.isArray(loanApp?.individualApplicants)
    ? loanApp.individualApplicants
        .map((a: any) => {
          const name = [s(a?.firstName), s(a?.lastName)].filter(Boolean).join(' ');
          if (!name) return '';
          const pct = typeof a?.ownershipPercentage === 'number' ? `${a.ownershipPercentage}%` : '';
          return pct ? `${name} (${pct})` : name;
        })
        .filter(Boolean)
    : [];
  const ownerNames = owners.join(', ');

  return {
    legalName,
    dba: s(ba.dba) || s(ba.dbaName),
    entityType: s(ba.entityType),
    stateOfFormation: s(ba.stateOfFormation),
    ein: s(ba.ein),
    businessAddress,
    projectAddress,
    websiteUrl: s(ba.website),
    industry,
    naicsCode,
    primaryProjectPurpose,
    secondaryProjectPurposes,
    loanAmount,
    useOfProceeds,
    projectDescription: s(po.projectDescription) || s(po.goodFitSummary) || s(po.bdoComments),
    yearsInOperation,
    businessStage,
    ownerNames,
  };
}

export const NDJSON_HEADERS = {
  'Content-Type': 'application/x-ndjson; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  'X-Accel-Buffering': 'no',
};

// Load the persisted loan application + project records for a project.
export async function loadApplicationData(
  projectId: string
): Promise<{ loanApp: any; project: any }> {
  const [loanCol, projCol] = await Promise.all([
    getCollection(COLLECTIONS.LOAN_APPLICATIONS),
    getCollection(COLLECTIONS.PROJECTS),
  ]);
  const [loanApp, project] = await Promise.all([
    loanCol.findOne({ projectId }),
    projCol.findOne({ id: projectId }),
  ]);
  return { loanApp, project };
}

// Human-readable labels of the required fields that are missing (empty = valid).
export function getMissingRequiredFields(fields: ExtractedFields): string[] {
  const missing: string[] = [];
  if (!fields.legalName) missing.push('Legal Name');
  if (!fields.industry) missing.push('Industry');
  if (!fields.naicsCode) missing.push('NAICS Code');
  if (!fields.primaryProjectPurpose) missing.push('Primary Project Purpose');
  return missing;
}

// Compose the final generation prompt: Core prompt (admin override → legacy
// aiPrompts entry → built-in default) + per-purpose appendices + placeholder
// substitution + a structured "Loan Application Data" block that is always
// appended so the model has full context even if the admin's custom template
// doesn't reference every placeholder.
export async function buildDiligencePrompt(
  loanApp: any,
  fields: ExtractedFields
): Promise<string> {
  // Resolve the Core prompt + Purpose Appendices from admin settings, falling
  // back to the legacy single-prompt entry, and finally to the built-in
  // default. Per the DD Prompts admin tab: empty appendices are skipped.
  let coreTemplate = DEFAULT_DILIGENCE_CORE_PROMPT;
  let appendices: Record<string, string> = {};
  try {
    const adminCol = await getCollection(COLLECTIONS.ADMIN_SETTINGS);
    const adminDoc = await adminCol.findOne({ id: ADMIN_SETTINGS_CONFIG_ID });
    const settings: any = adminDoc ?? {};

    const coreOverride = typeof settings.diligenceCorePrompt === 'string' ? settings.diligenceCorePrompt.trim() : '';
    if (coreOverride) {
      coreTemplate = coreOverride;
    } else {
      // Migration fallback: read the old aiPrompts[id=due-diligence-report]
      // entry until the admin saves the new DD Prompts tab.
      const legacy = settings.aiPrompts?.find((p: any) => p?.id === LEGACY_DUE_DILIGENCE_PROMPT_ID);
      if (legacy?.prompt && typeof legacy.prompt === 'string' && legacy.prompt.trim()) {
        coreTemplate = legacy.prompt;
      }
    }

    if (settings.diligencePurposeAppendices && typeof settings.diligencePurposeAppendices === 'object') {
      appendices = settings.diligencePurposeAppendices;
    }
  } catch (err) {
    console.warn('[diligence] Failed to load admin prompt overrides, using defaults:', err);
  }

  // Build the ordered, deduped list of selected purposes (primary + secondary).
  const primaryRaw = (loanApp?.projectOverview?.primaryProjectPurpose ?? null) as string | string[] | null;
  const secondaryRaw = (loanApp?.projectOverview?.secondaryProjectPurposes ?? []) as string[];
  const selectedPurposes: string[] = [];
  const seen = new Set<string>();
  const pushPurpose = (raw: unknown) => {
    if (typeof raw !== 'string') return;
    const trimmed = raw.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    selectedPurposes.push(trimmed);
  };
  if (Array.isArray(primaryRaw)) {
    primaryRaw.forEach(pushPurpose);
  } else {
    pushPurpose(primaryRaw);
  }
  if (Array.isArray(secondaryRaw)) {
    secondaryRaw.forEach(pushPurpose);
  }

  const appendixSections: string[] = [];
  for (const purpose of selectedPurposes) {
    const text = typeof appendices[purpose] === 'string' ? appendices[purpose].trim() : '';
    if (!text) continue;
    appendixSections.push(`## Appendix: ${purpose}\n\n${text}`);
  }

  const composedTemplate = appendixSections.length
    ? `${coreTemplate}\n\n${appendixSections.join('\n\n')}`
    : coreTemplate;

  // Substitute every supported placeholder against the composed template.
  let renderedPrompt = composedTemplate;
  for (const [key, value] of Object.entries(fields)) {
    const re = new RegExp(`\\{${key}\\}`, 'g');
    renderedPrompt = renderedPrompt.replace(re, value || 'Not provided');
  }

  const dataBlock = [
    '',
    '---',
    '',
    '## Loan Application Data',
    '',
    `- Legal Name: ${fields.legalName}`,
    `- DBA: ${fields.dba}`,
    `- Entity Type: ${fields.entityType}`,
    `- State of Formation: ${fields.stateOfFormation}`,
    `- EIN: ${fields.ein}`,
    `- Business Address: ${fields.businessAddress}`,
    `- Project Address: ${fields.projectAddress}`,
    `- Website: ${fields.websiteUrl}`,
    `- Industry: ${fields.industry}`,
    `- NAICS Code: ${fields.naicsCode}`,
    `- Primary Project Purpose: ${fields.primaryProjectPurpose}`,
    `- Secondary Project Purposes: ${fields.secondaryProjectPurposes}`,
    `- Loan Amount Requested: ${fields.loanAmount}`,
    `- Use of Proceeds: ${fields.useOfProceeds}`,
    `- Project Description: ${fields.projectDescription}`,
    `- Years in Operation: ${fields.yearsInOperation}`,
    `- Business Stage: ${fields.businessStage}`,
    `- Owners: ${fields.ownerNames}`,
  ].join('\n') + '\n';

  return renderedPrompt + dataBlock;
}

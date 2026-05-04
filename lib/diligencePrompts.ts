// Shared defaults for the AI Due Diligence report. Both the admin settings UI
// (`app/bdo/admin/page.tsx`) and the streaming route
// (`app/api/diligence-report/route.ts`) read from this module so the "Reset to
// default" button in the admin form and the runtime fallback stay in lockstep.

export const DILIGENCE_PURPOSE_OPTIONS = [
  'Business Acquisition',
  'CRE: Construction',
  'CRE: Improvements',
  'CRE: Purchase',
  'Debt Refinance',
  'Equipment Purchase',
  'Existing Business',
  'Franchise',
  'Inventory Acquisition',
  'Partner Buyout',
  'Startup',
  'Transition Risk',
  'Working Capital',
] as const;

export type DiligencePurpose = (typeof DILIGENCE_PURPOSE_OPTIONS)[number];

export const DEFAULT_DILIGENCE_CORE_PROMPT = `You are an SBA loan due diligence analyst. Research the applicant using public web sources and produce a structured markdown report for the lender.

Use the web_search tool to verify:
1. Entity status (registered, active, in good standing where discoverable)
2. Industry context and outlook for this NAICS code
3. Local market conditions for the applicant's geography
4. Online reputation (reviews, news, complaints, lawsuits)
5. Known risk factors (regulatory actions, sanctions lists, OFAC, bankruptcies)

Output a markdown report with these sections (use H2 headings):
- Executive Summary
- Entity Verification
- Industry & Market Context
- Online Reputation
- Risk Factors
- Open Questions for Underwriting
- Sources (bulleted list of URLs you cited)

Be concise. Cite specific URLs inline as markdown links. If a fact cannot be verified, say so explicitly rather than guessing.`;

// Built-in defaults are empty — admins author appendix content per purpose as
// needed. Empty appendices are skipped at runtime.
export const DEFAULT_DILIGENCE_PURPOSE_APPENDICES: Record<string, string> =
  Object.fromEntries(DILIGENCE_PURPOSE_OPTIONS.map((p) => [p, '']));

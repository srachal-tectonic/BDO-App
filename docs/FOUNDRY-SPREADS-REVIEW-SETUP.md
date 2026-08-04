# Internal Spreads Review — Microsoft Foundry Setup Guide

The Admin Settings → **Internal Spreads Review** tab sends a project's parsed
financial spread (income-statement periods, debt coverage, financing structure,
sources & uses, guarantor draws) to an in-tenant Microsoft Foundry model
deployment and streams back an analyst-style credit review. It mirrors the
Internal DD Test tab: display-only, nothing persisted, client disconnect
cancels the generation.

App-side code (already in the repo):

| Piece | Path |
|---|---|
| API route | `app/api/internal-spreads-review/route.ts` |
| Prompt + spread serialization | `lib/spreadsReviewShared.ts` |
| Admin tab UI | `components/admin/InternalSpreadsReviewTab.tsx` |
| Streaming hook | `hooks/useInternalSpreadsReview.ts` |

Like the Internal DD Test, this calls a **model deployment** directly through
the OpenAI-compatible Responses API (`{endpoint}/openai/v1/`) — it does NOT go
through a Foundry *Agent*. Agents (like the SBA Deal Copilot) are for
tool-calling chat experiences; here the app already assembles the full prompt
server-side, so a plain deployment is the right shape. All you create in
Foundry is a new deployment (optionally with its own content-filter policy).

Naming note: the portal has been renamed twice — Azure AI Studio → Azure AI
Foundry → **Microsoft Foundry**. It's the same portal at https://ai.azure.com;
older docs/screenshots may show the previous names.

---

## Step 1 — Open the Foundry project

1. Go to **https://ai.azure.com** and sign in with your work account.
2. Select the existing Foundry project that holds the `gpt-5` deployment used
   by the Internal DD Test (same resource = same endpoint + key, so the app
   needs no new endpoint/key settings). If you truly want a separate resource,
   create one via **Create new** → Foundry resource — but then you must also
   change `AZURE_OPENAI_ENDPOINT` / `AZURE_OPENAI_API_KEY`, which the DD Test
   shares, so reusing the existing resource is strongly recommended.

## Step 2 — Deploy the model

1. In the left nav, open **Models + endpoints** (under *My assets*), or browse
   the **Model catalog**.
2. Click **+ Deploy model** → **Deploy base model**.
3. Pick the model. Recommendations:
   - **gpt-5** — best reasoning quality; same model the DD Test uses.
   - **gpt-5-mini** — cheaper/faster; fine for structured financial review
     since all the data is provided in the prompt (no web research needed).
4. In the deployment dialog:
   - **Deployment name**: `spreads-review` (this exact string becomes the
     `AZURE_OPENAI_SPREADS_DEPLOYMENT` value — the route sends it as the
     `model` parameter).
   - **Deployment type**: Global Standard (default) is fine; pick Data Zone /
     Standard if your data-residency policy requires it.
   - Leave the default version with auto-update enabled unless policy says
     otherwise.
5. Click **Deploy** and wait for the deployment to show as succeeded.

Why a separate deployment instead of reusing the DD one? Independent
content-filter policy, independent quota/rate limits, and per-deployment cost
visibility. (Until you create it, the route falls back to
`AZURE_OPENAI_DEPLOYMENT`, so the tab works immediately for testing.)

## Step 3 — (Optional) Content filter / guardrails

The DD Test needed a relaxed filter because its prompts contain PII-heavy
investigation instructions. Spreads review prompts are plain financial data,
so the default filter is usually fine. If reviews come back truncated with the
"content filter stopped the response" banner:

1. In the Foundry portal go to **Guardrails + controls** (a.k.a. Safety +
   security in older UI).
2. Create (or reuse) a custom content-filter policy with output severity
   thresholds raised as your compliance team allows.
3. Edit the `spreads-review` deployment and attach the policy.

## Step 4 — Get the endpoint + key (only if using a new resource)

If you reused the existing resource, skip this — the app already has them.

- Foundry portal → project → **Overview** shows the *Azure OpenAI endpoint*
  (looks like `https://<resource>.openai.azure.com/` or
  `https://<resource>.cognitiveservices.azure.com/`) and keys, or use the Azure
  portal → the resource → **Keys and Endpoint**.
- Supply just the resource root — the app appends `/openai/v1/` itself.

## Step 5 — Configure the app

Local development — add to `.env.local`:

```bash
AZURE_OPENAI_SPREADS_DEPLOYMENT=spreads-review
# Already set for the DD Test; unchanged when reusing the same resource:
# AZURE_OPENAI_ENDPOINT=https://<resource>.openai.azure.com
# AZURE_OPENAI_API_KEY=<key>
```

Deployed slots — App Service → Configuration → Application settings (per
slot: dev / staging / prod):

```
AZURE_OPENAI_SPREADS_DEPLOYMENT = spreads-review
```

Restart the slot after saving.

## Step 6 — Test

1. Sign in as an Admin → **Admin Settings** → **Internal Spreads Review** tab.
2. Pick a project that has at least one spread uploaded on its Financials
   section (the second dropdown lists versions; "Active / newest spread" is
   the default).
3. Click **Generate Review** — you should see the thinking → writing status,
   then a streamed markdown memo with sections for trends, add-backs, DSCR,
   global cash flow, structure, red flags, and a recommendation.

Failure modes:

| Symptom | Cause / fix |
|---|---|
| "Azure OpenAI is not configured… Missing: AZURE_OPENAI_SPREADS_DEPLOYMENT" | Neither `AZURE_OPENAI_SPREADS_DEPLOYMENT` nor `AZURE_OPENAI_DEPLOYMENT` is set on that slot. |
| 404 / model not found from Azure | Deployment name in the env var doesn't exactly match the Foundry deployment name. |
| "No financial spreads found for this project" | The project has no uploaded spread — upload one on the Financials section. |
| Review cut off + content-filter banner | See Step 3. |

## Customizing the review prompt

The default memo instructions live in `DEFAULT_SPREADS_REVIEW_PROMPT`
(`lib/spreadsReviewShared.ts`). They can be overridden without a deploy by
setting a `spreadsReviewPrompt` string field on the admin settings document
(`adminSettings` collection, doc id `config`) — same pattern as
`diligenceCorePrompt`. There is no admin UI for it yet; add one alongside the
DD Prompts tab if it turns out to need frequent tuning.

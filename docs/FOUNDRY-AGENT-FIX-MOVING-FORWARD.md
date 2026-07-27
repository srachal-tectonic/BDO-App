# Foundry Agent — SOLVED 2026-07-27 (history + remaining work)

Continuation notes for the "SBA Deal Copilot" Foundry agent integration.
Companion docs: `docs/FOUNDRY-AGENT-SETUP.md` (setup guide), `docs/agent-openapi.json` (tool spec).

## ✅ RESOLVED — root cause (two stacked bugs)

1. **The Foundry portal's agent editor silently fails to save.** Instructions
   typed and tools added through the portal UI never persisted into any agent
   version — the runtime always executed the bare creation-time definition
   (REST inspection showed `api-test` v1 with empty instructions and only a
   default `web_search` tool). Every "agent can't reach the system" response
   across three days was the model literally not having the tool.
   **Do not trust the portal editor; manage agent definitions via REST.**
2. **The OpenAPI tool auth block is not validated** — wrong field names are
   accepted and silently degrade to anonymous (our API then 401s). The correct
   documented shape is:
   ```json
   "auth": {
     "type": "project_connection",
     "security_scheme": { "project_connection_id":
       "/subscriptions/<sub>/resourceGroups/rg-IntegraDebtorFlow/providers/Microsoft.CognitiveServices/accounts/srachal-5020-resource/projects/srachal-5020/connections/bdo-app-agent-api" }
   }
   ```
   (`type: "connection"` + `connection_id` = silently ignored → anonymous.)

**Working state**: agent `api-test` **version 5** answers "Summarize the CSRV
Ventures project" by chaining searchProjects → getProjectSummary →
getDiligenceReport → getFinancialSpreads, all `-> authorized` in app logs,
returning a real underwriting snapshot with DSCR from the spreads.

There was never a guardrail block on tool calls (the one guardrail message
seen Friday was incidental); no key mismatch; no Easy Auth issue.

## How to manage the agent via REST (the reliable path)

```bash
TOKEN=$(az account get-access-token --scope "https://ai.azure.com/.default" --query accessToken -o tsv)
EP="https://srachal-5020-resource.services.ai.azure.com/api/projects/srachal-5020"

# Inspect agent + versions (which version is @latest = what actually runs)
curl -s "$EP/agents/api-test?api-version=v1" -H "Authorization: Bearer $TOKEN"

# Create a new version (definition JSON: kind/model/instructions/tools;
# OpenAPI tool with the project_connection auth shape above)
curl -s -X POST "$EP/agents/api-test/versions?api-version=v1" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d @definition.json

# Invoke (agent_reference, NOT the deprecated 'agent' field)
curl -s -X POST "$EP/openai/v1/responses" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"agent_reference": {"type":"agent_reference","name":"api-test"}, "input": "..."}'
```

Traffic routes to `@latest` (100%). `tool_choice: "required"` in the invoke
body is the debugging trick that surfaces real tool errors instead of the
model's "can't reach the system" narration.

## SECOND PLATFORM BUG (found 2026-07-27 during rebuild): OpenAPI tool breaks
## when combined with ANY other tool

Systematic bisect on `sba-deal-copilot` (all versions tested via pinned
`agent_reference` invocations, rate-limit-paced):

| Tools on agent | Result |
|---|---|
| openapi solo (v3, v7) | ✅ works every time |
| openapi + web_search (v4) | ❌ model never calls openapi; 15+ web searches instead |
| openapi + code_interpreter (v6) | ❌ model tries to reach the API from the Python sandbox (25 calls) |
| openapi + file_search (v5) | ❌ hard 429 "rate limit" on EVERY request — even with the deployment fully idle (token metrics at zero) and `max_output_tokens` capped; a solo-openapi control run succeeds seconds earlier. Misreported internal failure. |

Clue: solo runs execute via `python_openapi_tool_<name>`; multi-tool runs
reference `remote_openapi.<name>_<op>` — different execution engines, the
multi-tool one broken. Worth filing with Microsoft (clean repro = versions 3-7).

## Current state (end of 2026-07-27)

- `sba-deal-copilot` **v7 = @latest, WORKING**: solo openapi tool, analyst
  instructions; answers project questions with live app data.
- `api-test` v5: working solo-openapi debug agent.
- Vector store `vs_1epkArc2QP2B3Z0OllIhbDQZ` (`sba-deal-copilot-kb`): SOP
  50 10 8 fully embedded (built via REST: file `assistant-4sEnMC1QK9dbskreWKCd4S`).
  Currently UNUSED (file_search pairing broken).
- Deployments live: `gpt-5` (DZ Standard, 300K) and `text-embedding-3-small`.

## FINAL ARCHITECTURE — SHIPPED 2026-07-27 (v10 live)

App-side SOP search replaced Foundry File Search (single-tool architecture):

- `lib/sopIngest.ts` — parses the SOP .docx (pizzip + fast-xml-parser,
  `trimValues: false` is load-bearing), chunks by Heading1-4 breadcrumbs
  (354 chunks / 88 sections), embeds via `text-embedding-3-small`.
- `lib/sopSearch.ts` — cosine search with in-memory cache.
- `POST /api/agent/sop-ingest` (maintenance, multipart .docx, agent key) and
  `GET /api/agent/sop-search?query=` (8th spec operation `searchSopPolicy`).
- Cosmos collection `sopChunks`; an index on `order` was created manually
  (Cosmos Mongo rejects sorts on unindexed fields; code now also sorts
  in-memory as belt-and-suspenders).
- SOP 50 10 8 ingested to prod 2026-07-27 (~144s). Re-ingest on new editions:
  `curl -X POST .../api/agent/sop-ingest -H "x-agent-api-key: $KEY" -F "file=@SOP.docx"`

**Agent `sba-deal-copilot` v10 = live and fully working.** Single openapi
tool (8 ops), analyst instructions, and — critically —
`definition.reasoning = {effort: "low"}`.

### THIRD finding: gpt-5 medium reasoning stalls tool use

At default medium effort the model plans, ANNOUNCES ("Searching for the
project…"), and ends its turn without calling tools on multi-step prompts —
even with explicit anti-announce instructions. `effort: "low"` in the agent
definition fixed it completely (7 chained calls, 60s, full eligibility memo
with SOP citations). Reasoning cannot be overridden at invoke time when
`agent_reference` is used — it must live in the definition.

Acceptance test that passes: "Look up the CSRV Ventures project and assess:
is this franchise acquisition likely eligible under SOP 50 10? Cite SOP
sections." → chained project + SOP calls, cited Section A Ch 1 / Section B
Ch 1-2, flagged size-standard and sources/uses issues.

Remaining (all optional): Phase 3 chat panel (`/api/agent-chat` +
`agent_reference`, remember `reasoning` low), PQ-criteria doc for the SOP
store, delete junk agent versions, playground sanity check, file the two
platform bugs with Microsoft.

## What is proven working (do not re-debug these)

- **App API**: 7 read-only routes under `app/api/agent/*`, deployed and live
  on commit `ef3c873` (deployment completed 2026-07-24 20:30:48Z, active).
  - `GET /api/agent/projects?search=` (searchProjects)
  - `GET /api/agent/projects/{id}/summary|loan-application|financials|credit-summary|diligence-report|uploads`
- **Auth**: `x-agent-api-key` header, constant-time compare vs `AGENT_API_KEY`
  app setting (set on the app; single app, **no deployment slots**).
  Implementation: `lib/agentAuth.ts` (now logs every request:
  `[agent-api] <path> -> authorized | 401 (key mismatch) | 401 (no key header) | 503`).
- **Easy Auth exclusion**: `/api/agent/*` added to
  `authsettingsV2 globalValidation.excludedPaths` via `az rest` (portal UI
  can't do this; `az webapp auth update --excluded-paths` has a truncation bug
  — https://github.com/azure/azure-cli/issues/31803).
- **External reachability**: curl without key → JSON 401 from our code;
  with key → 200 with project JSON. Verified repeatedly.
- **OpenAPI spec**: `docs/agent-openapi.json`, server URL set to the real
  hostname `https://sbaprequalifier-cbg7h5athsdkgxgm.southcentralus-01.azurewebsites.net`.
  All 7 operations confirmed visible in the Foundry tool after paste.

## The evidence that localizes the failure to Foundry

App-side logging (deployed 20:30Z) captures every `/api/agent/*` hit.
Full log grep shows ONLY our two test markers:

```
20:35:21 [agent-api] /api/agent/projects?search=DEPLOYCHECK  -> 401 (no key header)
20:38:32 [agent-api] /api/agent/projects?search=DEPLOYCHECK2 -> 401 (no key header)
```

A minimal-agent playground run at ~20:44Z produced **no line at all** →
Foundry never sent the request.

## Chronology of symptoms (each was real and fixed in turn)

1. Agent claimed no tool access; instructions fix made it *willing* but tool
   wasn't bound (portal showed tool but runs lacked it).
2. Found tool auth was **Anonymous** → switched to API key + connection.
3. Still failing (stale binding — editing an OpenAPI tool's auth doesn't
   reliably persist; Microsoft Q&A confirms full recreation is the fix).
   → Tool deleted and recreated cleanly with auth at creation time.
4. One run then hit an explicit **guardrail block** ("safety and security
   control in this asset's Foundry guardrail") with a mangled `# no` code block.
5. Minimal isolation agent (`api-test`: only the OpenAPI tool, neutral
   instructions) says "having trouble *reaching* the project system" —
   attempts the call; app logs prove it never arrives.

## Foundry-side inventory

- **Foundry project**: same resource as the `gpt-5` deployment (eastus2,
  **Data Zone Standard** — deliberate: PII must stay in US data zone; do NOT
  switch to Global Standard).
- **Agents**: `sba-deal-copilot` (full: File Search + Web search + Code
  Interpreter + OpenAPI) and `api-test` (minimal: OpenAPI tool only) — use
  `api-test` for debugging.
- **Connection**: `bdo-app-agent-api` (Custom keys; key NAME must be exactly
  `x-agent-api-key`, value = AGENT_API_KEY). A second connection was also
  created during debugging — clean up duplicates once working.
- **Vector store**: `sba-deal-copilot-kb` (contains SOP 50 10 8 .docx).
  `text-embedding-3-small` deployment was auto-created for it — do not delete.
- **Quota**: gpt-5 DZ Standard maxed at 300K TPM. Options if limits bite again:
  request DZ quota increase (Operate → Quota), or deploy gpt-5-mini (DZ) for
  the agent (separate quota pool). Playground pacing: wait ~60s between runs.
- **Known guardrail behavior**: same resource's content filter previously
  blocked the Internal DD Test output (`content_filter` incomplete reason) —
  this resource's policy is strict; agent tool-calls being blocked by a
  sibling control is consistent.

## Useful commands (all verified working)

```bash
RG=rg-SBAPrequalifier
APP=SBAPrequalifier
HOST=sbaprequalifier-cbg7h5athsdkgxgm.southcentralus-01.azurewebsites.net

# Sanity: app reachable + gated (expect 401)
curl -i https://$HOST/api/agent/projects

# With key (expect 200)
curl -i -H "x-agent-api-key: <AGENT_API_KEY>" "https://$HOST/api/agent/projects?search=CSRV"

# THE evidence loop — run agent in playground, then check for arrivals:
az webapp log download -g $RG -n $APP --log-file logs.zip \
  && unzip -o -q logs.zip && grep -rh "agent-api" LogFiles/*default_docker.log | sort -u
# (live `az webapp log tail` does NOT relay these lines; download works)

# Request metrics fallback (1-min grain)
APPID=$(az webapp show -g $RG -n $APP --query id -o tsv)
az monitor metrics list --resource "$APPID" --metric "Requests" "Http2xx" "Http401" \
  --interval PT1M --offset 15m \
  --query "value[].{metric:name.value, nonzero:timeseries[0].data[?total>\`0\`].{t:timeStamp,n:total}}" -o json

# Easy Auth exclusions (read)
SUB=$(az account show --query id -o tsv)
BASE="https://management.azure.com/subscriptions/$SUB/resourceGroups/$RG/providers/Microsoft.Web/sites/$APP/config/authsettingsV2"
az rest --method get --url "$BASE/list?api-version=2022-03-01" --query "properties.globalValidation.excludedPaths"
```

## Gotchas learned (don't relearn these)

- `excludedPaths` entries are exact-match; the `/*` wildcard is required.
  Portal UI never shows excludedPaths — CLI/ARM only.
- `az webapp auth update --excluded-paths` corrupts values (open CLI bug);
  use the `az rest` GET→jq→PUT sequence in FOUNDRY-AGENT-SETUP.md.
- Editing an existing Foundry OpenAPI tool (esp. its auth) leaves stale
  bindings; delete + recreate, then save BOTH the tool and the agent, then
  test in a brand-new playground thread.
- Custom-keys connection: the key *name* becomes the HTTP header — must be
  exactly `x-agent-api-key`.
- Old playground threads carry prior failures as conversational precedent —
  always retest in a fresh thread.
- App is Linux App Service: `console.log` lands in container logs; enable with
  `az webapp log config --docker-container-logging filesystem`. The live tail
  stream is unreliable for these lines; `az webapp log download` is reliable.
- New portal nav: Management center → **Operate** section; connections under
  Operate → Admin → project; guardrails under Operate → Compliance; the
  "New Foundry" toggle in the top banner switches back to classic UI.
- Steady 1-request/5-min 401 pulse in metrics = availability probe, ignore.

## Parked / follow-ups (not blocking)

- Two conflicting instruction states: the main agent has assertive TOOL USE
  instructions; keep the neutral phrasing on `api-test` while guardrails are
  suspect ("ALWAYS/never" imperatives can trip prompt shields).
- Duplicate connection from debugging — delete the unused one once working.
- Offer stands: generate a "PQ Screening Criteria & Risk Scoring" markdown doc
  from `questionnaire_rules_export.json` + `risk_assessment_rules_export.json`
  for the vector store.
- Phase 3 (in-app chat panel via `/api/agent-chat` + `agent_reference`) —
  only after the playground works end-to-end.
- Web search tool on the agent sends query text to Bing (outside compliance
  boundary) — decide deliberately whether to keep it, given the PII stance.
- Housekeeping: `docker-container-logging` + web-server logging were enabled
  on the app for debugging; harmless, but can be turned off later.

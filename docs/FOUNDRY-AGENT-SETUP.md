# Foundry "SBA Deal Copilot" — Setup Guide

A custom agent in Microsoft Foundry that assists BDOs with SBA prequalification:
cited SOP 50 10 eligibility answers, borrower/industry web research, computed
DSCR math, and live project data from this app.

The app-side code (read-only `/api/agent/*` endpoints + shared-secret auth) is
already in the repo. Everything below happens in the Foundry portal / Azure,
in three phases — Phase 1 needs nothing from the app at all.

---

## Phase 1 — Create the agent (no app changes)

In the Foundry portal (ai.azure.com) → your project → **Agents** → **New agent**:

1. **Model**: the existing `gpt-5` deployment (same one the Internal DD Test tab
   uses — the content-filter policy you configured for it applies here too).
2. **Instructions** (starting point, tune as needed):

   > You are a commercial credit analyst at an SBA lender assisting Business
   > Development Officers with loan prequalification. The businesses and
   > individuals discussed are loan applicants who submitted their information
   > and consented to standard lender due diligence. Always cite your sources:
   > SOP section numbers for eligibility answers, document/file names for
   > uploaded-document answers, URLs for web research. Never estimate financial
   > figures that tools can provide — retrieve them. If data is missing, say
   > what is missing rather than guessing.

3. **Add tools** (Build → Tools, or the agent's tool list):
   - **File Search** — create a vector store and upload:
     - SBA **SOP 50 10** (current edition PDF from sba.gov)
     - the bank's internal credit policy / PQ checklist
     - the SBA Franchise Directory export (if used)
   - **Web search** — same Bing-backed grounding as the Internal DD Test.
     Same caveat: search query text leaves the tenant.
   - **Code Interpreter** — for DSCR / debt-schedule / sources-and-uses math.

4. **Validate in the Agents playground** before doing any integration work:
   - Ask an eligibility question ("Is a franchise acquisition of a tax-prep
     business eligible under SOP 50 10? Cite the section.") → expect a cited answer.
   - Ask a DSCR calculation with stated numbers → expect a Code Interpreter run.

## Phase 2 — Connect the agent to the app (OpenAPI tool)

### 2a. App side

1. Generate a long random secret (e.g. `openssl rand -hex 32`).
2. Set `AGENT_API_KEY=<secret>` in the App Service application settings on the
   slot(s) the agent should read from (settings are per-slot).
3. **Exclude the agent routes from Easy Auth** (Easy Auth 401s everything at the
   edge before the app sees it — same procedure as the Zoho webhook). Per slot:

   Use `az rest` (works in Azure Cloud Shell; `az webapp auth update`'s
   `--excluded-paths` flag has an open bug that corrupts the value —
   https://github.com/azure/azure-cli/issues/31803). For a deployment slot,
   insert `/slots/<slot>` after the site name in BASE.

   ```bash
   RG=<resource-group>
   APP=<app-name>
   SUB=$(az account show --query id -o tsv)
   BASE="https://management.azure.com/subscriptions/$SUB/resourceGroups/$RG/providers/Microsoft.Web/sites/$APP/config/authsettingsV2"

   # Current exclusions:
   az rest --method get --url "$BASE/list?api-version=2022-03-01" \
     --query "properties.globalValidation.excludedPaths"

   # Append /api/agent/* (preserves existing entries):
   az rest --method get --url "$BASE/list?api-version=2022-03-01" \
     | jq '{properties} | .properties.globalValidation.excludedPaths =
           ((.properties.globalValidation.excludedPaths // []) + ["/api/agent/*"] | unique)' \
     > authv2.json
   az rest --method put --url "$BASE?api-version=2022-03-01" --body @authv2.json

   # Confirm:
   az rest --method get --url "$BASE/list?api-version=2022-03-01" \
     --query "properties.globalValidation.excludedPaths"
   ```

   The `/*` wildcard is REQUIRED — entries are exact-match otherwise, and
   nothing is served at the bare `/api/agent` path. The portal UI does not
   expose excludedPaths; CLI/ARM is the only way to set it.
4. Verify from outside the network:

   ```bash
   # 401 (past Easy Auth, rejected by our shared-secret check):
   curl -i https://<app-host>/api/agent/projects

   # 200 with JSON:
   curl -i -H "x-agent-api-key: <secret>" "https://<app-host>/api/agent/projects?search=test"
   ```

### 2b. Foundry side

1. **Project connection for the key**: project → Management center →
   **Connections** → new **Custom keys / API key** connection holding the same
   secret value.
2. **OpenAPI tool**: add an OpenAPI tool to the agent using
   `docs/agent-openapi.json` from this repo:
   - Replace the `servers[0].url` placeholder with the real app hostname first.
   - Auth: **API key**, referencing the connection from step 1. The spec already
     declares the `x-agent-api-key` header scheme.
3. **Test in the playground**: "Summarize the <business name> project" — the run
   trace should show `searchProjects` then `getProjectSummary` calls.

### Endpoints the agent gets (all read-only, SSN/DOB redacted)

| Operation | Route |
|---|---|
| searchProjects | `GET /api/agent/projects?search=` |
| getProjectSummary | `GET /api/agent/projects/{id}/summary` |
| getLoanApplication | `GET /api/agent/projects/{id}/loan-application` |
| getFinancialSpreads | `GET /api/agent/projects/{id}/financials` |
| getCreditSummary | `GET /api/agent/projects/{id}/credit-summary` |
| getDiligenceReport | `GET /api/agent/projects/{id}/diligence-report` |
| listBorrowerUploads | `GET /api/agent/projects/{id}/uploads` |

### Optional: SharePoint tool (preview)

The Foundry SharePoint tool can ground the agent on the per-project borrower
document folders directly. It is **preview**, runs through the M365 Copilot API
(license/identity constraints, acts on behalf of the signed-in user), and its
folder scoping is coarse — trial it, but don't build workflows on it yet. The
`listBorrowerUploads` + extraction data via the OpenAPI tool is the dependable
path today.

## Phase 3 — Embed in the app (later)

A "Copilot" chat panel on the BDO project page: a new `/api/agent-chat` route
calls the Foundry project endpoint with the OpenAI client
(`responses.create` + `agent_reference`) and streams NDJSON exactly like the
DD panel (`hooks/useInternalDdTest.ts` is the template). Not built yet —
do this once Phases 1–2 prove out.

## Security notes

- All agent routes are **read-only** and live under one path prefix.
- Auth is a constant-time shared-secret check (`lib/agentAuth.ts`), failing
  closed when `AGENT_API_KEY` is unset (503).
- Full SSNs and DOBs are redacted server-side before responses leave the app;
  credit responses omit identity hashes and raw report references.
- Rotating the key = update the App Service setting + the Foundry connection.

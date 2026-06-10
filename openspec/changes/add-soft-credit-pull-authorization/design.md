## Context

`IndividualApplicant` records are embedded as an array inside each project's
`loanApplications` document (`lib/schema.ts:12`), each with a UUID `id`. The same
person can appear as separate applicant records across projects, and a Zoho
submission arrives with **no project/applicant context** — only the person's
self-entered details. The webhook is a public endpoint (Zoho cannot perform an
Auth0 login).

## Goals / Non-Goals

- Goals
  - Button disabled by default; enabled only when a matching authorization exists.
  - Robust to submission order (form may arrive before or after the applicant
    record is created).
  - Idempotent webhook (Zoho may retry).
  - Easy future upgrade from name-only matching to a stronger key.
- Non-Goals
  - Storing or validating the signature image itself beyond a reference/URL.
  - Per-project scoping of authorization (a person's consent applies wherever
    they appear by name).
  - Changing the credit-pull mechanics downstream of the button.

## Decisions

- **Decision: Standalone `creditPullAuthorizations` collection as source of
  truth, queried by `nameKey` at render time** — rather than flipping a boolean
  on the embedded applicant. A standalone record survives applicants being
  added after the form arrives and applies across projects, and avoids mutating
  every matching project document on each submission.
  - Alternatives considered:
    - *Flag on the embedded applicant*: requires the webhook to scan every
      `loanApplications` doc and misses applicants created later. Rejected.
    - *Reuse `creditPulls`*: conflates "authorized to pull" with "pull
      performed". Rejected.

- **Decision: Match on name + DOB.** The match key is a normalized name
  (`firstName` + `lastName`) AND a normalized date of birth. Requiring DOB sharply
  reduces the false matches that name-only allows (e.g. two "John Smith"s).

- **Decision: One shared module `lib/nameKey.ts`** used by both the writer
  (webhook) and reader (status check), exporting `nameKey`/`nameKeyFromFull` and
  `dobKey`. Name normalization = lowercase → strip diacritics (NFKD) → remove
  non-letter/space → collapse whitespace → join `firstName` + `lastName`
  (middle/suffix ignored). DOB normalization = parse `MM/DD/YYYY` or ISO
  `YYYY-MM-DD` → `YYYYMMDD` digit string (no separators), '' if unparseable.
  Both sides MUST import the same functions so keys never drift.

- **Decision: Shared-secret auth via custom header.** Zoho Forms supports custom
  headers (alphanumeric + `_ . -`). The webhook compares a configured
  `ZOHO_WEBHOOK_SECRET` using a constant-time comparison and returns 401 on
  mismatch or absence. Endpoint must NOT call `verifyAuth`.

- **Decision: Capture `ssnLast4` now too.** Strengthening the match further
  later (e.g. adding `ssnLast4`) becomes a matcher-only change, with data already
  present.

- **Decision: Button reads status via a small authed GET keyed by name + DOB.**
  The button already has `prefill` (incl. `dateOfBirth`); it calls
  `GET /api/credit-pull/authorization?firstName=...&lastName=...&dob=...` on mount
  and sets `disabled = !projectId || !authorized`.

## Risks / Trade-offs

- **Residual false matches** (permanent + cross-project): name + DOB collisions
  are rare but possible. → SSN-last-4 is captured so the key can be tightened
  further; documented as a known limitation in the spec.
- **DOB must be present on both sides**: an applicant with no DOB entered, or a
  submission with an unparseable DOB, can never match → button stays disabled.
  This is intentional (can't verify identity without it).
- **Public endpoint abuse**: shared secret is the only gate. → Constant-time
  compare, secret in Key Vault/App Settings, log unauthorized attempts; optional
  HMAC upgrade noted as future work.
- **Stale UI**: applicant tabs are force-mounted, so a newly-arrived
  authorization won't reflect until the component refetches. → Fetch on mount;
  optional poll/manual refresh deferred unless requested.
- **SSN in payload**: never store full SSN; keep last 4 only; do not log the raw
  payload at info level in production.

## Migration Plan

- Add `ZOHO_WEBHOOK_SECRET` to all three Azure slots before deploying.
- **Exclude the webhook path from Azure Easy Auth.** The App Service has
  Microsoft Entra ID (Easy Auth) with `requireAuthentication: true`, so it
  returns a login redirect/401 for ALL requests *before* they reach Next.js —
  including the public webhook. Add `/api/webhooks/zoho/credit-auth` to
  `properties.globalValidation.excludedPaths` in the site's `authsettingsV2`
  config (per slot). There is no Portal UI for this — use Cloud Shell / Resource
  Explorer. Without this the endpoint is unreachable by Zoho and nothing reaches
  the app logs. See [[azure-easy-auth-excluded-paths]].
- Configure the Zoho form webhook (JSON, POST, custom secret header, field map).
- No data backfill: existing applicants start disabled until a form is received.
- Rollback: re-enabling the button unconditionally is a one-line revert of the
  `disabled` expression.

## Zoho Forms field mapping

The webhook parses by **parameter name** (the key we control in Zoho's webhook
config), not by the form's display label. Configure the webhook with these
parameter names mapped to the corresponding form fields:

| Parameter name (key) | Zoho form field (label) |
| --- | --- |
| `firstName` | First Name |
| `lastName` | Last Name |
| `ssn` | SSN |
| `dob` | DOB |
| `email` | Email |
| `cellPhone` | Cell Phone |
| `addressLine1` | Address - Site Address |
| `addressLine2` | Address - Site Address 2 |
| `city` | Address - City |
| `state` | Address - State |
| `zip` | Address - Zip Code |
| `country` | Address - Country |
| `submissionId` | Submitted Email ID (used as the idempotency key) |
| `submittedAt` *(optional)* | Submission/Added time, if exposed |

Notes:
- The Address widget in Zoho exposes its parts as separate fields prefixed with
  `Address - ` (e.g. `Address - City`, `Address - State`, `Address - Zip Code`).
  We map each to a flat parameter; the webhook stores both the structured
  `addressComponents` and a single composed `address` string.
- **Signature is intentionally unmapped** — Zoho Forms does not expose the
  signature image in the webhook payload; `signatureRef` stays null and the
  signed entry remains in Zoho.
- If the form ever uses a single combined name field instead of First/Last,
  map it to `name` and the normalizer splits it.

## Open Questions

- Whether near-real-time enabling (poll) is desired vs. enable-on-reload.

## 1. Data layer

- [x] 1.1 Add `CREDIT_PULL_AUTHORIZATIONS: 'creditPullAuthorizations'` to `COLLECTIONS` in `lib/cosmosdb.ts`
- [x] 1.2 Register an index on `{ nameKey: 1 }` (and a unique index on `zohoSubmissionId`) in `ensureIndexes`
- [x] 1.3 Add a `CreditPullAuthorization` type (nameKey, raw name, firstName, lastName, ssnLast4, dob, email, phone, address, signatureRef, zohoSubmissionId, submittedAt, receivedAt, source)

## 2. Shared name normalizer

- [x] 2.1 Create `lib/nameKey.ts` exporting `nameKey(first, last)` and `nameKeyFromFull(name)` (lowercase, strip diacritics, remove non-letter/space, collapse spaces, first+last only)
- [x] 2.2 Add unit-level sanity coverage notes for diacritics, casing, extra spaces, middle-name omission

## 3. Zoho webhook endpoint

- [x] 3.1 Create `app/api/webhooks/zoho/credit-auth/route.ts` (POST, public — no `verifyAuth`)
- [x] 3.2 Validate `ZOHO_WEBHOOK_SECRET` from the configured custom header via constant-time compare; 401 on missing/mismatch
- [x] 3.3 Parse the Zoho JSON payload with tolerant field lookup; extract name, ssnLast4, dob, email, phone, and the six `Address - *` components (compose a full address + keep structured parts). Signature is unmapped (Zoho does not expose it)
- [x] 3.4 Compute `nameKey` and upsert into `creditPullAuthorizations` keyed by `zohoSubmissionId` (idempotent)
- [x] 3.5 Call `logAuditEvent(...)` for received + unauthorized attempts; never log full SSN/raw payload at info level in prod
- [x] 3.6 Return 200 on success with a minimal body

## 4. Authorization status endpoint

- [x] 4.1 Create `app/api/credit-pull/authorization/route.ts` GET (authed via `verifyAuth`)
- [x] 4.2 Accept `?name=` (or first/last); compute `nameKey`; return `{ authorized, authorizedAt }`

## 5. UI gating

- [x] 5.1 In `CreditPullButton.tsx`, fetch authorization status on mount (alongside history)
- [x] 5.2 Change button to `disabled={!projectId || !authorized}`; keep `disabled:opacity-50`
- [x] 5.3 Update tooltip/title for the unauthorized state ("Awaiting signed Soft Credit Pull Authorization form")

## 6. Configuration & docs

- [x] 6.1 Add `ZOHO_WEBHOOK_SECRET` to Azure App Settings (dev/staging/prod) and env example
- [x] 6.2 Document the Zoho form webhook setup (JSON body, POST, custom secret header, field→parameter map — see `design.md` "Zoho Forms field mapping")

## 7. Verification

- [ ] 7.1 Send a test Zoho submission; confirm record stored and button enables for the matching applicant
- [ ] 7.2 Confirm button stays disabled for non-matching applicants and when the secret is wrong (401)

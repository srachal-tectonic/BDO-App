# Change: Gate Soft Credit Pull on a signed Zoho authorization form

## Why

The Soft Credit Pull button (`components/loan-sections/CreditPullButton.tsx`) is
currently always available once a project is saved. Pulling a consumer's credit
requires their signed authorization (FCRA permissible purpose). We now collect
that consent through a Zoho "Soft Credit Pull Authorization Form" (Name, Cell
Phone, SSN, DOB, Email, Address, Signature). We need the button to be **disabled
by default** and to **enable only after a matching signed authorization has been
received** for that individual applicant.

## What Changes

- Soft Credit Pull button now defaults to **disabled/greyed-out** for every
  individual applicant. **BREAKING** behavior change: BDOs can no longer pull
  credit until an authorization is on file.
- Add a **public webhook endpoint** that Zoho Forms POSTs to on each submission,
  authenticated by a shared secret token in a custom header.
- Persist each authorization in a new Cosmos collection
  (`creditPullAuthorizations`), keyed by a normalized name.
- Match an incoming submission to applicants by **normalized name (first + last)
  AND normalized date of birth** (`YYYYMMDD`, digits only — robust to
  `MM/DD/YYYY` vs ISO). SSN-last-4 is also captured so the key can be
  strengthened further later without re-plumbing.
- Authorization is **permanent** once received (no expiry, not consumed by use).
- Add an authenticated endpoint the button uses to check authorization status.

## Impact

- Affected specs: `credit-pull-authorization` (new capability)
- Affected code:
  - `lib/cosmosdb.ts` (new `CREDIT_PULL_AUTHORIZATIONS` collection + index)
  - `lib/nameKey.ts` (new shared name normalizer)
  - `app/api/webhooks/zoho/credit-auth/route.ts` (new public webhook)
  - `app/api/credit-pull/authorization/route.ts` (new authed status check)
  - `components/loan-sections/CreditPullButton.tsx` (gate the button)
  - Azure App Settings: new `ZOHO_WEBHOOK_SECRET` (dev/staging/prod)

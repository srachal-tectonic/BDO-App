# Audit Logging Implementation Plan

## Executive Summary

This document breaks down the work required to add comprehensive audit logging across the BDO App. The goal is to track **who** did **what**, **when**, and capture **before/after values** for all meaningful data changes.

**Current state:** A stub audit log module exists at `lib/auditLog.ts` with types and helper functions defined, but all functions only `console.log()`. Two API routes (`sharepoint/upload`, `broker/upload`) already call audit helpers, but the data goes nowhere persistent.

**Target state:** Every mutation in the app writes a structured audit event to a dedicated Cosmos DB collection, queryable by project, user, action type, and time range.

---

## Architecture Overview

### New Cosmos DB Collection: `auditLogs`

```typescript
// Add to lib/cosmosdb.ts COLLECTIONS
AUDIT_LOGS: 'auditLogs'

// Document schema
interface AuditLogEntry {
  id: string;                    // auto-generated
  timestamp: string;             // ISO 8601
  action: AuditAction;           // e.g. 'field_updated', 'file_uploaded', 'user_login'
  category: AuditCategory;       // e.g. 'auth', 'project', 'loan_application', 'file', 'admin'
  userId: string;                // Auth0 user ID
  userEmail: string;             // human-readable
  userName: string;              // display name
  projectId?: string;            // associated project (if applicable)
  resourceType: string;          // 'project' | 'loanApplication' | 'file' | 'note' | etc.
  resourceId: string;            // ID of the affected record
  summary: string;               // human-readable: "Changed Business Name from 'Acme' to 'Acme Corp'"
  changes?: FieldChange[];       // field-level diff (for updates)
  metadata?: Record<string, unknown>; // extra context (file size, IP, etc.)
  ipAddress?: string;
  userAgent?: string;
}

interface FieldChange {
  field: string;                 // dot-path: "businessApplicant.legalName"
  label: string;                 // human-readable: "Business Legal Name"
  oldValue: unknown;
  newValue: unknown;
}

type AuditCategory = 'auth' | 'project' | 'loan_application' | 'file' | 'financial' | 'admin' | 'portal' | 'note';
```

### Indexes Required

```typescript
// In lib/cosmosdb.ts ensureIndexes()
if (collectionName === 'auditLogs') {
  await col.createIndex({ projectId: 1, timestamp: -1 }).catch(() => {});
  await col.createIndex({ userId: 1, timestamp: -1 }).catch(() => {});
  await col.createIndex({ action: 1, timestamp: -1 }).catch(() => {});
  await col.createIndex({ category: 1, timestamp: -1 }).catch(() => {});
  await col.createIndex({ timestamp: -1 }).catch(() => {});
}
```

---

## Implementation Phases

### Phase 1: Core Infrastructure (Foundation)

**Goal:** Build the reusable audit logging engine so all subsequent phases just call it.

#### Task 1.1: Implement `logAuditEvent()` in `lib/auditLog.ts`

Replace the current `console.log` stub with real Cosmos DB persistence.

**File:** `lib/auditLog.ts`

- Replace `logAuditEvent()` to write to `COLLECTIONS.AUDIT_LOGS`
- Add `id` generation (`audit-{timestamp}-{random}`)
- Add `timestamp` automatically
- Keep `console.log` as a secondary output for dev visibility
- Add error handling that doesn't break the calling route (fire-and-forget with `catch`)

#### Task 1.2: Add diff utility `lib/auditDiff.ts`

Create a generic object diff function that compares old vs. new state and returns `FieldChange[]`.

```typescript
// lib/auditDiff.ts
export function diffObjects(
  oldObj: Record<string, any>,
  newObj: Record<string, any>,
  fieldLabels?: Record<string, string>  // maps dot-paths to human labels
): FieldChange[]
```

- Handles nested objects (dot-path notation)
- Ignores `_id`, `updatedAt`, `createdAt` (metadata fields)
- Supports a label map so logs show "Business Legal Name" not "businessApplicant.legalName"
- Handles arrays (individual applicants, financing sources) with add/remove/modify detection

#### Task 1.3: Add `AUDIT_LOGS` to `COLLECTIONS` in `lib/cosmosdb.ts`

- Add collection constant
- Add index definitions in `ensureIndexes()`

#### Task 1.4: Add server-side user context helper

Many API routes currently don't know who the caller is. Create a helper to extract user info from the request.

**File:** `lib/auditLog.ts` (or `lib/apiAuth.ts`)

```typescript
export function getAuditUser(request: NextRequest): { userId: string; userEmail: string; userName: string } | null
```

- Extract from Auth0 session / Authorization header
- Fallback to request body fields (`createdBy`, `createdByName`) where available

---

### Phase 2: Authentication Events

**Goal:** Track login, logout, and failed authentication attempts.

#### Task 2.1: Login tracking

**File:** `app/api/auth/[auth0]/route.ts`

- Log `user_login` after successful Auth0 callback
- Capture: userId, email, IP address, user agent, timestamp

#### Task 2.2: Logout tracking

- Log `user_logout` when session ends
- Capture: userId, email, timestamp

#### Task 2.3: Failed login attempts

- Log `login_failed` for bad credentials, expired sessions, blocked accounts
- Capture: attempted email, IP address, failure reason

#### Task 2.4: Borrower portal access

**File:** `app/api/forms/[token]/route.ts`

- Log when a borrower accesses the portal via token
- Capture: token (prefix only for security), projectId, IP, timestamp

---

### Phase 3: Project Lifecycle Events

**Goal:** Track creation, updates, status changes, and deletion of projects.

#### Task 3.1: Project creation

**File:** `app/api/projects/route.ts` (POST handler)

- Log `project_created` after `insertOne`
- Capture: projectId, projectName, businessName, loanAmount, creator

#### Task 3.2: Project updates (field-level tracking)

**File:** `app/api/projects/[id]/route.ts` (PUT handler)

This is a **critical** route — it's the generic project update endpoint. Currently it blindly applies `{ ...updates }` with no diffing.

- Before `findOneAndUpdate`, fetch the current document
- Diff old vs. new using `diffObjects()`
- Log `project_updated` with the `FieldChange[]` array
- Each change entry shows: field name, old value, new value, who changed it

**Key fields to track with human-readable labels:**
| Field Path | Label |
|---|---|
| `projectName` | Project Name |
| `businessName` | Business Name |
| `loanAmount` | Loan Amount |
| `stage` | Project Stage/Status |
| `bdoUserId` | Assigned BDO |
| `bdoUserName` | Assigned BDO Name |
| `businessType` | Business Type |
| `loanType` | Loan Type |

#### Task 3.3: Project stage/status changes

**File:** `app/api/projects/[id]/route.ts` (PUT handler)

- Detect when `stage` field changes specifically
- Log a dedicated `status_changed` event with old and new stage
- This is high-visibility — should appear prominently in activity feeds

#### Task 3.4: Project deletion (soft delete)

**File:** `app/api/projects/[id]/route.ts` (DELETE handler)

- Log `project_deleted` with projectId, who deleted it
- Log `project_restored` when `deletedAt` is set back to null

---

### Phase 4: Loan Application Field Changes

**Goal:** Track every field change in the loan application with old/new values. This is the most complex phase because loan apps auto-save every 30 seconds.

#### Task 4.1: Loan application save with diffing

**File:** `app/api/projects/[id]/loan-application/route.ts` (PUT handler)

- Before `updateOne`, fetch the existing document
- Diff the entire application data structure
- Log `loan_application_updated` with all `FieldChange[]` entries
- **Debounce strategy:** Since auto-save fires every 30s, batch changes that happen within a short window. Options:
  - Option A: Only log if there are actual field diffs (skip no-op saves)
  - Option B: Aggregate changes per-user per-session into a single log entry updated on each save
  - **Recommended: Option A** — simplest, and no-op saves are common

**Key sections to track with labels:**

| Section | Example Fields |
|---|---|
| `businessApplicant.*` | Legal Name, DBA, EIN, Address, Phone, etc. |
| `individualApplicants[].` | First Name, Last Name, SSN, DOB, Ownership %, etc. |
| `projectOverview.*` | Project Name, Industry, NAICS, Description, BDO, BDA |
| `sbaEligibility.*` | All eligibility questions |
| `sellerInfo.*` | Seller name, relationship, price |
| `sourcesUses7a.*` | Loan Amount, Equity Injection, Purchase Price, etc. |
| `sourcesUses504.*` | (same structure, different loan type) |
| `sourcesUsesExpress.*` | (same structure, different loan type) |
| `personalFinancialStatements.*` | All PFS fields per applicant |
| `otherOwnedBusinesses.*` | Business name, ownership, industry |
| `financingSources[]` | Financing type, amount, rate, term |
| `feeDisclosure.*` | Fee Disclosure 159 form fields |

#### Task 4.2: Individual applicant add/remove

- Log `applicant_added` when a new individual applicant is added
- Log `applicant_removed` when one is deleted
- Include applicant name in summary

#### Task 4.3: PDF import / envelope PDF apply

**File:** `app/api/projects/[id]/envelope-pdf/apply/route.ts`

- Log `pdf_data_imported` with count of fields applied
- Capture: fileName, extractedFieldCount, appliedFieldCount
- Diff the loan application before/after the merge

**File:** `app/api/projects/[id]/borrower-uploads/[uploadId]/apply/route.ts`

- Log `borrower_upload_applied` with extraction details

---

### Phase 5: File Operations

**Goal:** Track all file uploads, downloads, and deletions.

#### Task 5.1: SharePoint file uploads (already partially done)

**File:** `app/api/sharepoint/upload/route.ts`

- Already calls `logFileUpload()` — just needs the real implementation (Phase 1)
- Log: fileName, fileSize, subfolder, applicantName, projectId, uploader

#### Task 5.2: Broker file uploads (already partially done)

**File:** `app/api/broker/upload/route.ts`

- Already calls `logBrokerUpload()` — just needs real implementation
- Log: fileName, fileSize, broker token prefix, projectId

#### Task 5.3: Borrower portal file uploads

**File:** `app/api/forms/[token]/upload/route.ts`

- Log `borrower_file_uploaded` 
- Capture: fileName, fileSize, projectId, token prefix

#### Task 5.4: File downloads

**Files:**
- `app/api/generated-forms/[id]/download/route.ts`
- `app/api/forms/[token]/download/[formId]/route.ts`
- `app/api/projects/[id]/borrower-uploads/[uploadId]/download/route.ts`

- Log `file_downloaded` for each
- Capture: fileName, projectId, who downloaded

#### Task 5.5: Borrower upload deletion

**File:** `app/api/projects/[id]/borrower-uploads/[uploadId]/route.ts` (DELETE handler)

- Log `file_deleted` with fileName, projectId, who deleted

---

### Phase 6: Financial Spreads

**Goal:** Track spreadsheet uploads, activation, and deletion.

#### Task 6.1: Spread upload

**File:** `app/api/projects/[id]/financials/route.ts` (POST handler)

- Log `spread_uploaded` with: fileName, versionLabel, projectId, uploader

#### Task 6.2: Spread activation/deactivation

**File:** `app/api/projects/[id]/financials/route.ts` (PATCH handler)

- Log `spread_activated` or `spread_deactivated`
- Capture: spreadId, versionLabel, projectId

#### Task 6.3: Spread deletion

**File:** `app/api/projects/[id]/financials/route.ts` (DELETE handler)

- Log `spread_deleted` with: spreadId, projectId, who deleted

---

### Phase 7: Admin & Settings Changes

**Goal:** Track all administrative configuration changes.

#### Task 7.1: Admin settings updates

**File:** `app/api/admin-settings/route.ts` (PUT handler)

- Fetch current settings before `replaceOne`
- Diff old vs. new
- Log `admin_settings_updated` with all changes
- Key settings: risk rules, questionnaire rules, scoring thresholds, UI config

#### Task 7.2: Questionnaire rule changes

- Log `questionnaire_rule_created`, `questionnaire_rule_updated`, `questionnaire_rule_deleted`
- Already has stubs in `auditLog.ts` — just needs real persistence

#### Task 7.3: PDF template changes

**Files:**
- `app/api/pdf-templates/route.ts`
- `app/api/pdf-templates/[id]/route.ts`

- Log `pdf_template_created`, `pdf_template_updated`, `pdf_template_deleted`

---

### Phase 8: Portal Token Management

**Goal:** Track portal token lifecycle.

#### Task 8.1: Token creation

**File:** `app/api/projects/[id]/portal-token/route.ts` (POST handler)

- Log `portal_token_created` with: projectId, createdBy, expiresAt
- Already has `createdBy`/`createdByName` in the request body

#### Task 8.2: Token revocation

**File:** `app/api/projects/[id]/portal-token/route.ts` (DELETE handler)

- Log `portal_token_revoked` with: projectId, who revoked

#### Task 8.3: Broker token management

**File:** `app/api/broker/tokens/route.ts` and `app/api/broker/tokens/[tokenId]/route.ts`

- Log creation, revocation of broker tokens
- Already has stubs in `auditLog.ts`

---

### Phase 9: Notes

**Goal:** Track note creation (and future edit/delete).

#### Task 9.1: Note creation

**File:** `app/api/projects/[id]/notes/route.ts` (POST handler)

- Log `note_created` with: projectId, noteId, createdBy
- Include note content snippet (first 100 chars) in summary

---

### Phase 10: Audit Log UI

**Goal:** Make the audit trail visible and queryable in the app.

#### Task 10.1: Audit log API endpoint

**File:** `app/api/projects/[id]/audit-log/route.ts` (new)

```typescript
// GET /api/projects/:id/audit-log?page=1&limit=50&category=loan_application&userId=xxx
```

- Query `auditLogs` collection filtered by projectId
- Support pagination, filtering by category/user/date range
- Sort by timestamp descending

#### Task 10.2: Global audit log endpoint (admin)

**File:** `app/api/audit-log/route.ts` (new)

- Admin-only endpoint for cross-project audit queries
- Filter by user, date range, action type
- For compliance/investigation use cases

#### Task 10.3: Project activity timeline component

**File:** `components/AuditTimeline.tsx` (new)

- Displays chronological activity feed for a project
- Shows: who, what, when, with expandable change details
- Color-coded by category (auth=blue, field change=green, file=purple, etc.)
- Filterable by category and user

#### Task 10.4: Integration into project page

**File:** `app/bdo/projects/[id]/page.tsx`

- Add "Activity" tab or sidebar panel
- Load audit timeline for the current project
- Show recent activity count badge

---

## File Impact Summary

### Files to Modify

| File | Changes |
|---|---|
| `lib/auditLog.ts` | Replace stubs with real Cosmos DB persistence |
| `lib/cosmosdb.ts` | Add `AUDIT_LOGS` collection + indexes |
| `app/api/projects/route.ts` | Add logging to POST (create) |
| `app/api/projects/[id]/route.ts` | Add diffing + logging to PUT, DELETE |
| `app/api/projects/[id]/loan-application/route.ts` | Add diffing + logging to PUT |
| `app/api/projects/[id]/financials/route.ts` | Add logging to POST, PATCH, DELETE |
| `app/api/projects/[id]/notes/route.ts` | Add logging to POST |
| `app/api/projects/[id]/portal-token/route.ts` | Add logging to POST, DELETE |
| `app/api/projects/[id]/envelope-pdf/apply/route.ts` | Add logging to POST |
| `app/api/projects/[id]/borrower-uploads/[uploadId]/route.ts` | Add logging to DELETE |
| `app/api/projects/[id]/borrower-uploads/[uploadId]/apply/route.ts` | Add logging to POST |
| `app/api/admin-settings/route.ts` | Add diffing + logging to PUT |
| `app/api/auth/[auth0]/route.ts` | Add login/logout logging |
| `app/api/forms/[token]/route.ts` | Add portal access logging |
| `app/api/forms/[token]/upload/route.ts` | Add upload logging |
| `app/api/broker/tokens/route.ts` | Add token creation logging |
| `app/api/broker/tokens/[tokenId]/route.ts` | Add token revocation logging |
| `app/api/pdf-templates/route.ts` | Add template CRUD logging |
| `app/api/pdf-templates/[id]/route.ts` | Add template CRUD logging |
| `app/api/sharepoint/upload/route.ts` | Already calls audit — works once Phase 1 done |
| `app/api/broker/upload/route.ts` | Already calls audit — works once Phase 1 done |
| `app/bdo/projects/[id]/page.tsx` | Add activity tab/panel |

### Files to Create

| File | Purpose |
|---|---|
| `lib/auditDiff.ts` | Object diff utility for field-level change tracking |
| `lib/fieldLabels.ts` | Human-readable labels for all tracked fields |
| `app/api/projects/[id]/audit-log/route.ts` | Per-project audit log query endpoint |
| `app/api/audit-log/route.ts` | Global admin audit log endpoint |
| `components/AuditTimeline.tsx` | Activity timeline UI component |

---

## Priority & Effort Estimates

| Phase | Priority | Complexity | Dependencies |
|---|---|---|---|
| Phase 1: Infrastructure | P0 - Must do first | Medium | None |
| Phase 2: Auth events | P1 | Low | Phase 1 |
| Phase 3: Project lifecycle | P0 | Medium | Phase 1 |
| Phase 4: Loan app fields | P0 | High | Phase 1 |
| Phase 5: File operations | P1 | Low | Phase 1 |
| Phase 6: Financial spreads | P2 | Low | Phase 1 |
| Phase 7: Admin/settings | P1 | Medium | Phase 1 |
| Phase 8: Portal tokens | P2 | Low | Phase 1 |
| Phase 9: Notes | P3 | Low | Phase 1 |
| Phase 10: Audit UI | P1 | High | Phases 1-5 |

---

## Key Design Decisions

### 1. Fire-and-forget logging
Audit log writes should **never** block or fail the original operation. Wrap all `logAuditEvent()` calls in `.catch()` so a logging failure doesn't break the user's action.

### 2. Auto-save debouncing
The loan application auto-saves every 30 seconds. To avoid flooding the audit log:
- Only log when actual field diffs exist (skip no-op saves)
- Consider grouping rapid changes (< 60s apart by same user on same project) into a single entry

### 3. Sensitive data handling
- **Never log full SSN** — mask to last 4 digits in audit entries
- **Never log full passwords or tokens** — use prefixes only
- PII fields should be logged as "changed" but with masked values

### 4. Retention policy
- Consider a TTL index on the `auditLogs` collection (e.g., 2 years)
- Or implement archival to Azure Blob Storage for long-term compliance

### 5. User identity propagation
Many current API routes don't receive user identity. The PUT `/api/projects/[id]` handler, for example, gets `updates` from the request body but no user info. Options:
- **Option A (recommended):** Pass user info via request headers (Auth0 session already available)
- **Option B:** Add `updatedBy`/`updatedByName` to every request body from the client
- Most routes will need the `getAuditUser()` helper from Phase 1

---

## Existing Infrastructure to Leverage

| What Exists | Where | Status |
|---|---|---|
| `AuditAction` type (19 actions) | `lib/auditLog.ts` | Defined, needs expanding |
| `AuditEvent` interface | `lib/auditLog.ts` | Defined, needs `changes[]` field |
| `logFileUpload()` helper | `lib/auditLog.ts` | Stub, needs real impl |
| `logBrokerUpload()` helper | `lib/auditLog.ts` | Stub, needs real impl |
| `logBrokerTokenCreated()` helper | `lib/auditLog.ts` | Stub, needs real impl |
| `logSecurityEvent()` helper | `lib/auditLog.ts` | Stub, needs real impl |
| `getClientIp()` helper | `lib/auditLog.ts` | Working |
| `verifyAuth()` | `lib/apiAuth.ts` | Working (returns userId, email) |
| `createdBy`/`updatedBy` fields | `types/index.ts` | On ~8 interfaces already |
| Timestamps on all records | All API routes | `createdAt`/`updatedAt` auto-set |

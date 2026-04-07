# Latest Updates — April 6, 2026

## 1. Dev Login Bypass

Added a development-only login bypass so the app can be used without Microsoft Entra ID configured.

**How to use:** Go to `/bdo/login`, enter `srachal@tectonicfinancial.com` with any password. You'll be logged in as Admin and redirected to `/bdo/projects`.

**Files changed:**
- `contexts/FirebaseAuthContext.tsx` — `signIn()` recognizes dev email, sets Admin role, persists session to localStorage. `logout()` clears the session. Session restores on page reload.
- `lib/authenticatedFetch.ts` — `getAuthToken()` reads dev token from localStorage so authenticated API calls work.
- `lib/apiAuth.ts` — `verifyAuth()` accepts the dev token server-side, returning user identity for API routes.

All gated behind `NODE_ENV === 'development'` — none of this activates in staging or production.

---

## 2. Complete Firebase / Firestore / Google Cloud / Zoho Removal

Removed all Firebase, Firestore, Google Cloud Build, and Zoho integrations from the entire codebase. The app now uses in-memory stores for development.

### Core files rewritten to clean stubs:
- `lib/firebase.ts` — No Firebase SDK, clean empty exports
- `lib/firebaseAdmin.ts` — No firebase-admin, clean stubs
- `lib/db.ts` — In-memory Map store (data persists per browser session)
- `lib/auditLog.ts` — Console.log stub
- `lib/brokerAuth.ts` — Clean stub
- `services/firestoreAdmin.ts` — Clean stub
- `services/brokerTokens.ts` — Clean stub

### In-memory data stores:
- `services/firestore.ts` — Full in-memory project store with CRUD operations. Seeded with 3 test projects (Riverdale Restaurant Group, Summit Medical Partners, Heritage Auto Body).
- `lib/db.ts` — In-memory key-value store for admin settings. Supports `getDoc`, `getDocs`, `setDoc`, `deleteDoc`, `updateDoc` with `{ merge: true }`.

### Config files deleted:
- `cloudbuild.yaml` (Google Cloud Build)
- `cloudbuild.staging.yaml` (Google Cloud Build)
- `service-account.json` (Google service account credentials)

### Comments cleaned:
30+ files across API routes, components, and pages had "Firebase", "Firestore", "Zoho", "Google Cloud" references removed from comments.

### Note on file names:
File names like `FirebaseAuthContext.tsx`, `firebaseAdmin.ts`, `firebase.ts` were intentionally kept to avoid breaking 100+ import paths. These can be renamed in a future dedicated refactor.

---

## 3. Admin Settings Page — Replit Styling Migration

Restyled the Admin Settings page (`/bdo/admin`) to match the Replit application's visual design.

### Theme CSS Variables Added (`app/globals.css`):
50+ `--t-color-*` CSS custom properties for the full Replit theme system:
- Brand colors (primary navy `#133c7f`, accents, pale variants)
- Surface colors (page bg, card bg, input bg, highlights)
- Text colors (body, secondary, muted)
- Status colors (success, warning, danger, info)
- Layout tokens (border radius, padding, font sizes)
- Utility classes: `hover-elevate`, `active-elevate-2`

### Tab Navigation Restyled (`components/ui/tabs.tsx`):
Updated shadcn Tabs component defaults to match Replit's underline-style tabs:
- Uppercase text, letter-spacing, navy active color
- Bottom border underline on active tab
- Pale blue background on active tab (`#e7edf4`)
- No more rounded pill/shadow styling

### Admin Page Structure:
- Removed all `Card`/`CardHeader`/`CardContent` wrappers
- Replaced with flat `bg-white rounded-lg border border-[var(--t-color-border)] p-6` cards
- All text colors use theme variables
- Empty states use dashed border cards
- Fee config table uses themed plain HTML table
- Page header has navy-colored title, themed save button with hover elevation

### Admin Page — Firebase Removed:
- Removed all Firestore imports and async data loading
- Settings initialized inline with defaults (including NAICS prompt)
- Users initialized with test data (Shane Rachal as Admin, Jane Doe as BDO)
- `saveSettings()` saves to local state only
- Page loads instantly (no async Firestore calls)

### Tabs restyled to match Replit:
- **Default Inputs** — WSJ Prime Rate input, Fee Configurations table, DSCR Period selectors
- **AI Prompts** — 3 dedicated cards (NAICS, Business Description, Financial Spread) with code-styled placeholders
- **Questionnaire Rules** — Category filter buttons with counts, sortable column headers, Switch toggles
- **AI Block Templates** — Card-based layout with field previews
- **Note Tags** — Inline tag chips with X remove buttons
- **File Upload Instructions** — 4-textarea layout with consistent labels
- **User Management** — Search input, themed table, badge-based roles

---

## 4. App Header Restyled (`components/layout/BDOLayout.tsx`)

Updated the global app header to match Replit:
- Navy `#133c7f` background (was white with border)
- Sticky top positioning with z-50
- Logo with inverted filter for white appearance on dark background
- Nav links: uppercase, tracking-wider, white text with opacity states
- Active page gets `bg-white/15` highlight
- "Pipeline" and "Settings" nav links
- Content area uses `--t-color-page-bg` background (#fafbfd), max-width 1280px

---

## 5. Pipeline Page — In-Memory Project Storage

The Pipeline page (`/bdo/projects`) now works with the in-memory project store:
- **Create projects** — Click "+" to create, projects store in memory for the session
- **3 test projects seeded** — Riverdale Restaurant Group ($1.5M), Summit Medical Partners ($3.2M), Heritage Auto Body ($750K)
- **Delete/restore** — Works via local state
- **Search and filter** — Functional against in-memory data

---

## Architecture Note

The app is currently in a **development-only mode**:
- All data lives in JavaScript memory (browser-side Maps or React state)
- Data resets on page refresh (except auth session which uses localStorage)
- No external database, no external auth provider
- Microsoft Entra ID and Azure Cosmos DB will be integrated later

This setup allows full UI development and testing without any cloud service dependencies.

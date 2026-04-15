# Infrastructure — READ THIS FIRST

**This project does NOT use Firebase.** Do not assume, suggest, use, or add Firebase, Firestore, Firebase Auth, Firebase Storage, Firebase Hosting, `firebase-admin`, or any `@google-cloud/*` infrastructure SDK. The entire backend runs on **Azure** services:

- **Database**: Azure Cosmos DB (MongoDB API) — accessed via `lib/cosmosdb.ts` (`getCollection(COLLECTIONS.X)`).
- **Authentication**: Auth0 — single identity provider for both the BDO and Borrower portals. There is no Firebase Auth, even though legacy files named `FirebaseAuthContext`/`services/firestore.ts` exist for historical reasons. Those names are misleading — they wrap Auth0 + Cosmos.
- **File storage**: Microsoft SharePoint (per-project folders).
- **Hosting**: Azure App Service, Node 24 LTS, no Docker, three slots (dev / staging / prod).
- **Secrets**: Azure Key Vault / App Service application settings.

When porting or writing new code, use the Cosmos `mongodb` driver and the Auth0 SDK. If you see a file or variable with "firebase" or "firestore" in the name, treat it as legacy — do not deepen its Firebase dependency; migrate it out.

<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->
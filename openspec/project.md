# Project Context

## Purpose
The **SBA Loan Prequalifier** is a web application that streamlines the Small Business Administration (SBA) loan application and management process. It features a dual-portal architecture:

- **BDO (Business Development Officer) Portal**: For loan officers to manage applications, track projects through various stages (Lead, BDO, Underwriting, Closing, Servicing), monitor borrowers, and handle documentation
- **Borrower Portal**: For loan applicants to submit applications, upload documents, check application status, and communicate with assigned BDOs

## Tech Stack

### Frontend
- **Framework**: Next.js 16.0.8 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3.4.18 with CSS variables
- **UI Components**: shadcn/ui (New York style) + Radix UI primitives
- **Icons**: Lucide React 0.553.0
- **Rich Text Editor**: Tiptap 3.10.5
- **State Management**: Zustand 5.0.8

### Backend/Infrastructure
> **THIS PROJECT DOES NOT USE FIREBASE.** All persistence, auth, storage, and hosting are on **Azure** (with SharePoint for document storage). Do not introduce Firebase, Firestore, Firebase Auth, Firebase Storage, Google Cloud Hosting, or `firebase-admin` into any new code. Any existing mentions of Firebase in this repo are legacy and should be migrated away from — never toward.

- **Database**: **Azure Cosmos DB (MongoDB API)** — accessed via the official `mongodb` driver through `lib/cosmosdb.ts` (`COSMOS_CONNECTION_STRING` / `COSMOS_DATABASE` env vars). Collections include `projects`, `loanApplications`, `notes`, `generatedForms`, `borrowerUploads`, `portalTokens`, `pdfTemplates`, `pdfImportSessions`, `adminSettings`, etc.
- **Authentication**: **Auth0** for both portals (OAuth / OIDC). There is no Firebase Auth.
- **File Storage**: **Microsoft SharePoint** for project/document storage and folder structure management.
- **AI/ML**: OpenAI API (GPT-4o-mini) for NAICS code suggestions and questionnaire content.
- **Deployment**: **Azure App Service** running Node 24 LTS (no Docker). No Google Cloud / Firebase Hosting.

### Development Tools
- **Linter**: ESLint 9 (Next.js + TypeScript config)
- **Package Manager**: npm
- **Environment Management**: env-cmd for multi-environment builds

## Project Conventions

### Code Style
- **React components**: PascalCase (e.g., `BDOLayout.tsx`)
- **Utility functions**: camelCase (e.g., `generateNaicsCode()`)
- **Directories**: kebab-case (e.g., `loan-sections/`, `borrower-portal/`)
- **Page components**: Named `page.tsx` in route directories (Next.js App Router convention)
- **Path aliasing**: Use `@/*` for imports from project root
- **Client components**: Add `'use client'` directive at the top of client-side components

### Architecture Patterns
- **Server/Client Components**: Next.js App Router with explicit `'use client'` directives for client-side interactivity.
- **Auth**: Auth0 is the single identity provider. A legacy file named `FirebaseAuthContext` exists purely for historical reasons and is being migrated — do **not** extend it and do not add new Firebase dependencies. Treat it as an Auth0-backed context regardless of its filename.
- **Database Access Layer**: Centralized `lib/cosmosdb.ts` exposes `getCollection(COLLECTIONS.X)` returning a `mongodb.Collection`. API routes (`app/api/**`) call into it directly — `services/firestore.ts` is a compatibility shim that wraps the same API calls and is similarly misnamed legacy.
- **Component Composition**: Complex forms broken down into smaller, reusable loan-section components in `components/loan-sections/`.
- **State Management**: Zustand for client-side state; Cosmos DB for persistent state.
- **API Routes**: Next.js API routes (`app/api/`) for backend operations (auth callbacks, Cosmos persistence, OpenAI calls, SharePoint integration).
- **Environment Management**: Three-tier Azure App Service deployment (dev, staging, production), each with its own Cosmos DB + SharePoint config.

### Testing Strategy
Currently no formal test framework is implemented. This is a known gap and opportunity for improvement. Recommended additions:
- Jest or Vitest for unit testing
- React Testing Library for component testing
- Cypress or Playwright for E2E testing

### Git Workflow
- **Repository**: `https://github.com/srachal-tectonic/sba-prequalification`
- **Main branch**: `main`
- **Commit style**: Descriptive, feature-focused commits (e.g., "Changes for Google Cloud hosting and environments")
- **Merge strategy**: Standard merge commits

## Domain Context

### Loan Application Stages
Projects move through these stages:
1. **Lead** - Initial contact/inquiry
2. **BDO** - Business Development Officer review
3. **Underwriting** - Loan underwriting process
4. **Closing** - Final loan closing
5. **Servicing** - Post-closing loan servicing

### Key Domain Entities
- **Project**: Top-level container for a loan application
- **Loan**: Individual loan details within a project
- **LoanApplication**: Detailed application data
- **BusinessEntity**: Business information for applicants
- **Document**: Uploaded documents with metadata and status
- **FundingStructure**: Funding arrangement configurations
- **Notes**: Project notes with tags and timestamps

### NAICS Codes
The application uses AI (OpenAI) to suggest appropriate North American Industry Classification System (NAICS) codes based on business descriptions.

## Important Constraints

### Technical Constraints
- **No Firebase.** Do not add `firebase`, `firebase-admin`, Firebase Auth, Firestore, Firebase Storage, Firebase Hosting, or any `@google-cloud/*` infra SDKs. All backend services are Azure. If you see Firebase in legacy code, migrate it out — never deepen the dependency.
- Must support three deployment environments (dev, staging, production) on **Azure App Service** running Node 24 LTS (no Docker).
- **Auth0** is the single identity provider for both the BDO and Borrower portals.
- All secrets managed via **Azure Key Vault / App Service application settings** — not Google Cloud Secret Manager.

### Business/Regulatory Constraints
- SBA loan applications are subject to federal regulations
- Document handling must support standard SBA documentation requirements
- User data must be segregated by role (BDO vs Borrower)

## External Dependencies

### APIs & Services
| Service | Purpose |
|---------|---------|
| **Azure Cosmos DB (MongoDB API)** | Primary database — all persistent project, loan, note, form, and admin settings storage |
| **Auth0** | Single identity provider for both BDO and Borrower portals (OAuth / OIDC) |
| **Microsoft SharePoint** | Document / file storage and per-project folder structure |
| **OpenAI API** | NAICS code suggestions, questionnaire content generation |
| **Google Places API** | Address autocomplete (client-only) |
| **Azure App Service** | Application hosting (dev / staging / prod) |
| **Azure Key Vault / App Service settings** | Secret management |

### Hosting Environments
- Azure App Service (Node 24 LTS, no Docker), three slots: **dev**, **staging**, **prod**.
- Each environment has its own Cosmos DB connection string and SharePoint site configuration; secrets live in Azure, not Google Cloud.

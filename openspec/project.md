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
- **Database**: Firebase Firestore (cloud-hosted NoSQL)
- **Authentication**:
  - BDO Portal: Firebase Auth (email/password)
  - Borrower Portal: Auth0 (OAuth)
- **Storage**: Firebase Cloud Storage
- **AI/ML**: OpenAI API (GPT-4o-mini) for NAICS code suggestions and questionnaire content
- **Security**: Google reCAPTCHA Enterprise
- **Deployment**: Google Cloud Hosting (Firebase) with three environments (dev, staging, production)

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
- **Server/Client Components**: Next.js App Router with explicit `'use client'` directives for client-side interactivity
- **Context-based Auth**: Separate context providers for Firebase (`FirebaseAuthContext`) and Auth0 (`Auth0Context`) authentication
- **Firestore CRUD Layer**: Centralized `services/firestore.ts` handles all database operations
- **Component Composition**: Complex forms broken down into smaller, reusable loan-section components in `components/loan-sections/`
- **State Management**: Zustand for client state, Firestore for persistent state
- **API Routes**: Next.js API routes (`app/api/`) for backend operations (authentication, external API integrations, verification)
- **Environment Management**: Three-tier deployment (dev, staging, production) with separate Firebase projects

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
- Must support three deployment environments (dev, staging, production) with separate Firebase projects
- BDO authentication uses Firebase Auth; Borrower authentication uses Auth0 - these cannot be mixed
- reCAPTCHA Enterprise required for login security
- All secrets managed via Google Cloud Secret Manager

### Business/Regulatory Constraints
- SBA loan applications are subject to federal regulations
- Document handling must support standard SBA documentation requirements
- User data must be segregated by role (BDO vs Borrower)

## External Dependencies

### APIs & Services
| Service | Purpose |
|---------|---------|
| **Firebase Firestore** | Primary database |
| **Firebase Auth** | BDO authentication |
| **Firebase Storage** | File storage |
| **Auth0** | Borrower OAuth authentication |
| **OpenAI API** | NAICS code suggestions, questionnaire content generation |
| **Google reCAPTCHA Enterprise** | Bot prevention |
| **Google Places API** | Address autocomplete |
| **Microsoft SharePoint** | Document storage and folder structure management |
| **Google Cloud Secret Manager** | Secure credential management |

### Firebase Project Aliases
- `dev` → `sba-loan-prequalifier-dev`
- `staging` → `sba-loan-prequalifier-staging`
- `prod` → `sba-loan-prequalifier` (default)

# SBA Loan Prequalifier - Source of Truth

> **Last Updated:** December 2024
> **Purpose:** This document serves as the authoritative reference for the SBA Loan Prequalifier application. Refer to this when development gets off track or when onboarding new developers.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Architecture Overview](#3-architecture-overview)
4. [External Integrations](#4-external-integrations)
5. [Authentication](#5-authentication)
6. [Folder Structure](#6-folder-structure)
7. [API Routes](#7-api-routes)
8. [Pages & Routes](#8-pages--routes)
9. [Data Models](#9-data-models)
10. [Environment Variables](#10-environment-variables)
11. [Key Features](#11-key-features)
12. [Development Guidelines](#12-development-guidelines)

---

## 1. Project Overview

**Project Name:** SBA Loan Prequalifier
**GCP Project ID:** `sba-loan-prequalifier`
**Repository:** SBA Loan Prequalifier New

### Purpose

A comprehensive Next.js web application for managing SBA (Small Business Administration) loan applications with dual portals:

- **BDO Portal:** For Business Development Officers to manage loan applications
- **Borrower Portal:** For borrowers to submit applications and upload documents

### Key Objectives

- Streamline the SBA loan application process
- Provide BDOs with tools to manage multiple loan applications
- Enable borrowers to submit applications and upload documents
- Automate document generation and data mapping to spreadsheets
- Integrate with external services (SharePoint, Zoho Sheets, OpenAI)

---

## 2. Tech Stack

### Core Framework
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.0.8 | React framework (App Router) |
| TypeScript | 5.x | Type safety |
| React | 19.2.1 | UI library |

### UI & Styling
| Technology | Version | Purpose |
|------------|---------|---------|
| Tailwind CSS | 3.4.18 | Utility-first CSS |
| shadcn/ui | - | Component library (New York style) |
| Radix UI | 1.x | Accessible primitives |
| Lucide React | 0.553.0 | Icons |

### Backend & Database
| Technology | Version | Purpose |
|------------|---------|---------|
| Firebase | 12.5.0 | Backend services |
| Firestore | - | Document database |
| Firebase Auth | - | BDO authentication |
| Firebase Storage | - | File uploads |

### State Management
| Technology | Version | Purpose |
|------------|---------|---------|
| Zustand | 5.0.8 | Client-side state |

### External Services
| Service | Purpose |
|---------|---------|
| Google Cloud Secret Manager | Credential storage |
| SharePoint (Microsoft Graph) | Document management |
| Zoho Sheets | Spreadsheet generation |
| OpenAI | AI-powered features |
| Auth0 | Borrower authentication |
| Google reCAPTCHA Enterprise | Bot protection |

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │   BDO Portal    │    │ Borrower Portal │                     │
│  │ (Firebase Auth) │    │   (Auth0)       │                     │
│  └────────┬────────┘    └────────┬────────┘                     │
│           │                      │                               │
│           └──────────┬───────────┘                               │
│                      │                                           │
│              ┌───────▼───────┐                                   │
│              │  Next.js App  │                                   │
│              │  (App Router) │                                   │
│              └───────┬───────┘                                   │
└──────────────────────┼──────────────────────────────────────────┘
                       │
┌──────────────────────┼──────────────────────────────────────────┐
│                  API ROUTES                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │SharePoint│ │  Zoho    │ │  OpenAI  │ │reCAPTCHA │           │
│  │  /api/   │ │  /api/   │ │  /api/   │ │  /api/   │           │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘           │
└───────┼────────────┼────────────┼────────────┼──────────────────┘
        │            │            │            │
┌───────▼────────────▼────────────▼────────────▼──────────────────┐
│                  EXTERNAL SERVICES                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │SharePoint│ │  Zoho    │ │  OpenAI  │ │ Google   │           │
│  │  Graph   │ │  API     │ │  API     │ │  Cloud   │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
└─────────────────────────────────────────────────────────────────┘
        │
┌───────▼─────────────────────────────────────────────────────────┐
│                    DATA LAYER                                    │
│  ┌──────────────────────────────────────────────────────┐       │
│  │                   Firestore                           │       │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │       │
│  │  │projects │ │  loan   │ │  users  │ │  admin  │    │       │
│  │  │         │ │  Apps   │ │         │ │Settings │    │       │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘    │       │
│  └──────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. External Integrations

### SharePoint Integration

**Purpose:** Centralized document storage for loan applications

**Files:**
- `/lib/sharepoint.ts` - Server utilities (auth, credentials from Secret Manager)
- `/services/sharepoint.ts` - Client-side service
- `/app/api/sharepoint/*` - API routes

**Secret Manager Keys:**
```
SHAREPOINT_TENANT_ID
SHAREPOINT_CLIENT_ID
SHAREPOINT_CLIENT_SECRET
SHAREPOINT_SITE_URL (format: https://hostname.sharepoint.com/sites/sitename)
```

**Environment Variable (not secret):**
```
SHAREPOINT_PARENT_FOLDER_PATH (optional - parent folder for project folders)
```

**Folder Structure in SharePoint:**
```
[Project Name]/
├── Business Files/
│   ├── tax_returns...
│   └── financial_statements...
└── Individual Files/
    ├── personal_tax_returns...
    └── resumes...
```

### Zoho Sheets Integration

**Purpose:** Automated spreadsheet generation from loan application data

**Files:**
- `/services/zohoSheets.ts` - API client
- `/lib/spreadsDataMapper.ts` - Data transformation
- `/lib/spreadsTemplateConfig.ts` - Cell mapping configuration
- `/app/api/zoho-sheets/*` - API routes

**Secret Manager Keys:**
```
ZOHO_SHEETS_CLIENT_ID
ZOHO_SHEETS_CLIENT_SECRET
ZOHO_SHEETS_REFRESH_TOKEN
```

### OpenAI Integration

**Purpose:** AI-powered content generation

**Endpoints:**
- `/api/generate-naics` - NAICS code suggestions
- `/api/generate-questionnaire-content` - Dynamic questionnaire content

**Model:** `gpt-4o-mini`

**Environment Variable:**
```
OPENAI_API_KEY
```

### Google Cloud Secret Manager

**Purpose:** Secure credential storage (replaces environment variables for sensitive data)

**Project:** `sba-loan-prequalifier`

**Cache TTL:** 5 minutes

**Implementation:** `/lib/secrets.ts`

---

## 5. Authentication

### BDO Portal (Firebase Auth)

**Flow:**
1. User navigates to `/bdo/login`
2. Enters email and password
3. Firebase validates credentials
4. User info fetched from Firestore `/users/{uid}`
5. Role determined: `BDO`, `PQ Committee`, or `Admin`

**Context:** `/contexts/FirebaseAuthContext.tsx`

### Borrower Portal (Auth0)

**Flow:**
1. User navigates to `/borrower/login`
2. Redirected to Auth0 login
3. Callback to `/api/auth/callback`
4. Session stored in HTTP-only cookie
5. Redirected to `/borrower/dashboard`

**Package:** `@auth0/nextjs-auth0`

---

## 6. Folder Structure

```
/
├── app/
│   ├── api/
│   │   ├── auth/[auth0]/          # Auth0 callback
│   │   ├── generate-naics/        # AI NAICS suggestions
│   │   ├── generate-questionnaire-content/
│   │   ├── recaptcha/verify/
│   │   ├── sharepoint/
│   │   │   ├── create-folder/
│   │   │   ├── debug/
│   │   │   ├── files/
│   │   │   └── upload/
│   │   └── zoho-sheets/
│   │       └── create-from-template/
│   ├── bdo/
│   │   ├── admin/                 # Admin settings
│   │   ├── borrower-portal/[id]/  # Borrower view for BDOs
│   │   ├── login/
│   │   └── projects/
│   │       ├── page.tsx           # Projects list
│   │       └── [id]/page.tsx      # Project detail (BDO Tools)
│   └── borrower/
│       ├── auth/callback/
│       ├── dashboard/
│       ├── login/
│       └── uploads/
├── components/
│   ├── layout/                    # BDOLayout, Sidebar, etc.
│   ├── loan-sections/             # 64 loan application components
│   ├── ui/                        # shadcn/ui components
│   └── [specialized components]
├── contexts/
│   └── FirebaseAuthContext.tsx
├── docs/
│   └── SOURCE_OF_TRUTH.md         # This file
├── lib/
│   ├── firebase.ts                # Firebase initialization
│   ├── secrets.ts                 # Google Cloud Secret Manager
│   ├── sharepoint.ts              # SharePoint server utilities
│   ├── applicationStore.ts        # Zustand store
│   ├── spreadsDataMapper.ts       # Zoho data transformation
│   └── spreadsTemplateConfig.ts   # Zoho cell mappings
├── services/
│   ├── firestore.ts               # Firestore CRUD operations
│   ├── sharepoint.ts              # SharePoint client service
│   └── zohoSheets.ts              # Zoho Sheets service
├── types/
│   └── index.ts                   # TypeScript definitions
└── [config files]
```

---

## 7. API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/[auth0]` | GET/POST | Auth0 authentication |
| `/api/generate-naics` | POST | AI NAICS code suggestions |
| `/api/generate-questionnaire-content` | POST | AI questionnaire content |
| `/api/recaptcha/verify` | POST | Verify reCAPTCHA tokens |
| `/api/sharepoint/create-folder` | POST | Create project folder |
| `/api/sharepoint/debug` | GET | Debug SharePoint connection |
| `/api/sharepoint/files` | GET | List files in folder |
| `/api/sharepoint/upload` | POST | Upload file to SharePoint |
| `/api/zoho-sheets/create-from-template` | POST | Create Zoho workbook |

---

## 8. Pages & Routes

### BDO Portal

| Route | Purpose |
|-------|---------|
| `/bdo/login` | BDO authentication |
| `/bdo/projects` | Projects dashboard & list |
| `/bdo/projects/[id]` | Project detail with 11-step loan wizard |
| `/bdo/admin` | Admin settings (AI prompts, rules, defaults) |
| `/bdo/borrower-portal/[id]` | View borrower portal as BDO |

### Borrower Portal

| Route | Purpose |
|-------|---------|
| `/borrower/login` | Auth0 login |
| `/borrower/dashboard` | Application status |
| `/borrower/uploads` | Document uploads |
| `/borrower/auth/callback` | Auth0 callback |

---

## 9. Data Models

### Project
```typescript
interface Project {
  id: string;
  projectName: string;
  businessName: string;
  stage: 'Lead' | 'BDO' | 'Underwriting' | 'Closing' | 'Servicing';
  status: 'Active' | 'On Hold' | 'Closed';
  bdoUserId: string;
  bdoUserName: string;
  createdAt: Date;
  updatedAt: Date;
  sharepointFolderId?: string;
  sharepointFolderUrl?: string;
}
```

### Firestore Collections

| Collection | Document ID | Purpose |
|------------|-------------|---------|
| `projects` | Auto | Project records |
| `loanApplications` | `{projectId}` | Application data (1:1 with project) |
| `users` | Firebase UID | User profiles & roles |
| `adminSettings` | `config` | Admin configuration |
| `notes` | Auto | Project notes |

---

## 10. Environment Variables

### Required for All Environments

**Firebase (Client - NEXT_PUBLIC_):**
```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

**Auth0:**
```
AUTH0_ISSUER_BASE_URL
AUTH0_CLIENT_ID
AUTH0_CLIENT_SECRET
AUTH0_BASE_URL
AUTH0_SECRET
```

**OpenAI:**
```
OPENAI_API_KEY
```

**reCAPTCHA:**
```
NEXT_PUBLIC_RECAPTCHA_SITE_KEY
RECAPTCHA_API_KEY
```

**Application:**
```
NEXT_PUBLIC_APP_ENV=development|staging|production
```

### Stored in Google Cloud Secret Manager

```
SHAREPOINT_TENANT_ID
SHAREPOINT_CLIENT_ID
SHAREPOINT_CLIENT_SECRET
SHAREPOINT_SITE_URL
ZOHO_SHEETS_CLIENT_ID
ZOHO_SHEETS_CLIENT_SECRET
ZOHO_SHEETS_REFRESH_TOKEN
```

---

## 11. Key Features

### Loan Application Wizard (11 Steps)

1. **Project Overview** - NAICS code, industry, purpose
2. **Funding Structure** - Sources & Uses analysis
3. **Business Applicant** - Business entity information
4. **Business Files** - Tax returns, financial statements (SharePoint upload)
5. **Individual Applicants** - Owners/guarantors
6. **Individual Files** - Personal documents (SharePoint upload)
7. **SBA Eligibility** - Eligibility assessment
8. **Project Information** - Seller details
9. **Business Questionnaire** - AI-powered dynamic questions
10. **Risk Scores** - Risk analysis
11. **Review** - Final review & submission

### Auto-Save

- Loan applications auto-save every 30 seconds
- Uses Zustand for client state + Firestore sync
- Tracks unsaved changes

### SharePoint File Upload

- Files uploaded directly to SharePoint on selection
- Creates subfolders: "Business Files", "Individual Files"
- Shows upload progress and "SharePoint" badge on success
- Auto-creates project folder if missing

### Admin Settings

- AI prompt templates
- Questionnaire rules engine
- Default values
- Note tags

---

## 12. Development Guidelines

### Common Issues & Solutions

**Issue:** `.next/dev/types/routes.d.ts` corruption error
```bash
rm -rf .next && npm run build
```

**Issue:** SharePoint upload fails with "missing projectId or folderId"
- Ensure project has `sharepointFolderId` in Firestore
- Pages auto-create folder if missing when loaded

**Issue:** Secret Manager access denied
- Grant `Secret Manager Secret Accessor` role to service account

### Build Commands

```bash
npm run dev              # Local development
npm run build            # Production build
npm run build:dev        # Dev environment
npm run build:staging    # Staging environment
npm run build:prod       # Production
```

### Deploy Commands

```bash
npm run deploy:dev       # Deploy to dev
npm run deploy:staging   # Deploy to staging
npm run deploy:prod      # Deploy to production
```

### Key Architectural Decisions

1. **Dual Auth:** Firebase for BDOs (internal), Auth0 for Borrowers (public)
2. **Secret Manager:** All sensitive credentials in GCP, not environment variables
3. **Zustand + Firestore:** Client state for responsiveness, auto-sync to Firestore
4. **SharePoint Integration:** Documents stored externally, not in Firebase Storage
5. **Component-based:** Modular loan sections for maintainability

---

## Quick Reference

| What | Where |
|------|-------|
| Firebase config | `/lib/firebase.ts` |
| Secret Manager | `/lib/secrets.ts` |
| SharePoint utils | `/lib/sharepoint.ts` |
| Firestore CRUD | `/services/firestore.ts` |
| Zustand store | `/lib/applicationStore.ts` |
| Types | `/types/index.ts` |
| File upload component | `/components/loan-sections/FileUploadWithYearTags.tsx` |
| Project detail page | `/app/bdo/projects/[id]/page.tsx` |
| Borrower portal page | `/app/bdo/borrower-portal/[id]/page.tsx` |

---

*This document should be updated whenever significant architectural changes are made.*

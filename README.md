# SBA Loan Prequalifier

A comprehensive Next.js application for managing SBA loan applications with dual portals for Business Development Officers (BDOs) and Borrowers. Built with Azure Cosmos DB for data storage, Auth0 for borrower authentication, and deployed on Azure App Service.

## Features

### BDO Portal
- **Project Management** - Create, track, and manage multiple loan applications
- **Stage Tracking** - Monitor projects through Lead, BDO, Underwriting, Closing, and Servicing stages
- **Role-Based Access** - Support for BDO and PQ Committee roles with different permissions
- **Document Management** - Track and request documents from borrowers via SharePoint
- **Risk Assessment** - Built-in credit matrix and risk scoring
- **PDF Tools** - Generate and manage SBA forms

### Borrower Portal
- **Auth0 Authentication** - Secure OAuth authentication for borrowers
- **Application Status** - View real-time loan application status
- **Document Upload** - Securely upload required documents to SharePoint
- **Questionnaire** - Guided SBA eligibility questionnaire

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v3 with CSS variables
- **UI Components**: shadcn/ui (New York style)
- **Database**: Azure Cosmos DB (MongoDB API)
- **Authentication**: Auth0 (Borrower Portal)
- **File Storage**: SharePoint via Microsoft Graph API
- **AI**: OpenAI for PDF extraction
- **Hosting**: Azure App Service (Docker)
- **Icons**: Lucide React

## Setup Instructions

### 1. Prerequisites

- Node.js 20+ and npm
- Azure account with Cosmos DB provisioned
- Auth0 account (for Borrower Portal)
- SharePoint site configured for document storage

### 2. Install

```bash
npm install
```

### 3. Environment Configuration

Copy `.env.local.example` to `.env.local` and fill in your values:

```bash
cp .env.local.example .env.local
```

Required environment variables:
- `COSMOS_CONNECTION_STRING` - Azure Cosmos DB connection string
- `COSMOS_DATABASE` - Database name
- `AUTH0_*` - Auth0 configuration for borrower portal
- `OPENAI_API_KEY` - OpenAI API key for PDF extraction
- `SHAREPOINT_*` - SharePoint integration credentials

### 4. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3001](http://localhost:3001)

## Deployment (Azure App Service)

This app uses Next.js standalone output and deploys directly to Azure App Service with the built-in Node.js runtime — no Docker or ACR required.

### Deploy to Azure:

1. Create an **Azure App Service** (Linux, Node 24 LTS)
2. Connect your GitHub repo for continuous deployment, or use `az webapp up`
3. Set the **Startup Command** in App Service > Configuration > General settings:
   ```
   node .next/standalone/server.js
   ```
4. Set all environment variables in **App Service > Configuration > Application settings**

Required application settings:
- `COSMOS_CONNECTION_STRING`
- `COSMOS_DATABASE`
- `AUTH0_ISSUER_BASE_URL`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_BASE_URL`, `AUTH0_SECRET`
- `OPENAI_API_KEY`
- `SHAREPOINT_SITE_URL`, `SHAREPOINT_CLIENT_ID`, `SHAREPOINT_CLIENT_SECRET`, `SHAREPOINT_TENANT_ID`

## License

Proprietary - Internal use only

# Environment Configuration Guide

This document describes how to set up and manage the three deployment environments: Development, Staging, and Production.

## Overview

| Environment | Firebase Project | Purpose |
|-------------|------------------|---------|
| Development | `sba-loan-prequalifier-dev` | Local development and testing |
| Staging | `sba-loan-prequalifier-staging` | Pre-production testing and QA |
| Production | `sba-loan-prequalifier` | Live application |

## Prerequisites

1. **Firebase CLI**: Install globally
   ```bash
   npm install -g firebase-tools
   ```

2. **Firebase Login**: Authenticate with Firebase
   ```bash
   firebase login
   ```

3. **Create Firebase Projects**: Create three Firebase projects in the [Firebase Console](https://console.firebase.google.com/):
   - `sba-loan-prequalifier-dev`
   - `sba-loan-prequalifier-staging`
   - `sba-loan-prequalifier` (if not already exists)

4. **Enable Services**: For each project, enable:
   - Authentication (Email/Password)
   - Firestore Database
   - Storage
   - Hosting

## Environment Files

### File Structure

```
.env                      # Shared defaults (committed)
.env.development          # Dev config (committed, no secrets)
.env.staging              # Staging config (committed, no secrets)
.env.production           # Prod config (committed, no secrets)
.env.local                # Local overrides (gitignored)
.env.development.local    # Dev secrets (gitignored)
.env.staging.local        # Staging secrets (gitignored)
.env.production.local     # Prod secrets (gitignored)
```

### Setting Up Environment Files

1. **Copy the example file** for your secrets:
   ```bash
   cp .env.local.example .env.development.local
   cp .env.local.example .env.staging.local
   cp .env.local.example .env.production.local
   ```

2. **Update each `.local` file** with the appropriate credentials from each Firebase project.

3. **Update the base environment files** (`.env.development`, `.env.staging`, `.env.production`) with the correct Firebase project IDs and non-sensitive configuration.

### Required Variables

Each environment needs these variables configured:

| Variable | Description | Where to Find |
|----------|-------------|---------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web API Key | Firebase Console > Project Settings |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Auth domain | `[project-id].firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Project ID | Firebase Console > Project Settings |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Storage bucket | `[project-id].firebasestorage.app` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Sender ID | Firebase Console > Project Settings |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | App ID | Firebase Console > Project Settings |
| `FIREBASE_CLIENT_EMAIL` | Service account email | Firebase Console > Service Accounts |
| `FIREBASE_PRIVATE_KEY` | Service account key | Firebase Console > Service Accounts |
| `AUTH0_*` | Auth0 configuration | Auth0 Dashboard |
| `OPENAI_API_KEY` | OpenAI API key | OpenAI Dashboard |

## Firebase Aliases

The `.firebaserc` file configures project aliases:

```json
{
  "projects": {
    "dev": "sba-loan-prequalifier-dev",
    "staging": "sba-loan-prequalifier-staging",
    "prod": "sba-loan-prequalifier"
  }
}
```

### Switching Environments

```bash
# Switch to development
firebase use dev

# Switch to staging
firebase use staging

# Switch to production
firebase use prod

# Check current project
firebase use
```

## Build & Deploy

### NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start local development server |
| `npm run build:dev` | Build with development config |
| `npm run build:staging` | Build with staging config |
| `npm run build:prod` | Build with production config |
| `npm run deploy:dev` | Build and deploy to development |
| `npm run deploy:staging` | Build and deploy to staging |
| `npm run deploy:prod` | Build and deploy to production |

### Deployment Workflow

1. **Development**: Deploy frequently for testing
   ```bash
   npm run deploy:dev
   ```

2. **Staging**: Deploy for QA and pre-production testing
   ```bash
   npm run deploy:staging
   ```

3. **Production**: Deploy after staging verification
   ```bash
   npm run deploy:prod
   ```

## Environment Indicator

A visual badge appears in non-production environments:

- **Development**: Blue "DEV" badge (bottom-left corner)
- **Staging**: Yellow "STAGING" badge (bottom-left corner)
- **Production**: No badge

This helps prevent confusion about which environment you're viewing.

## Auth0 Configuration

Each environment needs its own Auth0 configuration:

1. **Create Auth0 Applications**: Create separate applications in Auth0 for each environment, or use the same application with multiple callback URLs.

2. **Update Callback URLs**: In Auth0 Dashboard, add the callback URLs for each environment:
   - Development: `http://localhost:3000/api/auth/callback`
   - Staging: `https://sba-loan-prequalifier-staging.web.app/api/auth/callback`
   - Production: `https://sba-loan-prequalifier.web.app/api/auth/callback`

3. **Update Logout URLs**: Similarly, add logout URLs for each environment.

## Firestore Security Rules

Remember to deploy Firestore security rules to each environment:

```bash
firebase use dev && firebase deploy --only firestore:rules
firebase use staging && firebase deploy --only firestore:rules
firebase use prod && firebase deploy --only firestore:rules
```

## Troubleshooting

### "Firebase project not found"
Ensure you've created the Firebase project and it matches the ID in `.firebaserc`.

### Environment variables not loading
1. Check that the correct `.env.[environment]` file exists
2. Restart the development server after changing environment files
3. Verify `NEXT_PUBLIC_` prefix for client-side variables

### Wrong environment badge showing
Check `NEXT_PUBLIC_APP_ENV` is set correctly in your environment file.

### Deployment fails
1. Ensure you're logged in: `firebase login`
2. Verify the project alias: `firebase use`
3. Check Firebase Hosting is enabled for the project

## Security Best Practices

1. **Never commit secrets**: Keep all sensitive values in `.env.*.local` files
2. **Rotate keys**: Regularly rotate API keys and service account credentials
3. **Limit access**: Use different service accounts per environment with minimal permissions
4. **Review before production**: Always test in staging before deploying to production

# Setup Notes - Environment Configuration

*Created: December 9, 2025*

## What Was Implemented

### Files Created

| File | Description |
|------|-------------|
| `.firebaserc` | Firebase project aliases (dev, staging, prod) |
| `firebase.json` | Firebase Hosting configuration for Next.js |
| `.env` | Shared defaults (committed) |
| `.env.development` | Development environment config |
| `.env.staging` | Staging environment config |
| `.env.production` | Production environment config |
| `components/layout/EnvironmentBadge.tsx` | Visual environment indicator |
| `ENVIRONMENTS.md` | Full setup and deployment documentation |

### Files Modified

| File | Change |
|------|--------|
| `package.json` | Added build/deploy scripts, `env-cmd` dev dependency |
| `.gitignore` | Updated to allow base env files, ignore `.local` variants |
| `app/layout.tsx` | Integrated EnvironmentBadge component |

### NPM Scripts Added

```bash
npm run build:dev      # Build with development config
npm run build:staging  # Build with staging config
npm run build:prod     # Build with production config
npm run deploy:dev     # Build & deploy to dev
npm run deploy:staging # Build & deploy to staging
npm run deploy:prod    # Build & deploy to production
```

---

## TODO: Complete These Steps

### 1. Create Firebase Projects

Create these projects in [Firebase Console](https://console.firebase.google.com/):

- [X] `sba-loan-prequalifier-dev`
- [X] `sba-loan-prequalifier-staging`
- [X] `sba-loan-prequalifier` (may already exist)

For each project, enable:
- [X] Authentication (Email/Password)
- [X] Firestore Database
- [X] Storage
- [X] Hosting

### 2. Create Secret Files

Run these commands to create your local secret files:

```bash
cp .env.local.example .env.development.local
cp .env.local.example .env.staging.local
cp .env.local.example .env.production.local
```

### 3. Fill In Credentials

For each `.local` file, get credentials from the respective Firebase project:

**From Firebase Console > Project Settings:**
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

**From Firebase Console > Service Accounts > Generate New Private Key:**
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

### 4. Install Firebase CLI

```bash
npm install -g firebase-tools
firebase login
```

### 5. Update Auth0 Callback URLs

In [Auth0 Dashboard](https://manage.auth0.com/), add callback URLs for each environment:

- Development: `http://localhost:3000/api/auth/callback`
- Staging: `https://sba-loan-prequalifier-staging.web.app/api/auth/callback`
- Production: `https://sba-loan-prequalifier.web.app/api/auth/callback`

### 6. Test Deployment

Start with development environment:

```bash
npm run deploy:dev
```

---

## Environment Badge

A visual indicator shows which environment you're in:

- **Development**: Blue "DEV" badge (bottom-left)
- **Staging**: Yellow "STAGING" badge (bottom-left)
- **Production**: No badge

---

## Reference

See `ENVIRONMENTS.md` for complete documentation on:
- Environment file structure
- Firebase aliases
- Deployment workflow
- Troubleshooting

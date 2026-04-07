# Cloud Build CI/CD Setup

This document explains how to set up Google Cloud Build for automated deployments with secrets from Secret Manager.

## Overview

Cloud Build automatically:
1. Fetches secrets from Google Cloud Secret Manager
2. Injects them as environment variables during the build
3. Builds the Next.js application
4. Deploys to Firebase Hosting

## Prerequisites

### 1. Enable Required APIs

```bash
gcloud services enable cloudbuild.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

### 2. Create Required Secrets in Secret Manager

Create the following secrets in Google Cloud Secret Manager:

```bash
# Google Places API Key (for client-side address autocomplete)
echo -n "YOUR_GOOGLE_PLACES_API_KEY" | gcloud secrets create NEXT_PUBLIC_GOOGLE_PLACES_API_KEY --data-file=-

# Firebase CI Token (for deployments)
# First, generate the token:
firebase login:ci
# Then create the secret with the token:
echo -n "YOUR_FIREBASE_TOKEN" | gcloud secrets create FIREBASE_TOKEN --data-file=-
```

### 3. Grant Cloud Build Service Account Permissions

Find your Cloud Build service account (format: `[PROJECT_NUMBER]@cloudbuild.gserviceaccount.com`):

```bash
# Get your project number
gcloud projects describe sba-loan-prequalifier --format="value(projectNumber)"
```

Grant the required roles:

```bash
PROJECT_ID="sba-loan-prequalifier"
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
CB_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

# Secret Manager access
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/secretmanager.secretAccessor"

# Firebase Hosting Admin
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/firebasehosting.admin"

# Cloud Run Admin (for Next.js server functions)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/run.admin"

# Service Account User (to deploy Cloud Run services)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/iam.serviceAccountUser"
```

## Manual Deployment

### Deploy to Production

```bash
gcloud builds submit --config=cloudbuild.yaml .
```

### Deploy to Staging

```bash
gcloud builds submit --config=cloudbuild.staging.yaml .
```

## Automatic Deployment (Triggers)

### Set Up GitHub Trigger

1. Go to [Cloud Build Triggers](https://console.cloud.google.com/cloud-build/triggers)
2. Click "Create Trigger"
3. Configure:
   - **Name**: `deploy-production`
   - **Event**: Push to branch
   - **Source**: Connect your GitHub repository
   - **Branch**: `^main$` (regex for main branch)
   - **Configuration**: Cloud Build configuration file
   - **Location**: `cloudbuild.yaml`
4. Click "Create"

For staging, create another trigger:
- **Name**: `deploy-staging`
- **Branch**: `^staging$` or `^develop$`
- **Location**: `cloudbuild.staging.yaml`

## Secrets Management

### View Existing Secrets

```bash
gcloud secrets list
```

### Update a Secret

```bash
echo -n "NEW_VALUE" | gcloud secrets versions add NEXT_PUBLIC_GOOGLE_PLACES_API_KEY --data-file=-
```

### View Secret Value (for debugging)

```bash
gcloud secrets versions access latest --secret="NEXT_PUBLIC_GOOGLE_PLACES_API_KEY"
```

## Troubleshooting

### Build Fails with "Permission Denied" for Secrets

Ensure the Cloud Build service account has the `Secret Manager Secret Accessor` role:

```bash
gcloud projects get-iam-policy sba-loan-prequalifier \
  --flatten="bindings[].members" \
  --filter="bindings.members:cloudbuild.gserviceaccount.com" \
  --format="table(bindings.role)"
```

### Build Fails with "Firebase Token Invalid"

Regenerate the Firebase token and update the secret:

```bash
firebase login:ci
# Copy the token, then:
echo -n "NEW_TOKEN" | gcloud secrets versions add FIREBASE_TOKEN --data-file=-
```

### View Build Logs

```bash
# List recent builds
gcloud builds list --limit=5

# View specific build logs
gcloud builds log BUILD_ID
```

## Security Notes

1. **NEXT_PUBLIC_* variables are public**: These are embedded in the client-side JavaScript and visible to users. Ensure you have API key restrictions in Google Cloud Console.

2. **Restrict API Key**: In Google Cloud Console > APIs & Services > Credentials:
   - Set HTTP referrer restrictions to your domains
   - Set API restrictions to only allow Places API

3. **Rotate secrets regularly**: Update secrets periodically and after any suspected compromise.

4. **Audit access**: Use Cloud Audit Logs to monitor secret access.

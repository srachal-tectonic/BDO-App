# Auth0 Setup Guide

This document explains how to configure Auth0 for the Borrower Portal authentication.

## Prerequisites

1. An Auth0 account (sign up at https://auth0.com)
2. A configured Auth0 Application

## Auth0 Application Setup

### Step 1: Create an Auth0 Application

1. Log in to your Auth0 Dashboard (https://manage.auth0.com)
2. Navigate to **Applications** → **Applications**
3. Click **Create Application**
4. Choose a name (e.g., "SBA Loan Borrower Portal")
5. Select **Regular Web Application**
6. Click **Create**

### Step 2: Configure Application Settings

In your Auth0 Application settings, configure the following:

#### Allowed Callback URLs
Add these URLs (adjust for your domain):
```
http://localhost:3000/api/auth/callback
https://yourdomain.com/api/auth/callback
```

#### Allowed Logout URLs
Add these URLs:
```
http://localhost:3000/borrower/login
https://yourdomain.com/borrower/login
```

#### Allowed Web Origins
Add these URLs:
```
http://localhost:3000
https://yourdomain.com
```

### Step 3: Enable Sign-up

1. In your Auth0 Application settings, scroll to **Advanced Settings**
2. Navigate to the **OAuth** tab
3. Ensure **OIDC Conformant** is enabled
4. Click **Save Changes**

### Step 4: Configure Database Connection

1. Navigate to **Authentication** → **Database**
2. Select your database connection (or create a new one)
3. Enable **Sign Ups** in the settings
4. Click **Save**

## Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# Auth0 Configuration for Borrower Portal
# Required for @auth0/nextjs-auth0

# Your Auth0 Domain (found in Application settings)
# Example: dev-abc123.us.auth0.com
AUTH0_ISSUER_BASE_URL=https://YOUR_AUTH0_DOMAIN

# Your Auth0 Client ID (found in Application settings)
AUTH0_CLIENT_ID=YOUR_CLIENT_ID

# Your Auth0 Client Secret (found in Application settings)
# IMPORTANT: Keep this secret! Never commit to version control
AUTH0_CLIENT_SECRET=YOUR_CLIENT_SECRET

# Your application URL
# Development: http://localhost:3000
# Production: https://yourdomain.com
AUTH0_BASE_URL=http://localhost:3000

# A long, secret value used to encrypt the session cookie
# Generate a secure random string (at least 32 characters)
# You can generate one with: openssl rand -hex 32
AUTH0_SECRET=YOUR_LONG_RANDOM_SECRET_STRING_AT_LEAST_32_CHARS
```

### How to Get Your Auth0 Credentials

1. **AUTH0_ISSUER_BASE_URL**:
   - Go to your Auth0 Application settings
   - Copy the **Domain** field
   - Add `https://` prefix (e.g., `https://dev-abc123.us.auth0.com`)

2. **AUTH0_CLIENT_ID**:
   - Found in your Auth0 Application settings
   - Copy the **Client ID** field

3. **AUTH0_CLIENT_SECRET**:
   - Found in your Auth0 Application settings
   - Copy the **Client Secret** field
   - **CRITICAL**: Never expose this in client-side code or commit to git

4. **AUTH0_BASE_URL**:
   - Local development: `http://localhost:3000`
   - Production: Your deployed application URL

5. **AUTH0_SECRET**:
   - Generate a secure random string (minimum 32 characters)
   - Run this command to generate one:
     ```bash
     openssl rand -hex 32
     ```

## Example .env.local File

```bash
# Auth0 Configuration
AUTH0_ISSUER_BASE_URL=https://dev-abc123.us.auth0.com
AUTH0_CLIENT_ID=aBcDeFgHiJkLmNoPqRsTuVwXyZ123456
AUTH0_CLIENT_SECRET=your-super-secret-client-secret-here-keep-it-safe
AUTH0_BASE_URL=http://localhost:3000
AUTH0_SECRET=09a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8
```

## Testing Your Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to: `http://localhost:3000/borrower/login`

3. Click **"Sign In / Sign Up"**

4. You should be redirected to Auth0's login page

5. Create a new account or sign in with existing credentials

6. After successful authentication, you should be redirected to the borrower dashboard

## Authentication Flows

### Sign In
- URL: `/api/auth/login`
- Redirects to Auth0 login page
- After success: redirects to `/borrower/dashboard`

### Sign Up
- Auth0 automatically provides sign-up on the same login page
- Users can create accounts if "Sign Ups" are enabled in your database connection

### Sign Out
- URL: `/api/auth/logout`
- Logs out from Auth0
- Redirects to: `/borrower/login`

### Get User Profile
- Use the `useAuth0Borrower()` hook in any component
- Returns: `userInfo`, `isLoading`, `error`, `isAuthenticated`

## Troubleshooting

### Issue: "Callback URL mismatch" error

**Solution**: Ensure your callback URL in Auth0 Application settings matches exactly:
- Local: `http://localhost:3000/api/auth/callback`
- Production: `https://yourdomain.com/api/auth/callback`

### Issue: "Invalid state" error

**Solution**:
1. Clear your browser cookies
2. Ensure `AUTH0_SECRET` is set and at least 32 characters
3. Restart your development server

### Issue: Users can't sign up

**Solution**:
1. Go to Auth0 Dashboard → Authentication → Database
2. Select your database connection
3. Enable "Disable Sign Ups" toggle to OFF
4. Save changes

### Issue: Environment variables not loading

**Solution**:
1. Ensure your `.env.local` file is in the project root
2. Restart your development server after changing environment variables
3. Verify variable names match exactly (including AUTH0_ prefix)

## Security Best Practices

1. **Never commit** `.env.local` or `.env` files to version control
2. **Keep `AUTH0_CLIENT_SECRET` secure** - it should never be exposed in client-side code
3. **Use strong, random secrets** for `AUTH0_SECRET`
4. **Enable Multi-Factor Authentication** in Auth0 for production
5. **Set up rate limiting** and brute force protection in Auth0
6. **Review Auth0 logs regularly** for suspicious activity

## Additional Resources

- [Auth0 Next.js SDK Documentation](https://auth0.com/docs/quickstart/webapp/nextjs)
- [Auth0 Dashboard](https://manage.auth0.com)
- [Auth0 Community](https://community.auth0.com)

## Support

For issues with Auth0 configuration:
1. Check the [Auth0 Documentation](https://auth0.com/docs)
2. Review the Auth0 logs in your dashboard (Monitoring → Logs)
3. Contact your development team or Auth0 support

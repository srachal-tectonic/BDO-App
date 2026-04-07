# Security Review - SBA Loan Prequalifier

**Review Date:** January 7, 2026
**Application Type:** Banking/Financial Services
**Risk Level:** High (handles SSN, financial data, loan applications)

---

## Critical Issues (Immediate Action Required)

### 1. Auth0 Credentials Exposed in Version Control

**Severity:** CRITICAL
**File:** `.env.local.example` (line 17-21)

The following credentials appear to be real (not placeholders) and are committed to git:

```
AUTH0_ISSUER_BASE_URL=https://<REDACTED>.us.auth0.com
AUTH0_CLIENT_ID=<REDACTED>
AUTH0_CLIENT_SECRET=<REDACTED>
```

**Required Actions:**
1. **Immediately rotate** the Auth0 client secret in the Auth0 dashboard
2. Update `.env.local.example` to use placeholder values:
   ```
   AUTH0_ISSUER_BASE_URL=https://your-tenant.us.auth0.com
   AUTH0_CLIENT_ID=your_client_id_here
   AUTH0_CLIENT_SECRET=your_client_secret_here
   ```
3. Consider removing credentials from git history using BFG Repo Cleaner:
   ```bash
   # Install BFG
   brew install bfg

   # Create a file with secrets to remove
   echo "<REDACTED_SECRET>" > secrets.txt

   # Run BFG to remove from history
   bfg --replace-text secrets.txt

   # Clean up
   git reflog expire --expire=now --all && git gc --prune=now --aggressive
   ```

---

## High Priority Issues

### 2. Add Content Security Policy (CSP) Headers

**Severity:** HIGH
**Current State:** No CSP headers configured

**Required Actions:**

Add to `next.config.js`:

```javascript
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com wss://*.firebaseio.com",
      "frame-src https://www.google.com",
    ].join('; ')
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  }
];

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

### 3. Add File Type Validation for Uploads

**Severity:** HIGH
**Files:**
- `app/api/sharepoint/upload/route.ts`
- `app/api/broker/upload/route.ts`

**Current State:** No file type validation beyond size limits

**Required Actions:**

Add MIME type and extension validation:

```typescript
const ALLOWED_FILE_TYPES = {
  // Documents
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  // Images
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
};

function validateFileType(file: File): boolean {
  const allowedExtensions = ALLOWED_FILE_TYPES[file.type];
  if (!allowedExtensions) return false;

  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  return allowedExtensions.includes(ext);
}
```

### 4. Restrict Firebase API Keys by Domain

**Severity:** MEDIUM
**Current State:** Firebase API keys are unrestricted

**Required Actions:**

In Firebase Console:
1. Go to Project Settings > General
2. Scroll to "Your apps" section
3. Click the web app configuration
4. Under "API key", click "Manage API keys in Google Cloud Console"
5. Add HTTP referrer restrictions:
   - `https://sba-loan-prequalifier-prod.web.app/*`
   - `https://your-custom-domain.com/*`
   - `http://localhost:3000/*` (for development)

---

## Medium Priority Issues

### 5. Implement Persistent Rate Limiting

**Severity:** MEDIUM
**File:** `lib/rateLimit.ts`

**Current State:** In-memory rate limiting resets on each deployment

**Required Actions:**

For production, replace with Redis-backed rate limiting:

```typescript
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function rateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): Promise<{ success: boolean; remaining: number }> {
  const key = `ratelimit:${identifier}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  // Remove old entries and count current
  await redis.zremrangebyscore(key, 0, windowStart);
  const count = await redis.zcard(key);

  if (count >= limit) {
    return { success: false, remaining: 0 };
  }

  // Add new request
  await redis.zadd(key, { score: now, member: `${now}-${Math.random()}` });
  await redis.expire(key, Math.ceil(windowMs / 1000));

  return { success: true, remaining: limit - count - 1 };
}
```

### 6. Add Audit Logging for Sensitive Operations

**Severity:** MEDIUM
**Current State:** No centralized audit logging

**Required Actions:**

Create `lib/auditLog.ts`:

```typescript
import { getAdminFirestore } from '@/lib/firebaseAdmin';

interface AuditEvent {
  action: string;
  userId?: string;
  userEmail?: string;
  resourceType: string;
  resourceId: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export async function logAuditEvent(event: Omit<AuditEvent, 'timestamp'>) {
  const db = getAdminFirestore();
  await db.collection('auditLogs').add({
    ...event,
    timestamp: new Date(),
  });
}
```

Log these events:
- User login/logout
- File uploads
- Loan application submissions
- Admin actions (rule changes, token creation/revocation)
- Access to sensitive data (SSN views)

### 7. Add Input Sanitization for User Content

**Severity:** MEDIUM
**Current State:** Basic validation exists but no sanitization

**Required Actions:**

Install DOMPurify for any user-generated content that might be rendered:

```bash
npm install dompurify @types/dompurify
```

```typescript
import DOMPurify from 'dompurify';

// Sanitize any user input that will be rendered as HTML
const sanitizedContent = DOMPurify.sanitize(userInput);
```

---

## Low Priority Issues

### 8. TypeScript Errors to Fix

**Severity:** LOW
**Files:**
- `app/bdo/pdf-exports/page.tsx:75`
- `app/bdo/pdf-tools/page.tsx:75`

**Issue:** Property 'name' does not exist on type 'Linter.LintMessage'

These are development utility pages but should be fixed for code quality.

### 9. Add Security Headers to API Routes

**Severity:** LOW

Add security headers to API responses:

```typescript
// In API route handlers
return NextResponse.json(data, {
  headers: {
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store, max-age=0',
  },
});
```

### 10. Implement CSRF Protection

**Severity:** LOW (Next.js has some built-in protection)

For additional protection on state-changing operations:

```typescript
// Generate CSRF token
import { randomBytes } from 'crypto';

export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

// Validate in API routes
export function validateCsrfToken(request: Request, expectedToken: string): boolean {
  const token = request.headers.get('X-CSRF-Token');
  return token === expectedToken;
}
```

---

## Security Checklist

### Before Production Deployment

- [ ] Rotate Auth0 credentials and update `.env.local.example`
- [ ] Remove secrets from git history
- [x] Configure CSP headers in `next.config.ts` (COMPLETED: Added comprehensive CSP, X-Frame-Options, HSTS, and other security headers)
- [x] Add file type validation to upload endpoints (COMPLETED: Created `lib/fileValidation.ts` and integrated into both SharePoint and Broker upload routes)
- [ ] Restrict Firebase API keys by domain
- [ ] Set up Redis for persistent rate limiting
- [x] Implement audit logging (COMPLETED: Created `lib/auditLog.ts` with comprehensive logging functions)
- [x] Review and fix TypeScript errors (COMPLETED: Fixed all TypeScript compilation errors)
- [ ] Run security scan (npm audit, Snyk, or similar)
- [ ] Perform penetration testing

### Ongoing Security Maintenance

- [ ] Regularly rotate API keys and secrets (quarterly)
- [ ] Monitor audit logs for suspicious activity
- [ ] Keep dependencies updated (npm audit fix)
- [ ] Review Firebase Security Rules periodically
- [ ] Test rate limiting effectiveness
- [ ] Backup and test disaster recovery procedures

---

## Current Security Strengths

The application already implements several security best practices:

| Feature | Implementation | Location |
|---------|----------------|----------|
| Secret Management | Google Cloud Secret Manager | `lib/sharepoint.ts` |
| API Authentication | Firebase Admin SDK | `lib/apiAuth.ts` |
| Broker Token Auth | Cryptographic tokens with expiry | `lib/brokerAuth.ts` |
| Rate Limiting | In-memory sliding window | `lib/rateLimit.ts` |
| SSN Masking | Toggle visibility component | `components/loan-sections/PasswordToggle.tsx` |
| No XSS Vectors | No dangerouslySetInnerHTML | Verified via grep |
| No Injection | No eval/exec usage | Verified via grep |
| File Size Limits | 10MB broker uploads | `app/api/broker/upload/route.ts` |
| Env Var Separation | NEXT_PUBLIC_ prefix for client vars | `.env.*` files |
| CSP Headers | Comprehensive security headers | `next.config.ts` |
| File Type Validation | MIME type + extension validation | `lib/fileValidation.ts` |
| Audit Logging | Firestore-based event logging | `lib/auditLog.ts` |
| API Security Headers | Reusable header utility | `lib/apiSecurityHeaders.ts` |

---

## Contact

For security concerns or to report vulnerabilities, contact the development team immediately.

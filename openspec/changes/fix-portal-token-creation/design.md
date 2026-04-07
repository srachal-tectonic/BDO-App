# Design: Fix Portal Token Creation Error

## Context

The portal token creation endpoint (`/api/projects/[id]/portal-token`) is failing with a generic error message. This endpoint is critical for the Borrower Forms feature as it generates secure links for borrowers to access the document portal.

**Current Implementation Issues:**
- No authentication verification
- No CSRF protection
- Generic error handling that swallows actual errors
- Non-atomic database operations

**Working Reference Implementation:**
The `/api/broker/tokens` endpoint uses the same pattern but works correctly. Key differences:
- Uses `verifyAuth` for authentication
- Uses `checkCsrf` for CSRF protection
- Uses plain `new Date()` instead of `Timestamp.fromDate()`
- Validates user has access to the project

## Goals / Non-Goals

### Goals
- Fix the immediate error so BDOs can generate portal links
- Add proper authentication and authorization
- Improve error handling for easier debugging
- Ensure data consistency with atomic operations

### Non-Goals
- Changing the API contract (request/response format)
- Adding new features to the portal token system
- Refactoring the entire borrower forms flow

## Decisions

### Decision: Follow broker/tokens Pattern
**Choice**: Align the portal-token endpoint with the working broker/tokens implementation.

**Rationale**: The broker/tokens endpoint uses the same pattern (create token, store in Firestore, return to client) and works correctly. By following the same patterns, we reduce the risk of introducing new issues.

**Key Patterns to Apply:**
```typescript
// 1. CSRF protection
const csrfError = checkCsrf(request);
if (csrfError) return csrfError;

// 2. Authentication
const authResult = await verifyAuth(request);
if (!authResult.authenticated || !authResult.user) {
  return unauthorizedResponse(authResult.error);
}

// 3. Use plain Date objects (Firestore auto-converts)
const tokenData = {
  createdAt: now,  // new Date()
  expiresAt,       // new Date()
  // ...
};

// 4. Get user info from auth, not request body
createdBy: authResult.user.uid,
createdByName: userName,
```

### Decision: Use Firestore Batch for Atomicity
**Choice**: Use `adminDb.batch()` to perform token creation and project update atomically.

**Rationale**: If the project update fails after token creation, we'd have an orphan token. A batch ensures both operations succeed or both fail.

```typescript
const batch = adminDb.batch();

// Create token
const tokenRef = adminDb.collection('formPortalTokens').doc(token);
batch.set(tokenRef, tokenData);

// Update project
const projectRef = adminDb.collection('projects').doc(projectId);
batch.update(projectRef, { formPortalToken: token, ... });

// Atomic commit
await batch.commit();
```

### Decision: Enhanced Error Logging
**Choice**: Log detailed errors server-side, return generic errors to client (with dev mode exception).

**Rationale**: Security best practice is to not expose internal errors to clients, but we need visibility into what's failing.

```typescript
catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  const errorStack = error instanceof Error ? error.stack : '';

  console.error('[Portal Token POST] Error:', {
    message: errorMessage,
    stack: errorStack,
    projectId,
    userId: authResult?.user?.uid,
  });

  // In development, return detailed error
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.json({
      error: 'Failed to create portal token',
      details: errorMessage
    }, { status: 500 });
  }

  return NextResponse.json({ error: 'Failed to create portal token' }, { status: 500 });
}
```

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| Adding auth breaks existing clients | Portal links stop working | Client already sends user info; auth just validates it |
| CSRF protection blocks legitimate requests | Portal links stop working | CSRF is currently disabled unless env var set |
| Batch write has different error semantics | Unexpected failures | Test thoroughly before deployment |

## Migration Plan

1. **Phase 1**: Deploy fix with enhanced logging
2. **Phase 2**: Monitor logs to confirm fix works
3. **Phase 3**: No migration needed - same API contract

**Rollback**: Revert to previous version if issues persist

## Open Questions

1. **Q**: Should GET endpoint also require authentication?
   **A**: Yes, for consistency, but lower priority since it only reads data.

2. **Q**: Should we add rate limiting to prevent token spam?
   **A**: Out of scope for this fix, but good future enhancement.

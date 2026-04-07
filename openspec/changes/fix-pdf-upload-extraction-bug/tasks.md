# Tasks: Fix PDF Upload Extraction Bug

## 1. Root Cause Analysis
- [x] 1.1 Confirm file has data locally (10 fields with values)
- [x] 1.2 Confirm extraction code works locally
- [x] 1.3 Identify the bug: Web API File to Node.js Buffer conversion fails in multiple ways

## 2. Fix Implementation
- [x] 2.1 First attempt: `Buffer.from(new Uint8Array(arrayBuffer))` - FAILED
- [x] 2.2 Second attempt: Stream-based reading with `file.stream()` - FAILED
- [x] 2.3 Third attempt: Switch to base64 encoding (like pdf-imports route) - IMPLEMENTED
- [x] 2.4 Update client-side to send base64 JSON instead of FormData
- [x] 2.5 Update server-side to decode base64 to Buffer
- [x] 2.6 Add logging to verify buffer sizes match
- [x] 2.7 Check other upload routes for same issue (confirmed: broker/upload passes arrayBuffer directly to fetch, pdf-imports uses base64)

## 3. Testing
- [ ] 3.1 Deploy fix to production
- [ ] 3.2 Upload Testing.pdf through borrower portal
- [ ] 3.3 Verify extraction shows 10 fields with values
- [ ] 3.4 Verify logs show matching buffer sizes

---

## Progress Summary

**Completed**: 9/11 tasks (82%)

## Root Cause

The issue was that the Web API `File` object from FormData could not be reliably converted to a Node.js `Buffer` in the Next.js App Router server environment. Multiple approaches failed:

1. `Buffer.from(arrayBuffer)` - Failed
2. `Buffer.from(new Uint8Array(arrayBuffer))` - Failed
3. Stream-based reading with `file.stream()` - Failed

## Solution

Switch to base64 encoding, which is the same reliable approach used by the working `pdf-imports/upload` route:

```typescript
// CLIENT: Convert to base64 in browser (where File API works correctly)
const base64 = btoa(binaryString);

// SERVER: Decode base64 to Buffer (reliable Node.js function)
const buffer = Buffer.from(file.data, 'base64');
```

## Files Changed

- `app/forms/[token]/page.tsx` - Send files as base64 JSON instead of FormData
- `app/api/forms/[token]/upload/route.ts` - Parse JSON, decode base64 to Buffer

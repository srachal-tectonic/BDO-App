# Design: Fix PDF Upload Extraction Bug

## Context

PDF files with filled form data were showing all fields as empty when uploaded through the borrower portal, despite the same files extracting correctly when tested locally.

## Root Cause

The bug was in how the Web API `File` object from FormData was being converted to a Node.js `Buffer` in `/api/forms/[token]/upload/route.ts`. Multiple approaches were tried:

### Approach 1: Direct ArrayBuffer (Failed)
```typescript
const arrayBuffer = await file.arrayBuffer();
const buffer = Buffer.from(arrayBuffer);
```

### Approach 2: Uint8Array intermediate (Failed)
```typescript
const arrayBuffer = await file.arrayBuffer();
const uint8Array = new Uint8Array(arrayBuffer);
const buffer = Buffer.from(uint8Array);
```

### Approach 3: Stream-based reading (Failed)
```typescript
const stream = file.stream();
const reader = stream.getReader();
const chunks: Uint8Array[] = [];
// ... read all chunks
const buffer = Buffer.concat(chunks);
```

### Why All Approaches Failed

The Web API `File` object in Next.js App Router's server environment behaves differently than expected. When files come through FormData in the Node.js server context, the various methods (`arrayBuffer()`, `stream()`, etc.) may not work correctly due to:

1. Cross-realm ArrayBuffer issues
2. Next.js internal handling of FormData
3. Streaming issues between Web API and Node.js contexts

## Solution

Switch to **base64 encoding** on the client side, which completely avoids the FormData/File API issues. This is the same approach used by the working `pdf-imports/upload` route.

### Client-side (app/forms/[token]/page.tsx)
```typescript
// Convert files to base64 before sending
const arrayBuffer = await file.arrayBuffer();
const bytes = new Uint8Array(arrayBuffer);
let binary = '';
for (let i = 0; i < bytes.length; i++) {
  binary += String.fromCharCode(bytes[i]);
}
const base64 = btoa(binary);

// Send as JSON instead of FormData
fetch(`/api/forms/${token}/upload`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ files: [{ name, type, size, data: base64 }] }),
});
```

### Server-side (app/api/forms/[token]/upload/route.ts)
```typescript
// Decode base64 to Buffer - this works reliably
const body = await request.json();
const buffer = Buffer.from(file.data, 'base64');
```

### Why This Works

1. **Browser's ArrayBuffer works correctly** - The browser environment properly handles file reading
2. **Base64 is a string** - No cross-realm issues with strings
3. **Buffer.from(string, 'base64')** - Well-tested Node.js function
4. **Proven approach** - Same method used in `pdf-imports/upload` which works

## Verification

Added logging to verify the fix:
```typescript
console.log('[Forms Portal Upload] Buffer created:', {
  name: file.name,
  expectedSize: file.size,
  actualBufferSize: buffer.length,
  sizeMatch: buffer.length === file.size,
});
```

## Testing

1. Deploy the fix
2. Upload Testing.pdf through borrower portal
3. Check logs show buffer size matches file size
4. Verify extraction shows 10 filled fields (not 0)
5. Check PDF header shows "%PDF"

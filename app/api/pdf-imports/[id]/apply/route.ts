import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';
import { PdfImportSession, PdfFieldMapping, ExtractedField } from '@/types';
import { checkCsrf } from '@/lib/csrf';

// Helper to verify auth token
async function verifyAuthToken(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken.uid;
  } catch (error) {
    console.error('[PDF Import] Token verification failed:', error);
    return null;
  }
}

/**
 * Set a nested value in an object using dot notation path
 */
function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    // Handle array notation like owners[0]
    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const arrayName = arrayMatch[1];
      const index = parseInt(arrayMatch[2], 10);
      if (!current[arrayName]) {
        current[arrayName] = [];
      }
      const arr = current[arrayName] as unknown[];
      if (!arr[index]) {
        arr[index] = {};
      }
      current = arr[index] as Record<string, unknown>;
    } else {
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }
  }

  const lastPart = parts[parts.length - 1];
  const arrayMatch = lastPart.match(/^(\w+)\[(\d+)\]$/);
  if (arrayMatch) {
    const arrayName = arrayMatch[1];
    const index = parseInt(arrayMatch[2], 10);
    if (!current[arrayName]) {
      current[arrayName] = [];
    }
    (current[arrayName] as unknown[])[index] = value;
  } else {
    current[lastPart] = value;
  }
}

/**
 * POST /api/pdf-imports/[id]/apply
 * Apply the mapped PDF data to the loan application
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // CSRF protection
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  try {
    const userId = await verifyAuthToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Get the import session
    const sessionRef = adminDb.collection('pdfImportSessions').doc(id);
    const sessionSnap = await sessionRef.get();

    if (!sessionSnap.exists) {
      return NextResponse.json({ error: 'Import session not found' }, { status: 404 });
    }

    const sessionData = sessionSnap.data() as Omit<PdfImportSession, 'id'>;
    const { projectId, extractedFields, appliedMappings } = sessionData;

    if (!appliedMappings || appliedMappings.length === 0) {
      return NextResponse.json(
        { error: 'No mappings defined. Please map fields before applying.' },
        { status: 400 }
      );
    }

    // Create a map of field name to value
    const fieldValues: Record<string, unknown> = {};
    for (const field of extractedFields) {
      fieldValues[field.name] = field.value;
    }

    // Build updates grouped by section
    const sectionUpdates: Record<string, Record<string, unknown>> = {};

    for (const mapping of appliedMappings as PdfFieldMapping[]) {
      if (!mapping.appSection || !mapping.appFieldPath) continue;

      const value = fieldValues[mapping.pdfFieldName];
      if (value === null || value === undefined || value === '') continue;

      if (!sectionUpdates[mapping.appSection]) {
        sectionUpdates[mapping.appSection] = {};
      }

      setNestedValue(sectionUpdates[mapping.appSection], mapping.appFieldPath, value);
    }

    // Get existing loan application
    const loanAppRef = adminDb.collection('loanApplications').doc(projectId);
    const loanAppSnap = await loanAppRef.get();

    // Merge updates with existing data
    const existingData = loanAppSnap.exists ? loanAppSnap.data() || {} : {};

    // Deep merge section updates
    for (const [section, updates] of Object.entries(sectionUpdates)) {
      if (!existingData[section]) {
        existingData[section] = {};
      }
      existingData[section] = deepMerge(
        existingData[section] as Record<string, unknown>,
        updates
      );
    }

    // Save updated loan application
    await loanAppRef.set(
      {
        ...existingData,
        projectId,
        updatedAt: new Date(),
      },
      { merge: true }
    );

    // Update import session status
    await sessionRef.update({
      status: 'applied',
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Import applied successfully',
      sectionsUpdated: Object.keys(sectionUpdates),
      fieldsApplied: appliedMappings.filter((m: PdfFieldMapping) => m.appSection && m.appFieldPath).length,
    });
  } catch (error) {
    console.error('[PDF Import] Error applying import:', error);
    return NextResponse.json({ error: 'Failed to apply import' }, { status: 500 });
  }
}

/**
 * Deep merge two objects
 */
function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (
      sourceValue !== null &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue !== null &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>
      );
    } else if (sourceValue !== null && sourceValue !== undefined) {
      result[key] = sourceValue;
    }
  }

  return result;
}

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, Timestamp } from '@/lib/firebaseAdmin';
import { ExtractedFieldValue, ExtractionChange } from '@/types';

/**
 * Set a nested value in an object using dot notation path
 */
function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): void {
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
 * Get a nested value from an object using dot notation path
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }

    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const arrayName = arrayMatch[1];
      const index = parseInt(arrayMatch[2], 10);
      current = (current as Record<string, unknown>)[arrayName];
      if (Array.isArray(current)) {
        current = current[index];
      } else {
        return undefined;
      }
    } else {
      current = (current as Record<string, unknown>)[part];
    }
  }

  return current;
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

/**
 * POST /api/projects/[id]/borrower-uploads/[uploadId]/apply
 * Apply extracted data to the loan application
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; uploadId: string }> }
) {
  try {
    const { id: projectId, uploadId } = await params;

    if (!projectId || !uploadId) {
      return NextResponse.json(
        { error: 'Project ID and Upload ID required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { extractionId, appliedBy, appliedByName, overwriteExisting = false } = body;

    if (!extractionId || !appliedBy || !appliedByName) {
      return NextResponse.json(
        { error: 'Extraction ID and user information required' },
        { status: 400 }
      );
    }

    // Get the extraction record
    const extractionRef = adminDb
      .collection('projects')
      .doc(projectId)
      .collection('borrowerUploads')
      .doc(uploadId)
      .collection('extractions')
      .doc(extractionId);

    const extractionDoc = await extractionRef.get();

    if (!extractionDoc.exists) {
      return NextResponse.json(
        { error: 'Extraction not found' },
        { status: 404 }
      );
    }

    const extractionData = extractionDoc.data();
    const fields: ExtractedFieldValue[] = extractionData?.fields || [];

    // Get upload info for history
    const uploadRef = adminDb
      .collection('projects')
      .doc(projectId)
      .collection('borrowerUploads')
      .doc(uploadId);
    const uploadDoc = await uploadRef.get();
    const uploadFilename = uploadDoc.data()?.originalName || 'Unknown file';

    // Filter to only approved or edited fields with mappings
    const fieldsToApply = fields.filter(
      (f) =>
        (f.status === 'approved' || f.status === 'edited') &&
        f.mappedSection &&
        f.mappedPath
    );

    if (fieldsToApply.length === 0) {
      return NextResponse.json(
        { error: 'No approved fields to apply' },
        { status: 400 }
      );
    }

    // Get existing loan application
    const loanAppRef = adminDb.collection('loanApplications').doc(projectId);
    const loanAppDoc = await loanAppRef.get();
    const existingData = loanAppDoc.exists ? loanAppDoc.data() || {} : {};

    // Build updates grouped by section
    const sectionUpdates: Record<string, Record<string, unknown>> = {};
    const changes: ExtractionChange[] = [];
    const conflicts: Array<{
      field: string;
      existingValue: unknown;
      newValue: unknown;
    }> = [];

    for (const field of fieldsToApply) {
      const section = field.mappedSection!;
      const path = field.mappedPath!;
      const value = field.status === 'edited' ? field.editedValue : field.transformedValue;

      // Check for existing value
      const fullPath = `${section}.${path}`;
      const existingValue = getNestedValue(existingData, fullPath);

      // Track conflicts
      if (
        existingValue !== null &&
        existingValue !== undefined &&
        existingValue !== '' &&
        !overwriteExisting
      ) {
        conflicts.push({
          field: field.mappedLabel || path,
          existingValue,
          newValue: value,
        });
        continue; // Skip this field
      }

      // Build section updates
      if (!sectionUpdates[section]) {
        sectionUpdates[section] = {};
      }
      setNestedValue(sectionUpdates[section], path, value);

      // Track change for audit
      changes.push({
        section,
        fieldPath: path,
        fieldLabel: field.mappedLabel,
        oldValue: existingValue ?? null,
        newValue: value,
      });
    }

    // If there are conflicts and we're not overwriting, return them
    if (conflicts.length > 0 && !overwriteExisting) {
      return NextResponse.json({
        success: false,
        conflicts,
        message: `${conflicts.length} field(s) have existing values. Set overwriteExisting=true to overwrite.`,
      });
    }

    // Apply updates
    if (changes.length > 0) {
      // Deep merge section updates with existing data
      const updatedData = { ...existingData };
      for (const [section, updates] of Object.entries(sectionUpdates)) {
        if (!updatedData[section]) {
          updatedData[section] = {};
        }
        updatedData[section] = deepMerge(
          updatedData[section] as Record<string, unknown>,
          updates
        );
      }

      // Save updated loan application
      await loanAppRef.set(
        {
          ...updatedData,
          projectId,
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      );

      // Update extraction status
      await extractionRef.update({
        status: 'applied',
        appliedBy,
        appliedByName,
        appliedAt: Timestamp.now(),
      });

      // Update upload status
      await uploadRef.update({
        extractionStatus: 'applied',
      });

      // Create audit history entry
      await adminDb.collection('projects').doc(projectId).collection('extractionHistory').add({
        projectId,
        extractionId,
        uploadId,
        uploadFilename,
        appliedBy,
        appliedByName,
        appliedAt: Timestamp.now(),
        fieldsApplied: changes.length,
        changes,
      });
    }

    return NextResponse.json({
      success: true,
      fieldsApplied: changes.length,
      changes,
      message: `Applied ${changes.length} field(s) to loan application`,
    });
  } catch (error) {
    console.error('[Apply Extraction] Error:', error);
    return NextResponse.json(
      { error: 'Failed to apply extraction' },
      { status: 500 }
    );
  }
}

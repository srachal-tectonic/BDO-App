import type { FieldChange } from '@/lib/auditLog';

// Fields that are metadata / always change — skip them in diffs
const IGNORED_FIELDS = new Set([
  '_id', 'updatedAt', 'createdAt', 'timestamp', '__v',
]);

// Fields containing sensitive data — mask values in diffs
const SENSITIVE_FIELDS = new Set([
  'ssn', 'socialSecurityNumber', 'taxId', 'ein',
]);

/**
 * Compare two objects and return an array of field-level changes.
 *
 * @param oldObj   - Previous state of the record
 * @param newObj   - New state (the incoming update)
 * @param labels   - Optional map of dot-paths to human-readable labels
 * @param prefix   - Internal: current dot-path prefix for recursion
 * @returns Array of FieldChange entries for fields that actually differ
 */
export function diffObjects(
  oldObj: Record<string, any> | null | undefined,
  newObj: Record<string, any> | null | undefined,
  labels?: Record<string, string>,
  prefix = '',
): FieldChange[] {
  const changes: FieldChange[] = [];
  const old = oldObj ?? {};
  const nw = newObj ?? {};

  // Collect all keys from both objects
  const allKeys = new Set([...Object.keys(old), ...Object.keys(nw)]);

  for (const key of allKeys) {
    if (IGNORED_FIELDS.has(key)) continue;

    const fullPath = prefix ? `${prefix}.${key}` : key;
    const oldVal = old[key];
    const newVal = nw[key];

    // Both undefined/null — no change
    if (oldVal == null && newVal == null) continue;

    // Check if this is a nested plain object (not array, not Date)
    if (
      isPlainObject(oldVal) && isPlainObject(newVal)
    ) {
      // Recurse into nested objects
      changes.push(...diffObjects(oldVal, newVal, labels, fullPath));
      continue;
    }

    // Compare values
    if (!valuesEqual(oldVal, newVal)) {
      const label = labels?.[fullPath] ?? humanizeFieldPath(fullPath);
      const isSensitive = SENSITIVE_FIELDS.has(key);

      changes.push({
        field: fullPath,
        label,
        oldValue: isSensitive ? maskValue(oldVal) : oldVal,
        newValue: isSensitive ? maskValue(newVal) : newVal,
      });
    }
  }

  return changes;
}

/**
 * Diff specifically for array items (e.g. individualApplicants).
 * Compares arrays by matching on `id` field, detecting adds, removes, and updates.
 */
export function diffArrayById<T extends { id: string }>(
  oldArr: T[],
  newArr: T[],
  arrayPath: string,
  itemLabelFn: (item: T) => string,
  labels?: Record<string, string>,
): FieldChange[] {
  const changes: FieldChange[] = [];
  const oldMap = new Map(oldArr.map(item => [item.id, item]));
  const newMap = new Map(newArr.map(item => [item.id, item]));

  // Detect removed items
  for (const [id, oldItem] of oldMap) {
    if (!newMap.has(id)) {
      changes.push({
        field: `${arrayPath}[${id}]`,
        label: `Removed ${itemLabelFn(oldItem)}`,
        oldValue: itemLabelFn(oldItem),
        newValue: null,
      });
    }
  }

  // Detect added items
  for (const [id, newItem] of newMap) {
    if (!oldMap.has(id)) {
      changes.push({
        field: `${arrayPath}[${id}]`,
        label: `Added ${itemLabelFn(newItem)}`,
        oldValue: null,
        newValue: itemLabelFn(newItem),
      });
    }
  }

  // Detect modified items
  for (const [id, newItem] of newMap) {
    const oldItem = oldMap.get(id);
    if (oldItem) {
      const itemChanges = diffObjects(
        oldItem as any,
        newItem as any,
        labels,
        `${arrayPath}[${id}]`,
      );
      changes.push(...itemChanges);
    }
  }

  return changes;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function isPlainObject(val: unknown): val is Record<string, any> {
  return val != null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date);
}

function valuesEqual(a: unknown, b: unknown): boolean {
  // Handle null/undefined
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;

  // Primitive comparison
  if (typeof a !== 'object' || typeof b !== 'object') {
    return a === b;
  }

  // Array comparison (shallow JSON)
  if (Array.isArray(a) && Array.isArray(b)) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  // Object comparison (shallow JSON)
  return JSON.stringify(a) === JSON.stringify(b);
}

function maskValue(val: unknown): string {
  if (val == null) return '***';
  const str = String(val);
  if (str.length >= 4) return `***${str.slice(-4)}`;
  return '***';
}

/**
 * Convert a dot-path like "businessApplicant.legalName" to "Business Applicant Legal Name"
 */
function humanizeFieldPath(path: string): string {
  // Take the last segment for brevity, or full path if short
  const segment = path.includes('.') ? path.split('.').pop()! : path;
  // camelCase / snake_case → words
  return segment
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

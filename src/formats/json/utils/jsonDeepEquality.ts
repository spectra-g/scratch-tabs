/**
 * JSON Deep Equality Checker
 *
 * Provides semantic comparison of JSON objects with:
 * - Order-insensitive object key comparison
 * - Order-insensitive array comparison (treats arrays as multisets)
 * - Detailed difference reporting with paths and values
 * - Canonical hashing for efficient array comparison
 */

export interface EqualityComparisonOptions {
  ignoreArrayOrder: boolean;
}

export type DifferenceType =
  | "VALUE_MISMATCH"
  | "MISSING_KEY_LEFT"
  | "MISSING_KEY_RIGHT"
  | "TYPE_MISMATCH"
  | "ARRAY_CONTENT_MISMATCH"
  | "ARRAY_LENGTH_MISMATCH";

export interface DifferenceDetail {
  path: string;
  type: DifferenceType;
  message: string;
  leftValue?: any;
  rightValue?: any;
}

export interface EqualityResult {
  isEqual: boolean;
  differences: DifferenceDetail[];
}

const DEFAULT_OPTIONS: EqualityComparisonOptions = {
  ignoreArrayOrder: true,
};

/**
 * Creates a canonical, order-insensitive hash for any JSON value.
 * This enables comparison of arrays as multisets (order-independent collections).
 */
function getCanonicalHash(value: any): string {
  if (value === null) return "null";
  if (typeof value !== "object") return `${typeof value}:${JSON.stringify(value)}`;

  if (Array.isArray(value)) {
    // Hash of sorted element hashes makes array order-insensitive
    const elementHashes = value.map(getCanonicalHash).sort();
    return `array:${JSON.stringify(elementHashes)}`;
  }

  // It's an object, sort keys for a consistent hash
  const sortedKeys = Object.keys(value).sort();
  const sortedObjectString = sortedKeys
    .map((key) => {
      const valHash = getCanonicalHash(value[key]);
      return `${JSON.stringify(key)}:${valHash}`;
    })
    .join(",");
  return `object:{${sortedObjectString}}`;
}

/**
 * Creates a frequency map of canonical hashes for array elements.
 * This enables intelligent reporting of matched, missing, and extra items.
 * @returns Map<string, number> where key is hash and value is count.
 */
function getArrayItemHashMap(arr: any[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of arr) {
    const hash = getCanonicalHash(item);
    map.set(hash, (map.get(hash) || 0) + 1);
  }
  return map;
}

/**
 * Get the type of a value as a string for comparison purposes.
 */
function getValueType(value: any): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

/**
 * Format a value for display in error messages (with truncation).
 */
function formatValueForDisplay(value: any, maxLength: number = 100): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";

  const str = typeof value === "string" ? value : JSON.stringify(value);

  if (str.length <= maxLength) {
    return str;
  }

  return `${str.substring(0, maxLength)}...`;
}

/**
 * Recursively compare two values and collect differences.
 */
function compareValues(
  left: any,
  right: any,
  path: string,
  options: EqualityComparisonOptions,
  diffs: DifferenceDetail[],
): void {
  const leftType = getValueType(left);
  const rightType = getValueType(right);

  // Type mismatch
  if (leftType !== rightType) {
    diffs.push({
      path,
      type: "TYPE_MISMATCH",
      message: `Type mismatch: Source is '${leftType}', Target is '${rightType}'`,
      leftValue: left,
      rightValue: right,
    });
    return;
  }

  // Primitives (string, number, boolean, null)
  if (leftType !== "object" && leftType !== "array") {
    if (left !== right) {
      diffs.push({
        path,
        type: "VALUE_MISMATCH",
        message: `Value mismatch: Source is ${formatValueForDisplay(left, 50)}, Target is ${formatValueForDisplay(right, 50)}`,
        leftValue: left,
        rightValue: right,
      });
    }
    return;
  }

  // Arrays
  if (Array.isArray(left)) {
    if (options.ignoreArrayOrder) {
      // Quick check: if hashes match, arrays are equal
      if (getCanonicalHash(left) === getCanonicalHash(right)) {
        return;
      }

      // Detailed analysis using frequency maps
      const leftMap = getArrayItemHashMap(left);
      const rightMap = getArrayItemHashMap(right);

      let matchedItems = 0;
      const allHashes = new Set([...leftMap.keys(), ...rightMap.keys()]);

      allHashes.forEach((hash) => {
        const leftCount = leftMap.get(hash) || 0;
        const rightCount = rightMap.get(hash) || 0;
        matchedItems += Math.min(leftCount, rightCount);
      });

      const missingInRight = left.length - matchedItems;
      const extraInRight = right.length - matchedItems;

      let message = "Array contents differ.";
      if (missingInRight > 0 || extraInRight > 0) {
        const parts = [];
        if (matchedItems > 0) parts.push(`${matchedItems} item(s) matched`);
        if (missingInRight > 0) parts.push(`${missingInRight} missing from target`);
        if (extraInRight > 0) parts.push(`${extraInRight} extra in target`);
        message = `Array contents differ: ${parts.join(", ")}.`;
      }

      diffs.push({
        path,
        type: "ARRAY_CONTENT_MISMATCH",
        message,
        leftValue: left,
        rightValue: right,
      });
    } else {
      // Order-sensitive comparison
      if (left.length !== right.length) {
        diffs.push({
          path,
          type: "ARRAY_LENGTH_MISMATCH",
          message: `Array length mismatch: Source has ${left.length} items, Target has ${right.length} items`,
          leftValue: left,
          rightValue: right,
        });
        return;
      }

      // Compare each element in order
      for (let i = 0; i < left.length; i++) {
        compareValues(left[i], right[i], `${path}[${i}]`, options, diffs);
      }
    }
    return;
  }

  // Objects
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  const allKeys = new Set([...leftKeys, ...rightKeys]);

  allKeys.forEach((key) => {
    const keyPath = path === "/" ? `/${key}` : `${path}.${key}`;
    const leftHasKey = Object.prototype.hasOwnProperty.call(left, key);
    const rightHasKey = Object.prototype.hasOwnProperty.call(right, key);

    if (leftHasKey && rightHasKey) {
      // Both have the key, recursively compare values
      compareValues(left[key], right[key], keyPath, options, diffs);
    } else if (leftHasKey) {
      // Key exists in left but not in right
      diffs.push({
        path: keyPath,
        type: "MISSING_KEY_RIGHT",
        message: `Key '${key}' exists in Source but is missing in Target`,
        leftValue: left[key],
      });
    } else {
      // Key exists in right but not in left
      diffs.push({
        path: keyPath,
        type: "MISSING_KEY_LEFT",
        message: `Key '${key}' exists in Target but is missing in Source`,
        rightValue: right[key],
      });
    }
  });
}

/**
 * Main function to compare two JSON objects for deep equality.
 *
 * @param jsonA - Source JSON (string or object)
 * @param jsonB - Target JSON (string or object)
 * @param options - Comparison options
 * @returns EqualityResult with isEqual flag and list of differences
 * @throws Error if JSON parsing fails
 */
export function compareJsonEquality(
  jsonA: any,
  jsonB: any,
  options: Partial<EqualityComparisonOptions> = {},
): EqualityResult {
  const finalOptions = { ...DEFAULT_OPTIONS, ...options };
  const differences: DifferenceDetail[] = [];

  let parsedA: any, parsedB: any;

  // Parse source JSON
  try {
    parsedA = typeof jsonA === "string" ? JSON.parse(jsonA) : jsonA;
  } catch (e) {
    throw new Error(`Invalid Source JSON: ${e instanceof Error ? e.message : "Parse error"}`);
  }

  // Parse target JSON
  try {
    parsedB = typeof jsonB === "string" ? JSON.parse(jsonB) : jsonB;
  } catch (e) {
    throw new Error(`Invalid Target JSON: ${e instanceof Error ? e.message : "Parse error"}`);
  }

  // Perform comparison
  compareValues(parsedA, parsedB, "/", finalOptions, differences);

  return {
    isEqual: differences.length === 0,
    differences,
  };
}

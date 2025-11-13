/**
 * Array Diff Preparation Utilities
 *
 * These utilities prepare arrays for visual comparison by:
 * 1. Recursively sorting all object keys (order-insensitive comparison)
 * 2. Sorting array elements by their canonical string representation
 * 3. Formatting the result as readable JSON
 *
 * This makes it much easier to visually spot actual differences when comparing
 * arrays that might have the same content but in different orders.
 */

/**
 * Recursively sorts all object keys in a value, creating a canonical representation.
 * Arrays are preserved as-is (not sorted yet), but their nested objects are sorted.
 *
 * @param value - Any JSON-serializable value
 * @returns The same value with all object keys sorted recursively
 *
 * @example
 * ```ts
 * deepSortKeys({ b: 2, a: 1 }) // => { a: 1, b: 2 }
 * deepSortKeys([{ b: 2, a: 1 }]) // => [{ a: 1, b: 2 }]
 * ```
 */
export function deepSortKeys(value: any): any {
  // Handle primitives and null
  if (value === null || typeof value !== "object") {
    return value;
  }

  // Handle arrays - sort keys of nested objects but preserve array order for now
  if (Array.isArray(value)) {
    return value.map(deepSortKeys);
  }

  // Handle objects - sort keys and recurse into values
  const sortedKeys = Object.keys(value).sort();
  const sortedObject: Record<string, any> = {};

  for (const key of sortedKeys) {
    sortedObject[key] = deepSortKeys(value[key]);
  }

  return sortedObject;
}

/**
 * Creates a stable, canonical string representation for any value.
 * This is used for sorting array elements.
 *
 * @param value - Any JSON-serializable value
 * @returns A stable string representation suitable for sorting
 */
function getCanonicalString(value: any): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";

  // For objects and arrays, use JSON.stringify with sorted keys
  if (typeof value === "object") {
    return JSON.stringify(deepSortKeys(value));
  }

  // For primitives, include type information to ensure stable sorting
  return `${typeof value}:${JSON.stringify(value)}`;
}

/**
 * Prepares an array for diff visualization by:
 * 1. Deep-sorting all object keys (makes objects order-insensitive)
 * 2. Sorting array elements by their canonical string representation
 * 3. Formatting as indented JSON
 *
 * This produces a normalized, human-readable representation that makes it easy
 * to spot actual differences in a side-by-side diff view.
 *
 * @param arr - The array to prepare (must be JSON-serializable)
 * @returns Formatted JSON string with sorted keys and sorted array elements
 * @throws Error if the input is not an array
 *
 * @example
 * ```ts
 * const arr1 = [{ name: "Bob", age: 30 }, { name: "Alice", age: 25 }];
 * const arr2 = [{ age: 25, name: "Alice" }, { age: 30, name: "Bob" }];
 *
 * prepareArrayForDiff(arr1) === prepareArrayForDiff(arr2); // true - normalized to same format
 * ```
 */
export function prepareArrayForDiff(arr: any[]): string {
  if (!Array.isArray(arr)) {
    throw new Error("prepareArrayForDiff expects an array as input");
  }

  // Step 1: Deep sort all object keys within array elements
  const keySortedArray = arr.map(deepSortKeys);

  // Step 2: Sort array elements by their canonical string representation
  // This makes arrays with the same content but different order comparable
  const sortedArray = keySortedArray.sort((a, b) => {
    const strA = getCanonicalString(a);
    const strB = getCanonicalString(b);
    return strA.localeCompare(strB);
  });

  // Step 3: Format as pretty JSON with 2-space indentation
  return JSON.stringify(sortedArray, null, 2);
}

/**
 * Validates that both inputs are arrays before preparing them for diff.
 * Returns error message if validation fails, otherwise returns prepared content.
 *
 * @param leftValue - The left/source array
 * @param rightValue - The right/target array
 * @returns Object with either error message or prepared left/right content
 */
export function prepareArrayPairForDiff(
  leftValue: any,
  rightValue: any,
): { error: string } | { leftContent: string; rightContent: string } {
  if (!Array.isArray(leftValue)) {
    return { error: "Left value is not an array" };
  }

  if (!Array.isArray(rightValue)) {
    return { error: "Right value is not an array" };
  }

  try {
    const leftContent = prepareArrayForDiff(leftValue);
    const rightContent = prepareArrayForDiff(rightValue);

    return { leftContent, rightContent };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to prepare arrays",
    };
  }
}

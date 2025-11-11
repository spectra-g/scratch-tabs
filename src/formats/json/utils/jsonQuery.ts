/**
 * Safely retrieves a nested value from an object using a string path.
 * Handles both dot notation and bracket notation for arrays.
 * @param obj The object to query.
 * @param path The path string (e.g., 'a.b[0].c').
 * @returns The value at the specified path, or undefined if not found.
 */
function getObjectByPath(obj: any, path: string): any {
  if (!path) return obj;

  const parts = path.match(/[^.[\]]+/g) || [];
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    const index = parseInt(part, 10);
    if (Array.isArray(current) && !isNaN(index)) {
      current = current[index];
    } else if (typeof current === 'object' && part in current) {
      current = current[part as keyof typeof current];
    } else {
      return undefined;
    }
  }
  return current;
}

/**
 * Evaluates a simple condition string against an object.
 * Supports operators: ==, !=, >, <, >=, <=
 * @param item The object to evaluate.
 * @param condition The condition string (e.g., 'age >= 18').
 * @returns True if the condition is met, false otherwise.
 */
function evaluateCondition(item: object, condition: string): boolean {
  const match = condition.match(
    /^\s*([a-zA-Z0-9_.-]+)\s*(==|!=|>=|<=|>|<)\s*(.*)\s*$/,
  );
  if (!match) return true; // Invalid or empty condition is treated as true

  const [, key, operator, rawValue] = match;
  const itemValue = getObjectByPath(item, key);

  if (itemValue === undefined) return false;

  let conditionValue: any = rawValue.trim();
  // Attempt to parse value as number or boolean, otherwise treat as string
  if (!isNaN(Number(conditionValue)) && !isNaN(parseFloat(conditionValue))) {
    conditionValue = parseFloat(conditionValue);
  } else if (conditionValue.toLowerCase() === 'true') {
    conditionValue = true;
  } else if (conditionValue.toLowerCase() === 'false') {
    conditionValue = false;
  } else {
    // It's a string, remove quotes if they exist
    conditionValue = conditionValue.replace(/^["']|["']$/g, '');
  }

  switch (operator) {
    case '==':
      return itemValue == conditionValue;
    case '!=':
      return itemValue != conditionValue;
    case '>':
      return itemValue > conditionValue;
    case '<':
      return itemValue < conditionValue;
    case '>=':
      return itemValue >= conditionValue;
    case '<=':
      return itemValue <= conditionValue;
    default:
      return false;
  }
}

/**
 * Extracts data from a JSON string based on specified criteria.
 * @param jsonString The raw JSON string.
 * @param config Configuration for extraction.
 * @returns An array of extracted values.
 */
export function extractData(
  jsonString: string,
  config: {
    arrayPath: string;
    propertyToExtract: string;
    condition?: string;
  },
): { results: any[]; error: string | null } {
  if (!config.arrayPath || !config.propertyToExtract) {
    return { results: [], error: null };
  }

  try {
    const json = JSON.parse(jsonString);
    const targetArray = getObjectByPath(json, config.arrayPath);

    if (!Array.isArray(targetArray)) {
      return { results: [], error: `Path "${config.arrayPath}" does not lead to an array.` };
    }

    const results = targetArray
      .filter((item) =>
        typeof item === 'object' && item !== null
          ? !config.condition || evaluateCondition(item, config.condition)
          : false, // Only filter objects
      )
      .map((item) => getObjectByPath(item, config.propertyToExtract))
      .filter((value) => value !== undefined); // Remove items where the property didn't exist

    return { results, error: null };
  } catch (e: any) {
    return { results: [], error: e.message || 'Invalid JSON input.' };
  }
}

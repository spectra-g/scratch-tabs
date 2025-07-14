interface CsvOptions {
  delimiter: "," | "\t";
  includeHeaders: boolean;
}

// Helper function to recursively flatten the JSON structure
// MODIFIED: Handles nested arrays by creating multiple rows, placing array values under the original array key name.
const flattenJsonArray = (
  arr: any[],
  parentPathKey: string = "", // The key name of the array itself (e.g., "hobbies")
  parentData: Record<string, any> = {}, // Data from levels above the array's parent object
): Record<string, any>[] => {
  const result: Record<string, any>[] = [];

  arr.forEach((item, index) => {
    // If the item within the array is itself an object or array, we need to handle it.
    if (typeof item === "object" && item !== null) {
      // Option 1: Flatten nested objects/arrays within the array under the parentPathKey
      // This creates paths like "hobbies.propertyName" or "hobbies[0].nestedProp"
      // which might not be desired if you want ONLY the primitive values in the 'hobbies' column.

      // Option 2 (Simpler for the desired output): Treat nested structures within the array
      // by serializing them or skipping them if only primitives are expected in the target column.
      // Let's serialize for now, similar to flattenJsonObject.
      const rowData = { ...parentData, [parentPathKey]: JSON.stringify(item) };
      result.push(rowData);
    } else {
      // Item is a primitive value (string, number, boolean, null)
      // Assign this primitive value directly to the parentPathKey column.
      const rowData = { ...parentData, [parentPathKey]: item };
      result.push(rowData);
    }
  });

  // Handle case where the input array was empty but had parent context
  if (arr.length === 0 && Object.keys(parentData).length > 0 && parentPathKey) {
    // Add a row with parent data, but the array's column is empty
    result.push({ ...parentData, [parentPathKey]: undefined });
  } else if (
    arr.length === 0 &&
    Object.keys(parentData).length > 0 &&
    !parentPathKey
  ) {
    // If the top-level array was empty
    result.push(parentData);
  }

  return result;
};

// Helper to flatten a single object, identifying arrays for expansion
const flattenObjectAndExpandArrays = (
  obj: Record<string, any>,
  parentPath: string = "",
  baseData: Record<string, any> = {}, // Accumulates non-array data for duplication
): Record<string, any>[] => {
  let currentLevelData: Record<string, any> = { ...baseData };
  const arraysToExpand: { key: string; pathKey: string; value: any[] }[] = [];

  Object.entries(obj).forEach(([key, value]) => {
    const currentPath = parentPath ? `${parentPath}.${key}` : key;

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      // Flatten nested objects directly into the current level data
      const flattenedSubObject = flattenJsonObject(value, currentPath); // Use simple flatten for sub-objects
      currentLevelData = { ...currentLevelData, ...flattenedSubObject };
    } else if (Array.isArray(value)) {
      // Identify arrays to expand later, passing the *original key* as the target column name
      arraysToExpand.push({ key: key, pathKey: currentPath, value: value });
    } else {
      // Add primitive values
      currentLevelData[currentPath] = value;
    }
  });

  // If no arrays to expand, return the single flattened row
  if (arraysToExpand.length === 0) {
    return [currentLevelData];
  }

  // If arrays exist, expand them recursively
  let expandedRows = [currentLevelData]; // Start with the non-array data

  arraysToExpand.forEach(({ key, pathKey, value }) => {
    const nextExpandedRows: Record<string, any>[] = [];
    expandedRows.forEach((rowToExpand) => {
      // For each current row, flatten the nested array using the *original key* ('hobbies')
      // Pass the current row data as the parentData for duplication
      const flattenedNested = flattenJsonArray(value, key, rowToExpand); // Use original key here!

      // If the nested array was empty, keep the parent row but clear the array key value
      if (flattenedNested.length === 0) {
        // Ensure the key exists even if the array was empty
        if (!rowToExpand.hasOwnProperty(key)) {
          rowToExpand[key] = undefined;
        }
        nextExpandedRows.push(rowToExpand);
      } else {
        nextExpandedRows.push(...flattenedNested);
      }
    });
    expandedRows = nextExpandedRows; // Update the set of rows for the next array
  });

  return expandedRows;
};

// --- flattenJsonObject (Simplified - only handles nested objects, not array expansion) ---
// This is used for objects nested *within* other objects or arrays being processed.
const flattenJsonObject = (
  obj: Record<string, any>,
  parentPath: string = "",
): Record<string, any> => {
  let result: Record<string, any> = {};
  Object.entries(obj).forEach(([key, value]) => {
    const currentPath = parentPath ? `${parentPath}.${key}` : key;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      result = { ...result, ...flattenJsonObject(value, currentPath) };
    } else {
      // Serialize arrays or keep primitives within nested objects
      result[currentPath] = Array.isArray(value)
        ? JSON.stringify(value)
        : value;
    }
  });
  return result;
};

export function convertToCsv(
  json: any,
  options: CsvOptions = { delimiter: ",", includeHeaders: true },
): { csv: string } | { error: string } {
  let topLevelArray: any[];

  if (!Array.isArray(json)) {
    if (typeof json === "object" && json !== null) {
      topLevelArray = [json]; // Wrap single object
    } else {
      return { error: "Input must be an array or a single object" };
    }
  } else {
    topLevelArray = json;
  }

  if (topLevelArray.length === 0) {
    return { csv: options.includeHeaders ? "" : "" };
  }

  try {
    // Flatten each top-level object, handling array expansion within them
    const flattenedData: Record<string, any>[] = [];
    topLevelArray.forEach((obj) => {
      if (typeof obj === "object" && obj !== null) {
        flattenedData.push(...flattenObjectAndExpandArrays(obj));
      } else {
        // Handle top-level array containing primitives if needed
        flattenedData.push({ value: obj }); // Assign to a default 'value' key
      }
    });

    if (flattenedData.length === 0) {
      return { csv: options.includeHeaders ? "" : "" };
    }

    // Dynamically get all unique headers
    const headersSet = new Set<string>();
    flattenedData.forEach((obj) => {
      Object.keys(obj).forEach((key) => headersSet.add(key));
    });
    const headers = Array.from(headersSet).sort();

    const escapeCsvValue = (value: any): string => {
      if (value === null || value === undefined) return "";
      const str = String(value);
      if (
        str.includes(options.delimiter) ||
        str.includes('"') ||
        str.includes("\n")
      ) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows: string[] = [];

    if (options.includeHeaders && headers.length > 0) {
      rows.push(headers.map(escapeCsvValue).join(options.delimiter));
    }

    flattenedData.forEach((obj) => {
      const row = headers.map((header) => escapeCsvValue(obj[header]));
      rows.push(row.join(options.delimiter));
    });

    return { csv: rows.join("\n") };
  } catch (error: any) {
    console.error("Error during CSV conversion:", error);
    return { error: `Conversion failed: ${error.message || "Unknown error"}` };
  }
}

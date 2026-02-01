/**
 * Documentation Generator Utility
 *
 * Generates safe API documentation samples by masking sensitive values
 * while preserving the JSON structure for documentation purposes.
 */

export type DocExportMode = "keep" | "mask-value" | "mask-type" | "remove";

export interface PathConfig {
  path: string;
  mode: DocExportMode;
}

/**
 * Extracts all unique property paths from a JSON object.
 * Returns paths in dot notation (e.g., "users[0].name", "data.items[1].id")
 *
 * @param json - The JSON object to analyze
 * @returns Array of unique paths sorted alphabetically
 */
export function generateDocPaths(json: unknown): string[] {
  const paths = new Set<string>();

  function traverse(value: unknown, currentPath: string): void {
    if (value === null || value === undefined) {
      if (currentPath) paths.add(currentPath);
      return;
    }

    if (Array.isArray(value)) {
      if (currentPath) paths.add(currentPath);
      // For arrays, traverse only first element to get representative paths
      if (value.length > 0) {
        traverse(value[0], `${currentPath}[0]`);
      }
      return;
    }

    if (typeof value === "object") {
      if (currentPath) paths.add(currentPath);
      for (const key of Object.keys(value as Record<string, unknown>)) {
        const newPath = currentPath ? `${currentPath}.${key}` : key;
        traverse((value as Record<string, unknown>)[key], newPath);
      }
      return;
    }

    // Primitive value
    if (currentPath) paths.add(currentPath);
  }

  traverse(json, "");
  return Array.from(paths).sort();
}

/**
 * Masks a value based on the specified mode.
 * For objects/arrays, returns a placeholder object/array or type string.
 */
function maskValue(value: unknown, mode: DocExportMode): unknown {
  if (mode === "keep") {
    return value;
  }

  if (mode === "remove") {
    return undefined; // Signal to remove this key
  }

  if (mode === "mask-value") {
    if (typeof value === "string") return "...";
    if (typeof value === "number") return 0;
    if (typeof value === "boolean") return false;
    if (value === null) return null;
    if (Array.isArray(value)) return ["..."];
    if (typeof value === "object") return { "...": "..." };
    return value;
  }

  if (mode === "mask-type") {
    if (typeof value === "string") return "<string>";
    if (typeof value === "number") return "<number>";
    if (typeof value === "boolean") return "<boolean>";
    if (value === null) return "<null>";
    if (Array.isArray(value)) return "<array>";
    if (typeof value === "object") return "<object>";
    return value;
  }

  return value;
}

/**
 * Checks if a path matches or is a prefix of another path.
 */
function pathMatches(targetPath: string, configPath: string): boolean {
  // Normalize array indices for matching
  const normalizeForMatch = (p: string) =>
    p.replace(/\[\d+\]/g, "[0]");

  const normalizedTarget = normalizeForMatch(targetPath);
  const normalizedConfig = normalizeForMatch(configPath);

  return normalizedTarget === normalizedConfig;
}

/**
 * Gets the mode for a given path from the config.
 * Returns 'keep' as default if no config matches.
 */
function getModeForPath(
  path: string,
  config: Record<string, DocExportMode>
): DocExportMode {
  // Check for exact match (with normalized array indices)
  for (const [configPath, mode] of Object.entries(config)) {
    if (pathMatches(path, configPath)) {
      return mode;
    }
  }

  return "keep"; // Default mode
}

/**
 * Transforms JSON based on path configuration for documentation export.
 * Applies masking rules to specified paths while preserving structure.
 * When an object/array has a mask mode, it's replaced with a placeholder.
 *
 * @param json - The source JSON object
 * @param config - Map of paths to their export modes
 * @returns Transformed JSON with masked/removed values
 */
export function generateDocumentationJson(
  json: unknown,
  config: Record<string, DocExportMode>
): unknown {
  function transform(value: unknown, currentPath: string): unknown {
    // Handle null
    if (value === null) {
      const mode = getModeForPath(currentPath, config);
      if (mode === "remove") return undefined;
      return maskValue(null, mode);
    }

    // Handle undefined
    if (value === undefined) {
      return undefined;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      const mode = getModeForPath(currentPath, config);
      if (mode === "remove") return undefined;
      // If mask mode, replace entire array with placeholder
      if (mode === "mask-value" || mode === "mask-type") {
        return maskValue(value, mode);
      }

      // Otherwise recurse into children
      const result: unknown[] = [];
      for (let i = 0; i < value.length; i++) {
        const itemPath = `${currentPath}[${i}]`;
        const transformed = transform(value[i], itemPath);
        if (transformed !== undefined) {
          result.push(transformed);
        }
      }
      return result;
    }

    // Handle objects
    if (typeof value === "object") {
      const mode = getModeForPath(currentPath, config);
      if (mode === "remove") return undefined;
      // If mask mode, replace entire object with placeholder
      if (mode === "mask-value" || mode === "mask-type") {
        return maskValue(value, mode);
      }

      // Otherwise recurse into children
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        const newPath = currentPath ? `${currentPath}.${key}` : key;
        const transformed = transform(val, newPath);
        if (transformed !== undefined) {
          result[key] = transformed;
        }
      }
      return result;
    }

    // Handle primitives
    const mode = getModeForPath(currentPath, config);
    if (mode === "remove") return undefined;
    return maskValue(value, mode);
  }

  return transform(json, "");
}

/**
 * Creates a default config with all paths set to 'keep'.
 */
export function createDefaultConfig(
  paths: string[]
): Record<string, DocExportMode> {
  const config: Record<string, DocExportMode> = {};
  for (const path of paths) {
    config[path] = "keep";
  }
  return config;
}

/**
 * Gets the next mode in the cycle for toggling.
 */
export function getNextMode(currentMode: DocExportMode): DocExportMode {
  const modes: DocExportMode[] = ["keep", "mask-value", "mask-type", "remove"];
  const currentIndex = modes.indexOf(currentMode);
  return modes[(currentIndex + 1) % modes.length];
}

/**
 * Gets display properties for a mode (label, color class).
 */
export function getModeDisplay(mode: DocExportMode): {
  label: string;
  colorClass: string;
  bgClass: string;
} {
  switch (mode) {
    case "keep":
      return {
        label: "Keep",
        colorClass: "text-success",
        bgClass: "bg-success/20",
      };
    case "mask-value":
      return {
        label: "Mask",
        colorClass: "text-warning",
        bgClass: "bg-warning/20",
      };
    case "mask-type":
      return {
        label: "Type",
        colorClass: "text-info",
        bgClass: "bg-info/20",
      };
    case "remove":
      return {
        label: "Remove",
        colorClass: "text-danger",
        bgClass: "bg-danger/20",
      };
  }
}

import JSZip from "jszip";
import {
  MappingConfig,
  MappingDirection,
  BatchProcessingOptions,
} from "../types";
import { transformJson } from "./mappingUtils";
import { isValidJson } from "./jsonUtils";

/**
 * Processes a single JSON file
 */
export async function processJsonFile(
  file: File,
  mapping: MappingConfig,
  direction: MappingDirection,
): Promise<{ content: string; error?: string }> {
  try {
    // Read the file
    const content = await readFileAsText(file);

    // Validate JSON
    if (!isValidJson(content)) {
      return { content: "", error: "Invalid JSON file" };
    }

    // Parse JSON
    const json = JSON.parse(content);

    // Transform JSON
    const result = transformJson(json, mapping.rules, direction);

    // Return transformed JSON
    return { content: JSON.stringify(result, null, 2) };
  } catch (error) {
    console.error("Error processing JSON file:", error);
    return {
      content: "",
      error:
        error instanceof Error
          ? error.message
          : "Unknown error processing file",
    };
  }
}

/**
 * Converts a simple wildcard pattern to a regular expression
 * Supports * as wildcard character, case-insensitive matching
 *
 * @param pattern - Wildcard pattern (e.g., "my-data*.json", "*.json")
 * @returns Regular expression for pattern matching
 * @example
 * wildcardToRegex("custsearch*.json") // Matches custsearch_data.json, custsearch123.json
 * wildcardToRegex("*.json") // Matches any .json file
 */
function wildcardToRegex(pattern: string): RegExp {
  const SPECIAL_REGEX_CHARS = /[.+?^${}()|[\]\\]/g;
  const WILDCARD = /\*/g;

  const escaped = pattern.replace(SPECIAL_REGEX_CHARS, "\\$&");
  const regexPattern = escaped.replace(WILDCARD, ".*");

  return new RegExp(`^${regexPattern}$`, "i");
}

/**
 * Applies filename transformation rule to a file path
 * Preserves directory structure and only transforms the filename
 *
 * @param filename - Full file path (e.g., "folder/custsearch_data.json")
 * @param rule - Transformation rule to apply
 * @returns Transformed file path
 * @example
 * transformFilename("data.json", { type: "prefix", value: "new_" }) // "new_data.json"
 * transformFilename("folder/data.json", { type: "suffix", value: "_v2" }) // "folder/data_v2.json"
 * transformFilename("custsearch.json", { type: "replace", search: "custsearch", value: "products" }) // "products.json"
 */
function transformFilename(
  filename: string,
  rule?: BatchProcessingOptions["filenameRule"],
): string {
  if (!rule) {
    return filename;
  }

  const { directory, basename } = splitPath(filename);
  const { name, extension } = splitFilename(basename);

  const newBasename = applyTransformationRule(basename, name, extension, rule);

  return directory ? `${directory}/${newBasename}` : newBasename;
}

/**
 * Splits a file path into directory and basename
 */
function splitPath(filepath: string): { directory: string; basename: string } {
  const pathParts = filepath.split("/");
  const basename = pathParts[pathParts.length - 1];
  const directory = pathParts.slice(0, -1).join("/");

  return { directory, basename };
}

/**
 * Splits a filename into name and extension
 */
function splitFilename(filename: string): { name: string; extension: string } {
  const lastDotIndex = filename.lastIndexOf(".");
  const hasExtension = lastDotIndex > 0;

  return {
    name: hasExtension ? filename.substring(0, lastDotIndex) : filename,
    extension: hasExtension ? filename.substring(lastDotIndex) : "",
  };
}

/**
 * Applies the transformation rule to generate new basename
 */
function applyTransformationRule(
  basename: string,
  name: string,
  extension: string,
  rule: NonNullable<BatchProcessingOptions["filenameRule"]>,
): string {
  switch (rule.type) {
    case "prefix":
      return rule.value + basename;

    case "suffix":
      return name + rule.value + extension;

    case "replace":
      return rule.search
        ? basename.replace(new RegExp(rule.search, "g"), rule.value)
        : basename;

    default:
      return basename;
  }
}

/**
 * Processes a ZIP file containing JSON files with pattern matching and transformations
 *
 * @param file - ZIP file to process
 * @param mapping - Mapping configuration with transformation rules
 * @param direction - Direction of transformation (sourceToTarget or targetToSource)
 * @param options - Batch processing options (pattern, filename rules, etc.)
 * @param onProgress - Progress callback (0-1)
 * @returns Result containing output ZIP, error (if any), and count of files processed
 */
export async function processZipFile(
  file: File,
  mapping: MappingConfig,
  direction: MappingDirection,
  options?: BatchProcessingOptions,
  onProgress?: (progress: number) => void,
): Promise<{ zip: JSZip; error?: string; filesProcessed?: number }> {
  try {
    const sourceZip = await JSZip.loadAsync(file);
    const outputZip = new JSZip();

    const opts = buildDefaultOptions(options);
    const allEntries = Object.keys(sourceZip.files);
    const patternRegex = opts.filePattern
      ? wildcardToRegex(opts.filePattern)
      : null;

    // Filter and process matching JSON files
    const matchingFiles = filterMatchingJsonFiles(
      allEntries,
      sourceZip,
      patternRegex,
    );
    const processedPaths = await processJsonFiles(
      matchingFiles,
      sourceZip,
      outputZip,
      mapping,
      direction,
      opts,
      onProgress,
    );

    // Preserve folder structure
    if (opts.preserveEmptyFolders) {
      preserveFolders(allEntries, sourceZip, outputZip);
    }

    // Copy non-matching files
    await copyNonMatchingFiles(
      allEntries,
      sourceZip,
      outputZip,
      processedPaths,
      patternRegex,
    );

    return {
      zip: outputZip,
      filesProcessed: processedPaths.size,
    };
  } catch (error) {
    console.error("Error processing ZIP file:", error);
    return {
      zip: new JSZip(),
      error:
        error instanceof Error
          ? error.message
          : "Unknown error processing ZIP file",
    };
  }
}

/**
 * Builds default options merged with user-provided options
 */
function buildDefaultOptions(
  options?: BatchProcessingOptions,
): BatchProcessingOptions {
  return {
    filePattern: "*.json",
    preserveOriginals: false,
    preserveEmptyFolders: true,
    ...options,
  };
}

/**
 * Filters entries to find JSON files matching the pattern
 */
function filterMatchingJsonFiles(
  allEntries: string[],
  sourceZip: JSZip,
  patternRegex: RegExp | null,
): string[] {
  return allEntries.filter((filename) => {
    const entry = sourceZip.files[filename];
    if (entry.dir) return false;
    if (!filename.toLowerCase().endsWith(".json")) return false;

    const basename = filename.split("/").pop() || filename;
    return !patternRegex || patternRegex.test(basename);
  });
}

/**
 * Processes JSON files and adds them to output ZIP
 * Returns set of processed file paths
 */
async function processJsonFiles(
  jsonFiles: string[],
  sourceZip: JSZip,
  outputZip: JSZip,
  mapping: MappingConfig,
  direction: MappingDirection,
  options: BatchProcessingOptions,
  onProgress?: (progress: number) => void,
): Promise<Set<string>> {
  const processedPaths = new Set<string>();
  let processedCount = 0;

  for (const filename of jsonFiles) {
    try {
      const content = await sourceZip.files[filename].async("text");

      if (!isValidJson(content)) {
        console.warn(`Skipping invalid JSON file: ${filename}`);
        continue;
      }

      const json = JSON.parse(content);
      const result = transformJson(json, mapping.rules, direction);
      const outputFilename = transformFilename(filename, options.filenameRule);

      // Add transformed file
      outputZip.file(outputFilename, JSON.stringify(result, null, 2));
      processedPaths.add(outputFilename);

      // Preserve original if requested
      if (options.preserveOriginals) {
        outputZip.file(filename, content);
        processedPaths.add(filename);
      }

      processedCount++;
      onProgress?.(processedCount / jsonFiles.length);
    } catch (error) {
      console.error(`Error processing file ${filename}:`, error);
    }
  }

  return processedPaths;
}

/**
 * Preserves folder structure in output ZIP
 */
function preserveFolders(
  allEntries: string[],
  sourceZip: JSZip,
  outputZip: JSZip,
): void {
  const folders = allEntries.filter((filename) => sourceZip.files[filename].dir);

  for (const folder of folders) {
    outputZip.folder(folder);
  }
}

/**
 * Copies non-matching files to preserve full ZIP structure
 */
async function copyNonMatchingFiles(
  allEntries: string[],
  sourceZip: JSZip,
  outputZip: JSZip,
  processedPaths: Set<string>,
  patternRegex: RegExp | null,
): Promise<void> {
  for (const filename of allEntries) {
    const entry = sourceZip.files[filename];

    if (entry.dir || processedPaths.has(filename)) {
      continue;
    }

    const basename = filename.split("/").pop() || filename;
    const isJson = filename.toLowerCase().endsWith(".json");
    const matchesPattern = !patternRegex || patternRegex.test(basename);

    if (isJson && !matchesPattern) {
      const content = await entry.async("text");
      outputZip.file(filename, content);
    } else if (!isJson) {
      const content = await entry.async("arraybuffer");
      outputZip.file(filename, content);
    }
  }
}

/**
 * Reads a file as text
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

/**
 * Downloads a string as a file
 */
export function downloadStringAsFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Downloads a ZIP file
 */
export async function downloadZip(zip: JSZip, filename: string): Promise<void> {
  const content = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

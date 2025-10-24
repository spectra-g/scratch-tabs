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
 * Example: "my-data*.json" -> /^my-data.*\.json$/
 */
function wildcardToRegex(pattern: string): RegExp {
  // Escape special regex characters except *
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  // Replace * with .*
  const regexPattern = escaped.replace(/\*/g, ".*");
  return new RegExp(`^${regexPattern}$`, "i");
}

/**
 * Applies filename transformation rule
 */
function transformFilename(
  filename: string,
  rule?: BatchProcessingOptions["filenameRule"],
): string {
  if (!rule) return filename;

  const pathParts = filename.split("/");
  const basename = pathParts[pathParts.length - 1];
  const directory = pathParts.slice(0, -1).join("/");

  // Extract name and extension
  const lastDotIndex = basename.lastIndexOf(".");
  const name = lastDotIndex > 0 ? basename.substring(0, lastDotIndex) : basename;
  const extension = lastDotIndex > 0 ? basename.substring(lastDotIndex) : "";

  let newBasename: string;

  switch (rule.type) {
    case "prefix":
      newBasename = rule.value + basename;
      break;
    case "suffix":
      newBasename = name + rule.value + extension;
      break;
    case "replace":
      if (rule.search) {
        newBasename = basename.replace(
          new RegExp(rule.search, "g"),
          rule.value,
        );
      } else {
        newBasename = basename;
      }
      break;
    default:
      newBasename = basename;
  }

  return directory ? `${directory}/${newBasename}` : newBasename;
}

/**
 * Processes a ZIP file containing JSON files
 */
export async function processZipFile(
  file: File,
  mapping: MappingConfig,
  direction: MappingDirection,
  options?: BatchProcessingOptions,
  onProgress?: (progress: number) => void,
): Promise<{ zip: JSZip; error?: string; filesProcessed?: number }> {
  try {
    // Read the ZIP file
    const sourceZip = await JSZip.loadAsync(file);

    // Create output ZIP
    const outputZip = new JSZip();

    // Default options
    const opts: BatchProcessingOptions = {
      filePattern: "*.json",
      preserveOriginals: false,
      preserveEmptyFolders: true,
      ...options,
    };

    // Get all files and folders in the ZIP
    const allEntries = Object.keys(sourceZip.files);

    // Create pattern regex
    const patternRegex = opts.filePattern
      ? wildcardToRegex(opts.filePattern)
      : null;

    // Filter JSON files that match the pattern
    const jsonFiles = allEntries.filter((filename) => {
      const entry = sourceZip.files[filename];
      if (entry.dir) return false;
      if (!filename.toLowerCase().endsWith(".json")) return false;

      // Extract just the filename (without path) for pattern matching
      const basename = filename.split("/").pop() || filename;

      // Apply pattern filter
      if (patternRegex && !patternRegex.test(basename)) {
        return false;
      }

      return true;
    });

    // Process each JSON file
    let processedCount = 0;
    const processedPaths = new Set<string>();

    for (const filename of jsonFiles) {
      try {
        // Get the file content
        const content = await sourceZip.files[filename].async("text");

        // Validate JSON
        if (!isValidJson(content)) {
          console.warn(`Skipping invalid JSON file: ${filename}`);
          continue;
        }

        // Parse JSON
        const json = JSON.parse(content);

        // Transform JSON
        const result = transformJson(json, mapping.rules, direction);

        // Apply filename transformation
        const outputFilename = transformFilename(filename, opts.filenameRule);

        // Add transformed file to output ZIP
        outputZip.file(outputFilename, JSON.stringify(result, null, 2));
        processedPaths.add(outputFilename);

        // Preserve original file if requested
        if (opts.preserveOriginals) {
          outputZip.file(filename, content);
          processedPaths.add(filename);
        }

        // Update progress
        processedCount++;
        if (onProgress) {
          onProgress(processedCount / jsonFiles.length);
        }
      } catch (error) {
        console.error(`Error processing file ${filename}:`, error);
        // Continue with other files
      }
    }

    // Preserve empty folders if requested
    if (opts.preserveEmptyFolders) {
      const folders = allEntries.filter(
        (filename) => sourceZip.files[filename].dir,
      );

      for (const folder of folders) {
        // Add empty folder to output ZIP
        outputZip.folder(folder);
      }
    }

    // Also copy any non-JSON files that don't match the pattern
    // (to preserve the full structure)
    for (const filename of allEntries) {
      const entry = sourceZip.files[filename];

      // Skip directories (already handled)
      if (entry.dir) continue;

      // Skip files we already processed
      if (processedPaths.has(filename)) continue;

      // Check if it's a JSON file that didn't match the pattern
      const basename = filename.split("/").pop() || filename;
      const isJson = filename.toLowerCase().endsWith(".json");
      const matchesPattern = patternRegex ? patternRegex.test(basename) : true;

      // Copy non-matching JSON files and all non-JSON files
      if (isJson && !matchesPattern) {
        const content = await entry.async("text");
        outputZip.file(filename, content);
      } else if (!isJson) {
        const content = await entry.async("arraybuffer");
        outputZip.file(filename, content);
      }
    }

    return { zip: outputZip, filesProcessed: processedCount };
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

import JSZip from 'jszip';
import { ExportData } from './types';

/**
 * Creates a stable string representation of the data block for checksum generation.
 * Ensures top-level keys are in a consistent order.
 */
export const stableStringifyDataBlock = (dataBlock: ExportData): string => {
  const orderedDataBlock = {
    workspaces: dataBlock.workspaces,
    tabs: dataBlock.tabs,
    splitViews: dataBlock.splitViews,
  };
  // For robust checksum, ensure objects within arrays and their properties are also sorted.
  // This basic ordering of top-level keys + relying on consistent object creation is a first step.
  // A deep sort function would be needed for true canonical stringification if object key order varies.
  return JSON.stringify(orderedDataBlock);
};

/**
 * Generates a SHA-256 checksum for a given string.
 */
export async function generateSha256(str: string): Promise<string> {
  const buffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Creates a ZIP archive containing export data and checksum.
 */
export async function createZipArchive(jsonData: string, checksum: string): Promise<Blob> {
  const zip = new JSZip();
  zip.file("export-data.json", jsonData);
  zip.file("checksum.sha256", checksum);
  return zip.generateAsync({ type: "blob" });
}

/**
 * Triggers a file download in the browser.
 */
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Reads and unzips a .scratch file.
 * Returns the content of export-data.json and checksum.sha256.
 */
export async function readZipArchive(file: File): Promise<{ jsonDataString?: string; checksumString?: string; error?: string }> {
  try {
    const zip = await JSZip.loadAsync(file);
    const jsonDataFile = zip.file("export-data.json");
    const checksumFile = zip.file("checksum.sha256");

    if (!jsonDataFile) {
      return { error: "Missing export-data.json in the archive." };
    }
    if (!checksumFile) {
      return { error: "Missing checksum.sha256 in the archive." };
    }

    const jsonDataString = await jsonDataFile.async("string");
    const checksumString = await checksumFile.async("string");
    return { jsonDataString, checksumString };
  } catch (e) {
    console.error("Failed to read zip archive:", e);
    return { error: "Failed to read or unzip the archive. It might be corrupted." };
  }
}

/**
 * Generates a suitable filename for the export.
 * e.g., scratch-tabs-export-YYYY-MM-DD-HH-MM-SS.scratch
 */
export function generateExportFilename(): string {
  const now = new Date();
  const pad = (num: number) => num.toString().padStart(2, '0');
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const timeStr = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  return `scratch-tabs-export-${dateStr}-${timeStr}.scratch`;
}
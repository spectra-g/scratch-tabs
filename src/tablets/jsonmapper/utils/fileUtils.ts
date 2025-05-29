import JSZip from 'jszip';
import { MappingConfig, MappingDirection } from '../types';
import { transformJson } from './mappingUtils';
import { isValidJson } from './jsonUtils';

/**
 * Processes a single JSON file
 */
export async function processJsonFile(
  file: File,
  mapping: MappingConfig,
  direction: MappingDirection
): Promise<{ content: string; error?: string }> {
  try {
    // Read the file
    const content = await readFileAsText(file);
    
    // Validate JSON
    if (!isValidJson(content)) {
      return { content: '', error: 'Invalid JSON file' };
    }
    
    // Parse JSON
    const json = JSON.parse(content);
    
    // Transform JSON
    const result = transformJson(json, mapping.rules, direction);
    
    // Return transformed JSON
    return { content: JSON.stringify(result, null, 2) };
  } catch (error) {
    console.error('Error processing JSON file:', error);
    return { 
      content: '', 
      error: error instanceof Error ? error.message : 'Unknown error processing file' 
    };
  }
}

/**
 * Processes a ZIP file containing JSON files
 */
export async function processZipFile(
  file: File,
  mapping: MappingConfig,
  direction: MappingDirection,
  onProgress?: (progress: number) => void
): Promise<{ zip: JSZip; error?: string }> {
  try {
    // Read the ZIP file
    const zip = await JSZip.loadAsync(file);
    
    // Get all files in the ZIP
    const files = Object.keys(zip.files);
    
    // Filter JSON files
    const jsonFiles = files.filter(filename => 
      filename.toLowerCase().endsWith('.json') && !zip.files[filename].dir
    );
    
    // Process each JSON file
    let processedCount = 0;
    
    for (const filename of jsonFiles) {
      try {
        // Get the file content
        const content = await zip.files[filename].async('text');
        
        // Validate JSON
        if (!isValidJson(content)) {
          console.warn(`Skipping invalid JSON file: ${filename}`);
          continue;
        }
        
        // Parse JSON
        const json = JSON.parse(content);
        
        // Transform JSON
        const result = transformJson(json, mapping.rules, direction);
        
        // Update the file in the ZIP
        zip.file(filename, JSON.stringify(result, null, 2));
        
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
    
    return { zip };
  } catch (error) {
    console.error('Error processing ZIP file:', error);
    return { 
      zip: new JSZip(), 
      error: error instanceof Error ? error.message : 'Unknown error processing ZIP file' 
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
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Downloads a string as a file
 */
export function downloadStringAsFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'application/json' });
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
 * Downloads a ZIP file
 */
export async function downloadZip(zip: JSZip, filename: string): Promise<void> {
  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
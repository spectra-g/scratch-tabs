import { Base64Stats } from '../types';
import { getFormatById } from './base64Formats';
import { convertEncoding } from './encodingOptions';

/**
 * Encodes a string to Base64 using the specified format and encoding
 */
export function encodeBase64(input: string, formatId: string, encoding: string, wrapOutput: boolean = false): string {
  try {
    // Convert input to UTF-8 if it's not already
    const utf8Input = encoding !== 'utf8' ? convertEncoding(input, encoding, 'utf8') : input;
    
    // Get the format and encode
    const format = getFormatById(formatId);
    let encoded = format.encode(utf8Input);
    
    // Apply wrapping if needed (only for MIME format)
    if (formatId === 'mime' && wrapOutput) {
      encoded = encodeMimeWithWrapping(utf8Input);
    }
    
    return encoded;
  } catch (error) {
    throw new Error(`Encoding failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Decodes a Base64 string using the specified format and encoding
 */
export function decodeBase64(input: string, formatId: string, encoding: string): string {
  try {
    // Get the format and decode
    const format = getFormatById(formatId);
    const decoded = format.decode(input);
    
    // Convert to the desired encoding if it's not UTF-8
    return encoding !== 'utf8' ? convertEncoding(decoded, 'utf8', encoding) : decoded;
  } catch (error) {
    throw new Error(`Decoding failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Encodes a string to MIME Base64 with line wrapping at 76 characters
 */
function encodeMimeWithWrapping(input: string): string {
  try {
    const standard = btoa(unescape(encodeURIComponent(input)));
    // Wrap at 76 characters per line as per RFC 2045
    const wrapped = standard.match(/.{1,76}/g);
    return wrapped ? wrapped.join('\r\n') : standard;
  } catch (e) {
    throw new Error('Failed to encode: Invalid input');
  }
}

/**
 * Validates if a string is valid Base64 according to the specified format
 */
export function validateBase64(input: string, formatId: string): boolean {
  try {
    const format = getFormatById(formatId);
    return format.validate(input);
  } catch (error) {
    return false;
  }
}

/**
 * Calculates statistics for Base64 encoding
 */
export function calculateBase64Stats(input: string, encoded: string): Base64Stats {
  const originalSize = new Blob([input]).size;
  const encodedSize = new Blob([encoded]).size;
  const ratio = encodedSize / originalSize;
  const compressionPercentage = ((encodedSize - originalSize) / originalSize) * 100;
  
  return {
    originalSize,
    encodedSize,
    ratio,
    compressionPercentage
  };
}

/**
 * Processes input line by line, encoding or decoding each line
 */
export function processLineByLine(
  input: string, 
  action: 'encode' | 'decode', 
  formatId: string, 
  encoding: string,
  preserveNewlines: boolean = true
): string {
  const lines = input.split(/\r?\n/);
  const processedLines = lines.map(line => {
    if (!line.trim()) return line; // Preserve empty lines
    
    try {
      return action === 'encode' 
        ? encodeBase64(line, formatId, encoding) 
        : decodeBase64(line, formatId, encoding);
    } catch (error) {
      // Return original line with error indicator
      return `${line} [ERROR: ${error instanceof Error ? error.message : String(error)}]`;
    }
  });
  
  return preserveNewlines ? processedLines.join('\n') : processedLines.filter(line => line.trim()).join('\n');
}

/**
 * Detects if a string is likely Base64 encoded
 */
export function isLikelyBase64(input: string): boolean {
  // Check if the string is empty or too short
  if (!input || input.length < 4) return false;
  
  // Check if the string length is valid for Base64 (multiple of 4 with possible padding)
  if (input.length % 4 !== 0 && !input.endsWith('=') && !input.endsWith('==')) return false;
  
  // Check if the string contains only valid Base64 characters
  return /^[A-Za-z0-9+/\-_]*={0,2}$/.test(input);
}

/**
 * Formats a file size in bytes to a human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Handles file drop for Base64 encoding
 */
export async function handleFileDrop(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        // For text files, use the text content
        if (file.type.startsWith('text/')) {
          resolve(reader.result as string);
        } else {
          // For binary files, use the base64 data
          const base64Data = (reader.result as string).split(',')[1];
          resolve(base64Data);
        }
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    
    if (file.type.startsWith('text/')) {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file);
    }
  });
}

/**
 * Downloads content as a file
 */
export function downloadAsFile(content: string, filename: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
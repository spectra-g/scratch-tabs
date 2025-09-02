import { HashAlgorithm, HashingOptions, HashingProgress } from '../types';

// Default chunk size: 10MB
const DEFAULT_CHUNK_SIZE = 10 * 1024 * 1024;

/**
 * CRC32 implementation (not available in Web Crypto API)
 */
class CRC32 {
  private static table: number[] | null = null;

  private static generateTable(): number[] {
    const table: number[] = [];
    for (let i = 0; i < 256; i++) {
      let crc = i;
      for (let j = 0; j < 8; j++) {
        crc = (crc & 1) ? (0xEDB88320 ^ (crc >>> 1)) : (crc >>> 1);
      }
      table[i] = crc;
    }
    return table;
  }

  static calculate(data: Uint8Array): number {
    if (!this.table) {
      this.table = this.generateTable();
    }

    let crc = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) {
      crc = this.table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  static calculateHex(data: Uint8Array): string {
    return this.calculate(data).toString(16).padStart(8, '0').toUpperCase();
  }
}

/**
 * Converts algorithm name to Web Crypto API algorithm identifier
 */
function getWebCryptoAlgorithm(algorithm: HashAlgorithm): string {
  switch (algorithm) {
    case 'SHA-1': return 'SHA-1';
    case 'SHA-256': return 'SHA-256';
    case 'SHA-384': return 'SHA-384';
    case 'SHA-512': return 'SHA-512';
    default: throw new Error(`Unsupported Web Crypto algorithm: ${algorithm}`);
  }
}

/**
 * Converts ArrayBuffer to hexadecimal string
 */
function arrayBufferToHex(buffer: ArrayBuffer): string {
  const hashArray = Array.from(new Uint8Array(buffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/**
 * Hashes text content using all specified algorithms
 */
export async function hashText(
  text: string,
  algorithms: HashAlgorithm[] = ['SHA-256']
): Promise<Record<HashAlgorithm, string>> {
  // Use polyfill for Node.js test environment
  const encoder = typeof TextEncoder !== 'undefined' 
    ? new TextEncoder() 
    : new (require('util').TextEncoder)();
    
  const rawData = encoder.encode(text);
  
  // Ensure we have a proper Uint8Array for browser compatibility
  const data = rawData instanceof Uint8Array ? rawData : new Uint8Array(rawData);
  const results: Record<string, string> = {};

  for (const algorithm of algorithms) {
    try {
      if (algorithm === 'CRC32') {
        results[algorithm] = CRC32.calculateHex(data);
      } else if (algorithm === 'MD5') {
        // MD5 is not supported by Web Crypto API, use a simple fallback
        results[algorithm] = 'MD5 not supported in browser';
      } else {
        const webCryptoAlg = getWebCryptoAlgorithm(algorithm);
        const hashBuffer = await crypto.subtle.digest(webCryptoAlg, data);
        results[algorithm] = arrayBufferToHex(hashBuffer);
      }
    } catch (error) {
      console.error(`Error hashing with ${algorithm}:`, error);
      results[algorithm] = `Error: ${algorithm} failed`;
    }
  }

  return results as Record<HashAlgorithm, string>;
}

/**
 * Processes a file in chunks and calculates hashes
 */
export async function hashFile(
  file: File,
  options: HashingOptions
): Promise<Record<HashAlgorithm, string>> {
  const { algorithms, chunkSize = DEFAULT_CHUNK_SIZE, onProgress } = options;
  const results: Record<string, string> = {};
  
  // Initialize hash contexts for Web Crypto algorithms
  const webCryptoContexts: Record<string, { algorithm: string; chunks: Uint8Array[] }> = {};
  let crc32Context: Uint8Array[] = [];

  for (const algorithm of algorithms) {
    if (algorithm === 'CRC32') {
      crc32Context = [];
    } else if (algorithm === 'MD5') {
      results[algorithm] = 'MD5 not supported in browser';
    } else {
      try {
        webCryptoContexts[algorithm] = {
          algorithm: getWebCryptoAlgorithm(algorithm),
          chunks: []
        };
      } catch (error) {
        results[algorithm] = `Error: ${algorithm} not supported`;
      }
    }
  }

  const totalSize = file.size;
  let processedBytes = 0;
  const startTime = Date.now();

  // Process file in chunks
  for (let offset = 0; offset < totalSize; offset += chunkSize) {
    const chunk = file.slice(offset, Math.min(offset + chunkSize, totalSize));
    const arrayBuffer = await readChunkAsArrayBuffer(chunk);
    const uint8Array = new Uint8Array(arrayBuffer);

    // Update progress
    processedBytes += uint8Array.length;
    const progress = Math.round((processedBytes / totalSize) * 100);
    const elapsedTime = Date.now() - startTime;
    const estimatedTotal = (elapsedTime / processedBytes) * totalSize;
    const estimatedRemaining = Math.max(0, estimatedTotal - elapsedTime);

    // Store chunks for later processing
    for (const algorithm of algorithms) {
      if (algorithm === 'CRC32') {
        crc32Context.push(uint8Array);
      } else if (webCryptoContexts[algorithm]) {
        webCryptoContexts[algorithm].chunks.push(uint8Array);
      }

      // Report progress for each algorithm
      if (onProgress) {
        onProgress({
          algorithm,
          progress,
          bytesProcessed: processedBytes,
          totalBytes: totalSize,
          estimatedTimeRemaining: estimatedRemaining,
        });
      }
    }
  }

  // Calculate final hashes
  for (const algorithm of algorithms) {
    try {
      if (algorithm === 'CRC32') {
        // Combine all CRC32 chunks
        const totalLength = crc32Context.reduce((sum, chunk) => sum + chunk.length, 0);
        const combined = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of crc32Context) {
          combined.set(chunk, offset);
          offset += chunk.length;
        }
        results[algorithm] = CRC32.calculateHex(combined);
      } else if (webCryptoContexts[algorithm]) {
        // Combine all chunks for Web Crypto API
        const context = webCryptoContexts[algorithm];
        const totalLength = context.chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const combined = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of context.chunks) {
          combined.set(chunk, offset);
          offset += chunk.length;
        }
        
        const hashBuffer = await crypto.subtle.digest(context.algorithm, combined);
        results[algorithm] = arrayBufferToHex(hashBuffer);
      }
    } catch (error) {
      console.error(`Error calculating final hash for ${algorithm}:`, error);
      results[algorithm] = `Error: ${algorithm} calculation failed`;
    }
  }

  return results as Record<HashAlgorithm, string>;
}

/**
 * Reads a file chunk as ArrayBuffer
 */
function readChunkAsArrayBuffer(chunk: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(chunk);
  });
}

/**
 * Compares a calculated hash with an expected value
 */
export function compareHashes(calculated: string, expected: string): boolean {
  if (!calculated || !expected) return false;
  return calculated.toLowerCase() === expected.toLowerCase();
}

/**
 * Formats file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Formats processing time in human-readable format
 */
export function formatProcessingTime(milliseconds: number): string {
  if (milliseconds < 1000) return `${milliseconds}ms`;
  if (milliseconds < 60000) return `${(milliseconds / 1000).toFixed(1)}s`;
  return `${Math.floor(milliseconds / 60000)}m ${Math.floor((milliseconds % 60000) / 1000)}s`;
}

/**
 * Estimates remaining time based on current progress
 */
export function estimateRemainingTime(
  startTime: number,
  processedBytes: number,
  totalBytes: number
): number {
  const elapsedTime = Date.now() - startTime;
  const bytesPerMs = processedBytes / elapsedTime;
  const remainingBytes = totalBytes - processedBytes;
  return Math.round(remainingBytes / bytesPerMs);
}
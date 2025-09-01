export type HashAlgorithm = 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512' | 'CRC32';

export interface FileInfo {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

export interface HashResult {
  algorithm: HashAlgorithm;
  hash: string;
  processingTime: number;
}

export interface ChecksumState {
  type: 'checksum';
  inputText: string;
  fileInfo: FileInfo | null;
  calculatedHashes: Record<HashAlgorithm, string>;
  expectedChecksum: string;
  comparisonResult: 'none' | 'match' | 'no-match';
  isProcessing: boolean;
  processingProgress: number;
  processingAlgorithm: string;
  selectedAlgorithms: HashAlgorithm[];
  lastProcessedAt: number;
}

export interface HashingProgress {
  algorithm: HashAlgorithm;
  progress: number; // 0-100
  bytesProcessed: number;
  totalBytes: number;
  estimatedTimeRemaining?: number;
}

export interface HashingOptions {
  algorithms: HashAlgorithm[];
  chunkSize?: number; // Default: 10MB
  onProgress?: (progress: HashingProgress) => void;
}
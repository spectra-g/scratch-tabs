export { ChecksumTablet } from './ChecksumTablet';
export type { ChecksumState, HashAlgorithm, FileInfo, HashingOptions } from './types';
export { hashText, hashFile, compareHashes } from './utils/hashing';

// Tablet factory function for the registry
export const createChecksumTablet = () => ({
  id: 'checksum',
  label: 'Checksum Calculator',
  
  createInitialState: (payload?: any) => ({
    type: 'checksum' as const,
    inputText: payload?.text || '',
    fileInfo: null,
    calculatedHashes: {} as Record<import('./types').HashAlgorithm, string>,
    expectedChecksum: '',
    comparisonResult: 'none' as const,
    isProcessing: false,
    processingProgress: 0,
    processingAlgorithm: '',
    selectedAlgorithms: ['SHA-256', 'SHA-512', 'CRC32'] as import('./types').HashAlgorithm[],
    lastProcessedAt: 0,
  }),
  
  serializeState: (state: any) => JSON.stringify(state),
  
  deserializeState: (serialized: string) => {
    try {
      return JSON.parse(serialized);
    } catch {
      return createChecksumTablet().createInitialState();
    }
  },
  
  render: (state: any, onChange: (newState: any) => void) => 
    React.createElement(ChecksumTablet, { state, onChange }),
});
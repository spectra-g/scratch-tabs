import { hashText, compareHashes, formatFileSize, formatProcessingTime } from '../utils/hashing';
import { HashAlgorithm } from '../types';

// Mock Web Crypto API for testing
const mockSubtle = {
  digest: jest.fn(),
};

Object.defineProperty(global, 'crypto', {
  value: {
    subtle: mockSubtle,
  },
});

describe('Checksum Hashing Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hashText', () => {
    it('should hash text with SHA-256', async () => {
      const mockHash = new ArrayBuffer(32); // SHA-256 produces 32 bytes
      const mockView = new Uint8Array(mockHash);
      mockView.fill(0xAB); // Fill with test data
      
      mockSubtle.digest.mockResolvedValue(mockHash);

      const result = await hashText('test text', ['SHA-256']);
      
      expect(mockSubtle.digest).toHaveBeenCalledWith('SHA-256', expect.any(Uint8Array));
      expect(result['SHA-256']).toBe('ABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABAB');
    });

    it('should handle CRC32 calculation', async () => {
      const result = await hashText('test', ['CRC32']);
      
      expect(result['CRC32']).toBeDefined();
      expect(result['CRC32']).toMatch(/^[0-9A-F]{8}$/);
    });

    it('should handle multiple algorithms', async () => {
      const mockHash256 = new ArrayBuffer(32);
      const mockHash512 = new ArrayBuffer(64);
      
      mockSubtle.digest
        .mockResolvedValueOnce(mockHash256)
        .mockResolvedValueOnce(mockHash512);

      const result = await hashText('test', ['SHA-256', 'SHA-512', 'CRC32']);
      
      expect(Object.keys(result)).toHaveLength(3);
      expect(result['SHA-256']).toBeDefined();
      expect(result['SHA-512']).toBeDefined();
      expect(result['CRC32']).toBeDefined();
    });

    it('should handle MD5 gracefully (not supported)', async () => {
      const result = await hashText('test', ['MD5']);
      
      expect(result['MD5']).toBe('MD5 not supported in browser');
    });

    it('should handle errors gracefully', async () => {
      mockSubtle.digest.mockRejectedValue(new Error('Crypto error'));

      const result = await hashText('test', ['SHA-256']);
      
      expect(result['SHA-256']).toContain('Error: SHA-256 failed');
    });
  });

  describe('compareHashes', () => {
    it('should return true for matching hashes (case insensitive)', () => {
      const hash1 = 'ABCDEF123456';
      const hash2 = 'abcdef123456';
      
      expect(compareHashes(hash1, hash2)).toBe(true);
    });

    it('should return false for non-matching hashes', () => {
      const hash1 = 'ABCDEF123456';
      const hash2 = 'FEDCBA654321';
      
      expect(compareHashes(hash1, hash2)).toBe(false);
    });

    it('should return false for empty inputs', () => {
      expect(compareHashes('', 'test')).toBe(false);
      expect(compareHashes('test', '')).toBe(false);
      expect(compareHashes('', '')).toBe(false);
    });

    it('should handle whitespace in hashes', () => {
      const hash1 = ' ABCDEF123456 ';
      const hash2 = 'abcdef123456';
      
      // Note: Our current implementation doesn't trim, so this should fail
      // If we want to support trimming, we'd need to update the function
      expect(compareHashes(hash1, hash2)).toBe(false);
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1073741824)).toBe('1 GB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });

    it('should handle large file sizes', () => {
      const terabyte = 1024 * 1024 * 1024 * 1024;
      expect(formatFileSize(terabyte)).toBe('1 TB');
      expect(formatFileSize(terabyte * 2.5)).toBe('2.5 TB');
    });
  });

  describe('formatProcessingTime', () => {
    it('should format milliseconds correctly', () => {
      expect(formatProcessingTime(500)).toBe('500ms');
      expect(formatProcessingTime(1500)).toBe('1.5s');
      expect(formatProcessingTime(65000)).toBe('1m 5s');
      expect(formatProcessingTime(125000)).toBe('2m 5s');
    });

    it('should handle edge cases', () => {
      expect(formatProcessingTime(0)).toBe('0ms');
      expect(formatProcessingTime(999)).toBe('999ms');
      expect(formatProcessingTime(1000)).toBe('1.0s');
      expect(formatProcessingTime(60000)).toBe('1m 0s');
    });
  });
});
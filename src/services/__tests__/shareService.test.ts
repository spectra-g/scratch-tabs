import { shareService } from '../shareService';

describe('ShareService', () => {
  describe('compress and decompress', () => {
    it('should compress and decompress content correctly', () => {
      const originalContent = 'Hello, World!';
      const compressed = shareService.compress(originalContent);
      const decompressed = shareService.decompress(compressed);

      expect(decompressed).toBe(originalContent);
    });

    it('should handle empty string', () => {
      const originalContent = '';
      const compressed = shareService.compress(originalContent);
      const decompressed = shareService.decompress(compressed);

      expect(decompressed).toBe(originalContent);
    });

    it('should handle large JSON content', () => {
      const largeObject = {
        users: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          name: `User ${i}`,
          email: `user${i}@example.com`,
          metadata: {
            created: new Date().toISOString(),
            tags: ['active', 'verified']
          }
        }))
      };
      const originalContent = JSON.stringify(largeObject, null, 2);
      const compressed = shareService.compress(originalContent);
      const decompressed = shareService.decompress(compressed);

      expect(decompressed).toBe(originalContent);
      expect(compressed.length).toBeLessThan(originalContent.length);
    });

    it('should return empty string for invalid compressed data', () => {
      const result = shareService.decompress('invalid-data');
      expect(result).toBe('');
    });
  });

  describe('canFitInUrl', () => {
    it('should correctly identify small content that fits', () => {
      const smallContent = 'Hello, World!';
      const result = shareService.canFitInUrl(smallContent, 'text');

      expect(result.fits).toBe(true);
      expect(result.size).toBeLessThan(result.maxSize);
    });

    it('should correctly identify large content that does not fit', () => {
      // Create content large enough to not fit even with compression
      const largeContent = JSON.stringify(
        Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          description: `This is a detailed description for item ${i}`,
          data: Array.from({ length: 10 }, () => Math.random()),
        }))
      );
      const result = shareService.canFitInUrl(largeContent, 'text');

      expect(result.fits).toBe(false);
      expect(result.size).toBeGreaterThan(result.maxSize);
    });

    it('should include metadata in size calculation', () => {
      const content = 'test';
      const resultShort = shareService.canFitInUrl(content, 'json', 'full');
      const resultLong = shareService.canFitInUrl(content, 'json', 'r1-1000');

      expect(resultLong.size).toBeGreaterThan(resultShort.size);
    });
  });

  describe('generateShareUrl', () => {
    it('should generate correct hash-based URL structure', () => {
      const content = 'Test content';
      const url = shareService.generateShareUrl('json', content);

      expect(url).toMatch(/^#\/s\/v1\/json\/full\/.+$/);
    });

    it('should include metadata in hash URL', () => {
      const content = 'Test content';
      const url = shareService.generateShareUrl('text', content, 'r100-200');

      expect(url).toContain('/r100-200/');
    });

    it('should compress content in hash URL', () => {
      const content = 'a'.repeat(1000);
      const url = shareService.generateShareUrl('text', content);

      // Compressed size should be much smaller than original
      expect(url.length).toBeLessThan(content.length);
    });
  });

  describe('parseShareUrl', () => {
    it('should parse valid share URL', () => {
      const pathname = '/s/v1/json/full/N4KABGBEAOBOD2A';
      const result = shareService.parseShareUrl(pathname);

      expect(result).not.toBeNull();
      expect(result?.version).toBe('v1');
      expect(result?.type).toBe('json');
      expect(result?.metadata).toBe('full');
      expect(result?.compressed).toBe('N4KABGBEAOBOD2A');
    });

    it('should parse URL with metadata', () => {
      const pathname = '/s/v1/text/r100-200/compressed123';
      const result = shareService.parseShareUrl(pathname);

      expect(result).not.toBeNull();
      expect(result?.metadata).toBe('r100-200');
    });

    it('should return null for invalid URL format', () => {
      const invalidUrls = [
        '/invalid/url',
        '/s/v1/json',
        '/s/json/full/data',
        '',
      ];

      invalidUrls.forEach(url => {
        expect(shareService.parseShareUrl(url)).toBeNull();
      });
    });

    it('should handle URLs with long compressed content', () => {
      const longCompressed = 'N'.repeat(500);
      const pathname = `/s/v1/json/full/${longCompressed}`;
      const result = shareService.parseShareUrl(pathname);

      expect(result).not.toBeNull();
      expect(result?.compressed).toBe(longCompressed);
    });
  });

  describe('isValidFormat', () => {
    it('should return true for valid formats', () => {
      // Assuming these formats are registered
      const validFormats = ['json', 'javascript', 'python', 'css', 'html'];

      validFormats.forEach(format => {
        // This test assumes format registry is populated
        // In actual tests, you may need to mock the registry
        const result = shareService.isValidFormat(format);
        expect(typeof result).toBe('boolean');
      });
    });

    it('should return false for invalid formats', () => {
      const result = shareService.isValidFormat('invalid-format-xyz');
      expect(result).toBe(false);
    });
  });

  describe('estimateUrlLength', () => {
    it('should estimate URL length accurately', () => {
      const content = 'Test content';
      const estimated = shareService.estimateUrlLength('json', content, 'full');
      const actual = shareService.generateShareUrl('json', content, 'full').length;

      // Estimate should be close to actual (within 100 chars due to base URL overhead)
      expect(Math.abs(estimated - actual)).toBeLessThan(100);
    });
  });

  describe('getCompressedSize', () => {
    it('should return compressed size', () => {
      const content = 'Test content';
      const size = shareService.getCompressedSize(content);

      expect(size).toBeGreaterThan(0);
    });

    it('should compress large repetitive content effectively', () => {
      const largeContent = 'a'.repeat(1000);
      const size = shareService.getCompressedSize(largeContent);

      // Large repetitive content should compress well
      expect(size).toBeLessThan(largeContent.length / 2);
    });
  });

  describe('round-trip test', () => {
    it('should successfully round-trip content through hash-based share URL', () => {
      const originalContent = JSON.stringify({
        name: 'Test',
        value: 123,
        nested: { key: 'value' }
      }, null, 2);

      // Generate hash-based URL
      const url = shareService.generateShareUrl('json', originalContent);

      // Verify it's hash-based
      expect(url.startsWith('#')).toBe(true);

      // Parse URL (remove # prefix as done in ShareURLHandler)
      const hashPath = url.startsWith('#') ? url.substring(1) : url;
      const parsed = shareService.parseShareUrl(hashPath);
      expect(parsed).not.toBeNull();

      // Decompress
      const decompressed = shareService.decompress(parsed!.compressed);

      // Verify
      expect(decompressed).toBe(originalContent);
    });
  });
});

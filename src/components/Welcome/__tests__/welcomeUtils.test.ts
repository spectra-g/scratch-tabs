import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  isJSONLike,
  getDemoJSON,
  readClipboardText,
  getJSONDemoContent,
  DEMO_JSON_CONTENT,
} from '../utils/welcomeUtils';

describe('welcomeUtils', () => {
  describe('isJSONLike', () => {
    it('should return true for object-like JSON', () => {
      expect(isJSONLike('{"key": "value"}')).toBe(true);
      expect(isJSONLike('  {"key": "value"}  ')).toBe(true);
      expect(isJSONLike('{}')).toBe(true);
    });

    it('should return true for array-like JSON', () => {
      expect(isJSONLike('[1, 2, 3]')).toBe(true);
      expect(isJSONLike('  [1, 2, 3]  ')).toBe(true);
      expect(isJSONLike('[]')).toBe(true);
    });

    it('should return false for non-JSON text', () => {
      expect(isJSONLike('plain text')).toBe(false);
      expect(isJSONLike('123')).toBe(false);
      expect(isJSONLike('true')).toBe(false);
      expect(isJSONLike('"string"')).toBe(false);
    });

    it('should return false for null, undefined, or empty string', () => {
      expect(isJSONLike(null)).toBe(false);
      expect(isJSONLike(undefined)).toBe(false);
      expect(isJSONLike('')).toBe(false);
      expect(isJSONLike('   ')).toBe(false);
    });
  });

  describe('getDemoJSON', () => {
    it('should return formatted JSON string', () => {
      const result = getDemoJSON();

      expect(result).toBeTruthy();
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('should contain expected demo content structure', () => {
      const result = getDemoJSON();
      const parsed = JSON.parse(result);

      expect(parsed.welcome).toBe(DEMO_JSON_CONTENT.welcome);
      expect(parsed.smartView).toBe(DEMO_JSON_CONTENT.smartView);
      expect(parsed.features).toBeDefined();
      expect(parsed.howToUse).toBeInstanceOf(Array);
      expect(parsed.tabs).toBeDefined();
      expect(parsed.devTools).toBeDefined();
      expect(parsed.workspaces).toBeDefined();
    });

    it('should use 2-space indentation', () => {
      const result = getDemoJSON();

      // Check for 2-space indentation by looking for common pattern
      expect(result).toContain('  "welcome"');
      expect(result).toContain('    "autoDetection"');
    });
  });

  describe('readClipboardText', () => {
    const mockReadText = jest.fn<() => Promise<string>>();

    beforeEach(() => {
      // Mock navigator.clipboard
      Object.defineProperty(global.navigator, 'clipboard', {
        value: {
          readText: mockReadText,
        },
        writable: true,
        configurable: true,
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
      mockReadText.mockReset();
    });

    it('should return clipboard text when available', async () => {
      mockReadText.mockResolvedValue('clipboard content');

      const result = await readClipboardText();

      expect(result).toBe('clipboard content');
      expect(mockReadText).toHaveBeenCalledTimes(1);
    });

    it('should return null when clipboard is empty', async () => {
      mockReadText.mockResolvedValue('');

      const result = await readClipboardText();

      expect(result).toBeNull();
    });

    it('should return null when clipboard API is unavailable', async () => {
      Object.defineProperty(global.navigator, 'clipboard', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const result = await readClipboardText();

      expect(result).toBeNull();
    });

    it('should return null when clipboard access is denied', async () => {
      mockReadText.mockRejectedValue(new Error('Permission denied'));

      const result = await readClipboardText();

      expect(result).toBeNull();
    });
  });

  describe('getJSONDemoContent', () => {
    const mockReadText = jest.fn<() => Promise<string>>();

    beforeEach(() => {
      Object.defineProperty(global.navigator, 'clipboard', {
        value: {
          readText: mockReadText,
        },
        writable: true,
        configurable: true,
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
      mockReadText.mockReset();
    });

    it('should return clipboard content when it contains JSON object', async () => {
      const jsonContent = '{"key": "value"}';
      mockReadText.mockResolvedValue(jsonContent);

      const result = await getJSONDemoContent();

      expect(result).toBe(jsonContent);
    });

    it('should return clipboard content when it contains JSON array', async () => {
      const jsonContent = '[1, 2, 3]';
      mockReadText.mockResolvedValue(jsonContent);

      const result = await getJSONDemoContent();

      expect(result).toBe(jsonContent);
    });

    it('should return demo JSON when clipboard contains non-JSON text', async () => {
      mockReadText.mockResolvedValue('plain text');

      const result = await getJSONDemoContent();

      expect(result).toBe(getDemoJSON());
    });

    it('should return demo JSON when clipboard is empty', async () => {
      mockReadText.mockResolvedValue('');

      const result = await getJSONDemoContent();

      expect(result).toBe(getDemoJSON());
    });

    it('should return demo JSON when clipboard access fails', async () => {
      mockReadText.mockRejectedValue(new Error('Permission denied'));

      const result = await getJSONDemoContent();

      expect(result).toBe(getDemoJSON());
    });

    it('should handle whitespace around JSON correctly', async () => {
      const jsonContent = '  {"key": "value"}  ';
      mockReadText.mockResolvedValue(jsonContent);

      const result = await getJSONDemoContent();

      expect(result).toBe(jsonContent);
    });
  });

  describe('DEMO_JSON_CONTENT', () => {
    it('should contain key instructional properties', () => {
      expect(DEMO_JSON_CONTENT.welcome).toBeTruthy();
      expect(DEMO_JSON_CONTENT.smartView).toBeTruthy();
      expect(DEMO_JSON_CONTENT.features).toBeTruthy();
      expect(DEMO_JSON_CONTENT.howToUse).toBeInstanceOf(Array);
      expect(DEMO_JSON_CONTENT.howToUse.length).toBeGreaterThan(0);
    });

    it('should include tab, dev tools, and workspace guidance', () => {
      expect(DEMO_JSON_CONTENT.tabs).toBeTruthy();
      expect(DEMO_JSON_CONTENT.devTools).toBeTruthy();
      expect(DEMO_JSON_CONTENT.workspaces).toBeTruthy();
    });

    it('should provide next steps guidance', () => {
      expect(DEMO_JSON_CONTENT.nextSteps).toBeTruthy();
    });
  });
});

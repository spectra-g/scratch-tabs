import {
  getContentForLanguageDetection,
  getTabContentForLanguageDetection,
  MAX_CONTENT_LENGTH_FOR_DETECTION
} from '../formatDetectionUtils';

describe('formatDetectionUtils', () => {
  describe('getContentForLanguageDetection', () => {
    it('should return empty string for empty input', () => {
      expect(getContentForLanguageDetection('')).toBe('');
    });

    it('should return full content when shorter than max length', () => {
      const content = 'short content';
      expect(getContentForLanguageDetection(content)).toBe(content);
    });

    it('should truncate content when longer than max length', () => {
      const longContent = 'a'.repeat(MAX_CONTENT_LENGTH_FOR_DETECTION + 100);
      const result = getContentForLanguageDetection(longContent);

      expect(result.length).toBe(MAX_CONTENT_LENGTH_FOR_DETECTION);
      expect(result).toBe('a'.repeat(MAX_CONTENT_LENGTH_FOR_DETECTION));
    });

    it('should return content exactly at max length unchanged', () => {
      const exactContent = 'a'.repeat(MAX_CONTENT_LENGTH_FOR_DETECTION);
      expect(getContentForLanguageDetection(exactContent)).toBe(exactContent);
    });
  });

  describe('getTabContentForLanguageDetection', () => {
    it('should handle tab with no content', () => {
      expect(getTabContentForLanguageDetection({})).toBe('');
    });

    it('should handle tab with empty content', () => {
      expect(getTabContentForLanguageDetection({ content: '' })).toBe('');
    });

    it('should handle tab with short content', () => {
      const tab = { content: 'short content' };
      expect(getTabContentForLanguageDetection(tab)).toBe('short content');
    });

    it('should truncate tab content when too long', () => {
      const longContent = 'x'.repeat(MAX_CONTENT_LENGTH_FOR_DETECTION + 50);
      const tab = { content: longContent };
      const result = getTabContentForLanguageDetection(tab);

      expect(result.length).toBe(MAX_CONTENT_LENGTH_FOR_DETECTION);
      expect(result).toBe('x'.repeat(MAX_CONTENT_LENGTH_FOR_DETECTION));
    });
  });
});
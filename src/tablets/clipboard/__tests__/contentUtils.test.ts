import { describe, it, expect } from '@jest/globals';
import { detectContentType, generateTitle, formatDuration } from '../utils/contentUtils';

describe('contentUtils', () => {
  describe('detectContentType', () => {
    it('should detect image content', () => {
      expect(detectContentType('data:image/png;base64,iVBORw0KGgoAAAANS')).toBe('image');
      expect(detectContentType('data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ')).toBe('image');
    });

    it('should detect color content', () => {
      expect(detectContentType('#FF0000')).toBe('color');
      expect(detectContentType('#fff')).toBe('color');
      expect(detectContentType('#123456')).toBe('color');
    });

    it('should detect link content', () => {
      expect(detectContentType('https://example.com')).toBe('link');
      expect(detectContentType('http://localhost:3000')).toBe('link');
      expect(detectContentType('ftp://files.example.com')).toBe('link');
    });

    it('should detect text content', () => {
      expect(detectContentType('Hello world')).toBe('text');
      expect(detectContentType('123456')).toBe('text');
      expect(detectContentType('Just some text')).toBe('text');
    });

    it('should handle invalid URLs as text', () => {
      expect(detectContentType('not-a-url')).toBe('text');
      expect(detectContentType('just-some-text')).toBe('text');
    });
  });

  describe('generateTitle', () => {
    it('should generate title for image', () => {
      const title = generateTitle('data:image/png;base64,abc', 'image');
      expect(title).toMatch(/^Image - /);
    });

    it('should generate title for link', () => {
      expect(generateTitle('https://example.com/path', 'link')).toBe('example.com');
      expect(generateTitle('http://localhost:3000', 'link')).toBe('localhost');
    });

    it('should generate title for color', () => {
      expect(generateTitle('#FF0000', 'color')).toBe('Color - #FF0000');
      expect(generateTitle('#fff', 'color')).toBe('Color - #fff');
    });

    it('should generate title for text', () => {
      expect(generateTitle('Hello world', 'text')).toBe('Hello world');
      expect(generateTitle('Line 1\nLine 2', 'text')).toBe('Line 1');
      expect(generateTitle('A'.repeat(100), 'text')).toBe('A'.repeat(50));
      expect(generateTitle('', 'text')).toBe('Text Snippet');
      expect(generateTitle('   ', 'text')).toBe('Text Snippet');
    });

    it('should handle invalid URLs for link type', () => {
      expect(generateTitle('not-a-url', 'link')).toBe('Link');
    });

    it('should handle unknown content types', () => {
      expect(generateTitle('test', 'unknown' as any)).toBe('Clipboard Item');
    });
  });

  describe('formatDuration', () => {
    it('should format expired time', () => {
      expect(formatDuration(-1000)).toBe('Expired');
      expect(formatDuration(-5000)).toBe('Expired');
    });

    it('should format seconds', () => {
      expect(formatDuration(5000)).toBe('00:00:05');
      expect(formatDuration(30000)).toBe('00:00:30');
    });

    it('should format minutes', () => {
      expect(formatDuration(60000)).toBe('00:01:00');
      expect(formatDuration(90000)).toBe('00:01:30');
    });

    it('should format hours', () => {
      expect(formatDuration(3600000)).toBe('01:00:00');
      expect(formatDuration(3665000)).toBe('01:01:05');
    });

    it('should pad with zeros', () => {
      expect(formatDuration(1000)).toBe('00:00:01');
      expect(formatDuration(61000)).toBe('00:01:01');
    });
  });
});
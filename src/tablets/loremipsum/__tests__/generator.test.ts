import { generateContent, validateOptions, getFileExtension, getLanguageForMode } from '../utils/generator';
import { GenerationOptions } from '../types';

describe('Lorem Ipsum Generator', () => {
  describe('generateContent', () => {
    it('should generate text content with correct word count', () => {
      const options: GenerationOptions = {
        mode: 'text',
        theme: 'general',
        count: 10,
        unit: 'words',
        startWithLorem: true,
      };

      const result = generateContent(options);
      const words = result.split(/\s+/).filter(w => w.length > 0);
      
      expect(words.length).toBe(10);
      expect(words[0]).toBe('Lorem');
    });

    it('should generate HTML content with proper structure', () => {
      const options: GenerationOptions = {
        mode: 'html',
        theme: 'business',
        count: 2,
        unit: 'paragraphs',
      };

      const result = generateContent(options);
      
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<html lang="en">');
      expect(result).toContain('<head>');
      expect(result).toContain('<body>');
      expect(result).toContain('<header>');
      expect(result).toContain('<main>');
      expect(result).toContain('<footer>');
    });

    it('should generate valid JSON content', () => {
      const options: GenerationOptions = {
        mode: 'json',
        theme: 'tech',
        count: 3,
        unit: 'paragraphs',
      };

      const result = generateContent(options);
      
      expect(() => JSON.parse(result)).not.toThrow();
      const parsed = JSON.parse(result);
      expect(typeof parsed).toBe('object');
      expect(Object.keys(parsed).length).toBeGreaterThan(0);
    });

    it('should generate Markdown content with proper formatting', () => {
      const options: GenerationOptions = {
        mode: 'markdown',
        theme: 'academic',
        count: 2,
        unit: 'paragraphs',
      };

      const result = generateContent(options);
      
      expect(result).toMatch(/^# /); // Should start with h1
      expect(result).toContain('## '); // Should contain h2
      expect(result).toContain('\n\n'); // Should have paragraph breaks
    });

    it('should handle custom source text generation', () => {
      const customText = 'The quick brown fox jumps over the lazy dog. This is a test sentence for custom generation.';
      const options: GenerationOptions = {
        mode: 'custom',
        theme: 'general',
        count: 20,
        unit: 'words',
        customSource: customText,
      };

      const result = generateContent(options);
      const words = result.split(/\s+/).filter(w => w.length > 0);
      
      expect(words.length).toBe(20);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle themed content generation', () => {
      const options: GenerationOptions = {
        mode: 'text',
        theme: 'tech',
        count: 5,
        unit: 'sentences',
      };

      const result = generateContent(options);
      
      expect(result.length).toBeGreaterThan(0);
      expect(result).toMatch(/\./); // Should contain sentence endings
    });
  });

  describe('validateOptions', () => {
    it('should return null for valid options', () => {
      const options: GenerationOptions = {
        mode: 'text',
        theme: 'general',
        count: 5,
        unit: 'paragraphs',
      };

      const result = validateOptions(options);
      expect(result).toBeNull();
    });

    it('should return error for zero count', () => {
      const options: GenerationOptions = {
        mode: 'text',
        theme: 'general',
        count: 0,
        unit: 'paragraphs',
      };

      const result = validateOptions(options);
      expect(result).toBe('Count must be greater than 0');
    });

    it('should return error for excessive count', () => {
      const options: GenerationOptions = {
        mode: 'text',
        theme: 'general',
        count: 1001,
        unit: 'paragraphs',
      };

      const result = validateOptions(options);
      expect(result).toBe('Count cannot exceed 1000');
    });

    it('should return error for custom mode without source text', () => {
      const options: GenerationOptions = {
        mode: 'custom',
        theme: 'general',
        count: 5,
        unit: 'words',
        customSource: 'short',
      };

      const result = validateOptions(options);
      expect(result).toBe('Custom source text must be at least 10 characters long');
    });
  });

  describe('getFileExtension', () => {
    it('should return correct extensions for each mode', () => {
      expect(getFileExtension('html')).toBe('html');
      expect(getFileExtension('markdown')).toBe('md');
      expect(getFileExtension('json')).toBe('json');
      expect(getFileExtension('text')).toBe('txt');
      expect(getFileExtension('custom')).toBe('txt');
    });
  });

  describe('getLanguageForMode', () => {
    it('should return correct languages for syntax highlighting', () => {
      expect(getLanguageForMode('html')).toBe('html');
      expect(getLanguageForMode('markdown')).toBe('markdown');
      expect(getLanguageForMode('json')).toBe('json');
      expect(getLanguageForMode('text')).toBe('plaintext');
      expect(getLanguageForMode('custom')).toBe('plaintext');
    });
  });
});
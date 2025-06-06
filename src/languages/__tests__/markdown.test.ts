jest.mock("../../components/StatusBar/LanguageStatusItems/markdown", () => ({
  MarkdownStatusItem: () => "MockedMarkdownStatusItem",
}));

import { MarkdownLanguageDetector } from '../markdown';

describe('MarkdownLanguageDetector', () => {
  let detector: MarkdownLanguageDetector;

  beforeEach(() => {
    detector = new MarkdownLanguageDetector();
  });

  describe('Basic Properties', () => {
    test('should have correct basic properties', () => {
      expect(detector.id).toBe('markdown');
      expect(detector.name).toBe('Markdown');
      expect(detector.extensions).toEqual(['md', 'markdown', 'mdown', 'mkd']);
      expect(detector.priority).toBe(4);
    });

    test('should return correct file extension', () => {
      expect(detector.getFileExtension()).toBe('md');
    });
  });

  describe('Sample Content', () => {
    test('should provide valid sample content', () => {
      const sample = detector.sampleContent();
      expect(sample).toContain('# Sample Markdown Document');
      expect(sample).toContain("```javascript");
      expect(sample).toContain('- [x] Completed task');
    });
  });

  describe('Detection Logic', () => {
    test('should detect a simple markdown file with headers and lists', () => {
      const content = `
# Title
## Subtitle

- List item 1
- List item 2
1. Ordered item
      `;
      const result = detector.detect(content);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    test('should detect markdown with YAML frontmatter', () => {
      const content = `
---
title: My Document
author: Test User
---

# Real Content Starts Here
This is a paragraph.
      `;
      const result = detector.detect(content);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test('should reject content that is almost exclusively YAML', () => {
      const content = `
name: my-app
version: 1.2.3
dependencies:
  - react
  - jest
config:
  port: 8080
  host: localhost
      `;
      const result = detector.detect(content);
      if (result.match) {
        expect(result.confidence).toBeLessThan(0.3);
      } else {
        expect(result.match).toBe(false);
      }
    });

    test('should detect markdown with various features like links, images, and code blocks', () => {
      const content = `
# Title
A link to [Google](https://google.com).

An image: ![alt text](image.png)

\`\`\`js
console.log('hello');
\`\`\`
      `;
      const result = detector.detect(content);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    test('should detect task lists and tables', () => {
        const content = `
### TODO
- [x] Item 1
- [ ] Item 2

| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
      `;
      const result = detector.detect(content);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    test('should reject empty or very short content', () => {
      expect(detector.detect('').match).toBe(false);
      expect(detector.detect(' \n ').match).toBe(false);
      expect(detector.detect('hello').match).toBe(false);
    });

    test('should have very low confidence for plain text prose', () => {
      const content = `
This is a paragraph of regular text. It does not contain any special markdown
characters like headers, lists, or links. It's just a few sentences to see how
the detector handles what could be considered simple prose. We want to avoid
classifying this as markdown if possible, as it is more likely just plaintext.
      `;
      const result = detector.detect(content);
      if (result.match) {
        expect(result.confidence).toBeLessThan(0.2);
      } else {
        expect(result.match).toBe(false);
      }
    });

    test('should reject JSON content', () => {
      const content = '{"key": "value", "array": [1, 2, 3]}';
      const result = detector.detect(content);
      expect(result.match).toBe(false);
    });

    test('should reject XML/HTML content', () => {
      const content = '<root><element attribute="value">Content</element></root>';
      const result = detector.detect(content);
      expect(result.match).toBe(false);
    });

    test('should reject shell script content', () => {
        const content = `
#!/bin/bash
echo "Hello World"
for i in {1..5}; do
  echo "Number: $i"
done
        `;
        const result = detector.detect(content);
        expect(result.match).toBe(false);
    });
  });

  describe('UI Components', () => {
    test('should return a status item component function', () => {
      // Get the function that returns the component
      const getStatusItemFn = detector.getStatusItem;
      expect(typeof getStatusItemFn).toBe('function');

      // Call it to get the component function (which is now mocked)
      const StatusItemComponent = getStatusItemFn!();
      expect(typeof StatusItemComponent).toBe('function');
      
      // We can call the mocked component function to verify it returns what we expect.
      expect(StatusItemComponent({ content: 'test'})).toBe('MockedMarkdownStatusItem');
    });
  });

  describe('Monaco Provider Registration', () => {
    test('should register monaco provider without errors', () => {
      const mockMonaco = {
        languages: {
          getLanguages: jest.fn(() => []),
          register: jest.fn(),
          registerDocumentFormattingEditProvider: jest.fn(),
        },
      };

      expect(() => {
        detector.registerProvider(mockMonaco);
      }).not.toThrow();

      expect(mockMonaco.languages.register).toHaveBeenCalledWith({ id: 'markdown' });
      expect(mockMonaco.languages.registerDocumentFormattingEditProvider).toHaveBeenCalledWith('markdown', expect.any(Object));
    });
  });
});
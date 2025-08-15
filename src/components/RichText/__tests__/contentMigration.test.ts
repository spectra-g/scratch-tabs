import { 
  migrateTextToRich, 
  migrateRichToText, 
  createCodeBlockNode 
} from '../utils/contentMigration';

describe('Content Migration Utils', () => {
  const mockDateCreated = 1640995200000; // 2022-01-01

  describe('migrateTextToRich', () => {
    it('should create empty rich content for empty text', () => {
      const result = migrateTextToRich('', mockDateCreated);
      
      expect(result).toEqual({
        type: 'doc',
        content: [
          {
            type: 'dateCreated',
            attrs: {
              dateCreated: mockDateCreated,
            },
          },
          {
            type: 'paragraph',
            content: [],
          },
        ],
      });
    });

    it('should convert single line text to paragraph', () => {
      const result = migrateTextToRich('Hello world', mockDateCreated);
      
      expect(result.content).toHaveLength(2);
      expect(result.content[1]).toEqual({
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Hello world',
          },
        ],
      });
    });

    it('should convert multiple paragraphs', () => {
      const text = 'First paragraph\n\nSecond paragraph\n\nThird paragraph';
      const result = migrateTextToRich(text, mockDateCreated);
      
      expect(result.content).toHaveLength(4); // dateCreated + 3 paragraphs
      expect(result.content[1].content[0].text).toBe('First paragraph');
      expect(result.content[2].content[0].text).toBe('Second paragraph');
      expect(result.content[3].content[0].text).toBe('Third paragraph');
    });

    it('should handle line breaks within paragraphs', () => {
      const text = 'Line 1\nLine 2\nLine 3';
      const result = migrateTextToRich(text, mockDateCreated);
      
      expect(result.content).toHaveLength(2); // dateCreated + 1 paragraph
      const paragraphContent = result.content[1].content;
      
      expect(paragraphContent).toHaveLength(5); // text, hardBreak, text, hardBreak, text
      expect(paragraphContent[0].text).toBe('Line 1');
      expect(paragraphContent[1].type).toBe('hardBreak');
      expect(paragraphContent[2].text).toBe('Line 2');
      expect(paragraphContent[3].type).toBe('hardBreak');
      expect(paragraphContent[4].text).toBe('Line 3');
    });
  });

  describe('migrateRichToText', () => {
    it('should return empty string for null/undefined content', () => {
      expect(migrateRichToText(null)).toBe('');
      expect(migrateRichToText(undefined)).toBe('');
      expect(migrateRichToText({})).toBe('');
    });

    it('should extract text from paragraphs', () => {
      const richContent = {
        type: 'doc',
        content: [
          {
            type: 'dateCreated',
            attrs: { dateCreated: mockDateCreated },
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Hello world' },
            ],
          },
        ],
      };
      
      const result = migrateRichToText(richContent);
      expect(result).toBe('Hello world');
    });

    it('should handle multiple paragraphs', () => {
      const richContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'First paragraph' }],
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Second paragraph' }],
          },
        ],
      };
      
      const result = migrateRichToText(richContent);
      expect(result).toBe('First paragraph\n\nSecond paragraph');
    });

    it('should handle headings with markdown markers', () => {
      const richContent = {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Main Title' }],
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Subtitle' }],
          },
        ],
      };
      
      const result = migrateRichToText(richContent);
      expect(result).toBe('# Main Title\n\n## Subtitle');
    });

    it('should handle code blocks', () => {
      const richContent = {
        type: 'doc',
        content: [
          {
            type: 'codeBlock',
            content: [{ type: 'text', text: 'console.log("hello");' }],
          },
        ],
      };
      
      const result = migrateRichToText(richContent);
      expect(result).toBe('```\nconsole.log("hello");\n```');
    });

    it('should handle hard breaks', () => {
      const richContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Line 1' },
              { type: 'hardBreak' },
              { type: 'text', text: 'Line 2' },
            ],
          },
        ],
      };
      
      const result = migrateRichToText(richContent);
      expect(result).toBe('Line 1\nLine 2');
    });
  });

  describe('createCodeBlockNode', () => {
    it('should create a code block node with default language', () => {
      const result = createCodeBlockNode('console.log("test");');
      
      expect(result).toEqual({
        type: 'codeBlock',
        attrs: {
          language: 'plaintext',
        },
        content: [
          {
            type: 'text',
            text: 'console.log("test");',
          },
        ],
      });
    });

    it('should create a code block node with specified language', () => {
      const result = createCodeBlockNode('console.log("test");', 'javascript');
      
      expect(result).toEqual({
        type: 'codeBlock',
        attrs: {
          language: 'javascript',
        },
        content: [
          {
            type: 'text',
            text: 'console.log("test");',
          },
        ],
      });
    });

    it('should handle empty content', () => {
      const result = createCodeBlockNode('');
      
      expect(result.content[0].text).toBe('');
    });
  });
});
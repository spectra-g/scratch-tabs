import { extractLinkTextForEditing, LinkTextExtractionResult } from '../linkTextExtraction';

// Mock editor type that matches what the function expects
interface MockEditor {
  getHTML: () => string;
  state: {
    selection: { from: number; to: number };
    doc: {
      textBetween: (from: number, to: number) => string;
      content: { size: number };
      resolve: (pos: number) => {
        marks: () => Array<{ type: { name: string }; attrs: { href: string } }>;
      };
    };
  };
}

// Mock document.createElement for HTML parsing
const mockDiv = {
  innerHTML: '',
  querySelectorAll: jest.fn()
};

const createElementSpy = jest.spyOn(document, 'createElement');
createElementSpy.mockImplementation((tagName: string) => {
  if (tagName === 'div') {
    return mockDiv as any;
  }
  return document.createElement(tagName);
});

describe('extractLinkTextForEditing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createElementSpy.mockClear();
    mockDiv.innerHTML = '';
    mockDiv.querySelectorAll.mockReturnValue([]);
  });

  describe('single link scenarios', () => {
    it('should extract text from a single link correctly', () => {
      const mockEditor: MockEditor = {
        getHTML: () => '<p>This is <a href="https://example.com">test link</a> text.</p>',
        state: {
          selection: { from: 10, to: 10 },
          doc: {
            textBetween: jest.fn(() => 'fallback text'),
            content: { size: 100 },
            resolve: jest.fn(() => ({
              marks: () => [{ type: { name: 'link' }, attrs: { href: 'https://example.com' } }]
            }))
          }
        }
      };

      // Mock querySelectorAll to return single link
      mockDiv.querySelectorAll.mockReturnValue([
        { textContent: 'test link' }
      ]);

      const result = extractLinkTextForEditing(mockEditor as any, 'https://example.com');

      expect(result.text).toBe('test link');
      expect(result.success).toBe(true);
      expect(result.method).toBe('html-single');
    });

    it('should handle empty link text', () => {
      const mockEditor: MockEditor = {
        getHTML: () => '<p>Empty: <a href="https://example.com"></a> link.</p>',
        state: {
          selection: { from: 10, to: 10 },
          doc: {
            textBetween: jest.fn(() => 'fallback text'),
            content: { size: 100 },
            resolve: jest.fn(() => ({
              marks: () => [{ type: { name: 'link' }, attrs: { href: 'https://example.com' } }]
            }))
          }
        }
      };

      mockDiv.querySelectorAll.mockReturnValue([
        { textContent: '' }
      ]);

      const result = extractLinkTextForEditing(mockEditor as any, 'https://example.com');

      expect(result.text).toBe('');
      expect(result.success).toBe(true);
      expect(result.method).toBe('html-single');
    });
  });

  describe('multiple link scenarios', () => {
    it('should handle multiple links with same href', () => {
      const mockEditor: MockEditor = {
        getHTML: () => '<p><a href="https://example.com">first</a> and <a href="https://example.com">second</a></p>',
        state: {
          selection: { from: 25, to: 25 },
          doc: {
            textBetween: jest.fn((from, to) => {
              if (from === 0 && to === 100) return 'first and second';
              return 'first and second';
            }),
            content: { size: 100 },
            resolve: jest.fn((pos) => ({
              marks: () => {
                // Simulate different marks at different positions
                if (pos >= 20 && pos <= 30) {
                  return [{ type: { name: 'link' }, attrs: { href: 'https://example.com' } }];
                }
                return [];
              }
            }))
          }
        }
      };

      mockDiv.querySelectorAll.mockReturnValue([
        { textContent: 'first' },
        { textContent: 'second' }
      ]);

      const result = extractLinkTextForEditing(mockEditor as any, 'https://example.com');

      expect(result.success).toBe(true);
      expect(result.method).toBe('html-multiple');
      expect(['first', 'second']).toContain(result.text);
    });

    it('should fallback to distance-based matching when position matching fails', () => {
      const mockEditor: MockEditor = {
        getHTML: () => '<p><a href="https://example.com">link1</a> text <a href="https://example.com">link2</a></p>',
        state: {
          selection: { from: 40, to: 40 },
          doc: {
            textBetween: jest.fn(() => 'link1 text link2'),
            content: { size: 100 },
            resolve: jest.fn(() => ({
              marks: () => [] // No marks found at any position
            }))
          }
        }
      };

      mockDiv.querySelectorAll.mockReturnValue([
        { textContent: 'link1' },
        { textContent: 'link2' }
      ]);

      const result = extractLinkTextForEditing(mockEditor as any, 'https://example.com');

      expect(result.success).toBe(true);
      expect(result.method).toBe('html-multiple');
      expect(['link1', 'link2']).toContain(result.text);
    });
  });

  describe('fallback scenarios', () => {
    it('should fallback to selection when no links found', () => {
      const mockEditor: MockEditor = {
        getHTML: () => '<p>No links here</p>',
        state: {
          selection: { from: 5, to: 10 },
          doc: {
            textBetween: jest.fn((from, to) => 'links'),
            content: { size: 100 },
            resolve: jest.fn(() => ({
              marks: () => []
            }))
          }
        }
      };

      mockDiv.querySelectorAll.mockReturnValue([]);

      const result = extractLinkTextForEditing(mockEditor as any, 'https://example.com');

      expect(result.text).toBe('links');
      expect(result.success).toBe(false);
      expect(result.method).toBe('selection-fallback');
    });

    it('should handle errors gracefully', () => {
      const mockEditor: MockEditor = {
        getHTML: () => {
          throw new Error('HTML extraction failed');
        },
        state: {
          selection: { from: 5, to: 10 },
          doc: {
            textBetween: jest.fn(() => 'error fallback'),
            content: { size: 100 },
            resolve: jest.fn(() => ({
              marks: () => []
            }))
          }
        }
      };

      const result = extractLinkTextForEditing(mockEditor as any, 'https://example.com');

      expect(result.text).toBe('error fallback');
      expect(result.success).toBe(false);
      expect(result.method).toBe('selection-fallback');
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in href', () => {
      const specialHref = 'https://example.com/path?param=value&other=123';
      const mockEditor: MockEditor = {
        getHTML: () => `<p><a href="${specialHref}">special link</a></p>`,
        state: {
          selection: { from: 10, to: 10 },
          doc: {
            textBetween: jest.fn(() => 'fallback'),
            content: { size: 100 },
            resolve: jest.fn(() => ({
              marks: () => [{ type: { name: 'link' }, attrs: { href: specialHref } }]
            }))
          }
        }
      };

      mockDiv.querySelectorAll.mockReturnValue([
        { textContent: 'special link' }
      ]);

      const result = extractLinkTextForEditing(mockEditor as any, specialHref);

      expect(result.text).toBe('special link');
      expect(result.success).toBe(true);
      expect(result.method).toBe('html-single');
    });

    it('should handle very long link text', () => {
      const longText = 'This is a very long link text that contains multiple words and spans across what would be multiple lines in a typical editor interface';
      const mockEditor: MockEditor = {
        getHTML: () => `<p><a href="https://example.com">${longText}</a></p>`,
        state: {
          selection: { from: 10, to: 10 },
          doc: {
            textBetween: jest.fn(() => 'fallback'),
            content: { size: 200 },
            resolve: jest.fn(() => ({
              marks: () => [{ type: { name: 'link' }, attrs: { href: 'https://example.com' } }]
            }))
          }
        }
      };

      mockDiv.querySelectorAll.mockReturnValue([
        { textContent: longText }
      ]);

      const result = extractLinkTextForEditing(mockEditor as any, 'https://example.com');

      expect(result.text).toBe(longText);
      expect(result.success).toBe(true);
      expect(result.method).toBe('html-single');
    });
  });
});
import {
  migrateDateCreatedNode,
  hasDateCreatedNode,
  autoMigrateDateCreatedNode,
  RichContent,
} from '../migrateDateCreatedNode';

describe('migrateDateCreatedNode', () => {
  describe('migrateDateCreatedNode', () => {
    it('should return undefined for null content', () => {
      expect(migrateDateCreatedNode(null)).toBeUndefined();
    });

    it('should return undefined for undefined content', () => {
      expect(migrateDateCreatedNode(undefined)).toBeUndefined();
    });

    it('should return undefined for dateCreated node', () => {
      const dateCreatedNode: RichContent = {
        type: 'dateCreated',
        attrs: {
          dateCreated: 1234567890,
        },
      };

      expect(migrateDateCreatedNode(dateCreatedNode)).toBeUndefined();
    });

    it('should keep non-dateCreated nodes unchanged', () => {
      const paragraphNode: RichContent = {
        type: 'paragraph',
        content: [],
      };

      const result = migrateDateCreatedNode(paragraphNode);
      expect(result).toEqual(paragraphNode);
    });

    it('should remove dateCreated from doc with multiple children', () => {
      const doc: RichContent = {
        type: 'doc',
        content: [
          {
            type: 'dateCreated',
            attrs: { dateCreated: 1234567890 },
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Hello' }],
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'World' }],
          },
        ],
      };

      const result = migrateDateCreatedNode(doc);

      expect(result).toEqual({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Hello' }],
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'World' }],
          },
        ],
      });
    });

    it('should handle nested structures', () => {
      const doc: RichContent = {
        type: 'doc',
        content: [
          {
            type: 'dateCreated',
            attrs: { dateCreated: 1234567890 },
          },
          {
            type: 'blockquote',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Quoted text' }],
              },
            ],
          },
        ],
      };

      const result = migrateDateCreatedNode(doc);

      expect(result).toEqual({
        type: 'doc',
        content: [
          {
            type: 'blockquote',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Quoted text' }],
              },
            ],
          },
        ],
      });
    });

    it('should handle multiple dateCreated nodes', () => {
      const doc: RichContent = {
        type: 'doc',
        content: [
          {
            type: 'dateCreated',
            attrs: { dateCreated: 1234567890 },
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Content' }],
          },
          {
            type: 'dateCreated',
            attrs: { dateCreated: 9876543210 },
          },
        ],
      };

      const result = migrateDateCreatedNode(doc);

      expect(result).toEqual({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Content' }],
          },
        ],
      });
    });

    it('should handle empty document after removing dateCreated', () => {
      const doc: RichContent = {
        type: 'doc',
        content: [
          {
            type: 'dateCreated',
            attrs: { dateCreated: 1234567890 },
          },
        ],
      };

      const result = migrateDateCreatedNode(doc);

      expect(result).toEqual({
        type: 'doc',
        content: [],
      });
    });
  });

  describe('hasDateCreatedNode', () => {
    it('should return false for null content', () => {
      expect(hasDateCreatedNode(null)).toBe(false);
    });

    it('should return false for undefined content', () => {
      expect(hasDateCreatedNode(undefined)).toBe(false);
    });

    it('should return true for dateCreated node', () => {
      const dateCreatedNode: RichContent = {
        type: 'dateCreated',
        attrs: { dateCreated: 1234567890 },
      };

      expect(hasDateCreatedNode(dateCreatedNode)).toBe(true);
    });

    it('should return false for non-dateCreated node', () => {
      const paragraphNode: RichContent = {
        type: 'paragraph',
        content: [],
      };

      expect(hasDateCreatedNode(paragraphNode)).toBe(false);
    });

    it('should return true if dateCreated is in children', () => {
      const doc: RichContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Hello' }],
          },
          {
            type: 'dateCreated',
            attrs: { dateCreated: 1234567890 },
          },
        ],
      };

      expect(hasDateCreatedNode(doc)).toBe(true);
    });

    it('should return true if dateCreated is nested deep', () => {
      const doc: RichContent = {
        type: 'doc',
        content: [
          {
            type: 'blockquote',
            content: [
              {
                type: 'dateCreated',
                attrs: { dateCreated: 1234567890 },
              },
            ],
          },
        ],
      };

      expect(hasDateCreatedNode(doc)).toBe(true);
    });

    it('should return false when no dateCreated nodes exist', () => {
      const doc: RichContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Hello' }],
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'World' }],
          },
        ],
      };

      expect(hasDateCreatedNode(doc)).toBe(false);
    });
  });

  describe('autoMigrateDateCreatedNode', () => {
    beforeEach(() => {
      // Spy on console.log to verify migration logging
      jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return null for null content', () => {
      expect(autoMigrateDateCreatedNode(null)).toBeNull();
    });

    it('should return undefined for undefined content', () => {
      expect(autoMigrateDateCreatedNode(undefined)).toBeUndefined();
    });

    it('should return content unchanged if no dateCreated nodes exist', () => {
      const doc: RichContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Hello' }],
          },
        ],
      };

      const result = autoMigrateDateCreatedNode(doc);
      expect(result).toEqual(doc);
      expect(console.log).not.toHaveBeenCalled();
    });

    it('should migrate content if dateCreated nodes exist', () => {
      const doc: RichContent = {
        type: 'doc',
        content: [
          {
            type: 'dateCreated',
            attrs: { dateCreated: 1234567890 },
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Hello' }],
          },
        ],
      };

      const result = autoMigrateDateCreatedNode(doc);

      expect(result).toEqual({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Hello' }],
          },
        ],
      });

      expect(console.log).toHaveBeenCalledWith('[Migration] Found legacy dateCreated node, removing...');
      expect(console.log).toHaveBeenCalledWith('[Migration] DateCreated node removed successfully');
    });

    it('should handle complex documents with migration', () => {
      const doc: RichContent = {
        type: 'doc',
        content: [
          {
            type: 'dateCreated',
            attrs: { dateCreated: 1234567890 },
          },
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Title' }],
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Content paragraph 1' }],
          },
          {
            type: 'codeBlock',
            attrs: { language: 'javascript' },
            content: [{ type: 'text', text: 'console.log("hello")' }],
          },
        ],
      };

      const result = autoMigrateDateCreatedNode(doc);

      expect(result).toEqual({
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Title' }],
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Content paragraph 1' }],
          },
          {
            type: 'codeBlock',
            attrs: { language: 'javascript' },
            content: [{ type: 'text', text: 'console.log("hello")' }],
          },
        ],
      });
    });
  });
});

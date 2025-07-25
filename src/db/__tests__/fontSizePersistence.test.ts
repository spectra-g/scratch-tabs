import { Tab } from '../../types';

describe('Font Size Type Support', () => {
  describe('Tab interface with fontSize', () => {
    it('should support fontSize property', () => {
      const tab: Tab = {
        id: 'tab-1',
        title: 'Test Tab',
        content: 'test content',
        language: 'javascript',
        languageLocked: false,
        isTablet: false,
        fontSize: 16,
        workspaceId: 'workspace-1',
        dateCreated: 1000,
        lastModified: 2000,
        cursorPosition: { lineNumber: 1, column: 1 },
      };

      expect(tab.fontSize).toBe(16);
      expect(tab.id).toBe('tab-1');
      expect(tab.title).toBe('Test Tab');
    });

    it('should handle undefined fontSize', () => {
      const tab: Tab = {
        id: 'tab-1',
        title: 'Test Tab',
        content: 'test content',
        language: 'javascript',
        languageLocked: false,
        isTablet: false,
        fontSize: undefined,
        workspaceId: 'workspace-1',
        dateCreated: 1000,
        lastModified: 2000,
        cursorPosition: { lineNumber: 1, column: 1 },
      };

      expect(tab.fontSize).toBeUndefined();
    });

    it('should work with tablet tabs', () => {
      const tabletTab: Tab = {
        id: 'tablet-1',
        title: 'Tablet Tab',
        content: 'tablet content',
        language: 'plaintext',
        languageLocked: false,
        isTablet: true,
        fontSize: 18, // Can be stored but won't be used by UI
        workspaceId: 'workspace-1',
        dateCreated: 1000,
        lastModified: 2000,
        cursorPosition: { lineNumber: 1, column: 1 },
      };

      expect(tabletTab.isTablet).toBe(true);
      expect(tabletTab.fontSize).toBe(18);
    });
  });

  describe('Font size validation', () => {
    it('should accept valid font sizes', () => {
      const validSizes = [8, 10, 12, 14, 16, 18, 20, 22, 24];
      
      validSizes.forEach(size => {
        const tab: Tab = {
          id: `tab-${size}`,
          title: `Tab ${size}`,
          content: 'test content',
          language: 'javascript',
          languageLocked: false,
          isTablet: false,
          fontSize: size,
          workspaceId: 'workspace-1',
          dateCreated: 1000,
          lastModified: 2000,
          cursorPosition: { lineNumber: 1, column: 1 },
        };

        expect(tab.fontSize).toBe(size);
      });
    });

    it('should handle edge cases', () => {
      // Test with minimum valid size
      const minTab: Tab = {
        id: 'min-tab',
        title: 'Min Tab',
        content: 'test content',
        language: 'javascript',
        languageLocked: false,
        isTablet: false,
        fontSize: 8,
        workspaceId: 'workspace-1',
        dateCreated: 1000,
        lastModified: 2000,
        cursorPosition: { lineNumber: 1, column: 1 },
      };

      expect(minTab.fontSize).toBe(8);

      // Test with maximum valid size
      const maxTab: Tab = {
        id: 'max-tab',
        title: 'Max Tab',
        content: 'test content',
        language: 'javascript',
        languageLocked: false,
        isTablet: false,
        fontSize: 24,
        workspaceId: 'workspace-1',
        dateCreated: 1000,
        lastModified: 2000,
        cursorPosition: { lineNumber: 1, column: 1 },
      };

      expect(maxTab.fontSize).toBe(24);
    });
  });
}); 
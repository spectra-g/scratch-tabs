import { RichTextService } from '../services/RichTextService';
import { useTabsStore } from '../../../stores/tabsStore';
import { Tab } from '../../../types';

// Mock the stores
jest.mock('../../../stores/tabsStore', () => ({
  useTabsStore: {
    getState: jest.fn(),
  },
}));

const mockUseTabsStore = useTabsStore as jest.Mocked<typeof useTabsStore>;

describe('RichTextService', () => {
  const mockUpdateTabState = jest.fn();
  const mockTabs: Tab[] = [
    {
      id: 'tab-1',
      title: 'JavaScript Tab',
      content: 'console.log("hello");',
      richContent: null,
      language: 'javascript',
      languageLocked: false,
      isRich: false,
      backgroundTexture: null,
      isTablet: false,
      tabletState: '',
      cursorPosition: { lineNumber: 1, column: 1 },
      dateCreated: Date.now(),
      lastModified: Date.now(),
      workspaceId: 'workspace-1',
    },
    {
      id: 'tab-2',
      title: 'Rich Text Tab',
      content: 'plain text content',
      richContent: { type: 'doc', content: [] },
      language: 'plaintext',
      languageLocked: false,
      isRich: true,
      backgroundTexture: 'paper',
      isTablet: false,
      tabletState: '',
      cursorPosition: { lineNumber: 1, column: 1 },
      dateCreated: Date.now(),
      lastModified: Date.now(),
      workspaceId: 'workspace-1',
    },
    {
      id: 'tab-3',
      title: 'Tablet Tab',
      content: '',
      richContent: null,
      language: 'plaintext',
      languageLocked: false,
      isRich: false,
      backgroundTexture: null,
      isTablet: true,
      tabletState: '{}',
      cursorPosition: { lineNumber: 1, column: 1 },
      dateCreated: Date.now(),
      lastModified: Date.now(),
      workspaceId: 'workspace-1',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    (mockUseTabsStore.getState as jest.Mock).mockReturnValue({
      tabs: mockTabs,
      updateTabState: mockUpdateTabState,
    });
  });

  describe('getImportableTabs', () => {
    it('should return tabs that can be imported', () => {
      const result = RichTextService.getImportableTabs('tab-2');
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('tab-1');
      expect(result[0].title).toBe('JavaScript Tab');
    });

    it('should exclude current tab', () => {
      const result = RichTextService.getImportableTabs('tab-1');
      
      expect(result.find(tab => tab.id === 'tab-1')).toBeUndefined();
    });

    it('should exclude tablet tabs', () => {
      const result = RichTextService.getImportableTabs('tab-1');
      
      expect(result.find(tab => tab.isTablet)).toBeUndefined();
    });

    it('should exclude tabs with no content', () => {
      const tabsWithEmptyContent = [
        ...mockTabs,
        {
          id: 'empty-tab',
          title: 'Empty Tab',
          content: '',
          richContent: null,
          language: 'plaintext',
          languageLocked: false,
          isRich: false,
          backgroundTexture: null,
          isTablet: false,
          tabletState: '',
          cursorPosition: { lineNumber: 1, column: 1 },
          dateCreated: Date.now(),
          lastModified: Date.now(),
          workspaceId: 'workspace-1',
        },
      ];

      (mockUseTabsStore.getState as jest.Mock).mockReturnValue({
        tabs: tabsWithEmptyContent,
        updateTabState: mockUpdateTabState,
      });

      const result = RichTextService.getImportableTabs('tab-1');
      
      expect(result.find(tab => tab.id === 'empty-tab')).toBeUndefined();
    });
  });

  describe('canUpgradeToRichText', () => {
    it('should return true for plain text tabs', () => {
      const tab = mockTabs[0]; // JavaScript tab (not rich, not tablet)
      expect(RichTextService.canUpgradeToRichText(tab)).toBe(true);
    });

    it('should return false for rich text tabs', () => {
      const tab = mockTabs[1]; // Rich text tab
      expect(RichTextService.canUpgradeToRichText(tab)).toBe(false);
    });

    it('should return false for tablet tabs', () => {
      const tab = mockTabs[2]; // Tablet tab
      expect(RichTextService.canUpgradeToRichText(tab)).toBe(false);
    });
  });

  describe('canDowngradeToPlainText', () => {
    it('should return true for rich text tabs', () => {
      const tab = mockTabs[1]; // Rich text tab
      expect(RichTextService.canDowngradeToPlainText(tab)).toBe(true);
    });

    it('should return false for plain text tabs', () => {
      const tab = mockTabs[0]; // JavaScript tab (not rich)
      expect(RichTextService.canDowngradeToPlainText(tab)).toBe(false);
    });

    it('should return false for tablet tabs', () => {
      const tab = mockTabs[2]; // Tablet tab
      expect(RichTextService.canDowngradeToPlainText(tab)).toBe(false);
    });
  });

  describe('setBackgroundTexture', () => {
    it('should update background texture', () => {
      RichTextService.setBackgroundTexture('tab-1', 'paper');
      
      expect(mockUpdateTabState).toHaveBeenCalledWith('tab-1', {
        backgroundTexture: 'paper',
        lastModified: expect.any(Number),
      });
    });

    it('should clear background texture when set to null', () => {
      RichTextService.setBackgroundTexture('tab-1', null);
      
      expect(mockUpdateTabState).toHaveBeenCalledWith('tab-1', {
        backgroundTexture: null,
        lastModified: expect.any(Number),
      });
    });
  });
});
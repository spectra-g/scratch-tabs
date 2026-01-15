import { renderHook, waitFor } from '@testing-library/react';
import { useCursorPosition, useStatusBarLogic } from '../useStatusBarLogic';
import { tabletRegistry } from '../../../tablets';
import { formatRegistry } from '../../../formats';

// Mock the tablets registry
jest.mock('../../../tablets', () => ({
  tabletRegistry: {
    getById: jest.fn(),
  },
}));

// Mock the format registry
jest.mock('../../../formats', () => ({
  formatRegistry: {
    getById: jest.fn(),
  },
}));

// Mock format detection utils
jest.mock('../../../utils/formatDetectionUtils', () => ({
  getTabContentForLanguageDetection: jest.fn((tab) => tab?.content?.slice(0, 100) || ''),
}));

// Mock FormatStatusItems
jest.mock('../FormatStatusItems', () => ({
  getFormatStatusItem: jest.fn(() => null),
}));

describe('useCursorPosition', () => {
  const createMockEditor = (initialPosition = { lineNumber: 1, column: 1 }) => {
    let listeners: ((e: any) => void)[] = [];
    return {
      getPosition: jest.fn(() => initialPosition),
      onDidChangeCursorPosition: jest.fn((callback) => {
        listeners.push(callback);
        return {
          dispose: jest.fn(() => {
            listeners = listeners.filter(l => l !== callback);
          }),
        };
      }),
      // Helper to trigger cursor change
      _triggerCursorChange: (position: { lineNumber: number; column: number }) => {
        listeners.forEach(l => l({ position }));
      },
    };
  };

  it('should return default position when editor is null', () => {
    const { result } = renderHook(() => useCursorPosition(null));

    expect(result.current).toEqual({ lineNumber: 1, column: 1 });
  });

  it('should return initial cursor position from editor', () => {
    const mockEditor = createMockEditor({ lineNumber: 5, column: 10 });

    const { result } = renderHook(() => useCursorPosition(mockEditor as any));

    expect(result.current).toEqual({ lineNumber: 5, column: 10 });
  });

  it('should update when cursor position changes', async () => {
    const mockEditor = createMockEditor({ lineNumber: 1, column: 1 });

    const { result } = renderHook(() => useCursorPosition(mockEditor as any));

    expect(result.current).toEqual({ lineNumber: 1, column: 1 });

    // Trigger cursor change
    mockEditor._triggerCursorChange({ lineNumber: 10, column: 25 });

    await waitFor(() => {
      expect(result.current).toEqual({ lineNumber: 10, column: 25 });
    });
  });

  it('should cleanup listener on unmount', () => {
    const disposeFn = jest.fn();
    const mockEditor = {
      getPosition: jest.fn(() => ({ lineNumber: 1, column: 1 })),
      onDidChangeCursorPosition: jest.fn(() => ({
        dispose: disposeFn,
      })),
    };

    const { unmount } = renderHook(() => useCursorPosition(mockEditor as any));

    // Verify listener was set up
    expect(mockEditor.onDidChangeCursorPosition).toHaveBeenCalled();

    unmount();

    // The dispose should have been called on cleanup
    expect(disposeFn).toHaveBeenCalled();
  });
});

describe('useStatusBarLogic', () => {
  const createMockTab = (overrides = {}) => ({
    id: 'tab-1',
    title: 'Test Tab',
    content: 'test content here',
    language: 'javascript',
    languageLocked: false,
    isTablet: false,
    isRich: false,
    workspaceId: 'workspace-1',
    dateCreated: Date.now(),
    lastModified: Date.now(),
    cursorPosition: { lineNumber: 1, column: 1 },
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('tabletLabel', () => {
    it('should return empty string for non-tablet tabs', () => {
      const { result } = renderHook(() =>
        useStatusBarLogic({ activeTab: createMockTab() })
      );

      expect(result.current.tabletLabel).toBe('');
    });

    it('should resolve tablet label for tablet tabs', async () => {
      const mockTablet = { label: 'Calculator' };
      (tabletRegistry.getById as jest.Mock).mockResolvedValue(mockTablet);

      const { result } = renderHook(() =>
        useStatusBarLogic({
          activeTab: createMockTab({
            isTablet: true,
            tabletState: JSON.stringify({ type: 'calculator' }),
          }),
        })
      );

      await waitFor(() => {
        expect(result.current.tabletLabel).toBe('Calculator');
      });
    });

    it('should handle tablet state parse errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() =>
        useStatusBarLogic({
          activeTab: createMockTab({
            isTablet: true,
            tabletState: 'invalid json',
          }),
        })
      );

      await waitFor(() => {
        expect(result.current.tabletLabel).toBe('');
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error parsing tablet state:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('contentSample', () => {
    it('should return empty string for tablet tabs', () => {
      const { result } = renderHook(() =>
        useStatusBarLogic({
          activeTab: createMockTab({ isTablet: true }),
        })
      );

      expect(result.current.contentSample).toBe('');
    });

    it('should return empty string for rich text tabs', () => {
      const { result } = renderHook(() =>
        useStatusBarLogic({
          activeTab: createMockTab({ isRich: true }),
        })
      );

      expect(result.current.contentSample).toBe('');
    });

    it('should return content sample for regular tabs', () => {
      const { result } = renderHook(() =>
        useStatusBarLogic({
          activeTab: createMockTab({ content: 'some code content' }),
        })
      );

      expect(result.current.contentSample).toBe('some code content');
    });
  });

  describe('statusBarItems', () => {
    it('should return empty array for tablet tabs', () => {
      const { result } = renderHook(() =>
        useStatusBarLogic({
          activeTab: createMockTab({ isTablet: true }),
        })
      );

      expect(result.current.statusBarItems).toEqual([]);
    });

    it('should return empty array for rich text tabs', () => {
      const { result } = renderHook(() =>
        useStatusBarLogic({
          activeTab: createMockTab({ isRich: true }),
        })
      );

      expect(result.current.statusBarItems).toEqual([]);
    });

    it('should return format-specific status bar items', () => {
      const mockModule = {
        getStatusBarItems: jest.fn(() => [
          { id: 'item-1', component: () => null, priority: 1 },
          { id: 'item-2', component: () => null, priority: 2 },
        ]),
      };
      (formatRegistry.getById as jest.Mock).mockReturnValue(mockModule);

      const { result } = renderHook(() =>
        useStatusBarLogic({
          activeTab: createMockTab({ language: 'json' }),
        })
      );

      expect(result.current.statusBarItems).toHaveLength(2);
      expect(result.current.statusBarItems[0].id).toBe('item-1');
    });

    it('should sort status bar items by priority', () => {
      const mockModule = {
        getStatusBarItems: jest.fn(() => [
          { id: 'item-high', component: () => null, priority: 10 },
          { id: 'item-low', component: () => null, priority: 1 },
        ]),
      };
      (formatRegistry.getById as jest.Mock).mockReturnValue(mockModule);

      const { result } = renderHook(() =>
        useStatusBarLogic({
          activeTab: createMockTab({ language: 'json' }),
        })
      );

      expect(result.current.statusBarItems[0].id).toBe('item-low');
      expect(result.current.statusBarItems[1].id).toBe('item-high');
    });
  });

  describe('languageForOptions', () => {
    it('should return null for tablet tabs', () => {
      const { result } = renderHook(() =>
        useStatusBarLogic({
          activeTab: createMockTab({ isTablet: true }),
        })
      );

      expect(result.current.languageForOptions).toBeNull();
    });

    it('should return null for rich text tabs', () => {
      const { result } = renderHook(() =>
        useStatusBarLogic({
          activeTab: createMockTab({ isRich: true }),
        })
      );

      expect(result.current.languageForOptions).toBeNull();
    });

    it('should return language for regular tabs', () => {
      const { result } = renderHook(() =>
        useStatusBarLogic({
          activeTab: createMockTab({ language: 'typescript' }),
        })
      );

      expect(result.current.languageForOptions).toBe('typescript');
    });
  });

  describe('null activeTab handling', () => {
    it('should handle null activeTab gracefully', () => {
      const { result } = renderHook(() =>
        useStatusBarLogic({ activeTab: null as any })
      );

      expect(result.current.tabletLabel).toBe('');
      expect(result.current.contentSample).toBe('');
      expect(result.current.statusBarItems).toEqual([]);
      expect(result.current.languageForOptions).toBeNull();
    });
  });
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StatusBar } from '../index';
import { useTabsStore } from '../../../stores/tabsStore';
import { useRootStore } from '../../../stores/rootStore';
import { useSplitViewStore } from '../../../stores/splitViewStore';
import { useSearchStore } from '../../../stores/searchStore';

// Mock the stores
jest.mock('../../../stores/tabsStore');
jest.mock('../../../stores/rootStore');
jest.mock('../../../stores/splitViewStore');
jest.mock('../../../stores/searchStore');

// Mock the FontSizeControls component
jest.mock('../FontSizeControls', () => ({
  FontSizeControls: ({ editor, isTablet, activeTabId }: any) => (
    <div data-testid="font-size-controls" data-editor={!!editor} data-tablet={isTablet} data-tab-id={activeTabId}>
      Font Size Controls
    </div>
  ),
}));

// Mock other components that might be imported
jest.mock('../FormatStatusItems', () => ({
  getFormatStatusItem: jest.fn(() => null),
  getFormatOptionsMenu: jest.fn(() => null),
}));

jest.mock('../LanguageSelectionPopup', () => ({
  LanguageSelectionPopup: () => <div data-testid="language-popup">Language Popup</div>,
}));

jest.mock('../SmartViewButtons', () => ({
  SmartViewButtons: () => <div data-testid="smart-view-buttons">Smart View Buttons</div>,
}));

jest.mock('../../AI/AIStatusIcon', () => ({
  AIStatusIcon: () => <div data-testid="ai-status-icon">AI Status Icon</div>,
}));

jest.mock('../../Macro', () => ({
  Macro: () => <div data-testid="macro">Macro</div>,
}));

jest.mock('../../../hooks/useIsMobile', () => ({
  useIsMobile: jest.fn(() => false),
}));

jest.mock('../../../formats', () => ({
  formatRegistry: {
    getById: jest.fn(() => null),
  },
  getPotentialFormatMatches: jest.fn(() => []),
}));

jest.mock('../../../tablets', () => ({
  tabletRegistry: {
    getById: jest.fn(() => null),
  },
}));

describe('StatusBar - Font Size Controls Integration', () => {
  const mockToggleSearch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock useTabsStore
    (useTabsStore as any).mockReturnValue({
      tabs: [
        {
          id: 'tab-1',
          title: 'Editor Tab',
          content: 'editor content',
          language: 'javascript',
          languageLocked: false,
          isTablet: false,
          fontSize: 16,
          workspaceId: 'workspace-1',
          dateCreated: Date.now(),
          lastModified: Date.now(),
          cursorPosition: { lineNumber: 1, column: 1 },
        },
        {
          id: 'tab-2',
          title: 'Tablet Tab',
          content: 'tablet content',
          language: 'plaintext',
          languageLocked: false,
          isTablet: true,
          fontSize: 18,
          workspaceId: 'workspace-1',
          dateCreated: Date.now(),
          lastModified: Date.now(),
          cursorPosition: { lineNumber: 1, column: 1 },
        },
      ],
    });

    // Mock useSplitViewStore
    (useSplitViewStore as any).mockReturnValue({
      splitView: {
        isSplit: false,
        activeLeftTabId: 'tab-1',
        activeRightTabId: null,
      },
    });

    // Mock useRootStore
    (useRootStore as any).mockReturnValue({
      updateTabLanguage: jest.fn(),
    });

    // Mock useSearchStore
    (useSearchStore as any).mockReturnValue({
      toggleSearch: mockToggleSearch,
    });
  });

  describe('FontSizeControls rendering', () => {
    it('should render FontSizeControls for editor tabs', () => {
      const mockEditor = {
        updateOptions: jest.fn(),
        getOption: jest.fn(),
        getPosition: jest.fn(() => ({ lineNumber: 1, column: 1 })),
        onDidChangeCursorPosition: jest.fn(() => ({ dispose: jest.fn() })),
      } as any;

      render(
        <StatusBar
          editor={mockEditor}
          activeTab={{
            id: 'tab-1',
            title: 'Editor Tab',
            content: 'editor content',
            language: 'javascript',
            languageLocked: false,
            isTablet: false,
            fontSize: 16,
            workspaceId: 'workspace-1',
            dateCreated: Date.now(),
            lastModified: Date.now(),
            cursorPosition: { lineNumber: 1, column: 1 },
          }}
          side="left"
        />
      );

      const fontSizeControls = screen.getByTestId('font-size-controls');
      expect(fontSizeControls).toBeInTheDocument();
      expect(fontSizeControls).toHaveAttribute('data-editor', 'true');
      expect(fontSizeControls).toHaveAttribute('data-tablet', 'false');
      expect(fontSizeControls).toHaveAttribute('data-tab-id', 'tab-1');
    });

    it('should render FontSizeControls for tablet tabs but with tablet flag', () => {
      const mockEditor = {
        updateOptions: jest.fn(),
        getOption: jest.fn(),
        getPosition: jest.fn(() => ({ lineNumber: 1, column: 1 })),
        onDidChangeCursorPosition: jest.fn(() => ({ dispose: jest.fn() })),
      } as any;

      render(
        <StatusBar
          editor={mockEditor}
          activeTab={{
            id: 'tab-2',
            title: 'Tablet Tab',
            content: 'tablet content',
            language: 'plaintext',
            languageLocked: false,
            isTablet: true,
            fontSize: 18,
            workspaceId: 'workspace-1',
            dateCreated: Date.now(),
            lastModified: Date.now(),
            cursorPosition: { lineNumber: 1, column: 1 },
          }}
          side="left"
        />
      );

      const fontSizeControls = screen.getByTestId('font-size-controls');
      expect(fontSizeControls).toBeInTheDocument();
      expect(fontSizeControls).toHaveAttribute('data-editor', 'true');
      expect(fontSizeControls).toHaveAttribute('data-tablet', 'true');
      expect(fontSizeControls).toHaveAttribute('data-tab-id', 'tab-2');
    });

    it('should handle null editor gracefully', () => {
      render(
        <StatusBar
          editor={null}
          activeTab={{
            id: 'tab-1',
            title: 'Editor Tab',
            content: 'editor content',
            language: 'javascript',
            languageLocked: false,
            isTablet: false,
            fontSize: 16,
            workspaceId: 'workspace-1',
            dateCreated: Date.now(),
            lastModified: Date.now(),
            cursorPosition: { lineNumber: 1, column: 1 },
          }}
          side="left"
        />
      );

      const fontSizeControls = screen.getByTestId('font-size-controls');
      expect(fontSizeControls).toBeInTheDocument();
      expect(fontSizeControls).toHaveAttribute('data-editor', 'false');
    });

    it('should handle missing active tab gracefully', () => {
      const mockEditor = {
        updateOptions: jest.fn(),
        getOption: jest.fn(),
        getPosition: jest.fn(() => ({ lineNumber: 1, column: 1 })),
        onDidChangeCursorPosition: jest.fn(() => ({ dispose: jest.fn() })),
      } as any;

      render(
        <StatusBar
          editor={mockEditor}
          activeTab={{
            id: 'missing-tab',
            title: 'Missing Tab',
            content: '',
            language: 'plaintext',
            languageLocked: false,
            isTablet: false,
            fontSize: undefined,
            workspaceId: 'workspace-1',
            dateCreated: Date.now(),
            lastModified: Date.now(),
            cursorPosition: { lineNumber: 1, column: 1 },
          }}
          side="left"
        />
      );

      // Should still render the status bar
      expect(screen.getByTestId('font-size-controls')).toBeInTheDocument();
    });
  });

  describe('Status bar layout', () => {
    it('should maintain proper layout with FontSizeControls', () => {
      const mockEditor = {
        updateOptions: jest.fn(),
        getOption: jest.fn(),
        getPosition: jest.fn(() => ({ lineNumber: 1, column: 1 })),
        onDidChangeCursorPosition: jest.fn(() => ({ dispose: jest.fn() })),
      } as any;

      render(
        <StatusBar
          editor={mockEditor}
          activeTab={{
            id: 'tab-1',
            title: 'Editor Tab',
            content: 'editor content',
            language: 'javascript',
            languageLocked: false,
            isTablet: false,
            fontSize: 16,
            workspaceId: 'workspace-1',
            dateCreated: Date.now(),
            lastModified: Date.now(),
            cursorPosition: { lineNumber: 1, column: 1 },
          }}
          side="left"
        />
      );

      // Check that the status bar is rendered
      expect(screen.getByTestId('status-bar')).toBeInTheDocument();
      
      // Check that FontSizeControls is rendered
      expect(screen.getByTestId('font-size-controls')).toBeInTheDocument();
    });
  });

  describe('Side-specific behavior', () => {
    it('should work for left side', () => {
      const mockEditor = {
        updateOptions: jest.fn(),
        getOption: jest.fn(),
        getPosition: jest.fn(() => ({ lineNumber: 1, column: 1 })),
        onDidChangeCursorPosition: jest.fn(() => ({ dispose: jest.fn() })),
      } as any;

      render(
        <StatusBar
          editor={mockEditor}
          activeTab={{
            id: 'tab-1',
            title: 'Editor Tab',
            content: 'editor content',
            language: 'javascript',
            languageLocked: false,
            isTablet: false,
            fontSize: 16,
            workspaceId: 'workspace-1',
            dateCreated: Date.now(),
            lastModified: Date.now(),
            cursorPosition: { lineNumber: 1, column: 1 },
          }}
          side="left"
        />
      );

      expect(screen.getByTestId('font-size-controls')).toBeInTheDocument();
    });

    it('should work for right side', () => {
      const mockEditor = {
        updateOptions: jest.fn(),
        getOption: jest.fn(),
        getPosition: jest.fn(() => ({ lineNumber: 1, column: 1 })),
        onDidChangeCursorPosition: jest.fn(() => ({ dispose: jest.fn() })),
      } as any;

      render(
        <StatusBar
          editor={mockEditor}
          activeTab={{
            id: 'tab-1',
            title: 'Editor Tab',
            content: 'editor content',
            language: 'javascript',
            languageLocked: false,
            isTablet: false,
            fontSize: 16,
            workspaceId: 'workspace-1',
            dateCreated: Date.now(),
            lastModified: Date.now(),
            cursorPosition: { lineNumber: 1, column: 1 },
          }}
          side="right"
        />
      );

      expect(screen.getByTestId('font-size-controls')).toBeInTheDocument();
    });
  });
}); 
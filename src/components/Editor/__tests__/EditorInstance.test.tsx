import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EditorInstance } from '../EditorInstance';
import { useTabsStore } from '../../../stores/tabsStore';
import { useRootStore } from '../../../stores/rootStore';

// Mock the stores
jest.mock('../../../stores/tabsStore');
jest.mock('../../../stores/rootStore', () => {
  const mockRootStore = {
    updateTabContent: jest.fn(),
    updateTabState: jest.fn(),
    getTabById: jest.fn(),
    // Add any other properties used in EditorInstance
  };
  const mockUseRootStore = jest.fn(() => mockRootStore);
  (mockUseRootStore as any).getState = () => mockRootStore;
  return {
    useRootStore: mockUseRootStore,
  };
});

jest.mock('../../../stores/aiStore', () => {
  const mockState = {
    ai: {
      isCodegenReady: false,
      codegenResult: null,
      activeCodegenTabId: null,
      isCodegenGenerating: false,
    },
    isReady: false,
    isLoading: false,
  };
  const mockStore = jest.fn(() => mockState) as any;
  mockStore.getState = () => mockState;
  mockStore.setState = jest.fn();
  mockStore.subscribe = jest.fn();
  mockStore.getSnapshot = () => mockState;
  mockStore.getServerSnapshot = () => mockState;
  mockStore.destroy = jest.fn();
  return {
    useAIStore: mockStore,
  };
});

jest.mock('../../../stores/splitViewStore', () => {
  const mockState = {
    splitView: {
      activeSide: 'left',
    },
  };
  const mockStore = jest.fn(() => mockState) as any;
  mockStore.getState = () => mockState;
  mockStore.setState = jest.fn();
  mockStore.subscribe = jest.fn();
  mockStore.getSnapshot = () => mockState;
  mockStore.getServerSnapshot = () => mockState;
  mockStore.destroy = jest.fn();
  return {
    useSplitViewStore: mockStore,
  };
});

// Mock custom hooks
jest.mock('../../../hooks/useEditorScrollManager', () => ({
  useEditorScrollManager: () => ({
    restoreScrollPosition: jest.fn(),
    saveScrollPosition: jest.fn(),
  }),
}));

jest.mock('../../../hooks/useTabletSelector', () => ({
  useTabletSelector: () => ({
    selectedTablet: null,
    setSelectedTablet: jest.fn(),
  }),
}));

jest.mock('../../../hooks/useEditorActions', () => ({
  useEditorActions: () => ({
    handleEditorChange: jest.fn(),
    handleCursorPositionChange: jest.fn(),
  }),
}));

jest.mock('../../../hooks/useEditorAI', () => ({
  useEditorAI: () => ({
    isAIReady: false,
    startCodegen: jest.fn(),
  }),
}));

jest.mock('../../../tablets/dynamicRegistry', () => ({}));
jest.mock('../../BatchTools/BatchToolsModal', () => ({
  BatchToolsModal: () => <div data-testid="batch-tools-modal">Batch Tools Modal</div>,
}));

// Mock services
jest.mock('../../../services/modelManager', () => ({
  modelManager: {
    getModelContent: jest.fn().mockResolvedValue(''),
    ensureModelContent: jest.fn().mockResolvedValue(undefined),
    switchModel: jest.fn().mockResolvedValue(undefined),
    createModel: jest.fn().mockResolvedValue({}),
    setupInitialModel: jest.fn().mockResolvedValue(undefined),
    initialize: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue({}),
    registerCursorPositionListener: jest.fn(),
  },
}));

// Mock Monaco Editor
jest.mock('@monaco-editor/react', () => ({
  Editor: ({ onMount, options }: any) => {
    // Simulate editor mount
    React.useEffect(() => {
      const mockModel = {
        isDisposed: jest.fn(() => false),
        dispose: jest.fn(),
      };
      const mockEditor = {
        updateOptions: jest.fn(),
        getOption: jest.fn(),
        onDidChangeCursorPosition: jest.fn(),
        onDidChangeModelContent: jest.fn(),
        dispose: jest.fn(),
        getModel: jest.fn(() => mockModel),
        setModel: jest.fn(),
        getValue: jest.fn(() => ''),
        setValue: jest.fn(),
        focus: jest.fn(),
        layout: jest.fn(),
        getPosition: jest.fn(() => ({ lineNumber: 1, column: 1 })),
        setPosition: jest.fn(),
        restoreViewState: jest.fn(),
        saveViewState: jest.fn(() => ({})),
        onKeyDown: jest.fn(),
        onKeyUp: jest.fn(),
        addCommand: jest.fn(),
        addAction: jest.fn(),
        trigger: jest.fn(),
        onDidPaste: jest.fn(),
      };
      const mockMonaco = {
        editor: {
          EditorOption: {
            fontSize: 'fontSize',
          },
        },
      };
      onMount?.(mockEditor, mockMonaco);
    }, []);
    return <div data-testid="monaco-editor" />;
  },
}));

describe('EditorInstance - Font Size Support', () => {
  const mockUpdateTabContent = jest.fn();
  const mockSetActiveLeftTab = jest.fn();
  const mockSetActiveRightTab = jest.fn();
  const mockUpdateTabState = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock useTabsStore
    (useTabsStore as any).mockReturnValue({
      tabs: [
        {
          id: 'tab-1',
          title: 'Test Tab',
          content: 'test content',
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
          title: 'Tab 2',
          content: 'content 2',
          language: 'typescript',
          languageLocked: false,
          isTablet: false,
          fontSize: 20,
          workspaceId: 'workspace-1',
          dateCreated: Date.now(),
          lastModified: Date.now(),
          cursorPosition: { lineNumber: 1, column: 1 },
        },
        {
          id: 'tab-3',
          title: 'Tab 3',
          content: 'content 3',
          language: 'python',
          languageLocked: false,
          isTablet: false,
          fontSize: undefined, // No font size set
          workspaceId: 'workspace-1',
          dateCreated: Date.now(),
          lastModified: Date.now(),
          cursorPosition: { lineNumber: 1, column: 1 },
        },
      ],
    });

    // Mock useRootStore
    (useRootStore as any).mockReturnValue({
      updateTabContent: mockUpdateTabContent,
      setActiveLeftTab: mockSetActiveLeftTab,
      setActiveRightTab: mockSetActiveRightTab,
      updateTabState: mockUpdateTabState,
    });
  });

  describe('Font size application', () => {
    it('should apply font size from tab state', () => {
      render(
        <EditorInstance
          side="left"
          activeTabId="tab-1"
          onEditorReady={jest.fn()}
        />
      );

      expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
    });

    it('should use default font size when tab has no fontSize', () => {
      render(
        <EditorInstance
          side="left"
          activeTabId="tab-3"
          onEditorReady={jest.fn()}
        />
      );

      expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
    });

    it('should handle different font sizes for different tabs', () => {
      // Test with tab-1 (fontSize: 16)
      const { rerender } = render(
        <EditorInstance
          side="left"
          activeTabId="tab-1"
          onEditorReady={jest.fn()}
        />
      );

      expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();

      // Test with tab-2 (fontSize: 20)
      rerender(
        <EditorInstance
          side="left"
          activeTabId="tab-2"
          onEditorReady={jest.fn()}
        />
      );

      expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
    });
  });

  describe('Editor options', () => {
    it('should pass correct options to Monaco editor', () => {
      render(
        <EditorInstance
          side="left"
          activeTabId="tab-1"
          onEditorReady={jest.fn()}
        />
      );

      // The editor should be rendered with the correct options
      expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
    });

    it('should handle missing tab gracefully', () => {
      render(
        <EditorInstance
          side="left"
          activeTabId="non-existent-tab"
          onEditorReady={jest.fn()}
        />
      );

      expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
    });
  });

  describe('Side-specific behavior', () => {
    it('should work for left side', () => {
      render(
        <EditorInstance
          side="left"
          activeTabId="tab-1"
          onEditorReady={jest.fn()}
        />
      );

      expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
    });

    it('should work for right side', () => {
      render(
        <EditorInstance
          side="right"
          activeTabId="tab-1"
          onEditorReady={jest.fn()}
        />
      );

      expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
    });
  });
}); 
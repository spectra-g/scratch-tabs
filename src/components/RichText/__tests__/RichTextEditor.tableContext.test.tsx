import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RichTextEditor } from '../RichTextEditor';
import { Tab } from '../../../types';

// Mock all the dependencies
jest.mock('../hooks/useRichTextEditor', () => ({
  useRichTextEditor: jest.fn(() => ({
    getJSON: jest.fn(() => ({})),
    chain: jest.fn(() => ({
      focus: jest.fn(() => ({
        setImage: jest.fn(() => ({ run: jest.fn() })),
      })),
    })),
    isActive: jest.fn(() => false),
    commands: {
      setSearchTerm: jest.fn(),
      goToNextSearchResult: jest.fn(),
      goToPreviousSearchResult: jest.fn(),
    },
    storage: {
      searchAndReplace: {
        results: [],
      },
    },
    on: jest.fn(),
    off: jest.fn(),
  })),
}));

jest.mock('../hooks/useImagePasteDetection', () => ({
  useImagePasteDetection: jest.fn(() => ({
    handlePaste: jest.fn(),
  })),
}));

jest.mock('../hooks/useTableKeyboardShortcuts', () => ({
  useTableKeyboardShortcuts: jest.fn(),
}));

jest.mock('@tiptap/react', () => ({
  EditorContent: ({ editor, className }: any) => (
    <div data-testid="editor-content" className={className}>
      Editor Content
    </div>
  ),
}));

jest.mock('../components/RichTextToolbar', () => ({
  RichTextToolbar: () => <div data-testid="toolbar">Toolbar</div>,
}));

jest.mock('../components/InlineSearchBar', () => ({
  InlineSearchBar: ({ isVisible, onClose, onOpen }: any) => (
    <div>
      {!isVisible && (
        <button title="Search (Ctrl+F)" onClick={onOpen} data-testid="search-button">
          Search
        </button>
      )}
      {isVisible && (
        <div data-testid="inline-search-bar">
          <button onClick={onClose} data-testid="close-search">Close</button>
        </div>
      )}
    </div>
  ),
}));

jest.mock('../components/LinkBubbleMenu', () => ({
  LinkBubbleMenu: () => <div data-testid="link-bubble">Link Bubble</div>,
}));

jest.mock('../components/TableContextMenu', () => ({
  TableContextMenu: ({ position, onClose }: any) => (
    <div 
      data-testid="table-context-menu" 
      style={{ top: position.y, left: position.x }}
    >
      <button onClick={onClose} data-testid="close-menu">Close</button>
    </div>
  ),
}));

jest.mock('../components/UpgradeConfirmationModal', () => ({
  UpgradeConfirmationModal: () => <div>Upgrade Modal</div>,
}));

jest.mock('../components/ImportCodeModal', () => ({
  ImportCodeModal: () => <div>Import Modal</div>,
}));

describe('RichTextEditor - Table Context Menu Integration', () => {
  const mockTab: Tab = {
    id: 'test-tab',
    title: 'Test Tab',
    content: 'Test content',
    language: 'markdown',
    isRich: true,
    richContent: {},
    dateCreated: Date.now(),
    lastModified: Date.now(),
    workspaceId: 'test-workspace',
    isPinned: false,
    languageLocked: false,
    cursorPosition: { lineNumber: 0, column: 0 },
  };

  const defaultProps = {
    tab: mockTab,
    onContentChange: jest.fn(),
    onUpgradeToRich: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not show table context menu initially', () => {
    render(<RichTextEditor {...defaultProps} />);
    
    expect(screen.queryByTestId('table-context-menu')).not.toBeInTheDocument();
  });

  it('should show table context menu when handleTableContextMenu is called', () => {
    const mockUseRichTextEditor = require('../hooks/useRichTextEditor').useRichTextEditor;
    let capturedContextMenuHandler: ((event: MouseEvent) => void) | null = null;
    
    mockUseRichTextEditor.mockImplementation(({ onTableContextMenu }: any) => {
      capturedContextMenuHandler = onTableContextMenu;
      return {
        getJSON: jest.fn(() => ({})),
        chain: jest.fn(() => ({
          focus: jest.fn(() => ({
            setImage: jest.fn(() => ({ run: jest.fn() })),
          })),
        })),
        isActive: jest.fn(() => false),
        commands: {},
        storage: { searchAndReplace: { results: [] } },
        on: jest.fn(),
        off: jest.fn(),
      };
    });

    render(<RichTextEditor {...defaultProps} />);
    
    // Simulate right-click at coordinates
    const mockEvent = {
      clientX: 150,
      clientY: 250,
    } as MouseEvent;
    
    if (capturedContextMenuHandler) {
      act(() => {
        capturedContextMenuHandler(mockEvent);
      });
    }

    expect(screen.getByTestId('table-context-menu')).toBeInTheDocument();
    expect(screen.getByTestId('table-context-menu')).toHaveStyle({
      top: '250px',
      left: '150px',
    });
  });

  it('should close table context menu when close button is clicked', () => {
    const mockUseRichTextEditor = require('../hooks/useRichTextEditor').useRichTextEditor;
    let capturedContextMenuHandler: ((event: MouseEvent) => void) | null = null;
    
    mockUseRichTextEditor.mockImplementation(({ onTableContextMenu }: any) => {
      capturedContextMenuHandler = onTableContextMenu;
      return {
        getJSON: jest.fn(() => ({})),
        chain: jest.fn(() => ({})),
        isActive: jest.fn(() => false),
        commands: {},
        storage: { searchAndReplace: { results: [] } },
        on: jest.fn(),
        off: jest.fn(),
      };
    });

    render(<RichTextEditor {...defaultProps} />);
    
    // Open the context menu
    if (capturedContextMenuHandler) {
      act(() => {
        capturedContextMenuHandler({ clientX: 100, clientY: 100 } as MouseEvent);
      });
    }
    
    expect(screen.getByTestId('table-context-menu')).toBeInTheDocument();
    
    // Close the context menu
    fireEvent.click(screen.getByTestId('close-menu'));
    
    expect(screen.queryByTestId('table-context-menu')).not.toBeInTheDocument();
  });

  it('should call useTableKeyboardShortcuts with the editor', () => {
    const mockUseTableKeyboardShortcuts = require('../hooks/useTableKeyboardShortcuts').useTableKeyboardShortcuts;
    const mockEditor = { test: 'editor' };
    
    const mockUseRichTextEditor = require('../hooks/useRichTextEditor').useRichTextEditor;
    mockUseRichTextEditor.mockReturnValue(mockEditor);
    
    render(<RichTextEditor {...defaultProps} />);
    
    expect(mockUseTableKeyboardShortcuts).toHaveBeenCalledWith({ editor: mockEditor });
  });

  it('should handle search keyboard shortcut', () => {
    render(<RichTextEditor {...defaultProps} />);
    
    // Initially search bar should not be visible
    expect(screen.queryByTestId('inline-search-bar')).not.toBeInTheDocument();
    
    // Simulate Ctrl+F
    fireEvent.keyDown(document, {
      key: 'f',
      ctrlKey: true,
    });
    
    expect(screen.getByTestId('inline-search-bar')).toBeInTheDocument();
  });

  it('should handle search keyboard shortcut with metaKey (Mac)', () => {
    render(<RichTextEditor {...defaultProps} />);
    
    // Simulate Cmd+F (Mac)
    fireEvent.keyDown(document, {
      key: 'f',
      metaKey: true,
    });
    
    expect(screen.getByTestId('inline-search-bar')).toBeInTheDocument();
  });
});
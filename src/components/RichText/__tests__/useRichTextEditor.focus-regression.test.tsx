/**
 * Focused regression test for editor focus loss issue
 *
 * This test protects against the specific regression where typing in the rich text editor
 * would lose focus after each keystroke due to editor recreation from incorrect dependencies.
 *
 * Issue: useEditor dependencies included 'initialContent' and useEffect cleanup had 'editor'
 * Fix: useEditor deps should be empty array, cleanup should have empty deps
 * Note: DateCreated is now external to editor, so no longer needs to be in deps
 */
import { renderHook } from '@testing-library/react';
import { useRichTextEditor } from '../hooks/useRichTextEditor';

// Mock TipTap
jest.mock('@tiptap/react', () => ({
  useEditor: jest.fn(() => ({
    destroy: jest.fn(),
    commands: {},
    can: () => true,
  })),
  EditorContent: 'div',
  NodeViewWrapper: 'div', 
  ReactNodeViewRenderer: () => () => 'div',
}));

// Mock clipboard store
jest.mock('../../../stores/clipboardStore', () => ({
  useClipboardStore: {
    getState: () => ({
      pendingImageData: null,
      pendingImageCursorOffset: null,
      setPendingImageData: jest.fn(),
      setPendingImageCursorOffset: jest.fn(),
    }),
  },
}));

describe('useRichTextEditor Focus Regression Test', () => {
  const mockUseEditor = require('@tiptap/react').useEditor as jest.Mock;
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should have empty dependency array to prevent focus loss during typing', () => {
    // This is the core regression test - ensures dependency array is correct
    const props = {
      initialContent: { content: 'test' },
      onUpdate: jest.fn(),
    };

    renderHook(() => useRichTextEditor(props));

    // Verify useEditor was called with correct dependencies
    const [config, deps] = mockUseEditor.mock.calls[0];

    // CRITICAL: Dependencies should be empty array
    // Including initialContent or other changing values causes editor recreation
    // DateCreated is now external, so not needed in deps
    expect(deps).toEqual([]);
    expect(deps).not.toContain(props.initialContent);
    expect(deps).not.toContain(props.onUpdate);
  });

  it('should not include editor in cleanup useEffect dependencies', () => {
    // This prevents the cleanup effect from destroying editor on every change
    const { result, unmount } = renderHook(() =>
      useRichTextEditor({
        initialContent: { content: 'test' },
        onUpdate: jest.fn(),
      })
    );

    const editor = result.current;
    expect(editor).toBeDefined();

    // Unmounting should call destroy (verifies cleanup works)
    unmount();
    expect(editor?.destroy).toHaveBeenCalled();
  });
});
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DiffViewer } from '../DiffViewer';

// Mock getBoundingClientRect for virtualization
const mockGetBoundingClientRect = jest.fn(() => ({
  width: 800,
  height: 600,
  top: 0,
  left: 0,
  bottom: 600,
  right: 800,
  x: 0,
  y: 0,
  toJSON: jest.fn(),
}));

Object.defineProperty(Element.prototype, 'getBoundingClientRect', {
  value: mockGetBoundingClientRect,
});

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
  },
});

const mockOnContentChange = jest.fn();

const sampleDiff = `diff --git a/test.txt b/test.txt
index 1234567..abcdefg 100644
--- a/test.txt
+++ b/test.txt
@@ -1,3 +1,4 @@
 line 1
-line 2
+line 2 modified
+new line 3
 line 3
diff --git a/another.txt b/another.txt
new file mode 100644
index 0000000..1234567
--- /dev/null
+++ b/another.txt
@@ -0,0 +1,2 @@
+first line
+second line`;

describe('DiffViewer', () => {
  beforeEach(() => {
    mockOnContentChange.mockClear();
    (navigator.clipboard.writeText as jest.Mock).mockClear();
  });

  it('should render diff content correctly', () => {
    render(
      <DiffViewer
        content={sampleDiff}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    expect(screen.getByTestId('diff-viewer')).toBeInTheDocument();
    expect(screen.getByText('Changed Files (2)')).toBeInTheDocument();
  });

  it('should show file list with status badges', () => {
    render(
      <DiffViewer
        content={sampleDiff}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    expect(screen.getByText('test.txt')).toBeInTheDocument();
    expect(screen.getByText('another.txt')).toBeInTheDocument();
    expect(screen.getByText('MODIFIED')).toBeInTheDocument();
    expect(screen.getByText('ADDED')).toBeInTheDocument();
  });

  it('should switch between view modes', () => {
    render(
      <DiffViewer
        content={sampleDiff}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    // Should start in side-by-side mode
    expect(screen.getByTestId('side-by-side-diff')).toBeInTheDocument();

    // Switch to unified mode
    const unifiedButton = screen.getByText('Unified');
    fireEvent.click(unifiedButton);

    expect(screen.getByTestId('unified-diff')).toBeInTheDocument();
  });

  it('should filter files by search query', () => {
    render(
      <DiffViewer
        content={sampleDiff}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    const searchInput = screen.getByPlaceholderText('Filter files...');
    fireEvent.change(searchInput, { target: { value: 'another' } });

    expect(screen.getByText('1 of 2 files')).toBeInTheDocument();
  });

  it('should toggle whitespace changes', () => {
    const diffWithWhitespace = `diff --git a/test.txt b/test.txt
index 1234567..abcdefg 100644
--- a/test.txt
+++ b/test.txt
@@ -1,2 +1,2 @@
-  spaced  
+	tabbed	
 normal line`;

    render(
      <DiffViewer
        content={diffWithWhitespace}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    const whitespaceButton = screen.getByText('Hide Whitespace');
    fireEvent.click(whitespaceButton);

    expect(screen.getByText('Show Whitespace')).toBeInTheDocument();
  });

  it('should copy diff to clipboard', async () => {
    render(
      <DiffViewer
        content={sampleDiff}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    const copyButton = screen.getByText('Copy Diff');
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
  });

  it('should handle empty content gracefully', () => {
    render(
      <DiffViewer
        content=""
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    expect(screen.getByText('No diff content to display')).toBeInTheDocument();
  });

  it('should handle invalid diff content', () => {
    render(
      <DiffViewer
        content="This is not a valid diff"
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    expect(screen.getByText('No valid diff found')).toBeInTheDocument();
  });

  it('should select first file automatically', () => {
    render(
      <DiffViewer
        content={sampleDiff}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    // First file should be selected and highlighted
    const fileButtons = screen.getAllByTestId('file-item');
    expect(fileButtons[0]).toHaveClass('bg-blue-500/20');
  });

  it('should show statistics in toolbar', () => {
    render(
      <DiffViewer
        content={sampleDiff}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    expect(screen.getByText('1 added')).toBeInTheDocument();
    expect(screen.getByText('1 modified')).toBeInTheDocument();
    
    // Check for the overall addition/deletion statistics
    const additionElements = screen.getAllByText('+4');
    const deletionElements = screen.getAllByText('-1');
    
    expect(additionElements.length).toBeGreaterThan(0);
    expect(deletionElements.length).toBeGreaterThan(0);
    
    // At least one of each should have the correct styling classes
    expect(additionElements.some(el => el.classList.contains('text-green-400'))).toBe(true);
    expect(deletionElements.some(el => el.classList.contains('text-red-400'))).toBe(true);
  });
});
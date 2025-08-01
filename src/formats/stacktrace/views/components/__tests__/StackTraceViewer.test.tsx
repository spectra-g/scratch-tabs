import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StackTraceViewer } from '../StackTraceViewer';
import { parseStackTrace } from '../../../utils/parser';

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

// Mock ResizeObserver for virtualization
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = MockResizeObserver;

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
  },
});

const mockOnContentChange = jest.fn();

const sampleJavaTrace = `Exception in thread "main" java.lang.NullPointerException: Cannot invoke "String.length()" because "str" is null
	at com.example.MyClass.processString(MyClass.java:15)
	at com.example.MyClass.main(MyClass.java:8)
	at java.base/java.lang.reflect.Method.invoke(Method.java:566)
	at java.base/sun.launcher.LauncherHelper.main(LauncherHelper.java:544)`;

const sampleJavaScriptTrace = `TypeError: Cannot read properties of undefined (reading 'length')
    at processItems (/app/src/utils/dataProcessor.js:42:23)
    at async Function.handleRequest (/app/src/controllers/itemController.js:156:12)
    at /app/node_modules/express/lib/router/layer.js:95:5`;

describe('StackTraceViewer', () => {
  beforeEach(() => {
    mockOnContentChange.mockClear();
    (navigator.clipboard.writeText as jest.Mock).mockClear();
  });

  it('should render stack trace content', () => {
    render(
      <StackTraceViewer
        content={sampleJavaTrace}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    expect(screen.getByTestId('stack-trace-viewer')).toBeInTheDocument();
    expect(screen.getByText(/NullPointerException/)).toBeInTheDocument();
  });

  it('should detect Java language correctly', () => {
    render(
      <StackTraceViewer
        content={sampleJavaTrace}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    expect(screen.getByText('java')).toBeInTheDocument();
  });

  it('should show frame statistics', () => {
    render(
      <StackTraceViewer
        content={sampleJavaTrace}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    expect(screen.getByText('4 total frames')).toBeInTheDocument();
    expect(screen.getByText(/library, \d+ user/)).toBeInTheDocument();
  });

  it('should toggle library frame visibility', () => {
    render(
      <StackTraceViewer
        content={sampleJavaTrace}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    const toggleButton = screen.getByText('Show Library Frames');
    fireEvent.click(toggleButton);

    expect(screen.getByText('Hide Library Frames')).toBeInTheDocument();
  });

  it('should filter frames by search query', () => {
    render(
      <StackTraceViewer
        content={sampleJavaTrace}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    const searchInput = screen.getByPlaceholderText('Filter frames...');
    fireEvent.change(searchInput, { target: { value: 'MyClass' } });

    expect(screen.getByDisplayValue('MyClass')).toBeInTheDocument();
  });

  it('should copy cleaned trace to clipboard', async () => {
    render(
      <StackTraceViewer
        content={sampleJavaTrace}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    const copyButton = screen.getByText('Copy Cleaned Trace');
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
  });

  it('should handle JavaScript stack traces', () => {
    render(
      <StackTraceViewer
        content={sampleJavaScriptTrace}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    expect(screen.getByText('javascript')).toBeInTheDocument();
    expect(screen.getByText(/TypeError/)).toBeInTheDocument();
  });

  it('should handle empty content gracefully', () => {
    render(
      <StackTraceViewer
        content=""
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    expect(screen.getByText('No stack trace content to display')).toBeInTheDocument();
  });

  it('should identify library frames correctly', () => {
    // Test the parsing logic directly to verify library frame detection
    const parsed = parseStackTrace(sampleJavaTrace);
    
    // Verify that we have the expected frames
    expect(parsed.frames).toHaveLength(4);
    
    // Check that the java.base/ frames are identified as library frames
    const libraryFrames = parsed.frames.filter(f => f.isLibraryFrame);
    expect(libraryFrames).toHaveLength(2);
    
    // Verify the specific library frames contain java.base module references
    expect(libraryFrames[0].methodName).toContain('java.base/');
    expect(libraryFrames[1].methodName).toContain('java.base/');
  });

  it('should clear search filter', () => {
    render(
      <StackTraceViewer
        content={sampleJavaTrace}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    const searchInput = screen.getByPlaceholderText('Filter frames...');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    const clearButton = screen.getByRole('button', { name: '' }); // X button
    fireEvent.click(clearButton);

    expect(searchInput).toHaveValue('');
  });
});
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StackFrameComponent } from '../StackFrameComponent';
import { StackFrame } from '../../utils/parser';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
  },
});

describe('StackFrameComponent', () => {
  beforeEach(() => {
    (navigator.clipboard.writeText as jest.Mock).mockClear();
  });

  const mockJavaFrame: StackFrame = {
    id: 'frame-1',
    raw: '	at com.example.MyClass.processString(MyClass.java:15)',
    filePath: 'MyClass.java',
    lineNumber: 15,
    methodName: 'com.example.MyClass.processString',
    className: 'com.example.MyClass',
    isLibraryFrame: false,
    language: 'java',
  };

  const mockLibraryFrame: StackFrame = {
    id: 'frame-2',
    raw: '	at java.base/java.lang.reflect.Method.invoke(Method.java:566)',
    filePath: 'Method.java',
    lineNumber: 566,
    methodName: 'java.base/java.lang.reflect.Method.invoke',
    isLibraryFrame: true,
    language: 'java',
  };

  const mockJavaScriptFrame: StackFrame = {
    id: 'frame-3',
    raw: '    at processItems (/app/src/utils/dataProcessor.js:42:23)',
    filePath: '/app/src/utils/dataProcessor.js',
    lineNumber: 42,
    columnNumber: 23,
    methodName: 'processItems',
    isLibraryFrame: false,
    language: 'javascript',
  };

  it('should render frame information correctly', () => {
    render(<StackFrameComponent frame={mockJavaFrame} index={0} />);

    expect(screen.getByText('1')).toBeInTheDocument(); // Frame index
    expect(screen.getByText('com.example.MyClass.processString')).toBeInTheDocument();
    expect(screen.getByText(/MyClass\.java:15/)).toBeInTheDocument();
  });

  it('should apply library frame styling', () => {
    render(<StackFrameComponent frame={mockLibraryFrame} index={1} />);

    const frameElement = screen.getByTestId('stack-frame');
    expect(frameElement).toHaveClass('opacity-60');
    expect(screen.getByText('Library/System Frame')).toBeInTheDocument();
  });

  it('should show language-specific color indicators', () => {
    const { rerender } = render(<StackFrameComponent frame={mockJavaFrame} index={0} />);
    
    // Java should have orange indicator
    expect(document.querySelector('.text-orange-400')).toBeInTheDocument();

    rerender(<StackFrameComponent frame={mockJavaScriptFrame} index={0} />);
    
    // JavaScript should have yellow indicator
    expect(document.querySelector('.text-yellow-400')).toBeInTheDocument();
  });

  it('should copy file location to clipboard when clicked', async () => {
    render(<StackFrameComponent frame={mockJavaScriptFrame} index={0} />);

    const fileButton = screen.getByTitle(/Copy.*dataProcessor\.js:42:23/);
    fireEvent.click(fileButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('/app/src/utils/dataProcessor.js:42:23');
    });
  });

  it('should copy entire frame when copy button is clicked', async () => {
    render(<StackFrameComponent frame={mockJavaFrame} index={0} />);

    const copyButton = screen.getByTitle('Copy frame to clipboard');
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockJavaFrame.raw);
    });
  });

  it('should handle frames without file path', () => {
    const frameWithoutFile: StackFrame = {
      id: 'frame-4',
      raw: '    at <anonymous>',
      methodName: '<anonymous>',
      isLibraryFrame: false,
      language: 'javascript',
    };

    render(<StackFrameComponent frame={frameWithoutFile} index={0} />);

    expect(screen.getByText('<anonymous>')).toBeInTheDocument();
    expect(screen.queryByTitle(/Copy.*to clipboard/)).not.toBeInTheDocument();
  });

  it('should show column numbers for JavaScript frames', () => {
    render(<StackFrameComponent frame={mockJavaScriptFrame} index={0} />);

    expect(screen.getByText(/42/)).toBeInTheDocument(); // Line number
    expect(screen.getByText(/23/)).toBeInTheDocument(); // Column number
  });

  it('should show class name when different from method name', () => {
    render(<StackFrameComponent frame={mockJavaFrame} index={0} />);

    expect(screen.getByText(/in com\.example\.MyClass/)).toBeInTheDocument();
  });
});
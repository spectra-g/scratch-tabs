import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WordCountInput } from '../WordCountInput';

// Mock the useDebounce hook to call immediately
jest.mock('../../../../hooks/useDebounce', () => ({
  useDebounce: (fn: Function, delay: number) => fn,
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    readText: jest.fn(),
  },
});

// Mock the stores to avoid dependency issues
jest.mock('../../../../stores', () => ({
  useRootStore: () => ({
    addBackgroundTab: jest.fn(),
  }),
}));

jest.mock('../../../../stores/workspaceStore', () => ({
  useWorkspaceStore: () => ({
    activeWorkspaceId: 'test-workspace',
  }),
}));

// Remove the inline mock to use the external mock file

// Mock the context hook
jest.mock('../../../bridge/context', () => ({
  useTabletContext: jest.fn(() => ({
    tabId: 'test-tab-id',
  })),
  TabletContextProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('WordCountInput', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should clear text when clear button is clicked', async () => {
    render(<WordCountInput value="Some text" onChange={mockOnChange} />);

    const clearButton = screen.getByTitle('Clear text');
    fireEvent.click(clearButton);

    // Wait for the onChange to be called
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith('');
    });
  });

  it('should disable clear button when text is empty', () => {
    render(<WordCountInput value="" onChange={mockOnChange} />);

    const clearButton = screen.getByTitle('Clear text');
    expect(clearButton).toBeDisabled();
  });

  it('should enable clear button when text is present', () => {
    render(<WordCountInput value="Some text" onChange={mockOnChange} />);

    const clearButton = screen.getByTitle('Clear text');
    expect(clearButton).not.toBeDisabled();
  });

  it('should handle paste from clipboard', async () => {
    const clipboardText = 'Pasted content';
    (navigator.clipboard.readText as jest.Mock).mockResolvedValue(clipboardText);

    render(<WordCountInput value="" onChange={mockOnChange} />);

    const pasteButton = screen.getByTitle('Paste from clipboard');
    fireEvent.click(pasteButton);

    // Wait for the onChange to be called
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(clipboardText);
    });
  });

  it('should handle clipboard paste error gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    (navigator.clipboard.readText as jest.Mock).mockRejectedValue(new Error('Clipboard error'));

    render(<WordCountInput value="" onChange={mockOnChange} />);

    const pasteButton = screen.getByTitle('Paste from clipboard');
    fireEvent.click(pasteButton);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to read clipboard:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });
});
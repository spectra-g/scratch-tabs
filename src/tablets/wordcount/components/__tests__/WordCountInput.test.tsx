import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WordCountInput } from '../WordCountInput';

// Mock the useDebounce hook
jest.mock('../../../../hooks/useDebounce', () => ({
  useDebounce: (fn: Function, delay: number) => fn,
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    readText: jest.fn(),
  },
});

describe('WordCountInput', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render textarea with placeholder', () => {
    render(<WordCountInput value="" onChange={mockOnChange} />);
    
    expect(screen.getByPlaceholderText('Enter or paste your text here to analyze...')).toBeInTheDocument();
  });

  it('should display current value', () => {
    const testValue = 'Hello world';
    render(<WordCountInput value={testValue} onChange={mockOnChange} />);
    
    expect(screen.getByDisplayValue(testValue)).toBeInTheDocument();
  });

  it('should call onChange when text is typed', () => {
    render(<WordCountInput value="" onChange={mockOnChange} />);
    
    const textarea = screen.getByPlaceholderText('Enter or paste your text here to analyze...');
    fireEvent.change(textarea, { target: { value: 'New text' } });
    
    expect(mockOnChange).toHaveBeenCalledWith('New text');
  });

  it('should show character count when text is present', () => {
    const testValue = 'Hello';
    render(<WordCountInput value={testValue} onChange={mockOnChange} />);
    
    expect(screen.getByText('5 characters')).toBeInTheDocument();
  });

  it('should not show character count when text is empty', () => {
    render(<WordCountInput value="" onChange={mockOnChange} />);
    
    expect(screen.queryByText(/characters/)).not.toBeInTheDocument();
  });

  it('should handle paste from clipboard', async () => {
    const clipboardText = 'Pasted content';
    (navigator.clipboard.readText as jest.Mock).mockResolvedValue(clipboardText);
    
    render(<WordCountInput value="" onChange={mockOnChange} />);
    
    const pasteButton = screen.getByTitle('Paste from clipboard');
    fireEvent.click(pasteButton);
    
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(clipboardText);
    });
  });

  it('should handle clipboard paste error gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (navigator.clipboard.readText as jest.Mock).mockRejectedValue(new Error('Clipboard error'));
    
    render(<WordCountInput value="" onChange={mockOnChange} />);
    
    const pasteButton = screen.getByTitle('Paste from clipboard');
    fireEvent.click(pasteButton);
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to read clipboard:', expect.any(Error));
    });
    
    consoleSpy.mockRestore();
  });

  it('should clear text when clear button is clicked', () => {
    render(<WordCountInput value="Some text" onChange={mockOnChange} />);
    
    const clearButton = screen.getByTitle('Clear text');
    fireEvent.click(clearButton);
    
    expect(mockOnChange).toHaveBeenCalledWith('');
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
});
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WordCountTablet } from '../WordCountTablet';

// Mock the useDebounce hook
jest.mock('../../../hooks/useDebounce', () => ({
  useDebounce: (fn: Function, delay: number) => fn,
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    readText: jest.fn(),
  },
});

describe('WordCountTablet', () => {
  describe('tablet interface', () => {
    it('should have correct tablet properties', () => {
      expect(WordCountTablet.id).toBe('wordcount');
      expect(WordCountTablet.label).toBe('Word Count');
      expect(WordCountTablet.keywords).toContain('word');
      expect(WordCountTablet.keywords).toContain('count');
      expect(WordCountTablet.keywords).toContain('text');
    });

    it('should create initial state correctly', () => {
      const state = WordCountTablet.createInitialState();
      
      expect(state).toEqual({
        type: 'wordcount',
        data: {
          text: '',
        },
      });
    });

    it('should serialize state correctly', () => {
      const state = WordCountTablet.createInitialState();
      state.data.text = 'Test content';
      
      const serialized = WordCountTablet.serializeState(state);
      const parsed = JSON.parse(serialized);
      
      expect(parsed.type).toBe('wordcount');
      expect(parsed.data.text).toBe('Test content');
    });

    it('should deserialize valid state correctly', () => {
      const originalState = WordCountTablet.createInitialState();
      originalState.data.text = 'Test content';
      
      const serialized = JSON.stringify(originalState);
      const deserialized = WordCountTablet.deserializeState(serialized);
      
      expect(deserialized).toEqual(originalState);
    });

    it('should handle invalid JSON gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = WordCountTablet.deserializeState('invalid json');
      
      expect(result).toEqual(WordCountTablet.createInitialState());
      expect(consoleSpy).toHaveBeenCalledWith('Failed to deserialize word count state:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should handle malformed state gracefully', () => {
      const result = WordCountTablet.deserializeState('{"type":"wrong"}');
      
      expect(result).toEqual(WordCountTablet.createInitialState());
    });
  });

  describe('component rendering', () => {
    it('should render word count header', () => {
      const state = WordCountTablet.createInitialState();
      const mockOnChange = jest.fn();
      
      render(WordCountTablet.render(state, mockOnChange));
      
      expect(screen.getByText('Word Count')).toBeInTheDocument();
      expect(screen.getByText('Comprehensive text analysis and statistics')).toBeInTheDocument();
    });

    it('should show empty state when no text', () => {
      const state = WordCountTablet.createInitialState();
      const mockOnChange = jest.fn();
      
      render(WordCountTablet.render(state, mockOnChange));
      
      expect(screen.getByText('No Text to Analyze')).toBeInTheDocument();
      expect(screen.getByText('Enter or paste some text above to see detailed statistics and analysis.')).toBeInTheDocument();
    });

    it('should show stats when text is present', () => {
      const state = WordCountTablet.createInitialState();
      state.data.text = 'Hello world. This is a test.';
      const mockOnChange = jest.fn();
      
      render(WordCountTablet.render(state, mockOnChange));
      
      expect(screen.getByText('Core Counts')).toBeInTheDocument();
      expect(screen.getByText('Averages & Lengths')).toBeInTheDocument();
      expect(screen.getByText('Readability & Time')).toBeInTheDocument();
      expect(screen.getByText('Top Keywords')).toBeInTheDocument();
    });

    it('should update state when text changes', () => {
      const state = WordCountTablet.createInitialState();
      const mockOnChange = jest.fn();
      
      render(WordCountTablet.render(state, mockOnChange));
      
      const textarea = screen.getByPlaceholderText('Enter or paste your text here to analyze...');
      fireEvent.change(textarea, { target: { value: 'New text content' } });
      
      expect(mockOnChange).toHaveBeenCalledWith({
        type: 'wordcount',
        data: {
          text: 'New text content',
        },
      });
    });

    it('should render input controls', () => {
      const state = WordCountTablet.createInitialState();
      const mockOnChange = jest.fn();
      
      render(WordCountTablet.render(state, mockOnChange));
      
      expect(screen.getByTitle('Paste from clipboard')).toBeInTheDocument();
      expect(screen.getByTitle('Clear text')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter or paste your text here to analyze...')).toBeInTheDocument();
    });
  });

  describe('text analysis integration', () => {
    it('should display correct word count', () => {
      const state = WordCountTablet.createInitialState();
      state.data.text = 'Hello world test';
      const mockOnChange = jest.fn();
      
      render(WordCountTablet.render(state, mockOnChange));
      
      // Should show 3 words
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should display correct character count', () => {
      const state = WordCountTablet.createInitialState();
      state.data.text = 'Hello';
      const mockOnChange = jest.fn();
      
      render(WordCountTablet.render(state, mockOnChange));
      
      // Should show 5 characters
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should update stats when text changes', () => {
      const state = WordCountTablet.createInitialState();
      const mockOnChange = jest.fn();
      
      const { rerender } = render(WordCountTablet.render(state, mockOnChange));
      
      // Initially no stats shown
      expect(screen.getByText('No Text to Analyze')).toBeInTheDocument();
      
      // Update state with text
      const newState = { ...state, data: { text: 'Hello world' } };
      rerender(WordCountTablet.render(newState, mockOnChange));
      
      // Now stats should be shown
      expect(screen.getByText('Core Counts')).toBeInTheDocument();
      expect(screen.queryByText('No Text to Analyze')).not.toBeInTheDocument();
    });
  });
});
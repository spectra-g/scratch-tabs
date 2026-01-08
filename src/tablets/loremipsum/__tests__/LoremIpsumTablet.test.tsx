import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LoremIpsumTablet } from '../LoremIpsumTablet';
import { LoremIpsumState } from '../types';

// Mock the generator utility
jest.mock('../utils/generator', () => ({
  generateContent: jest.fn().mockReturnValue('Generated lorem ipsum content'),
  validateOptions: jest.fn().mockReturnValue(null),
  getLanguageForMode: jest.fn().mockImplementation((mode) => {
    switch (mode) {
      case 'html': return 'html';
      case 'markdown': return 'markdown';
      case 'json': return 'json';
      default: return 'plaintext';
    }
  }),
}));

// Mock the bridge hook
jest.mock('../../bridge', () => ({
  useTabletTabCreation: jest.fn(() => ({
    createBackgroundTab: jest.fn(),
  })),
}));

// Mock the context hook
jest.mock('../../bridge/context', () => ({
  useTabletContext: jest.fn(() => ({
    tabId: 'test-tab-id',
  })),
  TabletContextProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('LoremIpsumTablet', () => {
  const createMockState = (overrides: Partial<LoremIpsumState> = {}): LoremIpsumState => ({
    type: 'loremipsum',
    settings: {
      mode: 'text',
      theme: 'general',
      outputUnit: 'paragraphs',
      count: 3,
      customSourceText: '',
      includeNumbers: false,
      includeSpecialChars: false,
      startWithLorem: true,
    },
    generatedOutput: '',
    isGenerating: false,
    lastGeneratedAt: 0,
    ...overrides,
  });

  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the main interface', () => {
      const state = createMockState();
      render(<LoremIpsumTablet state={state} onChange={mockOnChange} />);

      expect(screen.getByText('Lorem Ipsum & Mock Data Generator')).toBeInTheDocument();
      expect(screen.getByText('Generate realistic placeholder content for your projects')).toBeInTheDocument();
      expect(screen.getByText('Generation Settings')).toBeInTheDocument();
      expect(screen.getByText('Generated Content')).toBeInTheDocument();
    });

    it('should show last generated timestamp when available', () => {
      const timestamp = Date.now();
      const state = createMockState({
        lastGeneratedAt: timestamp,
      });
      render(<LoremIpsumTablet state={state} onChange={mockOnChange} />);

      const timeString = new Date(timestamp).toLocaleTimeString();
      expect(screen.getByText(`Last generated: ${timeString}`)).toBeInTheDocument();
    });
  });

  describe('content generation', () => {
    it('should generate content when Generate button is clicked', async () => {
      const generateContent = require('../utils/generator').generateContent;
      generateContent.mockReturnValue('New generated content');

      const state = createMockState();
      render(<LoremIpsumTablet state={state} onChange={mockOnChange} />);

      const generateButton = screen.getByText('Generate');
      fireEvent.click(generateButton);

      // Should set generating state first
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          isGenerating: true,
        })
      );

      // Wait for generation to complete
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            generatedOutput: 'New generated content',
            isGenerating: false,
            lastGeneratedAt: expect.any(Number),
          })
        );
      });
    });

    it('should auto-generate on first load', async () => {
      const generateContent = require('../utils/generator').generateContent;
      generateContent.mockReturnValue('Auto-generated content');

      const state = createMockState(); // No existing output
      render(<LoremIpsumTablet state={state} onChange={mockOnChange} />);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            generatedOutput: 'Auto-generated content',
          })
        );
      });
    });

    it('should handle generation errors gracefully', async () => {
      const generateContent = require('../utils/generator').generateContent;
      generateContent.mockImplementation(() => {
        throw new Error('Generation failed');
      });

      const state = createMockState();
      render(<LoremIpsumTablet state={state} onChange={mockOnChange} />);

      const generateButton = screen.getByText('Generate');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            generatedOutput: 'Error generating content. Please try again.',
            isGenerating: false,
          })
        );
      });
    });
  });

  describe('settings updates', () => {
    it('should update settings when mode changes', () => {
      const state = createMockState();
      render(<LoremIpsumTablet state={state} onChange={mockOnChange} />);

      const htmlButton = screen.getByText('HTML');
      fireEvent.click(htmlButton);

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.objectContaining({
            mode: 'html',
          }),
        })
      );
    });

    it('should update count when slider changes', () => {
      const state = createMockState();
      render(<LoremIpsumTablet state={state} onChange={mockOnChange} />);

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '5' } });

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.objectContaining({
            count: 5,
          }),
        })
      );
    });

    it('should update theme selection', () => {
      const state = createMockState();
      render(<LoremIpsumTablet state={state} onChange={mockOnChange} />);

      const businessTheme = screen.getByText('Business');
      fireEvent.click(businessTheme);

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.objectContaining({
            theme: 'business',
          }),
        })
      );
    });

    it('should auto-generate content when settings change with existing content', async () => {
      const generateContent = require('../utils/generator').generateContent;
      generateContent.mockReturnValue('Auto-generated updated content');

      const state = createMockState({
        generatedOutput: 'Initial content',
        isGenerating: false,
      });

      render(<LoremIpsumTablet state={state} onChange={mockOnChange} />);

      // Clear any previous calls
      mockOnChange.mockClear();
      generateContent.mockClear();

      // Change theme setting (this should trigger auto-generation)
      const businessTheme = screen.getByText('Business');
      fireEvent.click(businessTheme);

      // Should auto-generate when settings change
      await waitFor(() => {
        expect(generateContent).toHaveBeenCalledWith(
          expect.objectContaining({
            theme: 'business',
          })
        );
      });

      // Should update with new content
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            generatedOutput: 'Auto-generated updated content',
            isGenerating: false,
            lastGeneratedAt: expect.any(Number),
          })
        );
      });
    });

    it('should recover from stuck generating state after timeout', async () => {
      const oldTimestamp = Date.now() - 6000; // 6 seconds ago (past the 5 second timeout)

      const state = createMockState({
        isGenerating: true,
        lastGeneratedAt: oldTimestamp,
      });

      render(<LoremIpsumTablet state={state} onChange={mockOnChange} />);

      // Should recover from stuck state
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            isGenerating: false,
          })
        );
      });
    });
  });

  describe('new tab creation', () => {
    it('should create new tab with generated content', async () => {
      const mockCreateBackgroundTab = jest.fn();
      const useTabletTabCreation = require('../../bridge').useTabletTabCreation;
      useTabletTabCreation.mockReturnValue({
        createBackgroundTab: mockCreateBackgroundTab,
      });

      const state = createMockState({
        generatedOutput: 'Test generated content',
        settings: { ...createMockState().settings, mode: 'markdown' },
      });
      render(<LoremIpsumTablet state={state} onChange={mockOnChange} />);

      const newTabButton = screen.getByText('New Tab');
      fireEvent.click(newTabButton);

      expect(mockCreateBackgroundTab).toHaveBeenCalledWith(
        'Generated Markdown Content',
        'Test generated content',
        'markdown',
        'test-tab-id'
      );
    });

    it('should not create tab when no content is generated', () => {
      const state = createMockState({
        generatedOutput: '', // No content
      });
      render(<LoremIpsumTablet state={state} onChange={mockOnChange} />);

      const newTabButton = screen.getByText('New Tab').closest('button');
      expect(newTabButton).toBeDisabled();
    });
  });

  describe('copy functionality', () => {
    it('should copy generated content to clipboard', async () => {
      // Mock clipboard API
      const mockWriteText = jest.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });

      const state = createMockState({
        generatedOutput: 'Content to copy',
      });
      render(<LoremIpsumTablet state={state} onChange={mockOnChange} />);

      const copyButton = screen.getByText('Copy');
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith('Content to copy');
      });

      // Should show success feedback
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
  });

  describe('content statistics', () => {
    it('should display content statistics when content is generated', () => {
      const state = createMockState({
        generatedOutput: 'This is test content with multiple words and lines.\n\nSecond paragraph here.',
      });
      render(<LoremIpsumTablet state={state} onChange={mockOnChange} />);

      // Should show character count
      expect(screen.getAllByText(/characters/i).length).toBeGreaterThan(0);

      // Should show word count
      expect(screen.getAllByText(/words/i).length).toBeGreaterThan(0);

      // Should show line count
      expect(screen.getAllByText(/lines/i).length).toBeGreaterThan(0);
    });
  });
});
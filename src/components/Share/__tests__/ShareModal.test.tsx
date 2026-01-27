import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ShareModal } from '../ShareModal';
import { Tab } from '../../../types';
import { shareService } from '../../../services/shareService';
import { formatRegistry } from '../../../formats/registry';

// Mock the services
jest.mock('../../../services/shareService');
jest.mock('../../../formats/registry');

// Mock child components to simplify testing
jest.mock('../SizeIndicator', () => ({
  SizeIndicator: ({ currentSize, maxSize }: any) => (
    <div data-testid="size-indicator">
      Size: {currentSize}/{maxSize}
    </div>
  ),
}));

jest.mock('../DefaultTextRangeTrimUI', () => ({
  DefaultTextRangeTrimUI: () => <div data-testid="line-range-selector">Select Line Range</div>,
}));

// Mock React.lazy and Suspense for testing
jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return {
    ...actual,
    lazy: (fn: any) => {
      const Component = () => <div data-testid="json-trim-ui">JSON Field Selector</div>;
      return Component;
    },
  };
});

describe('ShareModal', () => {
  const mockOnClose = jest.fn();

  const createMockTab = (language: string, content: string): Tab => ({
    id: 'test-tab-1',
    title: 'Test Tab',
    content,
    language,
    languageLocked: false,
    cursorPosition: { lineNumber: 0, column: 0 },
    isPinned: false,
    dateCreated: Date.now(),
    lastModified: Date.now(),
    workspaceId: 'test-workspace',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (shareService.getMaxContentSize as jest.Mock).mockReturnValue(1800);
  });

  describe('Curl content scenarios', () => {
    beforeEach(() => {
      // Mock curl format without shareStrategy
      (formatRegistry.getById as jest.Mock).mockReturnValue({
        id: 'curl',
        name: 'Curl',
        shareStrategy: undefined,
      });
    });

    test('should show only URL when curl content fits', async () => {
      const curlContent = 'curl https://api.example.com/users';
      const tab = createMockTab('curl', curlContent);

      (shareService.canFitInUrl as jest.Mock).mockReturnValue({
        fits: true,
        size: 100,
        maxSize: 1800,
        percentUsed: 5.5,
      });

      (shareService.generateShareUrl as jest.Mock).mockReturnValue('#/s/v1/curl/full/abc123');

      await act(async () => {
        render(<ShareModal tab={tab} onClose={mockOnClose} />);
      });

      await waitFor(() => {
        expect(screen.getByText('Shareable URL')).toBeInTheDocument();
      });

      // Should NOT show trim UI
      expect(screen.queryByTestId('line-range-selector')).not.toBeInTheDocument();
      expect(screen.queryByTestId('json-trim-ui')).not.toBeInTheDocument();
    });

    test('should show line range selector when curl content is too large', async () => {
      const curlContent = 'curl https://api.example.com/users -d ' + 'x'.repeat(10000);
      const tab = createMockTab('curl', curlContent);

      (shareService.canFitInUrl as jest.Mock).mockReturnValue({
        fits: false,
        size: 2500,
        maxSize: 1800,
        percentUsed: 138.8,
      });

      await act(async () => {
        render(<ShareModal tab={tab} onClose={mockOnClose} />);
      });

      await waitFor(() => {
        expect(screen.getByTestId('line-range-selector')).toBeInTheDocument();
      });

      // Should show default line range selector, NOT JSON field selector
      expect(screen.queryByTestId('json-trim-ui')).not.toBeInTheDocument();
    });

    test('should use consistent maxSize for UI and status check', async () => {
      const curlContent = 'curl https://api.example.com/users';
      const tab = createMockTab('curl', curlContent);

      const mockSizeCheck = {
        fits: false,
        size: 1792,
        maxSize: 1800,
        percentUsed: 99.5,
      };

      (shareService.canFitInUrl as jest.Mock).mockReturnValue(mockSizeCheck);

      await act(async () => {
        render(<ShareModal tab={tab} onClose={mockOnClose} />);
      });

      await waitFor(() => {
        // Should show trim UI because fits: false
        expect(screen.getByText(/Shareable URL \(Trimmed Content\)/)).toBeInTheDocument();
      });

      // Should show line range selector
      expect(screen.getByTestId('line-range-selector')).toBeInTheDocument();
    });
  });

  describe('JSON content scenarios', () => {
    const mockJsonShareStrategy = {
      supportsCustomTrim: true,
      canTrim: jest.fn(),
      getTrimUI: jest.fn(),
      encodeMetadata: jest.fn(),
      decodeMetadata: jest.fn(),
      applyTrim: jest.fn(),
    };

    beforeEach(() => {
      // Mock JSON format with shareStrategy
      (formatRegistry.getById as jest.Mock).mockReturnValue({
        id: 'json',
        name: 'JSON',
        shareStrategy: mockJsonShareStrategy,
      });
    });

    test('should show only URL when JSON content fits', async () => {
      const jsonContent = '{"name": "test", "value": 123}';
      const tab = createMockTab('json', jsonContent);

      (shareService.canFitInUrl as jest.Mock).mockReturnValue({
        fits: true,
        size: 150,
        maxSize: 1800,
        percentUsed: 8.3,
      });

      (shareService.generateShareUrl as jest.Mock).mockReturnValue('#/s/v1/json/full/abc123');

      await act(async () => {
        render(<ShareModal tab={tab} onClose={mockOnClose} />);
      });

      await waitFor(() => {
        expect(screen.getByText('Shareable URL')).toBeInTheDocument();
      });

      // Should NOT show trim UI when content fits
      expect(screen.queryByTestId('line-range-selector')).not.toBeInTheDocument();
      expect(screen.queryByTestId('json-trim-ui')).not.toBeInTheDocument();
    });

    test('should show JSON field selector when JSON is too large and valid', async () => {
      const jsonContent = JSON.stringify({ key1: 'value1', key2: 'value2' }, null, 2);
      const tab = createMockTab('json', jsonContent);

      (shareService.canFitInUrl as jest.Mock).mockReturnValue({
        fits: false,
        size: 2500,
        maxSize: 1800,
        percentUsed: 138.8,
      });

      mockJsonShareStrategy.canTrim.mockReturnValue(true);

      await act(async () => {
        render(<ShareModal tab={tab} onClose={mockOnClose} />);
      });

      await waitFor(() => {
        expect(mockJsonShareStrategy.canTrim).toHaveBeenCalledWith(jsonContent);
        expect(screen.getByTestId('json-trim-ui')).toBeInTheDocument();
      });
    });

    test('should show line range selector when JSON is invalid', async () => {
      const invalidJsonContent = '{ invalid json content';
      const tab = createMockTab('json', invalidJsonContent);

      (shareService.canFitInUrl as jest.Mock).mockReturnValue({
        fits: false,
        size: 2500,
        maxSize: 1800,
        percentUsed: 138.8,
      });

      mockJsonShareStrategy.canTrim.mockReturnValue(false);

      await act(async () => {
        render(<ShareModal tab={tab} onClose={mockOnClose} />);
      });

      await waitFor(() => {
        expect(screen.getByTestId('line-range-selector')).toBeInTheDocument();
      });

      // Should NOT show JSON trim UI for invalid JSON
      expect(screen.queryByTestId('json-trim-ui')).not.toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    test('should handle empty content', async () => {
      const tab = createMockTab('curl', '');

      (formatRegistry.getById as jest.Mock).mockReturnValue({
        id: 'curl',
        name: 'Curl',
        shareStrategy: undefined,
      });

      (shareService.generateShareUrl as jest.Mock).mockReturnValue('#/s/v1/curl/full/');

      await act(async () => {
        render(<ShareModal tab={tab} onClose={mockOnClose} />);
      });

      await waitFor(() => {
        expect(screen.getByText('Shareable URL')).toBeInTheDocument();
      });
    });

    test('should handle format without shareStrategy', async () => {
      const tab = createMockTab('plaintext', 'Some plain text content that is very long');

      (formatRegistry.getById as jest.Mock).mockReturnValue({
        id: 'plaintext',
        name: 'Plain Text',
        shareStrategy: undefined,
      });

      (shareService.canFitInUrl as jest.Mock).mockReturnValue({
        fits: false,
        size: 2500,
        maxSize: 1800,
        percentUsed: 138.8,
      });

      await act(async () => {
        render(<ShareModal tab={tab} onClose={mockOnClose} />);
      });

      await waitFor(() => {
        // Should use default line range selector
        expect(screen.getByTestId('line-range-selector')).toBeInTheDocument();
      });
    });
  });

  describe('maxSize consistency', () => {
    test('should use same maxSize from sizeCheck for both UI and status', async () => {
      const tab = createMockTab('curl', 'test content');

      const mockSizeCheck = {
        fits: false,
        size: 1792,
        maxSize: 1800,
        percentUsed: 99.5,
      };

      (shareService.canFitInUrl as jest.Mock).mockReturnValue(mockSizeCheck);
      (formatRegistry.getById as jest.Mock).mockReturnValue({
        id: 'curl',
        name: 'Curl',
        shareStrategy: undefined,
      });

      await act(async () => {
        render(<ShareModal tab={tab} onClose={mockOnClose} />);
      });

      await waitFor(() => {
        // If size check says it doesn't fit, trim UI should be shown
        expect(screen.getByText(/Shareable URL \(Trimmed Content\)/)).toBeInTheDocument();
      });

      // Verify that the size indicator would use the same maxSize
      expect(shareService.canFitInUrl).toHaveBeenCalledWith('test content', 'curl');

      // Should show line range selector
      expect(screen.getByTestId('line-range-selector')).toBeInTheDocument();
    });
  });

  describe('Manual content customization', () => {
    beforeEach(() => {
      // Mock curl format without shareStrategy
      (formatRegistry.getById as jest.Mock).mockReturnValue({
        id: 'curl',
        name: 'Curl',
        shareStrategy: undefined,
      });
    });

    test('should show Customize Content button when content fits', async () => {
      const curlContent = 'curl https://api.example.com/users';
      const tab = createMockTab('curl', curlContent);

      (shareService.canFitInUrl as jest.Mock).mockReturnValue({
        fits: true,
        size: 100,
        maxSize: 1800,
        percentUsed: 5.5,
      });

      (shareService.generateShareUrl as jest.Mock).mockReturnValue('#/s/v1/curl/full/abc123');

      await act(async () => {
        render(<ShareModal tab={tab} onClose={mockOnClose} />);
      });

      await waitFor(() => {
        expect(screen.getByText('Shareable URL')).toBeInTheDocument();
      });

      // Should show the Customize Content button
      expect(screen.getByText('Customize Content')).toBeInTheDocument();
    });

    test('should show trim UI when Customize Content is clicked', async () => {
      const curlContent = 'curl https://api.example.com/users';
      const tab = createMockTab('curl', curlContent);

      (shareService.canFitInUrl as jest.Mock).mockReturnValue({
        fits: true,
        size: 100,
        maxSize: 1800,
        percentUsed: 5.5,
      });

      (shareService.generateShareUrl as jest.Mock).mockReturnValue('#/s/v1/curl/full/abc123');

      await act(async () => {
        render(<ShareModal tab={tab} onClose={mockOnClose} />);
      });

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByText('Customize Content')).toBeInTheDocument();
      });

      // Click the Customize Content button
      const customizeButton = screen.getByText('Customize Content');
      await act(async () => {
        customizeButton.click();
      });

      // Should now show the trim UI
      await waitFor(() => {
        expect(screen.getByTestId('line-range-selector')).toBeInTheDocument();
      });

      // Should show the trimmed content header
      expect(screen.getByText(/Shareable URL \(Trimmed Content\)/)).toBeInTheDocument();
    });

    test('should show different message in manual trim mode', async () => {
      const curlContent = 'curl https://api.example.com/users';
      const tab = createMockTab('curl', curlContent);

      (shareService.canFitInUrl as jest.Mock).mockReturnValue({
        fits: true,
        size: 100,
        maxSize: 1800,
        percentUsed: 5.5,
      });

      (shareService.generateShareUrl as jest.Mock).mockReturnValue('#/s/v1/curl/full/abc123');

      await act(async () => {
        render(<ShareModal tab={tab} onClose={mockOnClose} />);
      });

      // Click Customize Content
      await waitFor(() => {
        expect(screen.getByText('Customize Content')).toBeInTheDocument();
      });

      const customizeButton = screen.getByText('Customize Content');
      await act(async () => {
        customizeButton.click();
      });

      // Should show manual trim message
      await waitFor(() => {
        expect(screen.getByText(/This URL contains only the selected portion of your content/)).toBeInTheDocument();
      });
    });

    test('should work with JSON content', async () => {
      const jsonContent = '{"name": "test", "value": 123}';
      const tab = createMockTab('json', jsonContent);

      const mockJsonShareStrategy = {
        supportsCustomTrim: true,
        canTrim: jest.fn().mockReturnValue(true),
        getTrimUI: jest.fn(),
        encodeMetadata: jest.fn(),
        decodeMetadata: jest.fn(),
        applyTrim: jest.fn(),
      };

      (formatRegistry.getById as jest.Mock).mockReturnValue({
        id: 'json',
        name: 'JSON',
        shareStrategy: mockJsonShareStrategy,
      });

      (shareService.canFitInUrl as jest.Mock).mockReturnValue({
        fits: true,
        size: 150,
        maxSize: 1800,
        percentUsed: 8.3,
      });

      (shareService.generateShareUrl as jest.Mock).mockReturnValue('#/s/v1/json/full/abc123');

      await act(async () => {
        render(<ShareModal tab={tab} onClose={mockOnClose} />);
      });

      await waitFor(() => {
        expect(screen.getByText('Shareable URL')).toBeInTheDocument();
      });

      // Should show Customize Content button
      expect(screen.getByText('Customize Content')).toBeInTheDocument();

      // Click the button
      const customizeButton = screen.getByText('Customize Content');
      await act(async () => {
        customizeButton.click();
      });

      // Should show JSON trim UI
      await waitFor(() => {
        expect(screen.getByTestId('json-trim-ui')).toBeInTheDocument();
      });
    });
  });
});

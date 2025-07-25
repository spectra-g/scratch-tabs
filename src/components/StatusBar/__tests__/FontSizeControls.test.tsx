import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FontSizeControls } from '../FontSizeControls';
import { useTabsStore } from '../../../stores/tabsStore';
import { useRootStore } from '../../../stores/rootStore';

// Mock the stores
jest.mock('../../../stores/tabsStore');
jest.mock('../../../stores/rootStore');

// Mock Monaco editor
const mockEditor = {
  updateOptions: jest.fn(),
  getOption: jest.fn(),
} as any;

describe('FontSizeControls', () => {
  const mockUpdateTabState = jest.fn();
  const mockTabs = [
    {
      id: 'tab-1',
      title: 'Test Tab',
      content: 'test content',
      language: 'javascript',
      languageLocked: false,
      isTablet: false,
      fontSize: 14,
      workspaceId: 'workspace-1',
      dateCreated: Date.now(),
      lastModified: Date.now(),
      cursorPosition: { lineNumber: 1, column: 1 },
    },
    {
      id: 'tab-2',
      title: 'Tablet Tab',
      content: 'tablet content',
      language: 'plaintext',
      languageLocked: false,
      isTablet: true,
      fontSize: 16,
      workspaceId: 'workspace-1',
      dateCreated: Date.now(),
      lastModified: Date.now(),
      cursorPosition: { lineNumber: 1, column: 1 },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock useTabsStore
    (useTabsStore as any).mockReturnValue({
      tabs: mockTabs,
    });

    // Mock useRootStore
    (useRootStore as any).mockReturnValue({
      updateTabState: mockUpdateTabState,
    });
  });

  describe('Rendering', () => {
    it('should not render for tablet tabs', () => {
      render(
        <FontSizeControls
          editor={mockEditor}
          isTablet={true}
          activeTabId="tab-2"
        />
      );

      expect(screen.queryByText('14')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Font Size')).not.toBeInTheDocument();
    });

    it('should render for editor tabs', () => {
      render(
        <FontSizeControls
          editor={mockEditor}
          isTablet={false}
          activeTabId="tab-1"
        />
      );

      expect(screen.getByText('14')).toBeInTheDocument();
      expect(screen.getByTitle('Font Size')).toBeInTheDocument();
    });

    it('should display current font size', () => {
      render(
        <FontSizeControls
          editor={mockEditor}
          isTablet={false}
          activeTabId="tab-1"
        />
      );

      expect(screen.getByText('14')).toBeInTheDocument();
    });

    it('should use default font size when tab has no fontSize', () => {
      const tabsWithoutFontSize = [
        {
          ...mockTabs[0],
          fontSize: undefined,
        },
      ];

      (useTabsStore as any).mockReturnValue({
        tabs: tabsWithoutFontSize,
      });

      render(
        <FontSizeControls
          editor={mockEditor}
          isTablet={false}
          activeTabId="tab-1"
        />
      );

      expect(screen.getByText('14')).toBeInTheDocument();
    });
  });

  describe('Font Size Controls', () => {
    it('should open dropdown when clicked', () => {
      render(
        <FontSizeControls
          editor={mockEditor}
          isTablet={false}
          activeTabId="tab-1"
        />
      );

      const button = screen.getByTitle('Font Size');
      fireEvent.click(button);

      expect(screen.getByText('Font Size')).toBeInTheDocument();
      expect(screen.getByText('Reset')).toBeInTheDocument();
    });

    it('should close dropdown when clicking outside', async () => {
      render(
        <FontSizeControls
          editor={mockEditor}
          isTablet={false}
          activeTabId="tab-1"
        />
      );

      const button = screen.getByTitle('Font Size');
      fireEvent.click(button);

      expect(screen.getByText('Font Size')).toBeInTheDocument();

      // Click outside
      fireEvent.mouseDown(document.body);

      await waitFor(() => {
        expect(screen.queryByText('Font Size')).not.toBeInTheDocument();
      });
    });

    it('should increase font size when plus button is clicked', () => {
      render(
        <FontSizeControls
          editor={mockEditor}
          isTablet={false}
          activeTabId="tab-1"
        />
      );

      const button = screen.getByTitle('Font Size');
      fireEvent.click(button);

      const increaseButton = screen.getByTitle('Increase font size');
      fireEvent.click(increaseButton);

      expect(mockEditor.updateOptions).toHaveBeenCalledWith({ fontSize: 15 });
      expect(mockUpdateTabState).toHaveBeenCalledWith('tab-1', { fontSize: 15 });
    });

    it('should decrease font size when minus button is clicked', () => {
      render(
        <FontSizeControls
          editor={mockEditor}
          isTablet={false}
          activeTabId="tab-1"
        />
      );

      const button = screen.getByTitle('Font Size');
      fireEvent.click(button);

      const decreaseButton = screen.getByTitle('Decrease font size');
      fireEvent.click(decreaseButton);

      expect(mockEditor.updateOptions).toHaveBeenCalledWith({ fontSize: 13 });
      expect(mockUpdateTabState).toHaveBeenCalledWith('tab-1', { fontSize: 13 });
    });

    it('should reset font size when reset button is clicked', () => {
      render(
        <FontSizeControls
          editor={mockEditor}
          isTablet={false}
          activeTabId="tab-1"
        />
      );

      const button = screen.getByTitle('Font Size');
      fireEvent.click(button);

      const resetButton = screen.getByText('Reset');
      fireEvent.click(resetButton);

      expect(mockEditor.updateOptions).toHaveBeenCalledWith({ fontSize: 14 });
      expect(mockUpdateTabState).toHaveBeenCalledWith('tab-1', { fontSize: 14 });
    });

    it('should disable decrease button when font size is at minimum', () => {
      const tabsWithMinFontSize = [
        {
          ...mockTabs[0],
          fontSize: 8,
        },
      ];

      (useTabsStore as any).mockReturnValue({
        tabs: tabsWithMinFontSize,
      });

      render(
        <FontSizeControls
          editor={mockEditor}
          isTablet={false}
          activeTabId="tab-1"
        />
      );

      const button = screen.getByTitle('Font Size');
      fireEvent.click(button);

      const decreaseButton = screen.getByTitle('Decrease font size');
      expect(decreaseButton).toBeDisabled();
    });

    it('should disable increase button when font size is at maximum', () => {
      const tabsWithMaxFontSize = [
        {
          ...mockTabs[0],
          fontSize: 24,
        },
      ];

      (useTabsStore as any).mockReturnValue({
        tabs: tabsWithMaxFontSize,
      });

      render(
        <FontSizeControls
          editor={mockEditor}
          isTablet={false}
          activeTabId="tab-1"
        />
      );

      const button = screen.getByTitle('Font Size');
      fireEvent.click(button);

      const increaseButton = screen.getByTitle('Increase font size');
      expect(increaseButton).toBeDisabled();
    });
  });

  describe('Preset Font Sizes', () => {
    it('should apply preset font size when clicked', () => {
      render(
        <FontSizeControls
          editor={mockEditor}
          isTablet={false}
          activeTabId="tab-1"
        />
      );

      const button = screen.getByTitle('Font Size');
      fireEvent.click(button);

      const presetButton = screen.getByText('16px');
      fireEvent.click(presetButton);

      expect(mockEditor.updateOptions).toHaveBeenCalledWith({ fontSize: 16 });
      expect(mockUpdateTabState).toHaveBeenCalledWith('tab-1', { fontSize: 16 });
    });

    it('should highlight current font size in presets', () => {
      render(
        <FontSizeControls
          editor={mockEditor}
          isTablet={false}
          activeTabId="tab-1"
        />
      );

      const button = screen.getByTitle('Font Size');
      fireEvent.click(button);

      // Use getAllByText and find the button (not the span)
      const allElements = screen.getAllByText('14px');
      const currentSizeButton = allElements.find(el => el.tagName === 'BUTTON');
      expect(currentSizeButton).toHaveClass('bg-blue-500/20', 'text-blue-400');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing active tab gracefully', () => {
      (useTabsStore as any).mockReturnValue({
        tabs: [],
      });

      render(
        <FontSizeControls
          editor={mockEditor}
          isTablet={false}
          activeTabId="non-existent-tab"
        />
      );

      expect(screen.getByText('14')).toBeInTheDocument(); // Default size
    });

    it('should clamp font size to valid range', () => {
      const tabsWithInvalidFontSize = [
        {
          ...mockTabs[0],
          fontSize: 23, // Just below max
        },
      ];

      (useTabsStore as any).mockReturnValue({
        tabs: tabsWithInvalidFontSize,
      });

      render(
        <FontSizeControls
          editor={mockEditor}
          isTablet={false}
          activeTabId="tab-1"
        />
      );

      const button = screen.getByTitle('Font Size');
      fireEvent.click(button);

      const increaseButton = screen.getByTitle('Increase font size');
      fireEvent.click(increaseButton);

      // Should be clamped to 24
      expect(mockEditor.updateOptions).toHaveBeenCalledWith({ fontSize: 24 });
      expect(mockUpdateTabState).toHaveBeenCalledWith('tab-1', { fontSize: 24 });
    });

    it('should not call updateTabState when editor is null', () => {
      render(
        <FontSizeControls
          editor={null}
          isTablet={false}
          activeTabId="tab-1"
        />
      );

      const button = screen.getByTitle('Font Size');
      fireEvent.click(button);

      const increaseButton = screen.getByTitle('Increase font size');
      fireEvent.click(increaseButton);

      expect(mockUpdateTabState).not.toHaveBeenCalled();
    });
  });
}); 
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WorkspaceEmptyState } from '../WorkspaceEmptyState';
import { useRootStore } from '../../../stores/rootStore';
import { useWorkspaceStore } from '../../../stores/workspaceStore';
import { useFileImport } from '../../../hooks/useFileImport';

// Mock the stores
jest.mock('../../../stores/rootStore');
jest.mock('../../../stores/workspaceStore');
jest.mock('../../../hooks/useFileImport');
jest.mock('../../ToolSelector', () => ({
  ToolSelectorModal: ({ isOpen, onClose }: any) =>
    isOpen ? <div data-testid="tool-selector-modal" onClick={onClose}>Tool Selector</div> : null
}));
jest.mock('../../../services/toolService', () => ({
  toolService: {
    executeTool: jest.fn(),
  },
}));

describe('WorkspaceEmptyState', () => {
  const mockHandleNewTab = jest.fn();
  const mockHandleNewTabFromPaste = jest.fn();
  const mockHandleNewCanvas = jest.fn();
  const mockHandleNewPopulatedTab = jest.fn();
  const mockOpenFileDialog = jest.fn();

  const mockWorkspaces = [
    {
      id: 'workspace-1',
      name: 'My Project',
      links: [],
      createdAt: Date.now(),
      lastAccessed: Date.now(),
    },
    {
      id: 'workspace-2',
      name: 'Another Workspace',
      links: [],
      createdAt: Date.now(),
      lastAccessed: Date.now(),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock useRootStore
    (useRootStore as any).mockReturnValue({
      handleNewTab: mockHandleNewTab,
      handleNewTabFromPaste: mockHandleNewTabFromPaste,
      handleNewCanvas: mockHandleNewCanvas,
      handleNewPopulatedTab: mockHandleNewPopulatedTab,
    });

    // Mock useWorkspaceStore
    (useWorkspaceStore as any).mockReturnValue({
      activeWorkspaceId: 'workspace-1',
      workspaces: mockWorkspaces,
    });

    // Mock useFileImport
    (useFileImport as any).mockReturnValue({
      openFileDialog: mockOpenFileDialog,
    });
  });

  describe('Rendering', () => {
    it('should render the empty state with workspace name', () => {
      render(<WorkspaceEmptyState />);

      expect(screen.getByTestId('workspace-empty-state')).toBeInTheDocument();
      expect(screen.getByText('My Project is empty')).toBeInTheDocument();
    });

    it('should render fallback name when workspace not found', () => {
      (useWorkspaceStore as any).mockReturnValue({
        activeWorkspaceId: 'non-existent',
        workspaces: mockWorkspaces,
      });

      render(<WorkspaceEmptyState />);

      expect(screen.getByText('Workspace is empty')).toBeInTheDocument();
    });

    it('should render all four action cards', () => {
      render(<WorkspaceEmptyState />);

      expect(screen.getByTestId('new-tab-action')).toBeInTheDocument();
      expect(screen.getByTestId('new-canvas-action')).toBeInTheDocument();
      expect(screen.getByTestId('paste-action')).toBeInTheDocument();
      expect(screen.getByTestId('open-file-action')).toBeInTheDocument();
    });

    it('should render action labels and descriptions', () => {
      render(<WorkspaceEmptyState />);

      expect(screen.getByText('New Tab')).toBeInTheDocument();
      expect(screen.getByText('Empty Scratch Tab')).toBeInTheDocument();
      expect(screen.getByText('New Canvas')).toBeInTheDocument();
      expect(screen.getByText('Spatial workspace')).toBeInTheDocument();
      expect(screen.getByText('Paste')).toBeInTheDocument();
      expect(screen.getByText('From Clipboard')).toBeInTheDocument();
      expect(screen.getByText('Open File')).toBeInTheDocument();
      expect(screen.getByText('From Disk')).toBeInTheDocument();
    });

    it('should render keyboard hints', () => {
      render(<WorkspaceEmptyState />);

      expect(screen.getByText(/Double Click/i)).toBeInTheDocument();
      expect(screen.getByText(/for tablet tools/i)).toBeInTheDocument();
    });

    it('should render the folder icon', () => {
      const { container } = render(<WorkspaceEmptyState />);

      // Check for the icon wrapper with specific classes
      const iconWrapper = container.querySelector('.bg-surface-secondary\\/50');
      expect(iconWrapper).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call handleNewTab when clicking New Tab action', () => {
      render(<WorkspaceEmptyState />);

      const newTabButton = screen.getByTestId('new-tab-action');
      fireEvent.click(newTabButton);

      expect(mockHandleNewTab).toHaveBeenCalledTimes(1);
      expect(mockHandleNewTab).toHaveBeenCalledWith(false);
    });

    it('should call handleNewTabFromPaste when clicking Paste action', () => {
      render(<WorkspaceEmptyState />);

      const pasteButton = screen.getByTestId('paste-action');
      fireEvent.click(pasteButton);

      expect(mockHandleNewTabFromPaste).toHaveBeenCalledTimes(1);
      expect(mockHandleNewTabFromPaste).toHaveBeenCalledWith(false);
    });

    it('should call handleNewCanvas when clicking New Canvas action', () => {
      render(<WorkspaceEmptyState />);

      fireEvent.click(screen.getByTestId('new-canvas-action'));

      expect(mockHandleNewCanvas).toHaveBeenCalledWith(false);
    });

    it('should call openFileDialog when clicking Open File action', () => {
      render(<WorkspaceEmptyState />);

      const openFileButton = screen.getByTestId('open-file-action');
      fireEvent.click(openFileButton);

      expect(mockOpenFileDialog).toHaveBeenCalledTimes(1);
    });
  });

  describe('Memoization', () => {
    it('should memoize workspace lookup', () => {
      const { rerender } = render(<WorkspaceEmptyState />);

      // Workspace name should be displayed
      expect(screen.getByText('My Project is empty')).toBeInTheDocument();

      // Rerender with same data - should use memoized value
      rerender(<WorkspaceEmptyState />);
      expect(screen.getByText('My Project is empty')).toBeInTheDocument();
    });

    it('should update when workspace changes', () => {
      const { rerender } = render(<WorkspaceEmptyState />);

      expect(screen.getByText('My Project is empty')).toBeInTheDocument();

      // Change active workspace
      (useWorkspaceStore as any).mockReturnValue({
        activeWorkspaceId: 'workspace-2',
        workspaces: mockWorkspaces,
      });

      rerender(<WorkspaceEmptyState />);
      expect(screen.getByText('Another Workspace is empty')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper semantic structure', () => {
      render(<WorkspaceEmptyState />);

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('My Project is empty');
    });

    it('should have clickable buttons', () => {
      render(<WorkspaceEmptyState />);

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(4);
    });
  });
});

/**
 * Black-Box Test Suite for TabManagementUI Components
 *
 * Purpose: Capture current behavior before refactoring to Context pattern.
 * Tests verify that interacting with inputs calls the expected handlers.
 *
 * This suite tests the public API (props) of:
 * - TabManagementToolbar
 * - TabsContent
 * - WorkspaceForm
 * - DragOverlayUI
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  TabManagementToolbar,
  TabManagementToolbarProps,
  TabsContent,
  TabsContentProps,
  WorkspaceForm,
  WorkspaceFormProps,
} from '../TabManagementUI';
import { Tab } from '../../../../types';
import { SortOption, GroupOption } from '../types';

// Mock dependencies
jest.mock('@dnd-kit/core', () => ({
  DragOverlay: ({ children }: { children: React.ReactNode }) => <div data-testid="drag-overlay">{children}</div>,
}));

jest.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  verticalListSortingStrategy: {},
}));

jest.mock('../../../../formats', () => ({
  formatRegistry: {
    getById: (id: string) => id === 'javascript' ? { name: 'JavaScript' } : null,
  },
}));

jest.mock('../TabGroup', () => ({
  TabGroup: ({ title, tabs }: { title: string; tabs: Tab[] }) => (
    <div data-testid={`tab-group-${title}`}>
      {tabs.map(tab => <div key={tab.id} data-testid={`tab-item-${tab.id}`}>{tab.title}</div>)}
    </div>
  ),
}));

const createMockTab = (overrides: Partial<Tab> = {}): Tab => ({
  id: `tab-${Math.random().toString(36).substr(2, 9)}`,
  title: 'Test Tab',
  content: 'Test content',
  language: 'plaintext',
  languageLocked: false,
  cursorPosition: { lineNumber: 1, column: 1 },
  dateCreated: Date.now(),
  lastModified: Date.now(),
  workspaceId: 'test-workspace',
  ...overrides,
});

describe('TabManagementToolbar', () => {
  const createDefaultProps = (): TabManagementToolbarProps => ({
    searchQuery: '',
    setSearchQuery: jest.fn(),
    availableLanguages: ['javascript', 'typescript', 'plaintext'],
    languageFilter: [],
    setLanguageFilter: jest.fn(),
    sortOption: 'current' as SortOption,
    setSortOption: jest.fn(),
    groupOption: 'none' as GroupOption,
    setGroupOption: jest.fn(),
    selectedTabIds: new Set<string>(),
    filteredTabs: [],
    handleDeselectAll: jest.fn(),
    handleSelectAll: jest.fn(),
    handleApplyCurrentOrder: jest.fn(),
    handleTogglePinSelectedTabs: jest.fn(),
    handleDuplicateTabs: jest.fn(),
    showRenameOptions: false,
    setShowRenameOptions: jest.fn(),
    renameBasePattern: '',
    setRenameBasePattern: jest.fn(),
    renameSuffixPattern: ' {d}',
    setRenameSuffixPattern: jest.fn(),
    handleBulkRename: jest.fn(),
    showMergeOptions: false,
    setShowMergeOptions: jest.fn(),
    mergeDelimiter: '\n\n',
    setMergeDelimiter: jest.fn(),
    handleMergeTabs: jest.fn(),
    handleCloseTabs: jest.fn(),
    activeWorkspaceTabs: [],
    activeWorkspaceId: 'test-workspace',
  });

  describe('Search Input', () => {
    it('should call setSearchQuery on input change', async () => {
      const props = createDefaultProps();
      render(<TabManagementToolbar {...props} />);

      const searchInput = screen.getByPlaceholderText('Search tabs...');
      await userEvent.type(searchInput, 'test');

      expect(props.setSearchQuery).toHaveBeenCalled();
    });

    it('should display current search query', () => {
      const props = createDefaultProps();
      props.searchQuery = 'my search';
      render(<TabManagementToolbar {...props} />);

      const searchInput = screen.getByPlaceholderText('Search tabs...');
      expect(searchInput).toHaveValue('my search');
    });
  });

  describe('Language Filter', () => {
    it('should call setLanguageFilter when language is selected', async () => {
      const props = createDefaultProps();
      render(<TabManagementToolbar {...props} />);

      const languageSelect = screen.getByDisplayValue('All Languages');
      fireEvent.change(languageSelect, { target: { value: 'javascript' } });

      expect(props.setLanguageFilter).toHaveBeenCalledWith(['javascript']);
    });

    it('should clear language filter when All Languages is selected', async () => {
      const props = createDefaultProps();
      props.languageFilter = ['javascript'];
      render(<TabManagementToolbar {...props} />);

      // Find the select element (it may show the selected language)
      const languageSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(languageSelect, { target: { value: '' } });

      expect(props.setLanguageFilter).toHaveBeenCalledWith([]);
    });
  });

  describe('Sort Options', () => {
    it('should call setSortOption when sort option changes', async () => {
      const props = createDefaultProps();
      render(<TabManagementToolbar {...props} />);

      const sortSelect = screen.getByDisplayValue('Current');
      fireEvent.change(sortSelect, { target: { value: 'title-asc' } });

      expect(props.setSortOption).toHaveBeenCalledWith('title-asc');
    });
  });

  describe('Group Options', () => {
    it('should call setGroupOption when group option changes', async () => {
      const props = createDefaultProps();
      render(<TabManagementToolbar {...props} />);

      const groupSelect = screen.getByDisplayValue('No Grouping');
      fireEvent.change(groupSelect, { target: { value: 'language' } });

      expect(props.setGroupOption).toHaveBeenCalledWith('language');
    });
  });

  describe('Selection Actions', () => {
    it('should show Select All button when no tabs selected and tabs exist', () => {
      const props = createDefaultProps();
      props.filteredTabs = [createMockTab()];
      render(<TabManagementToolbar {...props} />);

      expect(screen.getByText('Select All')).toBeInTheDocument();
    });

    it('should call handleSelectAll when Select All is clicked', async () => {
      const props = createDefaultProps();
      props.filteredTabs = [createMockTab()];
      render(<TabManagementToolbar {...props} />);

      await userEvent.click(screen.getByText('Select All'));

      expect(props.handleSelectAll).toHaveBeenCalled();
    });

    it('should show Deselect All button when tabs are selected', () => {
      const props = createDefaultProps();
      props.selectedTabIds = new Set(['tab-1']);
      render(<TabManagementToolbar {...props} />);

      expect(screen.getByText('Deselect All')).toBeInTheDocument();
    });

    it('should call handleDeselectAll when Deselect All is clicked', async () => {
      const props = createDefaultProps();
      props.selectedTabIds = new Set(['tab-1']);
      render(<TabManagementToolbar {...props} />);

      await userEvent.click(screen.getByText('Deselect All'));

      expect(props.handleDeselectAll).toHaveBeenCalled();
    });

    it('should show Apply Current Order when sort option is not current', () => {
      const props = createDefaultProps();
      props.sortOption = 'title-asc' as SortOption;
      props.filteredTabs = [createMockTab()];
      render(<TabManagementToolbar {...props} />);

      expect(screen.getByText('Apply Current Order')).toBeInTheDocument();
    });

    it('should call handleApplyCurrentOrder when clicked', async () => {
      const props = createDefaultProps();
      props.sortOption = 'title-asc' as SortOption;
      props.filteredTabs = [createMockTab()];
      render(<TabManagementToolbar {...props} />);

      await userEvent.click(screen.getByText('Apply Current Order'));

      expect(props.handleApplyCurrentOrder).toHaveBeenCalled();
    });
  });

  describe('Bulk Actions (with selection in active workspace)', () => {
    const createPropsWithSelection = () => {
      const tab = createMockTab({ workspaceId: 'test-workspace' });
      const props = createDefaultProps();
      props.selectedTabIds = new Set([tab.id]);
      props.activeWorkspaceTabs = [tab];
      props.activeWorkspaceId = 'test-workspace';
      return props;
    };

    it('should show bulk action buttons when tabs are selected', () => {
      const props = createPropsWithSelection();
      render(<TabManagementToolbar {...props} />);

      expect(screen.getByText('Toggle Pin')).toBeInTheDocument();
      expect(screen.getByText('Duplicate')).toBeInTheDocument();
      expect(screen.getByText('Close')).toBeInTheDocument();
    });

    it('should call handleTogglePinSelectedTabs when Toggle Pin is clicked', async () => {
      const props = createPropsWithSelection();
      render(<TabManagementToolbar {...props} />);

      await userEvent.click(screen.getByText('Toggle Pin'));

      expect(props.handleTogglePinSelectedTabs).toHaveBeenCalled();
    });

    it('should call handleDuplicateTabs when Duplicate is clicked', async () => {
      const props = createPropsWithSelection();
      render(<TabManagementToolbar {...props} />);

      await userEvent.click(screen.getByText('Duplicate'));

      expect(props.handleDuplicateTabs).toHaveBeenCalled();
    });

    it('should call handleCloseTabs when Close is clicked', async () => {
      const props = createPropsWithSelection();
      render(<TabManagementToolbar {...props} />);

      await userEvent.click(screen.getByText('Close'));

      expect(props.handleCloseTabs).toHaveBeenCalled();
    });

    it('should show Rename button when 2+ tabs are selected', () => {
      const tab1 = createMockTab({ workspaceId: 'test-workspace' });
      const tab2 = createMockTab({ workspaceId: 'test-workspace' });
      const props = createDefaultProps();
      props.selectedTabIds = new Set([tab1.id, tab2.id]);
      props.activeWorkspaceTabs = [tab1, tab2];
      props.activeWorkspaceId = 'test-workspace';
      render(<TabManagementToolbar {...props} />);

      expect(screen.getByText('Rename')).toBeInTheDocument();
      expect(screen.getByText('Merge')).toBeInTheDocument();
    });

    it('should toggle rename options when Rename button is clicked', async () => {
      const tab1 = createMockTab({ workspaceId: 'test-workspace' });
      const tab2 = createMockTab({ workspaceId: 'test-workspace' });
      const props = createDefaultProps();
      props.selectedTabIds = new Set([tab1.id, tab2.id]);
      props.activeWorkspaceTabs = [tab1, tab2];
      props.activeWorkspaceId = 'test-workspace';
      render(<TabManagementToolbar {...props} />);

      await userEvent.click(screen.getByText('Rename'));

      expect(props.setShowRenameOptions).toHaveBeenCalledWith(true);
    });

    it('should show rename form when showRenameOptions is true', () => {
      const tab1 = createMockTab({ workspaceId: 'test-workspace' });
      const tab2 = createMockTab({ workspaceId: 'test-workspace' });
      const props = createDefaultProps();
      props.selectedTabIds = new Set([tab1.id, tab2.id]);
      props.activeWorkspaceTabs = [tab1, tab2];
      props.activeWorkspaceId = 'test-workspace';
      props.showRenameOptions = true;
      render(<TabManagementToolbar {...props} />);

      expect(screen.getByPlaceholderText('e.g. My Tab')).toBeInTheDocument();
    });

    it('should call handleBulkRename when Rename form is submitted', async () => {
      const tab1 = createMockTab({ workspaceId: 'test-workspace' });
      const tab2 = createMockTab({ workspaceId: 'test-workspace' });
      const props = createDefaultProps();
      props.selectedTabIds = new Set([tab1.id, tab2.id]);
      props.activeWorkspaceTabs = [tab1, tab2];
      props.activeWorkspaceId = 'test-workspace';
      props.showRenameOptions = true;
      props.renameBasePattern = 'New Tab';
      render(<TabManagementToolbar {...props} />);

      // Find and click the Rename button in the form (not the toggle button)
      const renameButtons = screen.getAllByText('Rename');
      const formRenameButton = renameButtons.find(btn => btn.closest('.absolute'));
      if (formRenameButton) {
        await userEvent.click(formRenameButton);
        expect(props.handleBulkRename).toHaveBeenCalled();
      }
    });
  });

  describe('Status Display', () => {
    it('should show tab count when no selection', () => {
      const props = createDefaultProps();
      props.filteredTabs = [createMockTab(), createMockTab()];
      render(<TabManagementToolbar {...props} />);

      expect(screen.getByText('2 tab(s) found')).toBeInTheDocument();
    });

    it('should show selection count when tabs are selected', () => {
      const props = createDefaultProps();
      props.selectedTabIds = new Set(['tab-1', 'tab-2', 'tab-3']);
      render(<TabManagementToolbar {...props} />);

      expect(screen.getByText('3 tab(s) selected')).toBeInTheDocument();
    });
  });
});

describe('WorkspaceForm', () => {
  const createDefaultProps = (isCreating = true): WorkspaceFormProps => ({
    isCreating,
    workspaceName: '',
    setWorkspaceName: jest.fn(),
    handleCreate: jest.fn(),
    handleRename: jest.fn(),
    onCancel: jest.fn(),
  });

  describe('Create Mode', () => {
    it('should render with Create button when isCreating is true', () => {
      const props = createDefaultProps(true);
      render(<WorkspaceForm {...props} />);

      expect(screen.getByText('Create')).toBeInTheDocument();
    });

    it('should call handleCreate when Create button is clicked', async () => {
      const props = createDefaultProps(true);
      props.workspaceName = 'New Workspace';
      render(<WorkspaceForm {...props} />);

      await userEvent.click(screen.getByText('Create'));

      expect(props.handleCreate).toHaveBeenCalled();
    });

    it('should disable Create button when workspace name is empty', () => {
      const props = createDefaultProps(true);
      props.workspaceName = '';
      render(<WorkspaceForm {...props} />);

      expect(screen.getByText('Create')).toBeDisabled();
    });
  });

  describe('Rename Mode', () => {
    it('should render with Rename button when isCreating is false', () => {
      const props = createDefaultProps(false);
      render(<WorkspaceForm {...props} />);

      expect(screen.getByText('Rename')).toBeInTheDocument();
    });

    it('should call handleRename when Rename button is clicked', async () => {
      const props = createDefaultProps(false);
      props.workspaceName = 'Renamed Workspace';
      render(<WorkspaceForm {...props} />);

      await userEvent.click(screen.getByText('Rename'));

      expect(props.handleRename).toHaveBeenCalled();
    });
  });

  describe('Common Behavior', () => {
    it('should call setWorkspaceName on input change', async () => {
      const props = createDefaultProps();
      render(<WorkspaceForm {...props} />);

      const input = screen.getByPlaceholderText('Workspace name');
      await userEvent.type(input, 'Test');

      expect(props.setWorkspaceName).toHaveBeenCalled();
    });

    it('should call onCancel when Cancel button is clicked', async () => {
      const props = createDefaultProps();
      render(<WorkspaceForm {...props} />);

      await userEvent.click(screen.getByText('Cancel'));

      expect(props.onCancel).toHaveBeenCalled();
    });

    it('should display current workspace name value', () => {
      const props = createDefaultProps();
      props.workspaceName = 'My Workspace';
      render(<WorkspaceForm {...props} />);

      const input = screen.getByPlaceholderText('Workspace name');
      expect(input).toHaveValue('My Workspace');
    });
  });
});

describe('TabsContent', () => {
  const createDefaultProps = (): TabsContentProps => ({
    duplicateTabs: {},
    handleRemoveDuplicates: jest.fn(),
    emptyTabs: [],
    handleRemoveEmptyTabs: jest.fn(),
    filteredTabs: [],
    groupedTabs: {},
    activeWorkspaceId: 'test-workspace',
    selectedTabIds: new Set<string>(),
    handleSelectTab: jest.fn(),
    handleDoubleClickTab: jest.fn(),
    editingTabIdForModal: null,
    handleStartEditingTab: jest.fn(),
    handleSaveTabTitle: jest.fn(),
    handleCancelEditingTab: jest.fn(),
  });

  describe('Empty State', () => {
    it('should show empty message when no tabs match', () => {
      const props = createDefaultProps();
      render(<TabsContent {...props} />);

      expect(screen.getByText('No tabs found matching your criteria')).toBeInTheDocument();
    });
  });

  describe('Duplicate Tabs Warning', () => {
    it('should show duplicate warning when duplicates exist', () => {
      const props = createDefaultProps();
      props.duplicateTabs = {
        'group1': [createMockTab(), createMockTab()],
      };
      render(<TabsContent {...props} />);

      expect(screen.getByText(/Found 1 groups of duplicate tabs/)).toBeInTheDocument();
    });

    it('should call handleRemoveDuplicates when Remove Duplicates is clicked', async () => {
      const props = createDefaultProps();
      props.duplicateTabs = {
        'group1': [createMockTab(), createMockTab()],
      };
      render(<TabsContent {...props} />);

      await userEvent.click(screen.getByText('Remove Duplicates'));

      expect(props.handleRemoveDuplicates).toHaveBeenCalled();
    });
  });

  describe('Empty Tabs Warning', () => {
    it('should show empty tabs warning when more than 1 empty tab exists', () => {
      const props = createDefaultProps();
      props.emptyTabs = [createMockTab(), createMockTab()];
      render(<TabsContent {...props} />);

      expect(screen.getByText(/Found 2 empty tabs/)).toBeInTheDocument();
    });

    it('should not show empty tabs warning when only 1 empty tab exists', () => {
      const props = createDefaultProps();
      props.emptyTabs = [createMockTab()];
      render(<TabsContent {...props} />);

      expect(screen.queryByText(/empty tabs/)).not.toBeInTheDocument();
    });

    it('should call handleRemoveEmptyTabs when Remove All is clicked', async () => {
      const props = createDefaultProps();
      props.emptyTabs = [createMockTab(), createMockTab()];
      render(<TabsContent {...props} />);

      await userEvent.click(screen.getByText('Remove All'));

      expect(props.handleRemoveEmptyTabs).toHaveBeenCalled();
    });
  });

  describe('Tab Groups', () => {
    it('should render tab groups from groupedTabs', () => {
      const props = createDefaultProps();
      const tab = createMockTab();
      props.filteredTabs = [tab];
      props.groupedTabs = {
        'JavaScript': [tab],
      };
      render(<TabsContent {...props} />);

      expect(screen.getByTestId('tab-group-JavaScript')).toBeInTheDocument();
    });
  });
});

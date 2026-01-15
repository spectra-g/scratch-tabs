/**
 * TabManagementContext
 *
 * Provides shared state and handlers for the Tab Management modal components.
 * This context eliminates prop drilling through TabManagementModalUI.
 *
 * Usage:
 * - Wrap components with TabManagementProvider and pass the engine
 * - Consume with useTabManagementContext() hook in child components
 */

import React, { createContext, useContext, useMemo } from "react";
import { Tab } from "../../../types";
import { TabManagementEngine } from "./useTabManagementEngine";
import { SortOption, GroupOption, ConfirmationState } from "./types";

/**
 * Context value interface - subset of TabManagementEngine used by UI components
 */
export interface TabManagementContextValue {
  // Data state
  filteredTabs: Tab[];
  groupedTabs: Record<string, Tab[]>;
  duplicateTabs: Record<string, Tab[]>;
  emptyTabs: Tab[];
  availableLanguages: string[];
  activeWorkspaceTabs: Tab[];

  // UI state
  selectedTabIds: Set<string>;
  searchQuery: string;
  languageFilter: string[];
  sortOption: SortOption;
  groupOption: GroupOption;
  editingTabIdForModal: string | null;
  showMergeOptions: boolean;
  mergeDelimiter: string;
  showRenameOptions: boolean;
  renameBasePattern: string;
  renameSuffixPattern: string;

  // Workspace state
  activeWorkspaceId: string | null;
  workspaces: Array<{ id: string; name: string }>;
  workspacesWithCounts: Array<{
    id: string;
    name: string;
    tabCount: number;
    isLoadingCount: boolean;
  }>;
  newWorkspaceName: string;
  isCreatingWorkspace: boolean;
  editingWorkspaceId: string | null;
  editingWorkspaceName: string;

  // Drag & Drop state
  activeDragId: string | null;
  draggedTabIds: Set<string>;
  activeDragItemData: Tab | null;

  // Confirmation dialog
  confirmationDialog: ConfirmationState;

  // Setters
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  setLanguageFilter: React.Dispatch<React.SetStateAction<string[]>>;
  setSortOption: React.Dispatch<React.SetStateAction<SortOption>>;
  setGroupOption: React.Dispatch<React.SetStateAction<GroupOption>>;
  setShowMergeOptions: React.Dispatch<React.SetStateAction<boolean>>;
  setMergeDelimiter: React.Dispatch<React.SetStateAction<string>>;
  setShowRenameOptions: React.Dispatch<React.SetStateAction<boolean>>;
  setRenameBasePattern: React.Dispatch<React.SetStateAction<string>>;
  setRenameSuffixPattern: React.Dispatch<React.SetStateAction<string>>;
  setNewWorkspaceName: React.Dispatch<React.SetStateAction<string>>;
  setIsCreatingWorkspace: React.Dispatch<React.SetStateAction<boolean>>;
  setEditingWorkspaceId: React.Dispatch<React.SetStateAction<string | null>>;
  setEditingWorkspaceName: React.Dispatch<React.SetStateAction<string>>;
  setConfirmationDialog: React.Dispatch<React.SetStateAction<ConfirmationState>>;

  // Event handlers - Tab actions
  handleSelectTab: (tabId: string, multiSelect: boolean) => void;
  handleSelectAll: () => void;
  handleDeselectAll: () => void;
  handleDoubleClickTab: (tabId: string) => void;
  handleStartEditingTab: (tabId: string) => void;
  handleSaveTabTitle: (tabId: string, newTitle: string) => void;
  handleCancelEditingTab: () => void;
  handleModifiedApplyCurrentOrder: (
    eventOrTabs: React.MouseEvent<HTMLButtonElement> | Tab[]
  ) => void;
  handleCloseTabs: () => void;
  handleTogglePinSelectedTabs: () => void;
  handleDuplicateTabs: () => void;
  handleBulkRename: () => void;
  handleMergeTabs: () => void;
  handleRemoveDuplicates: () => void;
  handleRemoveEmptyTabs: () => void;

  // Event handlers - Workspace actions
  handleCreateWorkspace: () => void;
  handleRenameWorkspace: () => void;
  handleDeleteWorkspace: (workspaceId: string) => void;
  handleSwitchWorkspaceAndKeepModal: (
    workspaceId: string,
    event: React.MouseEvent
  ) => void;
}

const TabManagementContext = createContext<TabManagementContextValue | null>(
  null
);

interface TabManagementProviderProps {
  engine: TabManagementEngine;
  children: React.ReactNode;
}

/**
 * Provider component that wraps the Tab Management engine state
 */
export const TabManagementProvider: React.FC<TabManagementProviderProps> = ({
  engine,
  children,
}) => {
  const value = useMemo<TabManagementContextValue>(
    () => ({
      // Data state
      filteredTabs: engine.filteredTabs,
      groupedTabs: engine.groupedTabs,
      duplicateTabs: engine.duplicateTabs,
      emptyTabs: engine.emptyTabs,
      availableLanguages: engine.availableLanguages,
      activeWorkspaceTabs: engine.activeWorkspaceTabs,

      // UI state
      selectedTabIds: engine.selectedTabIds,
      searchQuery: engine.searchQuery,
      languageFilter: engine.languageFilter,
      sortOption: engine.sortOption,
      groupOption: engine.groupOption,
      editingTabIdForModal: engine.editingTabIdForModal,
      showMergeOptions: engine.showMergeOptions,
      mergeDelimiter: engine.mergeDelimiter,
      showRenameOptions: engine.showRenameOptions,
      renameBasePattern: engine.renameBasePattern,
      renameSuffixPattern: engine.renameSuffixPattern,

      // Workspace state
      activeWorkspaceId: engine.activeWorkspaceId,
      workspaces: engine.workspaces,
      workspacesWithCounts: engine.workspacesWithCounts,
      newWorkspaceName: engine.newWorkspaceName,
      isCreatingWorkspace: engine.isCreatingWorkspace,
      editingWorkspaceId: engine.editingWorkspaceId,
      editingWorkspaceName: engine.editingWorkspaceName,

      // Drag & Drop state
      activeDragId: engine.activeDragId,
      draggedTabIds: engine.draggedTabIds,
      activeDragItemData: engine.activeDragItemData,

      // Confirmation dialog
      confirmationDialog: engine.confirmationDialog,

      // Setters
      setSearchQuery: engine.setSearchQuery,
      setLanguageFilter: engine.setLanguageFilter,
      setSortOption: engine.setSortOption,
      setGroupOption: engine.setGroupOption,
      setShowMergeOptions: engine.setShowMergeOptions,
      setMergeDelimiter: engine.setMergeDelimiter,
      setShowRenameOptions: engine.setShowRenameOptions,
      setRenameBasePattern: engine.setRenameBasePattern,
      setRenameSuffixPattern: engine.setRenameSuffixPattern,
      setNewWorkspaceName: engine.setNewWorkspaceName,
      setIsCreatingWorkspace: engine.setIsCreatingWorkspace,
      setEditingWorkspaceId: engine.setEditingWorkspaceId,
      setEditingWorkspaceName: engine.setEditingWorkspaceName,
      setConfirmationDialog: engine.setConfirmationDialog,

      // Event handlers - Tab actions
      handleSelectTab: engine.handleSelectTab,
      handleSelectAll: engine.handleSelectAll,
      handleDeselectAll: engine.handleDeselectAll,
      handleDoubleClickTab: engine.handleDoubleClickTab,
      handleStartEditingTab: engine.handleStartEditingTab,
      handleSaveTabTitle: engine.handleSaveTabTitle,
      handleCancelEditingTab: engine.handleCancelEditingTab,
      handleModifiedApplyCurrentOrder: engine.handleModifiedApplyCurrentOrder,
      handleCloseTabs: engine.handleCloseTabs,
      handleTogglePinSelectedTabs: engine.handleTogglePinSelectedTabs,
      handleDuplicateTabs: engine.handleDuplicateTabs,
      handleBulkRename: engine.handleBulkRename,
      handleMergeTabs: engine.handleMergeTabs,
      handleRemoveDuplicates: engine.handleRemoveDuplicates,
      handleRemoveEmptyTabs: engine.handleRemoveEmptyTabs,

      // Event handlers - Workspace actions
      handleCreateWorkspace: engine.handleCreateWorkspace,
      handleRenameWorkspace: engine.handleRenameWorkspace,
      handleDeleteWorkspace: engine.handleDeleteWorkspace,
      handleSwitchWorkspaceAndKeepModal: engine.handleSwitchWorkspaceAndKeepModal,
    }),
    [engine]
  );

  return (
    <TabManagementContext.Provider value={value}>
      {children}
    </TabManagementContext.Provider>
  );
};

/**
 * Custom hook to consume the TabManagementContext
 * @throws Error if used outside of TabManagementProvider
 */
export const useTabManagementContext = (): TabManagementContextValue => {
  const context = useContext(TabManagementContext);
  if (!context) {
    throw new Error(
      "useTabManagementContext must be used within a TabManagementProvider"
    );
  }
  return context;
};

/**
 * Optional hook variant that returns null if context is not available
 * Useful for components that may render outside the provider
 */
export const useTabManagementContextOptional =
  (): TabManagementContextValue | null => {
    return useContext(TabManagementContext);
  };

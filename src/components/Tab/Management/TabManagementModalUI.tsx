import React from "react";
import { DndContext } from "@dnd-kit/core";
import { FolderPlus } from "lucide-react";
import { BaseModal } from "../../../formats/json/components/modals/BaseModal";
import { ConfirmationDialog } from "./ConfirmationDialog";
import { WorkspaceSidebar } from "./WorkspaceSidebar";
import {
  TabManagementToolbar,
  TabsContent,
  WorkspaceForm,
  DragOverlayUI,
} from "./TabManagementUI";
import { TabManagementEngine } from "./useTabManagementEngine";

interface TabManagementModalUIProps {
  engine: TabManagementEngine;
}

export const TabManagementModalUI: React.FC<TabManagementModalUIProps> = ({
  engine,
}) => {
  const {
    // UI State
    newWorkspaceName,
    isCreatingWorkspace,
    editingWorkspaceId,
    editingWorkspaceName,
    searchQuery,
    availableLanguages,
    languageFilter,
    sortOption,
    groupOption,
    selectedTabIds,
    filteredTabs,
    showRenameOptions,
    renameBasePattern,
    renameSuffixPattern,
    showMergeOptions,
    mergeDelimiter,
    activeWorkspaceTabs,
    activeWorkspaceId,
    duplicateTabs,
    emptyTabs,
    groupedTabs,
    editingTabIdForModal,
    activeDragId,
    activeDragItemData,
    draggedTabIds,
    sensors,
    confirmationDialog,
    modalContentRef,
    workspacesWithCounts,
    workspaces,

    // Setters
    setNewWorkspaceName,
    setIsCreatingWorkspace,
    setEditingWorkspaceId,
    setEditingWorkspaceName,
    setSearchQuery,
    setLanguageFilter,
    setSortOption,
    setGroupOption,
    setShowRenameOptions,
    setRenameBasePattern,
    setRenameSuffixPattern,
    setShowMergeOptions,
    setMergeDelimiter,
    setConfirmationDialog,

    // Event handlers
    handleCreateWorkspace,
    handleRenameWorkspace,
    handleSwitchWorkspaceAndKeepModal,
    handleDeleteWorkspace,
    handleDeselectAll,
    handleSelectAll,
    handleModifiedApplyCurrentOrder,
    handleTogglePinSelectedTabs,
    handleDuplicateTabs,
    handleBulkRename,
    handleMergeTabs,
    handleCloseTabs,
    handleRemoveDuplicates,
    handleRemoveEmptyTabs,
    handleSelectTab,
    handleDoubleClickTab,
    handleStartEditingTab,
    handleSaveTabTitle,
    handleCancelEditingTab,
    handleBaseModalClose,
    handleDragStart,
    handleDragEnd,
  } = engine;

  return (
    <BaseModal
      title="Tab Management"
      onClose={handleBaseModalClose}
      maxWidthClass="max-w-6xl"
      maxHeightClass="max-h-[90vh]"
    >
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div ref={modalContentRef} className="flex h-[70vh]">
          {/* Left sidebar - Workspaces */}
          <div className="w-64 border-r border-themed flex flex-col">
            <div className="p-3 border-b border-themed">
              <h3 className="text-sm font-medium text-themed-secondary mb-2">
                Workspaces
              </h3>

              {/* Create workspace button */}
              <button
                onClick={() => setIsCreatingWorkspace(true)}
                className="w-full flex items-center justify-center space-x-1 px-3 py-1.5 bg-blue-500/10 text-blue-500 rounded-md hover:bg-blue-500/20 transition-colors text-sm"
              >
                <FolderPlus size={14} />
                <span>New Workspace</span>
              </button>

              {/* Create workspace form */}
              {isCreatingWorkspace && (
                <WorkspaceForm
                  isCreating={true}
                  workspaceName={newWorkspaceName}
                  setWorkspaceName={setNewWorkspaceName}
                  handleCreate={handleCreateWorkspace}
                  onCancel={() => setIsCreatingWorkspace(false)}
                />
              )}

              {/* Edit workspace form */}
              {editingWorkspaceId && (
                <WorkspaceForm
                  isCreating={false}
                  workspaceName={editingWorkspaceName}
                  setWorkspaceName={setEditingWorkspaceName}
                  handleRename={handleRenameWorkspace}
                  onCancel={() => {
                    setEditingWorkspaceId(null);
                    setEditingWorkspaceName("");
                  }}
                />
              )}
            </div>

            {/* Workspace list */}
            <WorkspaceSidebar
              workspaces={workspacesWithCounts}
              activeWorkspaceId={activeWorkspaceId}
              onSelect={handleSwitchWorkspaceAndKeepModal}
              onRename={(id) => {
                setEditingWorkspaceId(id);
                const workspace = workspaces.find((w) => w.id === id);
                if (workspace) {
                  setEditingWorkspaceName(workspace.name);
                }
              }}
              onDelete={handleDeleteWorkspace}
            />
          </div>

          {/* Main content - Tabs */}
          <div className="flex-1 flex flex-col">
            {/* Toolbar */}
            <TabManagementToolbar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              availableLanguages={availableLanguages}
              languageFilter={languageFilter}
              setLanguageFilter={setLanguageFilter}
              sortOption={sortOption}
              setSortOption={setSortOption}
              groupOption={groupOption}
              setGroupOption={setGroupOption}
              selectedTabIds={selectedTabIds}
              filteredTabs={filteredTabs}
              handleDeselectAll={handleDeselectAll}
              handleSelectAll={handleSelectAll}
              handleApplyCurrentOrder={handleModifiedApplyCurrentOrder}
              handleTogglePinSelectedTabs={handleTogglePinSelectedTabs}
              handleDuplicateTabs={handleDuplicateTabs}
              showRenameOptions={showRenameOptions}
              setShowRenameOptions={setShowRenameOptions}
              renameBasePattern={renameBasePattern}
              setRenameBasePattern={setRenameBasePattern}
              renameSuffixPattern={renameSuffixPattern}
              setRenameSuffixPattern={setRenameSuffixPattern}
              handleBulkRename={handleBulkRename}
              showMergeOptions={showMergeOptions}
              setShowMergeOptions={setShowMergeOptions}
              mergeDelimiter={mergeDelimiter}
              setMergeDelimiter={setMergeDelimiter}
              handleMergeTabs={handleMergeTabs}
              handleCloseTabs={handleCloseTabs}
              activeWorkspaceTabs={activeWorkspaceTabs}
              activeWorkspaceId={activeWorkspaceId}
            />

            {/* Tab list */}
            <TabsContent
              duplicateTabs={duplicateTabs}
              handleRemoveDuplicates={handleRemoveDuplicates}
              emptyTabs={emptyTabs}
              handleRemoveEmptyTabs={handleRemoveEmptyTabs}
              filteredTabs={filteredTabs}
              groupedTabs={groupedTabs}
              activeWorkspaceId={activeWorkspaceId}
              selectedTabIds={selectedTabIds}
              handleSelectTab={handleSelectTab}
              handleDoubleClickTab={handleDoubleClickTab}
              editingTabIdForModal={editingTabIdForModal}
              handleStartEditingTab={handleStartEditingTab}
              handleSaveTabTitle={handleSaveTabTitle}
              handleCancelEditingTab={handleCancelEditingTab}
            />
          </div>
        </div>

        <DragOverlayUI
          activeDragId={activeDragId}
          activeDragItemData={activeDragItemData}
          draggedTabIds={draggedTabIds}
        />
      </DndContext>

      {/* Confirmation dialog */}
      <ConfirmationDialog
        isOpen={confirmationDialog.isOpen}
        title={confirmationDialog.title}
        message={confirmationDialog.message}
        confirmText={confirmationDialog.confirmText}
        cancelText={confirmationDialog.cancelText}
        onConfirm={confirmationDialog.onConfirm}
        onCancel={() =>
          setConfirmationDialog((prev) => ({ ...prev, isOpen: false }))
        }
        isDestructive={confirmationDialog.isDestructive}
      />
    </BaseModal>
  );
};

import React from "react";
import { DndContext } from "@dnd-kit/core";
import { FolderPlus } from "lucide-react";
import { BaseModal } from "../../../formats/json/components/modals/BaseModal";
import { ConfirmationDialog } from "./ConfirmationDialog";
import { WorkspaceSidebar } from "./WorkspaceSidebar";
import {
  ConnectedTabManagementToolbar,
  ConnectedTabsContent,
  ConnectedWorkspaceForm,
  ConnectedDragOverlayUI,
} from "./TabManagementUI";
import { TabManagementProvider } from "./TabManagementContext";
import { TabManagementEngine } from "./useTabManagementEngine";

interface TabManagementModalUIProps {
  engine: TabManagementEngine;
}

export const TabManagementModalUI: React.FC<TabManagementModalUIProps> = ({
  engine,
}) => {
  // Only destructure values needed for UI structure (not passed to children)
  const {
    isCreatingWorkspace,
    editingWorkspaceId,
    activeWorkspaceId,
    sensors,
    confirmationDialog,
    modalContentRef,
    workspacesWithCounts,
    workspaces,

    // Setters needed at this level
    setIsCreatingWorkspace,
    setEditingWorkspaceId,
    setEditingWorkspaceName,
    setConfirmationDialog,

    // Event handlers needed at this level
    handleSwitchWorkspaceAndKeepModal,
    handleDeleteWorkspace,
    handleBaseModalClose,
    handleDragStart,
    handleDragEnd,
  } = engine;

  return (
    <TabManagementProvider engine={engine}>
      <BaseModal
        title="Tab Management"
        onClose={handleBaseModalClose}
        widthClass="w-modal-lg"
        maxWidthClass="max-w-[1600px]"
        maxHeightClass="max-h-[90vh]"
      >
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div ref={modalContentRef} className="flex h-[70vh]">
            {/* Left sidebar - Workspaces */}
            <div className="w-64 border-r border-base bg-surface-highlight flex flex-col">
              <div className="p-3 border-b border-base">
                <h3 className="text-sm font-medium text-secondary mb-2">
                  Workspaces
                </h3>

                {/* Create workspace button */}
                <button
                  onClick={() => setIsCreatingWorkspace(true)}
                  className="w-full flex items-center justify-center space-x-1 px-3 py-1.5 bg-primary/10 text-info rounded-md hover:bg-primary/20 transition-colors text-sm"
                >
                  <FolderPlus size={14} />
                  <span>New Workspace</span>
                </button>

                {/* Create workspace form */}
                {isCreatingWorkspace && (
                  <ConnectedWorkspaceForm
                    isCreating={true}
                    onCancel={() => setIsCreatingWorkspace(false)}
                  />
                )}

                {/* Edit workspace form */}
                {editingWorkspaceId && (
                  <ConnectedWorkspaceForm
                    isCreating={false}
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
              {/* Toolbar - now consumes from context */}
              <ConnectedTabManagementToolbar />

              {/* Tab list - now consumes from context */}
              <ConnectedTabsContent />
            </div>
          </div>

          {/* Drag overlay - now consumes from context */}
          <ConnectedDragOverlayUI />
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
    </TabManagementProvider>
  );
};

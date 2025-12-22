import React, { useState, useRef, useEffect } from "react";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { useModalStore } from "../../stores/modalStore";
import { useClickOutside } from "../../hooks/useClickOutside";
import {
  Folders,
  MoreHorizontal,
  Pencil,
  Trash2,
  Plus,
  Upload,
  Download,
  ListTodo,
} from "lucide-react";
import { StorageProviderFactory } from "../../db";
import { ExportWorkspacesModal } from "./ExportWorkspacesModal";
import { ImportWorkspacesModal } from "./ImportWorkspacesModal";
import { TabManagementModal } from "../Tab/Management";

export const WorkspaceSwitcher: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [showContextMenu, setShowContextMenu] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const [tabCounts, setTabCounts] = useState<Record<string, number>>({});
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Use modal store instead of local state
  const {
    isTabManagementModalOpen,
    openTabManagementModal,
    closeTabManagementModal,
    isImportModalActive,
    openImportModal,
    closeImportModal,
  } = useModalStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    workspaces,
    activeWorkspaceId,
    createWorkspace,
    switchWorkspace,
    renameWorkspace,
    deleteWorkspace,
  } = useWorkspaceStore();

  // Get the current workspace name for accessibility
  const currentWorkspace = workspaces.find(ws => ws.id === activeWorkspaceId);
  const currentWorkspaceName = currentWorkspace?.name || "Default Workspace";

  // Fetch tab counts when dropdown opens
  useEffect(() => {
    if (isOpen) {
      const storage = StorageProviderFactory.getProvider();
      Promise.all(
        workspaces.map(async (ws) => {
          const tabs = await storage.getTabsByWorkspace(ws.id);
          return { id: ws.id, count: tabs.length };
        }),
      ).then((results) => {
        const counts: Record<string, number> = {};
        results.forEach(({ id, count }) => {
          counts[id] = count;
        });
        setTabCounts(counts);
      });
    }
  }, [isOpen, workspaces]);

  // Handle clicks outside the dropdown menu and button
  useClickOutside([containerRef, buttonRef], () => {
    if (!showContextMenu) {
      setIsOpen(false);
    }
  });

  // Handle clicks outside the context menu
  useClickOutside([contextMenuRef], () => {
    setShowContextMenu(null);
  });

  // Close everything when clicking outside both menus
  useClickOutside([containerRef, buttonRef, contextMenuRef], () => {
    setIsOpen(false);
    setShowContextMenu(null);
  });

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;
    try {
      await createWorkspace(newWorkspaceName.trim());
      setNewWorkspaceName("");
      setIsCreating(false);
    } catch (error) {
      console.error("[WorkspaceSwitcher] Failed to create workspace:", error);
    }
  };

  const handleRenameWorkspace = async (id: string) => {
    if (!editingName.trim()) return;
    try {
      await renameWorkspace(id, editingName.trim());
      setEditingId(null);
      setEditingName("");
    } catch (error) {
      console.error("[WorkspaceSwitcher] Failed to rename workspace:", error);
    }
  };

  const handleDeleteWorkspace = async (id: string) => {
    if (!confirm("Are you sure you want to delete this workspace?")) {
      return;
    }

    try {
      await deleteWorkspace(id);
      setShowContextMenu(null);
    } catch (error) { }
  };

  const handleSwitchWorkspace = async (id: string) => {
    try {
      await switchWorkspace(id);
      setIsOpen(false);
    } catch (error) {
      console.error("[WorkspaceSwitcher] Failed to switch workspace:", error);
    }
  };

  const toggleDropdown = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownTop = rect.bottom + 4;

      if (containerRef.current) {
        containerRef.current.style.top = `${dropdownTop}px`;
        containerRef.current.style.right = "8px";
        containerRef.current.style.left = "auto";
      }
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative h-8 flex items-center">
      <button
        ref={buttonRef}
        onClick={toggleDropdown}
        className="h-full px-2 rounded-md transition-colors flex items-center space-x-2"
        title="Switch Workspace"
        data-testid="workspace-switcher"
        aria-label={currentWorkspaceName}
      >
        <Folders size={16} className="icon-themed" />
      </button>

      {isOpen && (
        <div
          ref={containerRef}
          className="fixed w-64 bg-surface border border-base rounded-lg shadow-2xl overflow-hidden flex flex-col"
          style={{
            top: buttonRef.current
              ? buttonRef.current.getBoundingClientRect().bottom + 4
              : 40,
            right: "8px",
            maxHeight: "80vh",
            maxWidth: "calc(100vw - 16px)",
            zIndex: 9999,
          }}
        >
          {/* Header */}
          <div className="px-3 py-2 border-b border-base flex-shrink-0">
            <h3 className="text-sm font-medium text-main">Workspaces</h3>
          </div>

          {/* Workspace List - Scrollable */}
          <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
            <div className="py-1">
              {workspaces.map((workspace) => (
                <div
                  key={workspace.id}
                  className={`group relative flex items-center justify-between px-3 py-2 hover:bg-element-hover transition-colors cursor-pointer ${workspace.id === activeWorkspaceId ? "bg-element-active" : ""
                    }`}
                  onClick={() => handleSwitchWorkspace(workspace.id)}
                >
                  {editingId === workspace.id ? (
                    <input
                      ref={inputRef}
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter")
                          handleRenameWorkspace(workspace.id);
                        if (e.key === "Escape") {
                          setEditingId(null);
                          setEditingName("");
                        }
                      }}
                      onBlur={() => handleRenameWorkspace(workspace.id)}
                      className="flex-1 bg-surface-highlight border border-base rounded px-2 py-1 text-sm text-main"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <>
                      <span className="flex-1 text-left text-sm text-main truncate">
                        {workspace.name}{" "}
                        {typeof tabCounts[workspace.id] === "number" ? (
                          <span className="text-muted">
                            ({tabCounts[workspace.id]})
                          </span>
                        ) : null}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setShowContextMenu({
                            id: workspace.id,
                            x: rect.right,
                            y: rect.top,
                          });
                        }}
                        className="p-1 text-muted hover:text-main opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal size={14} />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Actions - Always Visible */}
          <div className="flex-shrink-0">
            {/* Create New Workspace */}
            <div className="px-3 py-2 border-t border-base">
              {isCreating ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateWorkspace();
                      if (e.key === "Escape") {
                        setIsCreating(false);
                        setNewWorkspaceName("");
                      }
                    }}
                    placeholder="Workspace name"
                    className="w-full bg-surface-highlight border border-base rounded px-2 py-1 text-sm text-main"
                    autoFocus
                  />
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => {
                        setIsCreating(false);
                        setNewWorkspaceName("");
                      }}
                      className="px-3 py-1 text-sm text-muted hover:text-main transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateWorkspace}
                      disabled={!newWorkspaceName.trim()}
                      className="px-3 py-1 text-sm bg-primary text-white rounded hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Create
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCreating(true);
                  }}
                  className="w-full text-left text-sm text-muted hover:text-main flex items-center space-x-2"
                >
                  <Plus size={14} />
                  <span>New workspace</span>
                </button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="px-1 py-1 border-t border-base">
              <button
                onClick={() => {
                  openTabManagementModal();
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-main hover:bg-element-hover flex items-center space-x-2 transition-colors rounded-md"
              >
                <ListTodo size={14} />
                <span>Manage Tabs...</span>
              </button>
              <button
                onClick={() => {
                  setIsExportModalOpen(true);
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-main hover:bg-element-hover flex items-center space-x-2 transition-colors rounded-md"
              >
                <Download size={14} />
                <span>Export Workspaces...</span>
              </button>
              <button
                onClick={() => {
                  openImportModal();
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-main hover:bg-element-hover flex items-center space-x-2 transition-colors rounded-md"
              >
                <Upload size={14} />
                <span>Import Workspaces...</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {showContextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed bg-surface border border-base rounded-lg shadow-xl py-1 min-w-[120px]"
          style={{
            top: showContextMenu.y,
            right: window.innerWidth - showContextMenu.x,
            zIndex: 10000,
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditingId(showContextMenu.id);
              setEditingName(
                workspaces.find((w) => w.id === showContextMenu.id)?.name || "",
              );
              setShowContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 text-sm text-main hover:bg-element-hover flex items-center space-x-2"
          >
            <Pencil size={14} />
            <span>Rename</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteWorkspace(showContextMenu.id);
            }}
            className="w-full text-left px-3 py-1.5 text-sm text-danger hover:bg-element-hover flex items-center space-x-2"
          >
            <Trash2 size={14} />
            <span>Delete</span>
          </button>
        </div>
      )}
      <ExportWorkspacesModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
      <ImportWorkspacesModal
        isOpen={isImportModalActive}
        onClose={closeImportModal}
      />
      <TabManagementModal
        isOpen={isTabManagementModalOpen}
        onClose={() => closeTabManagementModal()}
      />
    </div>
  );
};

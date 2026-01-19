import React, { useRef, useEffect, useCallback, useState } from "react";
import { useLocation } from "react-router-dom";
import { useRootStore } from "../../stores";
import { ToolSelectorModal } from "../ToolSelector";
import { toolService, ToolItem } from "../../services/toolService";
import { TabActions } from "../Tab/TabActions";
import { FileText, Extension, Upload, FolderOpen, File, Package } from "../Icons";
import { ImportExportService } from "../../features/import-export/ImportExportService";
export const WelcomeScreen: React.FC = () => {
  const { handleNewTab, handleNewPopulatedTab } = useRootStore();
  const welcomeRef = useRef<HTMLDivElement>(null);
  const tabletButtonRef = useRef<HTMLButtonElement>(null);

  const location = useLocation();
  const pathSegments = location.pathname.split("/").filter(Boolean);

  const [showToolSelector, setShowToolSelector] = useState(false);

  const handleDoubleClick = useCallback(() => {
    handleNewTab(false);
  }, [handleNewTab]);

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent<HTMLDivElement>) => {
      const text = e.clipboardData.getData("text");
      if (text) {
        handleNewTab(false, text);
      }
    },
    [handleNewTab],
  );

  const handleToolSelect = useCallback(
    async (item: ToolItem) => {
      await toolService.executeTool(item, {
        side: 'left',
        activeWorkspaceId: '', // Default for welcome
        addTab: (tabData) => handleNewPopulatedTab(tabData),
      });
      setShowToolSelector(false);
    },
    [handleNewPopulatedTab],
  );

  const handleCreateNewTab = useCallback(() => {
    handleNewTab(false);
  }, [handleNewTab]);

  const handleOpenToolSelector = useCallback(() => {
    // Delay opening the selector slightly (50ms) to allow double-clicks on the
    // trigger button to propagate to the container first. This prevents the
    // modal from intercepting the second click of a double-click action.
    setTimeout(() => {
      setShowToolSelector(true);
    }, 50);
  }, []);

  const handleImportFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        handleNewTab(false, text);
      }
    } catch (err) {
      console.error("Failed to read from clipboard:", err);
      // Fallback: could show a message to user that they should use Ctrl+V instead
    }
  }, [handleNewTab]);

  const handleOpenFile = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "*/*"; // Accept all file types
    input.style.display = "none";

    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          if (content) {
            // Extract filename without extension for tab title
            handleNewTab(false, content);
            // Update the tab title after creation
            // Note: This is a simplified approach - in a real implementation
            // you might want to wait for the tab to be created and then update its title
          }
        };
        reader.readAsText(file);
      }
      // Clean up
      document.body.removeChild(input);
    };

    document.body.appendChild(input);
    input.click();
  }, [handleNewTab]);

  const handleImportWorkspace = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".scratch";
    input.style.display = "none";

    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          // Check if it's a .scratch file
          if (!file.name.endsWith(".scratch")) {
            alert("Invalid file type. Please select a '.scratch' file.");
            return;
          }

          const service = new ImportExportService();
          const importResult = await service.importWorkspaces(file);

          if (importResult.errors.length > 0) {
            const errorMessage = importResult.errors.join("\n");
            alert(`Import encountered errors:\n${errorMessage}`);
          }

          if (importResult.importedWorkspaces.length > 0) {
            const importedCount = importResult.importedWorkspaces.length;
            alert(`Successfully imported ${importedCount} workspace${importedCount === 1 ? "" : "s"}! Reloading page...`);
            window.location.reload();
          } else if (importResult.errors.length === 0) {
            alert("No workspaces were imported. The file might have been empty or contained no new data.");
          }
        } catch (error) {
          alert(`Import failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      // Clean up
      document.body.removeChild(input);
    };

    document.body.appendChild(input);
    input.click();
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !showToolSelector &&
        pathSegments.length === 0 &&
        location.pathname === "/"
      ) {
        handleOpenToolSelector();
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      document.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [showToolSelector, handleOpenToolSelector]);

  const actions = [
    {
      icon: FileText,
      title: "Start scratching",
      action: "Double-click anywhere",
      onClick: handleCreateNewTab,
      clickable: true,
    },
    {
      icon: File,
      title: "Open file",
      action: "Open file from your computer",
      onClick: handleOpenFile,
      clickable: true,
    },
    {
      icon: Extension,
      title: "Open specialized tablet",
      action: "Press / key",
      onClick: handleOpenToolSelector,
      clickable: true,
    },
    {
      icon: Upload,
      title: "Import from clipboard",
      action: "Paste text here",
      onClick: handleImportFromClipboard,
      clickable: true,
    },
    {
      icon: Package,
      title: "Import an exported Workspace",
      action: "Load all workspaces from a .scratch file",
      onClick: handleImportWorkspace,
      clickable: true,
    },
    {
      icon: FolderOpen,
      title: "Drag a file",
      action: "Drop a file here to open",
      onClick: () => { }, // Handled by drag and drop
      clickable: false,
    },
  ];

  return (
    <div className="h-full w-full flex flex-col bg-canvas">
      {/* Tab Actions Bar */}
      <div className="flex justify-end bg-surface h-8">
        <TabActions
          onShowTabletSelector={() => setShowToolSelector(true)}
          tabletButtonRef={tabletButtonRef}
        />
      </div>

      {/* Welcome Content */}
      <div
        ref={welcomeRef}
        className="flex-1 flex flex-col items-center justify-center text-muted cursor-pointer relative outline-none px-8"
        onDoubleClick={handleDoubleClick}
        onPaste={handlePaste}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="text-center mb-12 w-full">
          <div className="flex items-center justify-center w-full">
            <img
              src="/favicon-gray.svg"
              alt="Scratch Tabs Logo"
              className="w-7 h-7 mr-4 flex-shrink-0"
            />
            <h1 className="text-3xl font-mono font-medium text-main">SCRATCH_TABS</h1>
          </div>
          <p className="text-muted text-sm font-mono mt-2">// v1.18.0</p>
        </div>

        {/* Actions Grid */}
        <div className="w-full max-w-2xl">
          <div className="grid gap-3">
            {actions.map((action, index) => {
              // Render non-clickable action
              if (!action.clickable) {
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-surface-glass/30 rounded-lg border border-transparent text-left w-full"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-surface-secondary border-none rounded-md">
                        <action.icon size={18} className="text-secondary" />
                      </div>
                      <div className="flex-1">
                        <div className="text-main font-medium text-sm mb-1">
                          {action.title}
                        </div>
                        <div className="text-muted text-xs">
                          {action.action}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              // Render clickable action
              return (
                <button
                  key={index}
                  onClick={action.onClick}
                  className="group flex items-center justify-between p-4 bg-surface-glass/30 hover:bg-surface-glass/50 rounded-lg transition-all duration-200 border border-transparent hover:border-base text-left w-full"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-surface-secondary border-none rounded-md group-hover:bg-element/70 transition-colors">
                      <action.icon size={18} className="text-secondary" />
                    </div>
                    <div className="flex-1">
                      <div className="text-main font-medium text-sm mb-1">
                        {action.title}
                      </div>
                      <div className="text-muted text-xs">
                        {action.action}
                      </div>
                    </div>
                  </div>
                  <div className="text-muted text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                    Click to try
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {showToolSelector && (
        <ToolSelectorModal
          onSelect={handleToolSelect}
          onClose={() => setShowToolSelector(false)}
        />
      )}
    </div>
  );
};

import React, { useRef, useEffect, useCallback } from "react";
import { useRootStore } from "../../stores";
import { useTabletSelector } from "../../hooks/useTabletSelector";
import { TabletSelector } from "../../tablets";
import { Tablet } from "../../tablets";
import { TabActions } from "../Tab/TabActions";
import { FileText, Layers, Upload, FolderOpen, File, Package } from "../Icons";
import type * as Monaco from "monaco-editor/esm/vs/editor/editor.api";
import { ImportExportService } from "../../features/import-export/ImportExportService";

export const WelcomeScreen: React.FC = () => {
  const { handleNewTab, handleNewPopulatedTab } = useRootStore();
  const welcomeRef = useRef<HTMLDivElement>(null);
  const tabletButtonRef = useRef<HTMLButtonElement>(null);
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);

  const {
    showTabletSelector,
    selectorPosition,
    tabletSelectorContainerRef,
    openTabletSelector,
    closeTabletSelector,
  } = useTabletSelector(editorRef, welcomeRef, null, undefined);

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

  const handleTabletSelect = useCallback(
    (tablet: Tablet) => {
      const state = tablet.createInitialState();
      const serializedState = tablet.serializeState
        ? tablet.serializeState(state)
        : JSON.stringify(state);
      const now = Date.now();

      handleNewPopulatedTab({
        id: crypto.randomUUID(),
        title: tablet.label,
        content: "",
        language: "plaintext",
        languageLocked: true,
        isTablet: true,
        tabletState: serializedState,
        cursorPosition: { lineNumber: 1, column: 1 },
        dateCreated: now,
        lastModified: now,
        workspaceId: "", // Will be set by the store
      });

      closeTabletSelector(false);
    },
    [handleNewPopulatedTab, closeTabletSelector],
  );

  const handleCreateNewTab = useCallback(() => {
    handleNewTab(false);
  }, [handleNewTab]);

  const handleOpenTabletSelector = useCallback(() => {
    // Center the tablet selector on the screen for welcome screen
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const selectorWidth =
      window.innerWidth >= 1024 ? 700 : window.innerWidth >= 768 ? 600 : 384;
    const selectorHeight =
      window.innerHeight >= 1024 ? 600 : window.innerHeight >= 768 ? 500 : 384;

    const centerX = (viewportWidth - selectorWidth) / 2;
    const centerY = (viewportHeight - selectorHeight) / 2;

    openTabletSelector({ x: centerX, y: centerY });
  }, [openTabletSelector]);

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
            const fileName = file.name.replace(/\.[^/.]+$/, "");
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
        !showTabletSelector &&
        !(
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        )
      ) {
        e.preventDefault();
        handleOpenTabletSelector();
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      document.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [showTabletSelector, handleOpenTabletSelector]);

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
      icon: Layers,
      title: "Open specialized tablet",
      action: "Press / key",
      onClick: handleOpenTabletSelector,
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
          onShowTabletSelector={() => {
            // Center the tablet selector on the screen for welcome screen
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const selectorWidth =
              window.innerWidth >= 1024
                ? 700
                : window.innerWidth >= 768
                  ? 600
                  : 384;
            const selectorHeight =
              window.innerHeight >= 1024
                ? 600
                : window.innerHeight >= 768
                  ? 500
                  : 384;

            const centerX = (viewportWidth - selectorWidth) / 2;
            const centerY = (viewportHeight - selectorHeight) / 2;

            openTabletSelector({ x: centerX, y: centerY });
          }}
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
            <h1 className="text-3xl font-light text-main">Scratch Tabs</h1>
          </div>
          <p className="text-muted text-sm mt-2">Version 1.13.0</p>
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

      {showTabletSelector && (
        <div
          ref={tabletSelectorContainerRef}
          style={{
            position: "absolute",
            left: `${selectorPosition.x}px`,
            top: `${selectorPosition.y}px`,
            zIndex: 50,
          }}
        >
          <TabletSelector
            searchQuery=""
            onSelect={handleTabletSelect}
            onClose={() => closeTabletSelector(false)}
            showSearch={true}
          />
        </div>
      )}
    </div>
  );
};

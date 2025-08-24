import React, { useRef, useEffect, useCallback, useState } from "react";
import { Editor } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor/esm/vs/editor/editor.api";
import { useRootStore } from "../../stores";
import { useTabsStore } from "../../stores/tabsStore";
import { useSplitViewStore } from "../../stores/splitViewStore";
import { useEditorScrollManager } from "../../hooks/useEditorScrollManager";
import { useTabletSelector } from "../../hooks/useTabletSelector";
import { useEditorActions } from "../../hooks/useEditorActions";
import { useEditorAI } from "../../hooks/useEditorAI";
import { TabletSelector } from "../../tablets";
import { Tablet } from "../../tablets";
import { useAIStore } from "../../stores/aiStore";
import { BatchToolsModal } from "../BatchTools/BatchToolsModal";
import { modelManager } from "../../services/modelManager";
import { useStoreWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";
import { useActiveEditorStore } from "../../stores/activeEditorStore";
import { UpgradeConfirmationModal } from "../RichText";
import { useClipboardStore } from "../../stores/clipboardStore";

interface EditorInstanceProps {
  side: "left" | "right";
  activeTabId: string;
  onEditorReady?: (editor: Monaco.editor.IStandaloneCodeEditor | null) => void;
  onUpgradeToRich?: () => void;
}

// Global storage for view states (scroll position, etc.)
const tabViewStates = new Map<string, Monaco.editor.ICodeEditorViewState>();

export const EditorInstance: React.FC<EditorInstanceProps> = ({
  side,
  activeTabId,
  onEditorReady,
  onUpgradeToRich,
}) => {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const currentTabIdRef = useRef<string>(activeTabId);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { setActiveEditor } = useActiveEditorStore();
  const { setPendingImageData } = useClipboardStore();

  // Get active tab using standard Zustand approach (simplified since cursor position is no longer in state)
  const activeTab = useTabsStore((state) => {
    const tab = state.tabs.find((t) => t.id === activeTabId);
    return tab || null;
  });

  // This can now be simplified since cursor position is no longer in React state
  const activeTabWithoutCursor = activeTab;

  // Image paste detection is handled directly in useEffect below

  // Get actions from rootStore
  const {
    updateTabContent,
    setActiveLeftTab,
    setActiveRightTab,
    updateTabState,
  } = useRootStore.getState();

  // FIX: Use useStoreWithEqualityFn for activeEditorSide only
  const activeEditorSide = useStoreWithEqualityFn(
    useSplitViewStore,
    (state) => state.splitView?.activeSide,
    shallow,
  );

  // FIX: Use useStoreWithEqualityFn for AI store with specific properties
  const {
    isCodegenReady,
    codegenResult,
    activeCodegenTabId,
    isCodegenGenerating,
  } = useStoreWithEqualityFn(
    useAIStore,
    (state) => ({
      isCodegenReady: state.ai.isCodegenReady,
      codegenResult: state.ai.codegenResult,
      activeCodegenTabId: state.ai.activeCodegenTabId,
      isCodegenGenerating: state.ai.isCodegenGenerating,
    }),
    shallow,
  );

  const { isReady: isAiReady, isLoading: isAiLoading } = useStoreWithEqualityFn(
    useAIStore,
    (state) => ({
      isReady: state.ai.isReady,
      isLoading: state.ai.isLoading,
    }),
    shallow,
  );

  // --- Ref to hold the latest activeTab data ---
  const latestActiveTabRef = useRef(activeTab);
  useEffect(() => {
    latestActiveTabRef.current = activeTab;
  }, [activeTab]);

  // --- Custom Hooks ---
  const { restoreScrollPosition } = useEditorScrollManager(
    editorRef,
    activeTabId,
  );
  const {
    showTabletSelector,
    tabletQuery,
    selectorPosition,
    tabletSelectorContainerRef,
    closeTabletSelector,
  } = useTabletSelector(
    editorRef,
    editorContainerRef,
    activeTabId,
    updateTabContent,
  );

  // Editor Actions Hook
  useEditorActions({
    editor: editorRef.current,
    monaco: monacoRef.current,
    activeTabId,
    latestActiveTabRef,
    isAiReady,
    isAiLoading,
    isCodegenReady,
    isCodegenGenerating,
  });

  // Editor AI Hook
  useEditorAI({
    editor: editorRef.current,
    activeTabId,
    isCodegenGenerating,
    activeCodegenTabId,
    codegenResult,
  });

  // Guard against the tab being removed while a render is queued
  if (!activeTabWithoutCursor) {
    return null;
  }

  // Don't render Monaco editor for rich text tabs
  if (activeTabWithoutCursor.isRich) {
    return null;
  }
  // SIMPLIFIED: This effect manages model switching with the corrected ModelManager
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !activeTabWithoutCursor) {
      return;
    }

    const editor = editorRef.current;
    const previousTabId = currentTabIdRef.current;
    
    // Skip if we're not actually switching tabs
    if (previousTabId === activeTabId) {
      return;
    }

    (async () => {
      try {
        // Save view state for the tab we are leaving
        const prevModel = editor.getModel();
        if (previousTabId && prevModel && !prevModel.isDisposed()) {
          const viewState = editor.saveViewState();
          if (viewState) {
            tabViewStates.set(previousTabId, viewState);
          }
        }

        // Get the model from ModelManager (this ensures it exists and is loaded)
        const newModel = await modelManager.get(activeTabWithoutCursor);

        // Set the model on the editor directly (following architecture)
        if (editor.getModel() !== newModel) {
          editor.setModel(newModel);
        }

        // Restore view state for the new tab
        const newViewState = tabViewStates.get(activeTabWithoutCursor.id);
        if (newViewState) {
          editor.restoreViewState(newViewState);
        }
        
        // Always check for and apply cursor position from database if available
        // This ensures that debounced cursor position updates are applied even when view state exists
        const dbCursorPos = activeTabWithoutCursor.cursorPosition;
        if (dbCursorPos && dbCursorPos.lineNumber > 0 && dbCursorPos.column > 0) {
          editor.setPosition({
            lineNumber: dbCursorPos.lineNumber,
            column: dbCursorPos.column,
          });
        }

        // Focus the editor
        editor.focus();

        currentTabIdRef.current = activeTabWithoutCursor.id;
      } catch (error) {
        console.error(
          `[EditorInstance] Failed to switch model for tab ${activeTabWithoutCursor.id}:`,
          error,
        );
      }
    })();
  }, [activeTabId, activeTabWithoutCursor]);

  // Cleanup effect: detach model from editor before component unmounts
  useEffect(() => {
    return () => {
      const editor = editorRef.current;
      if (editor) {
        const currentModel = editor.getModel();
        if (currentModel && !currentModel.isDisposed()) {
          editor.setModel(null);
        }
        // Clear from active editor store if this was the active editor for this side
        const currentActive = useActiveEditorStore.getState();
        const activeEditorForSide = side === 'left' ? currentActive.activeLeftEditor : currentActive.activeRightEditor;
        if (activeEditorForSide === editor) {
          setActiveEditor(side, null);
        }
      }
    };
  }, []); // Empty dependency array since this should only run on mount/unmount

  // Focus effect - only focus if this editor instance's side matches the globally active editor side
  useEffect(() => {
    const { splitView } = useSplitViewStore.getState();
    const shouldFocus =
      activeEditorSide === side &&
      ((side === "left" && activeTabId === splitView.activeLeftTabId) ||
        (side === "right" && activeTabId === splitView.activeRightTabId));

    if (shouldFocus) {
      const timer = setTimeout(() => {
        try {
          if (
            editorRef.current &&
            document.activeElement !==
              editorRef.current.getDomNode()?.querySelector("textarea")
          ) {
            editorRef.current.focus();
          }
        } catch (error) {
          console.warn("[EditorInstance] Failed to focus editor:", error);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [side, activeTabId, activeEditorSide]);

  
  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container || !activeTab || activeTab.isRich) return;

    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) {
        return;
      }

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          event.preventDefault();
          event.stopPropagation();

          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
              const dataUrl = e.target?.result as string;
              setPendingImageData(dataUrl);
              if (onUpgradeToRich) {
                setShowUpgradeModal(true);
              }
            };
            reader.readAsDataURL(file);
          }

          return;
        }
      }
    };

    container.addEventListener('paste', handlePaste, true);

    return () => {
      container.removeEventListener('paste', handlePaste, true);
    };
  }, [activeTab, onUpgradeToRich, setPendingImageData]);
  const handleEditorDidMount = (
    editor: Monaco.editor.IStandaloneCodeEditor,
    monaco: typeof Monaco,
  ) => {
    try {
      editorRef.current = editor;
      monacoRef.current = monaco;
      onEditorReady?.(editor);
      setActiveEditor(side, editor);

      // Add focus listener to update active editor
      editor.onDidFocusEditorWidget(() => {
        setActiveEditor(side, editor);
      });

      // Initialize the ModelManager with Monaco
      modelManager.initialize(monaco);

      // Set up the initial model asynchronously
      const setupInitialModel = async () => {
        if (activeTab) {
          try {
            // Get the model from ModelManager (this ensures it exists and is loaded)
            const initialModel = await modelManager.get(activeTab);

            // Set the model on the editor directly
            if (editor.getModel() !== initialModel) {
              editor.setModel(initialModel);
            }

            // Restore view state if it exists (this is safe during initial setup)
            const initialViewState = tabViewStates.get(activeTab.id);
            if (initialViewState) {
              editor.restoreViewState(initialViewState);
            } else {
              // No view state found - restore cursor position from database
              const dbCursorPos = activeTab.cursorPosition;
              if (dbCursorPos && dbCursorPos.lineNumber > 0 && dbCursorPos.column > 0) {
                editor.setPosition({
                  lineNumber: dbCursorPos.lineNumber,
                  column: dbCursorPos.column,
                });
              }
            }
          } catch (error) {
            console.error(
              `[EditorInstance] Failed to set up initial model for tab ${activeTab.id}:`,
              error,
            );
          }
        }
      };

      setupInitialModel();

      restoreScrollPosition(activeTabId);

      // Auto-format tabs that were likely created from paste or file import
      const now = Date.now();
      if (activeTab && now - activeTab.dateCreated < 500) {
        const content = activeTab.content || "";
        const hasSubstantialContent = content.trim().length > 50;
        const isFormattableLanguage = activeTab.language !== "plaintext";
        const isNotTablet = !activeTab.isTablet;
        const isNotLikelyDuplicate =
          !activeTab.title.includes("(copy)") &&
          !activeTab.title.includes("Copy of");

        if (
          hasSubstantialContent &&
          isFormattableLanguage &&
          isNotTablet &&
          isNotLikelyDuplicate
        ) {
          setTimeout(() => {
            try {
              const formatAction = editor.getAction(
                "editor.action.formatDocument",
              );
              if (formatAction) {
                formatAction.run();
              }
            } catch (error) {
              console.warn(
                "[EditorInstance] Failed to auto-format document:",
                error,
              );
            }
          }, 100);
        }
      }

      // Cursor Position Listener - NOW MANAGED BY MODELMANAGER
      if (activeTab) {
        modelManager.registerCursorPositionListener(activeTab.id, editor);
      }

      // Paste Detection Listener - Use keyboard event to catch paste BEFORE content changes
      editor.onKeyDown((e) => {
        try {
          
          // Detect Ctrl+V (Windows/Linux) or Cmd+V (Mac)
          // Try multiple ways to detect V key
          const isPasteShortcut = (e.ctrlKey || e.metaKey) && (
            e.keyCode === 86 || // KeyCode for 'V'
            e.browserEvent?.key === 'v' || 
            e.browserEvent?.key === 'V' ||
            e.browserEvent?.code === 'KeyV'
          );
          
          if (isPasteShortcut) {
            const currentTab = latestActiveTabRef.current;
            if (currentTab) {
              modelManager.markNextChangeAsPaste(currentTab.id);
            }
          }
        } catch (error) {
          console.warn(
            "[EditorInstance] Failed to handle paste detection:",
            error,
          );
        }
      });

      // Keep the original onDidPaste as backup (though it fires too late)
      editor.onDidPaste((e) => {
        try {
          const currentTab = latestActiveTabRef.current;
          if (currentTab) {
            modelManager.markNextChangeAsPaste(currentTab.id);
          }
        } catch (error) {
          console.warn(
            "[EditorInstance] Failed to handle paste detection:",
            error,
          );
        }
      });
    } catch (error) {
      console.error("[EditorInstance] Failed to mount editor:", error);
    }
  };

  const handleEditorFocus = () => {
    try {
      if (side === "left") {
        setActiveLeftTab(activeTabId);
      } else {
        setActiveRightTab(activeTabId);
      }
    } catch (error) {
      console.warn("[EditorInstance] Failed to handle editor focus:", error);
    }
  };

  const handleTabletSelect = (tablet: Tablet) => {
    try {
      // Convert to tablet
      const state = tablet.createInitialState();
      const serializedState = tablet.serializeState
        ? tablet.serializeState(state)
        : JSON.stringify(state);
      updateTabState(activeTabId, {
        isTablet: true,
        tabletState: serializedState,
        content: "",
        language: "plaintext",
        languageLocked: true,
        title: tablet.label,
      });
      closeTabletSelector(true);
    } catch (error) {
      console.warn("[EditorInstance] Failed to handle tablet select:", error);
    }
  };

  const handleTabletSelectorClose = () => {
    try {
      closeTabletSelector(true);
    } catch (error) {
      console.warn("[EditorInstance] Failed to close tablet selector:", error);
    }
  };

  

  // Upgrade modal handlers
  const handleUpgradeConfirm = () => {
    setShowUpgradeModal(false);
    if (onUpgradeToRich) {
      onUpgradeToRich();
    }
  };

  const handleUpgradeCancel = () => {
    setShowUpgradeModal(false);
  };

  const handleBatchToolsApply = useCallback((content: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    try {
      const selection = editor.getSelection();
      const model = editor.getModel();
      const selectedText =
        selection && !selection.isEmpty() && model && !model.isDisposed()
          ? model.getValueInRange(selection) || ""
          : "";

      if (selectedText) {
        // Replace only the selected text
        editor.executeEdits("batch-tools", [
          {
            range: selection!,
            text: content,
          },
        ]);
      } else {
        // Replace entire content
        if (model && !model.isDisposed()) {
          editor.executeEdits("batch-tools", [
            {
              range: model.getFullModelRange(),
              text: content,
            },
          ]);
        }
      }
    } catch (error) {
      console.warn("[EditorInstance] Failed to apply batch tools:", error);
    }
  }, []);

  return (
    <div className="flex flex-col h-full w-full bg-gray-850">
      <div
        className="flex-grow relative overflow-hidden"
        ref={editorContainerRef}
      >
        <div
          className="w-full h-full absolute inset-0"
          onClick={handleEditorFocus}
        >
          <Editor
            height="100%"
            width="100%"
            theme="vs-dark"
            onMount={handleEditorDidMount}
            key={side} // Key by side to ensure we have two distinct editor instances
            options={{
              minimap: { enabled: false },
              fontSize: activeTab?.fontSize || 14,
              wordWrap: "on",
              automaticLayout: true,
              copyWithSyntaxHighlighting: false,
              scrollBeyondLastLine: true,
              formatOnPaste: true,
              formatOnType: true,
              find: {
                addExtraSpaceOnTop: false,
              },
            }}
            // NO `value`, `defaultValue`, `language`, or `onChange` props!
            // The model manager now controls everything imperatively.
          />
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
                searchQuery={tabletQuery}
                onSelect={handleTabletSelect}
                onClose={handleTabletSelectorClose}
              />
            </div>
          )}
        </div>
      </div>
      <BatchToolsModal onApply={handleBatchToolsApply} />
      <UpgradeConfirmationModal
        isOpen={showUpgradeModal}
        onConfirm={handleUpgradeConfirm}
        onCancel={handleUpgradeCancel}
      />
    </div>
  );
};

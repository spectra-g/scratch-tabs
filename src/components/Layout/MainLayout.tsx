import React, { useEffect, useState } from "react";
import { useRootStore } from "../../stores/rootStore";
import { useTabsStore } from "../../stores/tabsStore";
import { useSplitViewStore } from "../../stores/splitViewStore";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { usePersistenceStore } from "../../stores/persistenceStore";
import { useSplitViewResizer } from "../../hooks/useSplitViewResizer";
import {
  useUrlTabHandler,
  handleInitialUrl,
} from "../../hooks/useUrlTabHandler";
import { useSearchStore } from "../../stores/searchStore";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { WelcomeScreen } from "../Welcome/WelcomeScreen";
import { TabBar } from "../Tab/TabBar";
import { EditorPaneWrapper } from "../Editor/EditorPaneWrapper";
import { SplitViewDivider } from "../SplitView/SplitViewDivider";
import { DiffModal } from "../DiffModal";
import { SummarizeModal } from "../AI/SummarizeModal";
import { SearchModal } from "../Search/SearchModal";
import { AIModelManagementModal } from "../AI/AIModelManagementModal";
import { ConfirmationDialog } from "../Tab/ConfirmationDialog";
import { TestFields } from "../TestFields/TestFields";
import { updateSaveIndicator } from "../../utils/testIndicators";
import { useAIStore } from "../../stores/aiStore";
import { useStoreWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";
import { getTabsInVisualOrder } from "../../utils/diffModalHelpers";

const MainLayout: React.FC = () => {
  // Update document title with workspace name
  useDocumentTitle();

  // FIX: Use selective subscription for tab count only
  const tabCount = useTabsStore((state) => state.tabs.length);

  // FIX: Use useStoreWithEqualityFn for split view with shallow comparison
  const { splitView, activeLeftTabId, activeRightTabId } =
    useStoreWithEqualityFn(
      useSplitViewStore,
      (state) => ({
        splitView: state.splitView,
        activeLeftTabId: state.splitView?.activeLeftTabId,
        activeRightTabId: state.splitView?.activeRightTabId,
      }),
      shallow,
    );

  // FIX: Use useStoreWithEqualityFn for root store actions
  const { saveTabDataById, setSplitRatio, removeTab } = useStoreWithEqualityFn(
    useRootStore,
    (state) => ({
      saveTabDataById: state.saveTabDataById,
      setSplitRatio: state.setSplitRatio,
      removeTab: state.removeTab,
    }),
    shallow,
  );

  // FIX: Use useStoreWithEqualityFn for workspace store
  const { loadWorkspaces, workspaces } = useStoreWithEqualityFn(
    useWorkspaceStore,
    (state) => ({
      loadWorkspaces: state.loadWorkspaces,
      workspaces: state.workspaces,
    }),
    shallow,
  );

  // FIX: Use useStoreWithEqualityFn for persistence store
  const { saveState } = useStoreWithEqualityFn(
    usePersistenceStore,
    (state) => ({ saveState: state.saveState }),
    shallow,
  );

  const [isAppInitialized, setIsAppInitialized] = useState(false);

  // State for keyboard shortcut confirmation dialog
  const [keyboardCloseConfirmation, setKeyboardCloseConfirmation] = useState<{
    isOpen: boolean;
    tabId: string;
    tabTitle: string;
  } | null>(null);

  // FIX: Use useStoreWithEqualityFn for AI store
  const { setSummaryModalCallback } = useStoreWithEqualityFn(
    useAIStore,
    (state) => ({ setSummaryModalCallback: state.setSummaryModalCallback }),
    shallow,
  );

  function setRealHeight() {
    document.documentElement.style.setProperty(
      "--real-vh",
      `${window.innerHeight * 0.01}px`,
    );
  }
  window.addEventListener("resize", setRealHeight);
  setRealHeight();

  // Initialize workspace store
  useEffect(() => {
    loadWorkspaces()
      .then(async () => {
        await handleInitialUrl();
        setIsAppInitialized(true);
      })
      .catch((error) => {
        console.error(
          "[MainLayout] Failed to initialize workspace store:",
          error,
        );
        setIsAppInitialized(true);
      });
  }, [loadWorkspaces]);

  // Set up AI summary modal callback
  useEffect(() => {
    setSummaryModalCallback(handleOpenSummarizeModal);
    return () => {
      setSummaryModalCallback(null);
    };
  }, [setSummaryModalCallback]);

  // Set up periodic save interval
  useEffect(() => {
    const saveInterval = setInterval(async () => {
      // Use getState to ensure we always get the latest version of the saveState function
      // and prevent issues with stale closures.
      await usePersistenceStore.getState().saveState();

      // Update test indicator after save completes
      updateSaveIndicator();
    }, 2500); // Save every 2.5 seconds

    return () => {
      clearInterval(saveInterval); // Cleanup interval on unmount
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  const [diffModal, setDiffModal] = React.useState<{
    leftTabId: string | null;
    rightTabId: string | null;
    fromHistory?: boolean;
  } | null>(null);

  const [summarizeModal, setSummarizeModal] = React.useState<{
    content: string;
    tabId: string;
  } | null>(null);

  // Encapsulate resizing logic within the hook
  const {
    containerRef,
    dividerProps,
    leftPaneStyle,
    rightPaneStyle,
    isDragging,
  } = useSplitViewResizer(
    splitView?.isSplit,
    splitView?.splitRatio,
    setSplitRatio,
  );

  const { isOpen: isSearchOpen, toggleSearch } = useSearchStore();

  const handleOpenDiffModal = (
    fromHistory?: boolean,
    explicitSide?: "left" | "right",
    explicitTabId?: string,
  ) => {
    const currentSplitView = useSplitViewStore.getState().splitView;

    if (fromHistory) {
      // Determine which side we're on based on explicit side or current state
      const isRightSide = explicitSide
        ? explicitSide === "right"
        : currentSplitView.rightTabs.includes(
          currentSplitView.activeRightTabId || "",
        );
      const history = isRightSide
        ? (currentSplitView as any).rightTabHistory
        : (currentSplitView as any).leftTabHistory;

      // Always use the explicit tab ID when provided
      const currentTabId =
        explicitTabId ||
        (isRightSide
          ? currentSplitView.activeRightTabId
          : currentSplitView.activeLeftTabId);

      if (history && history.length >= 2 && currentTabId) {
        // Get the previous tab from history that isn't the current tab
        let previousTabId = null;
        for (let i = 0; i < history.length; i++) {
          if (history[i] !== currentTabId) {
            previousTabId = history[i];
            break;
          }
        }

        if (previousTabId) {
          const tabList = isRightSide ? currentSplitView.rightTabs : currentSplitView.leftTabs;
          const { leftTabId, rightTabId } = getTabsInVisualOrder(tabList, currentTabId, previousTabId);

          setDiffModal({
            leftTabId,
            rightTabId,
            fromHistory: true,
          });
        }
      }
    } else {
      // If we have an explicit tab ID, use it on the appropriate side
      let leftTabId = currentSplitView.activeLeftTabId;
      let rightTabId = currentSplitView.activeRightTabId;

      if (explicitTabId) {
        // If explicit side provided, use it on that side
        if (explicitSide === "left") {
          leftTabId = explicitTabId;
        } else if (explicitSide === "right") {
          rightTabId = explicitTabId;
        } else {
          // No side specified - determine based on which side contains the tab
          const isInLeftSide =
            currentSplitView.leftTabs.includes(explicitTabId);
          const isInRightSide =
            currentSplitView.rightTabs.includes(explicitTabId);

          if (isInLeftSide) {
            leftTabId = explicitTabId;
          } else if (isInRightSide) {
            rightTabId = explicitTabId;
          }
        }
      }

      setDiffModal({
        leftTabId: leftTabId,
        rightTabId: rightTabId,
        fromHistory: false,
      });
    }
  };

  const handleCloseDiffModal = () => {
    setDiffModal(null);
  };

  const handleOpenSummarizeModal = (tabId: string) => {
    // This find should be fast unless 'tabs' is gigantic
    const tab = useTabsStore.getState().tabs.find((t) => t.id === tabId);
    if (tab && tab.content) {
      setSummarizeModal({ content: tab.content, tabId: tabId }); // This should trigger re-render quickly
    } else {
      // Optionally show a user notification here
    }
  };

  const handleCloseSummarizeModal = () => {
    setSummarizeModal(null);
  };

  // Tab close handlers for keyboard shortcut
  const handleTabClose = (tabId: string) => {
    removeTab(tabId);
  };

  const handleKeyboardCloseConfirm = () => {
    if (keyboardCloseConfirmation) {
      handleTabClose(keyboardCloseConfirmation.tabId);
      setKeyboardCloseConfirmation(null);
    }
  };

  const handleKeyboardCloseCancel = () => {
    setKeyboardCloseConfirmation(null);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // --- Search Shortcut ---
      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key === "F"
      ) {
        event.preventDefault();
        const selectedText = window.getSelection()?.toString() || "";
        toggleSearch(selectedText); // Pass selected text to pre-populate
      }

      // --- Tab Close Shortcut (CTRL+W) ---
      if (event.ctrlKey && !event.metaKey && event.key === 'w') {
        event.preventDefault();
        event.stopPropagation();

        // Determine which tab should be closed based on active side
        const targetTabId = splitView?.activeSide === 'left'
          ? splitView?.activeLeftTabId
          : splitView?.activeRightTabId;

        if (targetTabId) {
          // Get tabs data only when needed, without subscribing
          const tabs = useTabsStore.getState().tabs;
          const activeTab = tabs.find(tab => tab.id === targetTabId);

          if (activeTab) {
            // Check if confirmation is needed (same logic as SortableTab)
            const needsConfirmation = (activeTab.content && activeTab.content.trim() !== "") || activeTab.isTablet;

            if (needsConfirmation) {
              setKeyboardCloseConfirmation({
                isOpen: true,
                tabId: targetTabId,
                tabTitle: activeTab.title,
              });
            } else {
              handleTabClose(targetTabId);
            }
          }
        }
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault();
        saveState(); // Call the centralized save function

        const editorTextAreas = document.querySelectorAll<HTMLElement>(
          ".monaco-editor textarea",
        );
        let focusedEditorSide: "left" | "right" | null = null;
        let focusedElement: HTMLElement | null = null;

        if (
          document.activeElement &&
          document.activeElement.tagName === "TEXTAREA"
        ) {
          for (const textArea of editorTextAreas) {
            if (document.activeElement === textArea) {
              focusedElement = textArea;
              break;
            }
          }
        }

        if (focusedElement) {
          const parentPane = focusedElement.closest<HTMLElement>(
            "[data-editor-pane-side]",
          );
          if (parentPane) {
            const sideAttr = parentPane.getAttribute("data-editor-pane-side");
            if (sideAttr === "left" || sideAttr === "right") {
              focusedEditorSide = sideAttr;
            }
          }
        }
        if (focusedEditorSide) {
          const tabIdToSave =
            focusedEditorSide === "left" ? activeLeftTabId : activeRightTabId;

          if (tabIdToSave) {
            saveTabDataById(tabIdToSave);
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    saveState,
    toggleSearch,
    activeLeftTabId,
    activeRightTabId,
    saveTabDataById,
    splitView?.activeSide,
    splitView?.activeLeftTabId,
    splitView?.activeRightTabId,
    handleTabClose,
  ]);

  useUrlTabHandler();

  if (!isAppInitialized) {
    return (
      <div className="app-loading-container">
        <div className="app-loading-spinner"></div>
        <p>Loading tabs...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-canvas text-main transition-colors duration-200">
      <div
        ref={containerRef}
        className="flex w-full h-full min-w-0 overflow-hidden"
      >
        {tabCount === 0 && workspaces.length === 0 ? (
          <WelcomeScreen />
        ) : (
          <>
            <div
              className="flex flex-col h-full overflow-hidden min-w-0"
              style={leftPaneStyle}
            >
              <div className="w-full flex-shrink-0">
                <TabBar
                  side="left"
                  onOpenDiffModal={handleOpenDiffModal}
                  onOpenSummaryModal={handleOpenSummarizeModal}
                />
              </div>
              <div className="w-full h-full flex-grow overflow-hidden">
                <EditorPaneWrapper side="left" />
              </div>
            </div>

            {splitView.isSplit && (
              <>
                <SplitViewDivider
                  dividerProps={dividerProps}
                  isDragging={isDragging}
                  isSplitEnabled={splitView.isSplit}
                />

                <div
                  className="flex flex-col h-full overflow-hidden min-w-0"
                  style={rightPaneStyle}
                >
                  <div className="w-full flex-shrink-0">
                    <TabBar
                      side="right"
                      onOpenDiffModal={handleOpenDiffModal}
                      onOpenSummaryModal={handleOpenSummarizeModal}
                    />
                  </div>
                  <div className="w-full h-full flex-grow overflow-hidden">
                    <EditorPaneWrapper side="right" />
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {diffModal && (
        <DiffModal
          leftTabId={diffModal.leftTabId || ""}
          rightTabId={diffModal.rightTabId || ""}
          onClose={handleCloseDiffModal}
        />
      )}
      {summarizeModal && (
        <>
          <SummarizeModal
            content={summarizeModal.content}
            onClose={handleCloseSummarizeModal}
          />
        </>
      )}
      {isSearchOpen && <SearchModal />}
      <AIModelManagementModal />

      {keyboardCloseConfirmation && (
        <ConfirmationDialog
          isOpen={keyboardCloseConfirmation.isOpen}
          onConfirm={handleKeyboardCloseConfirm}
          onCancel={handleKeyboardCloseCancel}
          message={`Tab "${keyboardCloseConfirmation.tabTitle}" contains content that cannot be recovered once closed. Are you sure you want to close this tab?`}
          position={{ x: window.innerWidth / 2, y: window.innerHeight / 2 }}
          positionType="above"
        />
      )}

      <TestFields />
    </div>
  );
};

export default MainLayout;

import React, { useEffect, useState } from 'react';
import { useRootStore } from '../../stores/rootStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { usePersistenceStore } from '../../stores/persistenceStore';
import { useSplitViewResizer } from '../../hooks/useSplitViewResizer';
import { useUrlTabHandler, handleInitialUrl } from '../../hooks/useUrlTabHandler';
import { useSearchStore } from '../../stores/searchStore';
import { WelcomeScreen } from '../Welcome/WelcomeScreen';
import { TabBar } from '../Tab/TabBar';
import { EditorPaneWrapper } from '../Editor/EditorPaneWrapper';
import { SplitViewDivider } from '../SplitView/SplitViewDivider';
import { DiffModal } from '../DiffModal';
import { SummarizeModal } from '../AI/SummarizeModal';
import { SearchModal } from '../Search/SearchModal';

const MainLayout: React.FC = () => {
  const {
    tabs,
    activeLeftTabId,
    activeRightTabId,
    saveTabDataById,
    splitView,
    setSplitRatio,
    activeSide,
  } = useRootStore(state => ({
    tabs: state.tabs,
    activeLeftTabId: state.splitView?.activeLeftTabId,
    activeRightTabId: state.splitView?.activeRightTabId,
    saveTabDataById: state.saveTabDataById,
    splitView: state.splitView,
    setSplitRatio: state.setSplitRatio,
    activeSide: state.splitView?.activeSide,
  }));

  const { loadWorkspaces, workspaces } = useWorkspaceStore();
  const { saveState } = usePersistenceStore(); // Get saveState function
  const [isAppInitialized, setIsAppInitialized] = useState(false);

  function setRealHeight() {
    document.documentElement.style.setProperty('--real-vh', `${window.innerHeight * 0.01}px`);
  }
  window.addEventListener('resize', setRealHeight);
  setRealHeight();

  // Initialize workspace store
  useEffect(() => {
    loadWorkspaces().then(async () => {
      await handleInitialUrl();
      setIsAppInitialized(true);
    }).catch(error => {
      console.error('[MainLayout] Failed to initialize workspace store:', error);
      setIsAppInitialized(true);
    });
  }, []);

     useEffect(() => {
       const saveInterval = setInterval(() => {
         saveState(); // Call saveState periodically
       }, 10000); // e.g., every 10 seconds

       return () => {
         clearInterval(saveInterval); // Cleanup interval on unmount
       };
     }, [saveState]); // Depend on saveState


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
    setSplitRatio
  );

  const { isOpen: isSearchOpen, toggleSearch } = useSearchStore();

  const handleOpenDiffModal = (fromHistory?: boolean, explicitSide?: 'left' | 'right', explicitTabId?: string) => {
    const currentSplitView = useRootStore.getState().splitView;
    
    // If we have an explicit tab ID, use it on the appropriate side
    let leftTabId = currentSplitView.activeLeftTabId;
    let rightTabId = currentSplitView.activeRightTabId;
    
    if (explicitTabId) {
      // If explicit side provided, use it on that side
      if (explicitSide === 'left') {
        leftTabId = explicitTabId;
      } else if (explicitSide === 'right') {
        rightTabId = explicitTabId;
      } else {
        // No side specified - determine based on which side contains the tab
        const isInLeftSide = currentSplitView.leftTabs.includes(explicitTabId);
        const isInRightSide = currentSplitView.rightTabs.includes(explicitTabId);

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
      fromHistory: false
    });
  };

  const handleCloseDiffModal = () => {
    setDiffModal(null);
  };

    const handleOpenSummarizeModal = (tabId: string) => {
        // This find should be fast unless 'tabs' is gigantic
        const tab = useRootStore.getState().tabs.find(t => t.id === tabId);
        if (tab && tab.content) {
            setSummarizeModal({ content: tab.content, tabId: tabId }); // This should trigger re-render quickly
        } else {
            // Optionally show a user notification here
        }
    };

  const handleCloseSummarizeModal = () => {
      setSummarizeModal(null);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {

      // --- Search Shortcut ---
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'F') {
        event.preventDefault();
        const selectedText = window.getSelection()?.toString() || '';
        toggleSearch(selectedText); // Pass selected text to pre-populate
      }

      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        saveState(); // Call the centralized save function

        const editorTextAreas = document.querySelectorAll<HTMLElement>('.monaco-editor textarea');
        let focusedEditorSide: 'left' | 'right' | null = null;
        let focusedElement: HTMLElement | null = null;

        if (document.activeElement && document.activeElement.tagName === 'TEXTAREA') {
            for (const textArea of editorTextAreas) {
                if (document.activeElement === textArea) {
                     focusedElement = textArea;
                     break;
                }
            }
        }

        if (focusedElement) {
            const parentPane = focusedElement.closest<HTMLElement>('[data-editor-pane-side]');
            if (parentPane) {
                const sideAttr = parentPane.getAttribute('data-editor-pane-side');
                if (sideAttr === 'left' || sideAttr === 'right') {
                    focusedEditorSide = sideAttr;
                }
            }
        }

        if (focusedEditorSide) {
          const tabIdToSave = focusedEditorSide === 'left' ? activeLeftTabId : activeRightTabId;

          if (tabIdToSave) {
            saveTabDataById(tabIdToSave);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggleSearch, activeLeftTabId, activeRightTabId, saveTabDataById, saveState]);

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
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      <div
        ref={containerRef}
        className="flex w-full h-full min-w-0 overflow-hidden"
      >
        {tabs.length === 0 && workspaces.length === 0 ? (
          <WelcomeScreen/>
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
                <EditorPaneWrapper side="left"/>
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
                    <EditorPaneWrapper side="right"/>
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
          <SummarizeModal
              content={summarizeModal.content}
              onClose={handleCloseSummarizeModal}
              // You might pass tabId if the modal needs it for some reason
              // tabId={summarizeModal.tabId}
          />
      )}
      {isSearchOpen && <SearchModal />}
    </div>
  );
};

export default MainLayout;
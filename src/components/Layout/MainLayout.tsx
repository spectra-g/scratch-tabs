import React from 'react';
import { useRootStore } from '../../stores';
import { WelcomeScreen } from '../Welcome/WelcomeScreen';
import { EditorPaneWrapper } from '../Editor/EditorPaneWrapper';
import { TabBar } from '../Tab/TabBar';
import { DiffModal } from '../DiffModal';
import { useSplitViewResizer } from '../../hooks/useSplitViewResizer';
import { SplitViewDivider } from "../SplitView/SplitViewDivider.tsx";

const MainLayout: React.FC = () => {
  const {tabs, splitView, setSplitRatio} = useRootStore();

  const [diffModal, setDiffModal] = React.useState<{
    leftTabId: string | null;
    rightTabId: string | null;
    fromHistory?: boolean;
  } | null>(null);

  // Encapsulate resizing logic within the hook
  // The hook manages containerRef, drag state, styles, and event handlers
  const {
    containerRef,
    dividerProps,
    leftPaneStyle,
    rightPaneStyle,
    isDragging, // Get dragging state from hook for styling
  } = useSplitViewResizer(
    splitView.isSplit,
    splitView.splitRatio,
    setSplitRatio // Pass the store action directly (hook should handle debouncing)
  );

  const handleOpenDiffModal = (fromHistory?: boolean) => {
    // Read the latest active tab IDs from the store when opening
    const currentSplitView = useRootStore.getState().splitView;

    if (fromHistory) {
      // For history comparison, use the current tab's history
      const isRightSide = currentSplitView.rightTabs.includes(currentSplitView.activeRightTabId || '');
      const history = isRightSide ? currentSplitView.rightTabHistory : currentSplitView.leftTabHistory;

      if (history && history.length >= 2) {
        setDiffModal({
          leftTabId: history[0], // Current tab
          rightTabId: history[1], // Previous tab
          fromHistory: true
        });
      }
    } else {
      // For regular split view comparison
      setDiffModal({
        leftTabId: currentSplitView?.activeLeftTabId ?? null,
        rightTabId: currentSplitView?.activeRightTabId ?? null,
        fromHistory: false
      });
    }
  };

  const handleCloseDiffModal = () => {
    setDiffModal(null);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white"> {/* Ensure base text color */}
      <div
        ref={containerRef} // Ref for the resizer hook to measure
        className="flex w-full h-full overflow-hidden"
      >
        {tabs.length === 0 ? (
          // --- Welcome Screen ---
          <WelcomeScreen/>
        ) : (
          // --- Editor View (Single or Split) ---
          <>
            {/* --- Left Pane --- */}
            <div
              className="flex flex-col h-full overflow-hidden" // Ensure height and overflow
              style={leftPaneStyle} // Style managed by the hook
            >
              <div className="w-full flex-shrink-0"> {/* Prevent TabBar from shrinking */}
                <TabBar side="left" onOpenDiffModal={handleOpenDiffModal}/>
              </div>
              <div className="w-full h-full flex-grow overflow-hidden"> {/* Allow EditorPane to fill space */}
                <EditorPaneWrapper side="left"/>
              </div>
            </div>

            {/* --- Split View Divider and Right Pane (Conditional) --- */}
            {splitView.isSplit && (
              <>
                {/* Divider */}
                {/* Use the dedicated Divider Component */}
                <SplitViewDivider
                  dividerProps={dividerProps}
                  isDragging={isDragging}
                  isSplitEnabled={splitView.isSplit} // Pass the split state
                />

                {/* --- Right Pane --- */}
                <div
                  className="flex flex-col h-full overflow-hidden" // Ensure height and overflow
                  style={rightPaneStyle} // Style managed by the hook
                >
                  <div className="w-full flex-shrink-0"> {/* Prevent TabBar from shrinking */}
                    <TabBar side="right" onOpenDiffModal={handleOpenDiffModal}/>
                  </div>
                  <div className="w-full h-full flex-grow overflow-hidden"> {/* Allow EditorPane to fill space */}
                    <EditorPaneWrapper side="right"/>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* --- Diff Modal (Rendered outside the flex container) --- */}
      {diffModal && (
        <DiffModal
          leftTabId={diffModal.leftTabId || ""}
          rightTabId={diffModal.rightTabId || ""}
          onClose={handleCloseDiffModal}
        />
      )}
    </div>
  );
};

export default MainLayout;
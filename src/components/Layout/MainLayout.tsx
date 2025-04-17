import React from 'react';
import { useRootStore } from '../../stores';
import { WelcomeScreen } from '../Welcome/WelcomeScreen';
import { EditorPaneWrapper } from '../Editor/EditorPaneWrapper';
import { TabBar } from '../Tab/TabBar';
import { DiffModal } from '../DiffModal';
import { useSplitViewResizer } from '../../hooks/useSplitViewResizer';
import { SplitViewDivider } from "../SplitView/SplitViewDivider.tsx";

const MainLayout: React.FC = () => {
  const { tabs, splitView, setSplitRatio } = useRootStore();

  const [diffModal, setDiffModal] = React.useState<{
    leftTabId: string | null;
    rightTabId: string | null;
    fromHistory?: boolean;
  } | null>(null);

  // Encapsulate resizing logic within the hook
  const {
    containerRef,
    dividerProps,
    leftPaneStyle,
    rightPaneStyle,
    isDragging,
  } = useSplitViewResizer(
    splitView.isSplit,
    splitView.splitRatio,
    setSplitRatio
  );

  const handleOpenDiffModal = (fromHistory?: boolean) => {
    const currentSplitView = useRootStore.getState().splitView;

    if (fromHistory) {
      const isRightSide = currentSplitView.rightTabs.includes(currentSplitView.activeRightTabId || '');
      const history = isRightSide ? currentSplitView.rightTabHistory : currentSplitView.leftTabHistory;

      if (history && history.length >= 2) {
        setDiffModal({
          leftTabId: history[0],
          rightTabId: history[1],
          fromHistory: true
        });
      }
    } else {
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
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      <div
        ref={containerRef}
        className="flex w-full h-full overflow-hidden"
      >
        {tabs.length === 0 ? (
          <WelcomeScreen/>
        ) : (
          <>
            <div
              className="flex flex-col h-full overflow-hidden"
              style={leftPaneStyle}
            >
              <div className="w-full flex-shrink-0">
                <TabBar side="left" onOpenDiffModal={handleOpenDiffModal}/>
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
                  className="flex flex-col h-full overflow-hidden"
                  style={rightPaneStyle}
                >
                  <div className="w-full flex-shrink-0">
                    <TabBar side="right" onOpenDiffModal={handleOpenDiffModal}/>
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
    </div>
  );
};

export default MainLayout;
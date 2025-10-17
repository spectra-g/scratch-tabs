import React, { useCallback } from "react";
import { useDiffEditor } from "./DiffModal/useDiffEditor";
import { DiffModalUI } from "./DiffModal/DiffModalUI";

interface ContentDiffModalProps {
  leftContent: string;
  rightContent: string;
  leftTitle?: string;
  rightTitle?: string;
  language?: string;
  onClose: (updatedLeftContent?: string) => void;
}

export const ContentDiffModal: React.FC<ContentDiffModalProps> = ({
  leftContent,
  rightContent,
  leftTitle = "Left",
  rightTitle = "Right",
  language = "json",
  onClose,
}) => {
  const engine = useDiffEditor(
    leftContent,
    rightContent,
    language,
    "left-content",
    "right-content"
  );

  // Close and Save Handler
  const handleCloseAndSave = useCallback(() => {
    // Force record any pending debounced changes
    engine.forceRecordChange();

    // Get final content from the current history state
    const finalState = engine.changeHistory[engine.currentHistoryIndex];
    const finalLeftContent =
      finalState?.leftContent ?? engine.getCurrentLeftContent();

    // Check if content actually changed from original state
    if (finalLeftContent !== undefined && leftContent !== finalLeftContent) {
      onClose(finalLeftContent);
    } else {
      onClose();
    }
  }, [leftContent, onClose, engine]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center">
      <DiffModalUI
        leftTabTitle={leftTitle}
        rightTabTitle={rightTitle}
        engine={engine}
        onClose={handleCloseAndSave}
      />
    </div>
  );
};

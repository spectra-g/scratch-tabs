import React from "react";
import { X, Undo2, Redo2, Eye, EyeOff } from "../Icons";
import { DiffEditorEngine } from "./useDiffEditor";

interface DiffModalUIProps {
  leftTabTitle: string;
  rightTabTitle: string;
  engine: DiffEditorEngine;
  onClose: () => void;
}

export const DiffModalUI: React.FC<DiffModalUIProps> = ({
  leftTabTitle,
  rightTabTitle,
  engine,
  onClose,
}) => {
  const {
    editorContainerRef,
    areContentsIdentical,
    hideMatchingLines,
    canUndo,
    canRedo,
    handleUndo,
    handleRedo,
    toggleHideMatching,
  } = engine;

  return (
    <div
      className="bg-surface border border-base rounded-lg shadow-2xl z-50 flex flex-col overflow-hidden w-[95vw] max-w-[1800px] h-full max-h-[90vh] mx-4"
      data-testid="diff-modal"
    >
      {/* Header */}
      <div className="flex items-center justify-between bg-surface-highlight px-4 py-2 border-b border-base flex-wrap">
        <h2
          className="text-main font-medium mr-4 mb-1 sm:mb-0"
          title={`${leftTabTitle} ↔ ${rightTabTitle}`}
        >
          Compare: {leftTabTitle} <span className="text-muted mx-1">↔</span>{" "}
          {rightTabTitle}
        </h2>
        <div className="flex items-center flex-shrink-0">
          {/* Toggle Hide Matching Lines Button */}
          {!areContentsIdentical && (
            <button
              onClick={toggleHideMatching}
              title={
                hideMatchingLines
                  ? "Show Matching Lines"
                  : "Hide Matching Lines (Contextual Diff)"
              }
              className="mr-4 px-2 py-1 bg-element hover:bg-element-hover rounded text-xs text-main flex items-center transition-colors"
            >
              {hideMatchingLines ? (
                <Eye size={14} className="mr-1" />
              ) : (
                <EyeOff size={14} className="mr-1" />
              )}
              {hideMatchingLines ? "Show All" : "Hide Matching"}
            </button>
          )}
          {/* Undo/Redo Buttons */}
          <button
            onClick={handleUndo}
            title="Undo"
            disabled={!canUndo}
            className="mr-2 px-2 py-1 bg-element hover:bg-element-hover rounded text-xs text-main disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Undo2 size={14} />
          </button>
          <button
            onClick={handleRedo}
            title="Redo"
            disabled={!canRedo}
            className="mr-4 px-2 py-1 bg-element hover:bg-element-hover rounded text-xs text-main disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Redo2 size={14} />
          </button>
          {/* Close Button */}
          <button
            className="icon-themed hover:text-main transition-colors"
            onClick={onClose}
            title="Close and Save Changes"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Identical Content Message */}
      {areContentsIdentical && (
        <div className="bg-success-subtle text-success text-sm px-4 py-1 text-center border-b border-base flex-shrink-0">
          Contents are identical.
        </div>
      )}

      {/* Editor Area */}
      <div
        ref={editorContainerRef}
        className="flex-1 overflow-hidden"
        data-testid="diff-editor-container"
      >
        {/* Monaco Editor renders here */}
      </div>
    </div>
  );
};

import React, { useCallback, useMemo, useRef, useEffect } from "react";
import { useBatchToolsStore } from "../../stores/batchToolsStore";
import {
  X,
  RotateCcw,
  Check,
  Eye,
  EyeOff,
  Wrench,
  CheckCircle,
} from "../Icons";
import { BatchToolsConfig } from "./BatchToolsConfig";
import { BatchToolsPreview } from "./BatchToolsPreview";
import { applyTransformations } from "./transformations";

interface BatchToolsModalProps {
  onApply: (content: string) => void;
}

export const BatchToolsModal: React.FC<BatchToolsModalProps> = ({
  onApply,
}) => {
  const {
    isOpen,
    originalContent,
    selectedText,
    config,
    previewMode,
    closeModal,
    updateConfig,
    resetConfig,
    setPreviewMode,
  } = useBatchToolsStore();

  const contentToTransform = selectedText || originalContent;

  // Debounced transformation
  const debouncedTransformRef = useRef<NodeJS.Timeout>();
  const [transformedContent, setTransformedContent] =
    React.useState(contentToTransform);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const performTransformation = useCallback(() => {
    if (debouncedTransformRef.current) {
      clearTimeout(debouncedTransformRef.current);
    }

    setIsProcessing(true);

    debouncedTransformRef.current = setTimeout(() => {
      try {
        const result = applyTransformations(contentToTransform, config);
        setTransformedContent(result);
      } catch (error) {
        console.error("Transformation error:", error);
        setTransformedContent(contentToTransform);
      } finally {
        setIsProcessing(false);
      }
    }, 150);
  }, [contentToTransform, config]);

  useEffect(() => {
    performTransformation();
    return () => {
      if (debouncedTransformRef.current) {
        clearTimeout(debouncedTransformRef.current);
      }
    };
  }, [performTransformation]);

  const handleApply = useCallback(() => {
    onApply(transformedContent);
    closeModal();
  }, [transformedContent, onApply, closeModal]);

  const handleReset = useCallback(() => {
    resetConfig();
    setTransformedContent(contentToTransform);
  }, [resetConfig, contentToTransform]);

  const hasChanges = useMemo(() => {
    return contentToTransform !== transformedContent;
  }, [contentToTransform, transformedContent]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-themed rounded-lg shadow-2xl w-[95vw] h-[90vh] max-w-7xl flex flex-col border border-themed">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-themed bg-themed-secondary">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Wrench className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-medium text-themed">Batch Tools</h2>
            </div>
            {selectedText && (
              <span className="text-sm text-blue-500 bg-blue-500/10 px-2 py-1 rounded">
                Selection Mode
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* Preview Mode Toggle */}
            <button
              onClick={() =>
                setPreviewMode(
                  previewMode === "side-by-side" ? "unified" : "side-by-side",
                )
              }
              className="flex items-center space-x-1 px-3 py-1.5 bg-themed-secondary bg-themed-hover rounded text-sm text-themed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              title={`Switch to ${previewMode === "side-by-side" ? "unified" : "side-by-side"} view`}
            >
              {previewMode === "side-by-side" ? (
                <Eye className="w-4 h-4" />
              ) : (
                <EyeOff className="w-4 h-4" />
              )}
              <span>
                {previewMode === "side-by-side" ? "Side-by-side" : "Unified"}
              </span>
            </button>

            {/* Reset Button */}
            <button
              onClick={handleReset}
              className="flex items-center space-x-1 px-3 py-1.5 bg-themed-secondary bg-themed-hover rounded text-sm text-themed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Reset all transformations"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>

            {/* Close Button */}
            <button
              onClick={closeModal}
              className="p-1.5 icon-themed icon-themed-hover bg-themed-hover rounded-full transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Close modal"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Configuration */}
          <div className="w-80 bg-themed-secondary border-r border-themed flex flex-col">
            <div className="p-4 border-b border-themed">
              <h3 className="text-lg font-medium text-themed">
                Transformations
              </h3>
              <p className="text-sm text-themed-muted mt-1">
                {contentToTransform.split("\n").length} lines •{" "}
                {contentToTransform.length} chars
              </p>
            </div>

            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
              <BatchToolsConfig config={config} onChange={updateConfig} />
            </div>
          </div>

          {/* Right Panel - Preview */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-4 border-b border-themed flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-themed">Preview</h3>
                <div className="flex items-center space-x-4">
                  {hasChanges && (
                    <span className="flex items-center space-x-1 text-sm text-green-500">
                      <CheckCircle className="w-4 h-4" />
                      <span>Changes detected</span>
                    </span>
                  )}
                  <span className="text-sm text-themed-muted">
                    {transformedContent.split("\n").length} lines •{" "}
                    {transformedContent.length} chars
                  </span>
                </div>
              </div>
            </div>

            <div className="flex-1 p-4 min-h-0 overflow-hidden">
              <div className="h-full max-h-full overflow-hidden">
                <BatchToolsPreview
                  originalContent={contentToTransform}
                  transformedContent={transformedContent}
                  previewMode={previewMode}
                  isProcessing={isProcessing}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-themed bg-themed-secondary">
          <div className="text-sm text-themed-muted">
            {selectedText
              ? "Transformations will be applied to selected text"
              : "Transformations will be applied to entire content"}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={closeModal}
              className="px-4 py-2 text-themed-secondary hover:text-themed bg-themed-hover rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>

            <button
              onClick={handleApply}
              disabled={!hasChanges || isProcessing}
              className={`
                flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors
                ${
                  !hasChanges || isProcessing
                    ? "bg-themed-secondary text-themed-muted cursor-not-allowed"
                    : "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
                }
                focus:outline-none focus:ring-2 focus:ring-blue-500
              `}
            >
              <Check className="w-4 h-4" />
              <span>Apply Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

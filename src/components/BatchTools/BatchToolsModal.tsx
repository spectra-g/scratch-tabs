import React, { useCallback, useMemo, useRef, useEffect } from "react";
import {
  X,
  RotateCcw,
  Check,
  Eye,
  EyeOff,
  Wrench,
  CheckCircle,
} from "lucide-react";
import { useBatchToolsStore } from "../../stores/batchToolsStore";
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
      <div className="bg-gray-850 rounded-lg shadow-2xl w-[95vw] h-[90vh] max-w-7xl flex flex-col border border-gray-700/60">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700/60 bg-gradient-to-b from-gray-800 to-gray-850">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Wrench className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-medium text-gray-100">Batch Tools</h2>
            </div>
            {selectedText && (
              <span className="text-sm text-blue-400 bg-blue-900/30 px-2 py-1 rounded">
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
              className="flex items-center space-x-1 px-3 py-1.5 bg-gray-700/50 hover:bg-gray-600/50 rounded text-sm text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-850"
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
              className="flex items-center space-x-1 px-3 py-1.5 bg-gray-700/50 hover:bg-gray-600/50 rounded text-sm text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-850"
              title="Reset all transformations"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>

            {/* Close Button */}
            <button
              onClick={closeModal}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700/70 rounded-full transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-850"
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
          <div className="w-80 bg-gray-900 border-r border-gray-700/60 flex flex-col">
            <div className="p-4 border-b border-gray-700/60">
              <h3 className="text-lg font-medium text-gray-200">
                Transformations
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                {contentToTransform.split("\n").length} lines •{" "}
                {contentToTransform.length} chars
              </p>
            </div>

            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
              <BatchToolsConfig config={config} onChange={updateConfig} />
            </div>
          </div>

          {/* Right Panel - Preview */}
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-gray-700/60">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-200">Preview</h3>
                <div className="flex items-center space-x-4">
                  {hasChanges && (
                    <span className="flex items-center space-x-1 text-sm text-green-400">
                      <CheckCircle className="w-4 h-4" />
                      <span>Changes detected</span>
                    </span>
                  )}
                  <span className="text-sm text-gray-400">
                    {transformedContent.split("\n").length} lines •{" "}
                    {transformedContent.length} chars
                  </span>
                </div>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-hidden">
              <BatchToolsPreview
                originalContent={contentToTransform}
                transformedContent={transformedContent}
                previewMode={previewMode}
                isProcessing={isProcessing}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-700/60 bg-gray-900">
          <div className="text-sm text-gray-400">
            {selectedText
              ? "Transformations will be applied to selected text"
              : "Transformations will be applied to entire content"}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={closeModal}
              className="px-4 py-2 text-gray-300 hover:text-gray-100 hover:bg-gray-700/50 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
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
                    ? "bg-gray-700/50 text-gray-500 cursor-not-allowed"
                    : "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                }
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900
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

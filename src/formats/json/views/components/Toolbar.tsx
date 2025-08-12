import React, { useState, useCallback } from "react";
import { CheckCircle2, XCircle, RotateCcw, RotateCw, WrapText, GitCompare, Wand2, Copy, Check } from "lucide-react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { formatJson, applyEditToEditor } from "../../actions/jsonOperations";
import { useJsonModals } from "../../hooks/useJsonModals";
import { autoFixJson, formatFixedJson } from "../../actions/jsonAutoFix";

interface ToolbarProps {
  isValid: boolean;
  validationError: string | null;
  currentPath: string;
  onPathChange: (path: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  editor: monaco.editor.IStandaloneCodeEditor | null;
  onContentChange: (content: string) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  isValid,
  validationError,
  currentPath,
  onPathChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  editor,
  onContentChange: _onContentChange, // Passed to maintain interface compatibility, handled by Monaco events
}) => {
  const { openStructureComparisonModal } = useJsonModals();
  const [isCopied, setIsCopied] = useState(false);

  const handleFormat = () => {
    if (!editor) return;
    try {
      const content = editor.getValue();
      const formatted = formatJson(content);
      applyEditToEditor(editor, formatted, "format");
    } catch (error) {
      console.error("Failed to format JSON:", error);
    }
  };

  const handleAutoFix = () => {
    if (!editor) return;
    
    const content = editor.getValue();
    const result = autoFixJson(content);
    
    if (result.success && result.fixedContent) {
      try {
        const formatted = formatFixedJson(result.fixedContent);
        applyEditToEditor(editor, formatted, "auto-fix");
      } catch (error) {
        console.error("Failed to format fixed JSON:", error);
        // Still apply the fix even if formatting fails
        applyEditToEditor(editor, result.fixedContent, "auto-fix");
      }
    } else {
      console.warn("Auto-fix failed:", result.error);
      // Could show a toast/notification here in the future
    }
  };

  const handleCompareStructures = () => {
    if (!editor) return;
    const content = editor.getValue();
    openStructureComparisonModal(content);
  };

  const handleCopy = useCallback(async () => {
    if (!editor) return;
    
    try {
      const content = editor.getValue();
      await navigator.clipboard.writeText(content);
      setIsCopied(true);
      
      // Reset the icon after 2 seconds
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }, [editor]);

  return (
    <div className="flex items-center justify-between p-3 border-b border-gray-700 bg-gray-800/50">
      {/* Left Section: Validation Status */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          {isValid ? (
            <CheckCircle2 size={16} className="text-green-400" />
          ) : (
            <XCircle size={16} className="text-red-400" />
          )}
          <span className="text-sm">
            {isValid ? "Valid JSON" : "Invalid JSON"}
          </span>
          {validationError && (
            <>
              <span className="text-xs text-red-400 ml-2" title={validationError}>
                {validationError.length > 50 
                  ? `${validationError.substring(0, 50)}...` 
                  : validationError
                }
              </span>
              <button
                onClick={handleAutoFix}
                className="p-1 rounded hover:bg-gray-700 text-purple-400 hover:text-purple-300 transition-colors"
                title="Auto-fix JSON"
              >
                <Wand2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Center Section: Search */}
      <div className="flex-1 max-w-md mx-4">
        <input
          type="text"
          value={currentPath}
          onChange={(e) => onPathChange(e.target.value)}
          placeholder="Search in JSON (e.g., users[0].name)"
          className="w-full px-3 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-gray-200 placeholder-gray-400 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Right Section: Actions */}
      <div className="flex items-center space-x-2">
        {/* Undo/Redo */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`p-2 rounded transition-colors ${
            canUndo 
              ? "hover:bg-gray-700 text-gray-300" 
              : "text-gray-500 cursor-not-allowed"
          }`}
          title="Undo"
        >
          <RotateCcw size={16} />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={`p-2 rounded transition-colors ${
            canRedo 
              ? "hover:bg-gray-700 text-gray-300" 
              : "text-gray-500 cursor-not-allowed"
          }`}
          title="Redo"
        >
          <RotateCw size={16} />
        </button>

        <div className="w-px h-6 bg-gray-600 mx-2" />

        {/* Primary Actions */}
        <button
          onClick={handleCopy}
          className={`p-2 rounded transition-colors ${
            isCopied 
              ? "bg-green-500/20 text-green-400" 
              : "hover:bg-gray-700 text-gray-300"
          }`}
          title={isCopied ? "Copied!" : "Copy JSON"}
        >
          {isCopied ? <Check size={16} /> : <Copy size={16} />}
        </button>
        <button
          onClick={handleFormat}
          className="flex items-center space-x-1 px-3 py-1 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors"
          title="Format JSON"
        >
          <WrapText size={14} />
          <span className="text-sm">Format</span>
        </button>
        <button
          onClick={handleCompareStructures}
          className="flex items-center space-x-1 px-3 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
          title="Compare Structures"
        >
          <GitCompare size={14} />
          <span className="text-sm">Compare Structures</span>
        </button>
      </div>
    </div>
  );
};
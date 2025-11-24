import React, { useState, useCallback } from "react";
import { CheckCircle2, XCircle, RotateCcw, RotateCw, WrapText, Wand2, Copy, Check, Sparkles, Database } from "lucide-react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { formatJson, applyEditToEditor } from "../../actions/jsonOperations";
import { useJsonModals } from "../../hooks/useJsonModals";
import { autoFixJson, formatFixedJson } from "../../actions/jsonAutoFix";
import { CompareDropdown } from "./CompareDropdown";
import { useTabsStore } from "../../../../stores/tabsStore";
import { useWorkspaceStore } from "../../../../stores/workspaceStore";
import { useDiffModalStore } from "../../../../stores/diffModalStore";
import { getRecentJsonTabs, isValidJson } from "../../../../utils/jsonTabHelpers";
import { useQueryPanelStore } from "../../stores/useQueryPanelStore";
import { contentProcessingService } from "../../../../services/contentProcessing";

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
  tabId: string;
}

// Constants
const COPY_FEEDBACK_DURATION_MS = 2000;

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
  tabId,
}) => {
  const { openStructureComparisonModal, openEqualityCheckModal } = useJsonModals();
  const { tabs } = useTabsStore();
  const { activeWorkspaceId } = useWorkspaceStore();
  const { openDiffModalWithContent } = useDiffModalStore();
  const { getStateForTab, togglePanel } = useQueryPanelStore();
  const { isOpen: isQueryPanelOpen } = getStateForTab(tabId);
  const [isCopied, setIsCopied] = useState(false);

  // Get all JSON tabs from current workspace
  const recentJsonTabs = getRecentJsonTabs(tabs, tabId, activeWorkspaceId || "");

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

  const handleFixJson = () => {
    if (!editor) return;

    const content = editor.getValue();
    const result = autoFixJson(content);

    if (result.success && result.fixedContent) {
      try {
        const formatted = formatFixedJson(result.fixedContent);
        applyEditToEditor(editor, formatted, "fix-json");
      } catch (error) {
        console.error("Failed to format fixed JSON:", error);
        // Still apply the fix even if formatting fails
        applyEditToEditor(editor, result.fixedContent, "fix-json");
      }
    } else {
      console.warn("Fix JSON failed:", result.error);
      // Apply partially fixed content if available
      if (result.fixedContent) {
        applyEditToEditor(editor, result.fixedContent, "fix-json");
      }
    }
  };

  const handleCompareStructures = () => {
    if (!editor) return;
    const content = editor.getValue();
    openStructureComparisonModal(content);
  };

  const handleEqualityCheck = () => {
    if (!editor) return;
    const content = editor.getValue();
    openEqualityCheckModal(content, tabId);
  };

  /**
   * Opens diff modal with current content vs comparison content
   * Updates editor with changes when modal closes
   */
  const openComparisonDiff = useCallback(
    (comparisonContent: string, comparisonTitle: string) => {
      if (!editor) return;

      const currentContent = editor.getValue();

      openDiffModalWithContent(
        currentContent,
        comparisonContent,
        "Current JSON",
        comparisonTitle,
        (updatedContent) => {
          // When diff modal closes, update current editor with changes
          if (updatedContent !== undefined && updatedContent !== currentContent) {
            applyEditToEditor(editor, updatedContent, "diff-update");
          }
        }
      );
    },
    [editor, openDiffModalWithContent]
  );

  const handleCompareWithClipboard = async () => {
    if (!editor) return;

    try {
      const clipboardContent = await navigator.clipboard.readText();

      if (!isValidJson(clipboardContent)) {
        console.warn("Clipboard does not contain valid JSON");
        // TODO: Show toast notification
        return;
      }

      // Process clipboard content through content processing pipeline
      // This handles unstringifying double-escaped JSON, formatting, etc.
      const { content: processedContent } = await contentProcessingService.processClipboardForComparison(
        clipboardContent,
        'json' // Pre-detect as JSON since we validated it
      );

      openComparisonDiff(processedContent, "Clipboard JSON");
    } catch (error) {
      console.error("Failed to compare with clipboard:", error);
      // TODO: Show toast notification
    }
  };

  const handleCompareWithTab = (compareTabId: string) => {
    const compareTab = tabs.find((t) => t.id === compareTabId);
    if (!compareTab || !compareTab.content) {
      console.warn("Tab not found or has no content");
      return;
    }

    openComparisonDiff(compareTab.content, compareTab.title);
  };

  const handleCopy = useCallback(async () => {
    if (!editor) return;
    
    try {
      const content = editor.getValue();
      await navigator.clipboard.writeText(content);
      setIsCopied(true);
      
      // Reset the icon after feedback duration
      setTimeout(() => {
        setIsCopied(false);
      }, COPY_FEEDBACK_DURATION_MS);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }, [editor]);

  return (
    <div className="flex items-center justify-between p-3 border-b border-base bg-surface-highlight">
      {/* Left Section: Validation Status */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          {isValid ? (
            <CheckCircle2 size={16} className="text-success" />
          ) : (
            <XCircle size={16} className="text-danger" />
          )}
          <span className="text-sm text-main">
            {isValid ? "Valid JSON" : "Invalid JSON"}
          </span>
          {validationError && (
            <>
              <span className="text-xs text-danger ml-2" title={validationError}>
                {validationError.length > 50
                  ? `${validationError.substring(0, 50)}...`
                  : validationError
                }
              </span>
              <button
                onClick={handleAutoFix}
                className="p-1 rounded hover:bg-element-hover text-info hover:text-main transition-colors"
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
          className="w-full px-3 py-1 bg-element text-main border border-base rounded text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:border-focus"
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
              ? "hover:bg-element-hover text-secondary"
              : "text-muted cursor-not-allowed"
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
              ? "hover:bg-element-hover text-secondary"
              : "text-muted cursor-not-allowed"
          }`}
          title="Redo"
        >
          <RotateCw size={16} />
        </button>

        <div className="w-px h-6 bg-base mx-2" />

        {/* Primary Actions */}
        <button
          onClick={() => togglePanel(tabId)}
          className={`flex items-center space-x-1 px-3 py-1 rounded transition-colors ${
            isQueryPanelOpen
              ? "bg-element-active text-info"
              : "bg-info text-main hover:bg-info/80"
          }`}
          title="Toggle JMESPath Query Panel"
        >
          <Database size={14} />
          <span className="text-sm">Query</span>
        </button>
        <button
          onClick={handleCopy}
          className={`p-2 rounded transition-colors ${
            isCopied
              ? "bg-success-subtle text-success"
              : "hover:bg-element-hover text-secondary"
          }`}
          title={isCopied ? "Copied!" : "Copy JSON"}
        >
          {isCopied ? <Check size={16} /> : <Copy size={16} />}
        </button>
        <button
          onClick={handleFormat}
          className="flex items-center space-x-1 px-3 py-1 bg-info text-main rounded hover:bg-info/80 transition-colors"
          title="Format JSON"
        >
          <WrapText size={14} />
          <span className="text-sm">Format</span>
        </button>
        <button
          onClick={handleFixJson}
          className="flex items-center space-x-1 px-3 py-1 bg-info text-main rounded hover:bg-info/80 transition-colors"
          title="Fix JSON - Auto-fix common errors including control characters, missing quotes, commas, and brackets"
        >
          <Sparkles size={14} />
          <span className="text-sm">Fix JSON</span>
        </button>
        <CompareDropdown
          recentJsonTabs={recentJsonTabs}
          onCompareWithClipboard={handleCompareWithClipboard}
          onCompareWithTab={handleCompareWithTab}
          onCompareStructure={handleCompareStructures}
          onEqualityCheck={handleEqualityCheck}
        />
      </div>
    </div>
  );
};
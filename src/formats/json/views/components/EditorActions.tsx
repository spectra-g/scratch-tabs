import React, { useCallback } from "react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import {
  WrapText,
  Sparkles,
  ArrowDownAZ,
  Minimize2,
  Quote,
  FileText,
  GitCompare,
  ChevronDown,
  Clipboard,
  FileJson,
  CheckCheck,
} from "lucide-react";
import {
  formatJson,
  applyEditToEditor,
  minifyJson,
  sortJsonKeys,
  stringifyJson,
  unstringifyJsonContent,
} from "../../actions/jsonOperations";
import { autoFixJson, formatFixedJson } from "../../actions/jsonAutoFix";
import { useJsonModals } from "../../hooks/useJsonModals";
import { CompareDropdown } from "./CompareDropdown";
import { Tab } from "../../../../types";
import { useTabsStore } from "../../../../stores/tabsStore";
import { useWorkspaceStore } from "../../../../stores/workspaceStore";
import { useDiffModalStore } from "../../../../stores/diffModalStore";
import { getRecentJsonTabs, isValidJson } from "../../../../utils/jsonTabHelpers";
import { contentProcessingService } from "../../../../services/contentProcessing";

interface EditorActionsProps {
  editor: monaco.editor.IStandaloneCodeEditor | null;
  tabId: string;
  addTab: (tab: Tab) => void;
}

interface ActionButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  title?: string;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  onClick,
  icon,
  label,
  title,
}) => (
  <button
    onClick={onClick}
    className="flex items-center gap-1 px-2 py-1 text-xs bg-element hover:bg-element-hover text-main rounded transition-colors"
    title={title || label}
  >
    {icon}
    <span>{label}</span>
  </button>
);

export const EditorActions: React.FC<EditorActionsProps> = ({
  editor,
  tabId,
  addTab,
}) => {
  const { openStructureComparisonModal, openEqualityCheckModal, openDocumentationExportModal } =
    useJsonModals();
  const { tabs } = useTabsStore();
  const { activeWorkspaceId } = useWorkspaceStore();
  const { openDiffModalWithContent } = useDiffModalStore();

  // Get all JSON tabs from current workspace
  const recentJsonTabs = getRecentJsonTabs(tabs, tabId, activeWorkspaceId || "");

  const executeTransformation = useCallback(
    (transformFn: (content: string) => string, actionName: string) => {
      if (!editor) return;
      try {
        const content = editor.getValue();
        const result = transformFn(content);
        applyEditToEditor(editor, result, actionName);
      } catch (error) {
        console.error(`${actionName} failed:`, error);
      }
    },
    [editor]
  );

  const handleFormat = useCallback(() => {
    executeTransformation(formatJson, "format");
  }, [executeTransformation]);

  const handleMinify = useCallback(() => {
    executeTransformation(minifyJson, "minify");
  }, [executeTransformation]);

  const handleAutoFix = useCallback(() => {
    if (!editor) return;

    const content = editor.getValue();
    const result = autoFixJson(content);

    if (result.success && result.fixedContent) {
      try {
        const formatted = formatFixedJson(result.fixedContent);
        applyEditToEditor(editor, formatted, "auto-fix");
      } catch (error) {
        console.error("Failed to format fixed JSON:", error);
        applyEditToEditor(editor, result.fixedContent, "auto-fix");
      }
    } else {
      console.warn("Auto-fix failed:", result.error);
      if (result.fixedContent) {
        applyEditToEditor(editor, result.fixedContent, "auto-fix");
      }
    }
  }, [editor]);

  const handleSortKeys = useCallback(() => {
    executeTransformation(sortJsonKeys, "sort-keys");
  }, [executeTransformation]);

  const handleStringify = useCallback(() => {
    executeTransformation(stringifyJson, "stringify");
  }, [executeTransformation]);

  const handleUnstringify = useCallback(() => {
    executeTransformation(unstringifyJsonContent, "unstringify");
  }, [executeTransformation]);

  const handleExportDocs = useCallback(() => {
    if (!editor) return;
    const content = editor.getValue();
    openDocumentationExportModal(content, addTab);
  }, [editor, openDocumentationExportModal, addTab]);

  // Compare handlers
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
          if (updatedContent !== undefined && updatedContent !== currentContent) {
            applyEditToEditor(editor, updatedContent, "diff-update");
          }
        }
      );
    },
    [editor, openDiffModalWithContent]
  );

  const handleCompareWithClipboard = useCallback(async () => {
    if (!editor) return;

    try {
      const clipboardContent = await navigator.clipboard.readText();

      if (!isValidJson(clipboardContent)) {
        console.warn("Clipboard does not contain valid JSON");
        return;
      }

      const { content: processedContent } =
        await contentProcessingService.processClipboardForComparison(
          clipboardContent,
          "json"
        );

      openComparisonDiff(processedContent, "Clipboard JSON");
    } catch (error) {
      console.error("Failed to compare with clipboard:", error);
    }
  }, [editor, openComparisonDiff]);

  const handleCompareWithTab = useCallback(
    (compareTabId: string) => {
      const compareTab = tabs.find((t) => t.id === compareTabId);
      if (!compareTab || !compareTab.content) {
        console.warn("Tab not found or has no content");
        return;
      }

      openComparisonDiff(compareTab.content, compareTab.title);
    },
    [tabs, openComparisonDiff]
  );

  const handleCompareStructures = useCallback(() => {
    if (!editor) return;
    const content = editor.getValue();
    openStructureComparisonModal(content);
  }, [editor, openStructureComparisonModal]);

  const handleEqualityCheck = useCallback(() => {
    if (!editor) return;
    const content = editor.getValue();
    openEqualityCheckModal(content, tabId);
  }, [editor, openEqualityCheckModal, tabId]);

  return (
    <div className="flex items-center gap-4 p-2 border-b border-base bg-surface-secondary">
      {/* Format Group */}
      <div className="flex items-center gap-1">
        <ActionButton
          onClick={handleFormat}
          icon={<WrapText size={14} />}
          label="Format"
          title="Format JSON (Pretty Print)"
        />
        <ActionButton
          onClick={handleMinify}
          icon={<Minimize2 size={14} />}
          label="Minify"
          title="Minify JSON (Remove Whitespace)"
        />
        <ActionButton
          onClick={handleAutoFix}
          icon={<Sparkles size={14} />}
          label="Fix"
          title="Auto-fix common JSON errors"
        />
      </div>

      <div className="w-px h-5 bg-base" />

      {/* Structure Group */}
      <div className="flex items-center gap-1">
        <ActionButton
          onClick={handleSortKeys}
          icon={<ArrowDownAZ size={14} />}
          label="Sort"
          title="Sort Keys Alphabetically"
        />
        <ActionButton
          onClick={handleStringify}
          icon={<Quote size={14} />}
          label="Stringify"
          title="Escape JSON as a string"
        />
        <ActionButton
          onClick={handleUnstringify}
          icon={<Quote size={14} className="rotate-180" />}
          label="Unstringify"
          title="Unescape stringified JSON"
        />
      </div>

      <div className="w-px h-5 bg-base" />

      {/* Tools Group */}
      <div className="flex items-center gap-1">
        <ActionButton
          onClick={handleExportDocs}
          icon={<FileText size={14} />}
          label="Export Docs"
          title="Export for Documentation (Mask Sensitive Data)"
        />
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

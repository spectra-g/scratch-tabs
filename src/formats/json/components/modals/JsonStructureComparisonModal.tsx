import React, { useState, useRef, useCallback, useEffect } from "react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { BaseModal } from "../../../../components/Modals/BaseModal";
import { JsonStructureComparisonUI } from "./JsonStructureComparisonUI";
import {
  compareStructures,
  ComparisonResult,
  ComparisonOptions,
} from "../../utils/jsonStructureComparison";
import { useDebounce } from "../../../../hooks/useDebounce";

interface JsonStructureComparisonModalProps {
  sourceJson: string;
  onClose: () => void;
}

export const JsonStructureComparisonModal: React.FC<
  JsonStructureComparisonModalProps
> = ({ sourceJson, onClose }) => {
  const [targetJson, setTargetJson] = useState("");
  const [comparisonResult, setComparisonResult] =
    useState<ComparisonResult | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<ComparisonOptions>({
    arraySampleCount: 3,
    strictArrayLength: false,
    caseSensitiveKeys: true,
  });

  const sourceEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(
    null,
  );
  const targetEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(
    null,
  );
  const [syncScroll, setSyncScroll] = useState(false);

  // Debounce the comparison to avoid excessive computation
  const debouncedTargetJson = useDebounce(targetJson, 500);

  // Run comparison when target JSON changes
  useEffect(() => {
    if (!debouncedTargetJson.trim()) {
      setComparisonResult(null);
      setError(null);
      return;
    }

    setIsComparing(true);
    setError(null);

    // Use setTimeout to prevent blocking the UI
    const timeoutId = setTimeout(() => {
      try {
        const result = compareStructures(
          sourceJson,
          debouncedTargetJson,
          options,
        );
        setComparisonResult(result);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "An error occurred during comparison",
        );
        setComparisonResult(null);
      } finally {
        setIsComparing(false);
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [sourceJson, debouncedTargetJson, options]);

  // Handle source editor mount
  const handleSourceEditorMount = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor) => {
      sourceEditorRef.current = editor;

      // Configure editor
      editor.updateOptions({
        readOnly: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: "on",
      });

      // Set the source JSON
      editor.setValue(sourceJson);
    },
    [sourceJson],
  );

  // Handle target editor mount
  const handleTargetEditorMount = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor) => {
      targetEditorRef.current = editor;

      // Configure editor
      editor.updateOptions({
        readOnly: false,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: "on",
      });

      // Set placeholder
      editor.setValue(targetJson || "// Paste your JSON here to compare\n");
    },
    [targetJson],
  );

  // Handle target editor change
  const handleTargetEditorChange = useCallback((value: string | undefined) => {
    setTargetJson(value || "");
  }, []);

  // Sync scroll between editors
  useEffect(() => {
    if (!syncScroll || !sourceEditorRef.current || !targetEditorRef.current)
      return;

    const sourceEditor = sourceEditorRef.current;
    const targetEditor = targetEditorRef.current;

    const handleSourceScroll = () => {
      const scrollTop = sourceEditor.getScrollTop();
      const scrollLeft = sourceEditor.getScrollLeft();
      targetEditor.setScrollPosition({ scrollTop, scrollLeft });
    };

    const handleTargetScroll = () => {
      const scrollTop = targetEditor.getScrollTop();
      const scrollLeft = targetEditor.getScrollLeft();
      sourceEditor.setScrollPosition({ scrollTop, scrollLeft });
    };

    const sourceDisposable = sourceEditor.onDidScrollChange(handleSourceScroll);
    const targetDisposable = targetEditor.onDidScrollChange(handleTargetScroll);

    return () => {
      sourceDisposable.dispose();
      targetDisposable.dispose();
    };
  }, [syncScroll]);

  // Navigate to path in editors
  const navigateToPath = useCallback((path: string) => {
    if (!sourceEditorRef.current || !targetEditorRef.current) return;

    // Simple path to line number mapping (this could be enhanced)
    const pathParts = path.split("/").filter(Boolean);
    const lineNumber = pathParts.length + 1; // Rough estimate

    // Navigate in both editors
    sourceEditorRef.current.revealLineInCenter(lineNumber);
    targetEditorRef.current.revealLineInCenter(lineNumber);

    // Highlight the line briefly
    const sourceModel = sourceEditorRef.current.getModel();
    const targetModel = targetEditorRef.current.getModel();

    if (sourceModel && lineNumber <= sourceModel.getLineCount()) {
      const range = new monaco.Range(lineNumber, 1, lineNumber, 1);
      sourceEditorRef.current.setSelection(range);
    }

    if (targetModel && lineNumber <= targetModel.getLineCount()) {
      const range = new monaco.Range(lineNumber, 1, lineNumber, 1);
      targetEditorRef.current.setSelection(range);
    }
  }, []);

  // Copy report to clipboard
  const copyReport = useCallback(() => {
    if (!comparisonResult) return;

    const reportText = comparisonResult.diffList
      .map((diff) => `${diff.path}: ${diff.message}`)
      .join("\n");

    navigator.clipboard.writeText(reportText);
  }, [comparisonResult]);

  // Download report as JSON
  const downloadReport = useCallback(() => {
    if (!comparisonResult) return;

    const dataStr = JSON.stringify(comparisonResult, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "json-structure-comparison-report.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [comparisonResult]);

  return (
    <BaseModal
      title="JSON Structure Comparison"
      onClose={onClose}
      widthClass="w-[95vw]"
      maxWidthClass="max-w-[1800px]"
      maxHeightClass="max-h-[90vh]"
    >
      <JsonStructureComparisonUI
        sourceJson={sourceJson}
        targetJson={targetJson}
        comparisonResult={comparisonResult}
        isComparing={isComparing}
        error={error}
        options={options}
        syncScroll={syncScroll}
        onSourceEditorMount={handleSourceEditorMount}
        onTargetEditorMount={handleTargetEditorMount}
        onTargetEditorChange={handleTargetEditorChange}
        onSyncScrollChange={setSyncScroll}
        onOptionsChange={setOptions}
        onNavigateToPath={navigateToPath}
        onCopyReport={copyReport}
        onDownloadReport={downloadReport}
      />
    </BaseModal>
  );
};

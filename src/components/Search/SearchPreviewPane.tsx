import React, { useRef, useEffect } from "react";
import { Editor } from "@monaco-editor/react"; // Import Monaco type directly from here
import type * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api"; // Keep for specific types if needed
import { Tab } from "../../types";
import { SearchResult } from "../../stores/searchStore";
import { useThemeStore } from "../../stores/themeStore";

interface SearchPreviewPaneProps {
  tab: Tab | null | undefined;
  selectedResult: SearchResult | null;
}

// Type alias for clarity
type MonacoApi = typeof monacoEditor;

export const SearchPreviewPane: React.FC<SearchPreviewPaneProps> = ({
  tab,
  selectedResult,
}) => {
  const { isDarkMode } = useThemeStore();
  const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(
    null,
  );
  const monacoRef = useRef<MonacoApi | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const revealTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Capture both editor and monaco instances on mount
  const handleEditorDidMount = (
    editor: monacoEditor.editor.IStandaloneCodeEditor,
    monacoInstance: MonacoApi,
  ) => {
    editorRef.current = editor;
    monacoRef.current = monacoInstance; // Store the monaco instance
  };

  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;

    // Clear any pending reveal timeout from previous effect runs
    if (revealTimeoutRef.current) {
      clearTimeout(revealTimeoutRef.current);
    }

    // Determine content and language for the editor
    const displayContent = selectedResult?.tabContent ?? tab?.content ?? "";
    const displayLanguage =
      selectedResult?.language ?? tab?.language ?? "plaintext";

    if (!editor || !monaco) {
      if (editor) editor.setValue(displayContent); // Set content even if no tab prop
      return;
    }

    // If no selected result or tab, clear editor.
    // We use selectedResult directly for content now.
    if (!selectedResult) {
      const model = editor.getModel();
      if (model && model.getValue() !== "") model.setValue("");
      decorationsRef.current = editor.deltaDecorations(
        decorationsRef.current,
        [],
      );
      return;
    }

    const model = editor.getModel();
    if (model) {
      if (model.getValue() !== displayContent) model.setValue(displayContent);
      if (model.getLanguageId() !== displayLanguage) {
        monaco.editor.setModelLanguage(model, displayLanguage);
      }
    }

    if (selectedResult) {
      const { lineNumber, matchIndex, matchLength } = selectedResult;

      // --- Add a short delay before applying decorations and revealing ---
      revealTimeoutRef.current = setTimeout(() => {
        if (!editorRef.current || !monacoRef.current) return; // Check refs again inside timeout
        const currentEditor = editorRef.current;
        const currentMonaco = monacoRef.current;
        const currentModel = currentEditor.getModel();

        if (
          currentModel &&
          lineNumber > 0 &&
          lineNumber <= currentModel.getLineCount()
        ) {
          decorationsRef.current = currentEditor.deltaDecorations(
            decorationsRef.current,
            [
              {
                range: new currentMonaco.Range(lineNumber, 1, lineNumber, 1),
                options: {
                  isWholeLine: true,
                  className: "search-highlight-line bg-blue-900/20 dark:bg-blue-900/40",
                  overviewRuler: {
                    color: "rgba(0, 122, 204, 0.7)",
                    position: currentMonaco.editor.OverviewRulerLane.Center,
                  },
                },
              },
              {
                range: new currentMonaco.Range(
                  lineNumber,
                  Math.max(1, matchIndex + 1),
                  lineNumber,
                  Math.max(1, matchIndex + matchLength + 1),
                ),
                options: {
                  className: "search-highlight-match bg-yellow-300/40 dark:bg-yellow-500/40",
                  inlineClassName: "search-match-inline-decoration",
                  stickiness:
                    currentMonaco.editor.TrackedRangeStickiness
                      .NeverGrowsWhenTypingAtEdges,
                },
              },
            ],
          );
          currentEditor.revealLineInCenterIfOutsideViewport(
            lineNumber,
            currentMonaco.editor.ScrollType.Smooth,
          );
        } else {
          console.warn(
            `Invalid lineNumber (${lineNumber}) or model not ready for highlighting in tab ${tab?.id || "unknown"}`,
          );
          decorationsRef.current = currentEditor.deltaDecorations(
            decorationsRef.current,
            [],
          );
        }
      }, 50); // Small delay (e.g., 50ms)
    } else {
      decorationsRef.current = editor.deltaDecorations(
        decorationsRef.current,
        [],
      );
    }

    // Cleanup timeout on effect re-run or unmount
    return () => {
      if (revealTimeoutRef.current) {
        clearTimeout(revealTimeoutRef.current);
      }
    };
  }, [tab, selectedResult]);

  return (
    <Editor
      height="100%"
      // Use a key derived from the tab ID to force a full remount when the tab changes.
      // This often helps reset internal Monaco state reliably.
      key={selectedResult?.tabId || tab?.id || "no-preview-tab"} // Key off selectedResult first
      language={selectedResult?.language ?? tab?.language ?? "plaintext"}
      value={selectedResult?.tabContent ?? tab?.content ?? ""}
      theme={isDarkMode ? "vs-dark" : "vs"}
      onMount={handleEditorDidMount} // Pass the updated handler
      options={{
        readOnly: true,
        minimap: { enabled: true }, // Enable minimap for context
        fontSize: 13,
        wordWrap: "on",
        scrollBeyondLastLine: false,
        padding: { top: 8, bottom: 8 },
        renderLineHighlight: "none",
        occurrencesHighlight: "off",
      }}
    />
  );
};

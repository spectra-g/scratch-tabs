import React, { useRef, useEffect } from "react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";

interface MonacoDiffViewerProps {
  leftContent: string;
  rightContent: string;
  language: string;
  leftLabel?: string;
  rightLabel?: string;
}

/**
 * A reusable, read-only side-by-side diff viewer component powered by Monaco Editor.
 *
 * This component is designed for displaying content differences in a clean,
 * non-editable format. Perfect for comparing JSON arrays, code snippets, or any text.
 *
 * @example
 * ```tsx
 * <MonacoDiffViewer
 *   leftContent={originalJson}
 *   rightContent={modifiedJson}
 *   language="json"
 *   leftLabel="Original"
 *   rightLabel="Modified"
 * />
 * ```
 */
export const MonacoDiffViewer: React.FC<MonacoDiffViewerProps> = ({
  leftContent,
  rightContent,
  language,
  leftLabel,
  rightLabel,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const diffEditorRef = useRef<monaco.editor.IStandaloneDiffEditor | null>(null);
  const modelsRef = useRef<{
    original: monaco.editor.ITextModel | null;
    modified: monaco.editor.ITextModel | null;
  }>({ original: null, modified: null });

  // Initialize Monaco diff editor
  useEffect(() => {
    if (!containerRef.current) return;

    // Create models
    const originalModel = monaco.editor.createModel(leftContent, language);
    const modifiedModel = monaco.editor.createModel(rightContent, language);

    modelsRef.current = {
      original: originalModel,
      modified: modifiedModel,
    };

    // Create diff editor
    const diffEditor = monaco.editor.createDiffEditor(containerRef.current, {
      originalEditable: false,
      readOnly: true,
      renderSideBySide: true,
      theme: "vs-dark",
      automaticLayout: true,
      enableSplitViewResizing: false,
      scrollBeyondLastLine: false,
      renderIndicators: true,
      diffCodeLens: false,
      minimap: { enabled: false },
      folding: true,
      lineNumbers: "on",
      glyphMargin: false,
      renderOverviewRuler: false,
    });

    diffEditor.setModel({
      original: originalModel,
      modified: modifiedModel,
    });

    diffEditorRef.current = diffEditor;

    // Cleanup on unmount
    return () => {
      diffEditor.dispose();
      originalModel.dispose();
      modifiedModel.dispose();
      diffEditorRef.current = null;
      modelsRef.current = { original: null, modified: null };
    };
  }, []); // Only run once on mount

  // Update content when props change
  useEffect(() => {
    const { original, modified } = modelsRef.current;

    if (original && original.getValue() !== leftContent) {
      original.setValue(leftContent);
    }

    if (modified && modified.getValue() !== rightContent) {
      modified.setValue(rightContent);
    }
  }, [leftContent, rightContent]);

  // Update language when it changes
  useEffect(() => {
    const { original, modified } = modelsRef.current;

    if (original) {
      monaco.editor.setModelLanguage(original, language);
    }

    if (modified) {
      monaco.editor.setModelLanguage(modified, language);
    }
  }, [language]);

  return (
    <div className="flex flex-col h-full">
      {/* Optional labels */}
      {(leftLabel || rightLabel) && (
        <div className="flex-none grid grid-cols-2 gap-px bg-gray-700/50 text-xs text-gray-400 font-medium">
          <div className="bg-gray-800 px-3 py-1.5">
            {leftLabel || "Original"}
          </div>
          <div className="bg-gray-800 px-3 py-1.5">
            {rightLabel || "Modified"}
          </div>
        </div>
      )}

      {/* Monaco diff editor container */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0"
        data-testid="monaco-diff-viewer"
      />
    </div>
  );
};

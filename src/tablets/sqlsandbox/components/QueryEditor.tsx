import Editor from "@monaco-editor/react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { forwardRef, useImperativeHandle, useRef } from "react";
import { useThemeStore } from "../../../stores/themeStore";

export interface QueryEditorHandle {
  getSelectedSql: () => string;
}

interface QueryEditorProps {
  query: string;
  onChange: (query: string) => void;
  onRun: () => void;
  onRunSelected: (sql: string) => void;
}

export const QueryEditor = forwardRef<QueryEditorHandle, QueryEditorProps>(function QueryEditor(
  { query, onChange, onRun, onRunSelected },
  ref,
) {
  const { isDarkMode } = useThemeStore();
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  
  const onRunRef = useRef(onRun);
  const onRunSelectedRef = useRef(onRunSelected);
  onRunRef.current = onRun;
  onRunSelectedRef.current = onRunSelected;

  const getSelectedSql = () => {
    const editor = editorRef.current;
    if (!editor) return "";
    const selection = editor.getSelection();
    const model = editor.getModel();
    if (!selection || !model || selection.isEmpty()) return "";
    return model.getValueInRange(selection);
  };

  useImperativeHandle(ref, () => ({ getSelectedSql }), []);

  return (
    <div className="h-full min-h-[220px]" data-testid="sqlsandbox-query-editor">
      <Editor
        height="100%"
        language="sql"
        value={query}
        onChange={(value) => onChange(value ?? "")}
        onMount={(editor) => {
          editorRef.current = editor;
          editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
            onRunRef.current();
          });
          editor.addCommand(
            monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter,
            () => onRunSelectedRef.current(getSelectedSql()),
          );
        }}
        theme={isDarkMode ? "vs-dark" : "vs"}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          wordWrap: "on",
          padding: { top: 10, bottom: 10 },
          scrollBeyondLastLine: false,
        }}
      />
    </div>
  );
});

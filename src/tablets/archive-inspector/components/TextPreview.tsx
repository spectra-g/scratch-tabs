import React from "react";
import { Editor } from "@monaco-editor/react";

interface TextPreviewProps {
  content: string;
  language: string;
  truncated: boolean;
}

export const TextPreview: React.FC<TextPreviewProps> = ({ content, language, truncated }) => (
  <div className="flex-1 min-h-0 flex flex-col">
    {truncated && (
      <div className="flex-none px-3 py-1.5 text-xs text-secondary bg-surface-secondary border-b border-base">
        Showing first 512 KB. Extract to view full file.
      </div>
    )}
    <div className="flex-1 overflow-hidden custom-scrollbar">
      <Editor
        value={content}
        language={language}
        options={{
          readOnly: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: "on",
          fontSize: 12,
          lineNumbers: "on",
          folding: true,
          renderLineHighlight: "none",
          scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
        }}
        theme="vs-dark"
      />
    </div>
  </div>
);

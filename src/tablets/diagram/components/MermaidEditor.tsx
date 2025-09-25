import React, { useCallback, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

interface MermaidEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  onEditorReady?: (editor: editor.IStandaloneCodeEditor) => void;
}

export const MermaidEditor: React.FC<MermaidEditorProps> = ({
  value,
  onChange,
  className = "",
  onEditorReady
}) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleEditorDidMount = useCallback((editor: editor.IStandaloneCodeEditor, monaco: typeof import('monaco-editor')) => {
    editorRef.current = editor;

    // Register Mermaid language if not already registered
    if (!monaco.languages.getLanguages().find(lang => lang.id === 'mermaid')) {
      monaco.languages.register({ id: 'mermaid' });

      // Define Mermaid tokens and syntax highlighting
      monaco.languages.setMonarchTokensProvider('mermaid', {
        tokenizer: {
          root: [
            // Diagram type keywords (first line)
            [/^(flowchart|graph|sequenceDiagram|classDiagram|erDiagram|gantt|pie|journey|gitGraph|mindmap|timeline|quadrantChart|requirementDiagram|stateDiagram-v2)\b/, 'keyword.diagram-type'],
            
            // Direction keywords
            [/\b(TD|TB|BT|RL|LR)\b/, 'keyword.direction'],
            
            // Class diagram keywords
            [/\b(class|interface|enum|abstract|static|public|private|protected)\b/, 'keyword.class'],
            
            // Sequence diagram keywords
            [/\b(participant|actor|note|activate|deactivate|loop|alt|else|opt|par|and|critical|break|ref|autonumber)\b/, 'keyword.sequence'],
            
            // Flowchart shapes and arrows
            [/-->|---|-\.-|==>|===|-.->|<-->|<->|o--o|\|\|--\|\|/, 'operator.arrow'],
            [/[\[\](){}><]/, 'bracket'],
            
            // Strings in quotes
            [/"([^"\\]|\\.)*"/, 'string'],
            [/'([^'\\]|\\.)*'/, 'string'],
            
            // Comments
            [/%%.*$/, 'comment'],
            
            // Node IDs and labels
            [/\b[A-Za-z_][A-Za-z0-9_]*\b/, 'identifier'],
            
            // Numbers
            [/\d+/, 'number'],
            
            // Operators and symbols
            [/[|:;,]/, 'delimiter'],
          ],
        },
      });

      // Define theme for Mermaid syntax highlighting
      monaco.editor.defineTheme('mermaid-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'keyword.diagram-type', foreground: '569cd6', fontStyle: 'bold' },
          { token: 'keyword.direction', foreground: '4ec9b0' },
          { token: 'keyword.class', foreground: 'c586c0' },
          { token: 'keyword.sequence', foreground: 'dcdcaa' },
          { token: 'operator.arrow', foreground: '9cdcfe' },
          { token: 'bracket', foreground: 'ffd700' },
          { token: 'string', foreground: 'ce9178' },
          { token: 'comment', foreground: '6a9955', fontStyle: 'italic' },
          { token: 'identifier', foreground: '9cdcfe' },
          { token: 'number', foreground: 'b5cea8' },
          { token: 'delimiter', foreground: 'd4d4d4' },
        ],
        colors: {
          'editor.background': '#1e1e1e',
          'editor.foreground': '#d4d4d4',
          'editorLineNumber.foreground': '#858585',
          'editor.selectionBackground': '#264f78',
          'editor.inactiveSelectionBackground': '#3a3d41',
        },
      });

      // Apply the theme
      monaco.editor.setTheme('mermaid-dark');
    }

    // Configure editor options
    editor.updateOptions({
      fontSize: 14,
      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
      lineNumbers: 'on',
      lineNumbersMinChars: 3,
      glyphMargin: false,
      folding: true,
      lineDecorationsWidth: 0,
      lineHeight: 22,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      wrappingIndent: 'indent',
      automaticLayout: true,
      tabSize: 2,
      insertSpaces: true,
      renderLineHighlight: 'line',
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
    });

    // Set language to mermaid
    monaco.editor.setModelLanguage(editor.getModel()!, 'mermaid');

    // Notify parent component that editor is ready
    if (onEditorReady) {
      onEditorReady(editor);
    }
  }, [onEditorReady]);

  const handleEditorChange = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      onChange(value);
    }
  }, [onChange]);

  return (
    <div className={`h-full ${className}`}>
      <Editor
        height="100%"
        defaultLanguage="mermaid"
        value={value}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        theme="mermaid-dark"
        options={{
          fontSize: 14,
          fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
          lineNumbers: 'on',
          lineNumbersMinChars: 3,
          glyphMargin: false,
          folding: true,
          lineDecorationsWidth: 0,
          lineHeight: 22,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          wrappingIndent: 'indent',
          automaticLayout: true,
          tabSize: 2,
          insertSpaces: true,
          renderLineHighlight: 'line',
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
        }}
      />
    </div>
  );
};
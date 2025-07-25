import React, { useState, useCallback, useEffect, useRef } from 'react';
import { FileText, ClipboardPaste, Trash2, Code } from 'lucide-react';
import Editor from '@monaco-editor/react';

interface WordCountInputProps {
  value: string;
  onChange: (value: string) => void;
  highlights?: Array<{ startIndex: number; endIndex: number; className: string }>;
  onEditorReady?: (editor: any) => void;
}

export const WordCountInput: React.FC<WordCountInputProps> = ({ 
  value, 
  onChange, 
  highlights = [],
  onEditorReady 
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [useMonaco, setUseMonaco] = useState(false);
  const editorRef = useRef<any>(null);

  // Sync local state with parent value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Create a debounced onChange function
  const timeoutRef = useRef<NodeJS.Timeout>();
  const debouncedOnChange = useCallback((value: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      onChange(value);
    }, 300);
  }, [onChange]);

  const handleChange = useCallback((newValue: string) => {
    setLocalValue(newValue);
    debouncedOnChange(newValue);
  }, [debouncedOnChange]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      handleChange(text);
    } catch (error) {
      console.error('Failed to read clipboard:', error);
    }
  }, [handleChange]);

  const handleClear = useCallback(() => {
    handleChange('');
  }, [handleChange]);

  const toggleEditor = useCallback(() => {
    setUseMonaco(!useMonaco);
  }, [useMonaco]);

  const handleEditorMount = useCallback((editor: any) => {
    editorRef.current = editor;
    if (onEditorReady) {
      onEditorReady(editor);
    }
  }, [onEditorReady]);

  const handleEditorChange = useCallback((newValue: string | undefined) => {
    const value = newValue || '';
    setLocalValue(value);
    debouncedOnChange(value);
  }, [debouncedOnChange]);

  // Apply highlights to Monaco editor
  useEffect(() => {
    if (useMonaco && editorRef.current && highlights.length > 0) {
      const decorations = highlights.map(highlight => ({
        range: editorRef.current.getModel().getPositionAt(highlight.startIndex),
        options: {
          className: highlight.className,
          isWholeLine: false
        }
      }));
    }
  }, [highlights, useMonaco]);

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <FileText size={16} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
            Text Input
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleEditor}
            className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded transition-colors"
            title={useMonaco ? "Switch to simple editor" : "Switch to Monaco editor"}
          >
            <Code size={16} />
          </button>
          <button
            onClick={handlePaste}
            className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded transition-colors"
            title="Paste from clipboard"
          >
            <ClipboardPaste size={16} />
          </button>
          <button
            onClick={handleClear}
            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700/50 rounded transition-colors"
            title="Clear text"
            disabled={!localValue}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      
      {useMonaco ? (
        <div className="h-64 border border-gray-600/50 rounded-md overflow-hidden">
          <Editor
            height="100%"
            defaultLanguage="plaintext"
            value={localValue}
            onChange={handleEditorChange}
            onMount={handleEditorMount}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 14,
              lineNumbers: 'on',
              wordWrap: 'on',
              automaticLayout: true,
            }}
          />
        </div>
      ) : (
        <textarea
          value={localValue}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Enter or paste your text here to analyze..."
          className="w-full h-64 bg-gray-900/50 border border-gray-600/50 rounded-md p-3 text-gray-200 placeholder-gray-500 resize-none focus:outline-none focus:border-blue-500/50 transition-colors font-mono text-sm leading-relaxed"
          spellCheck={false}
        />
      )}
      
      {localValue && (
        <div className="mt-2 text-xs text-gray-500">
          {localValue.length} characters
        </div>
      )}
    </div>
  );
};
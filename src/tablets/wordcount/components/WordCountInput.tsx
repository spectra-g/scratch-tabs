import React, { useState, useCallback } from 'react';
import { FileText, ClipboardPaste, Trash2 } from 'lucide-react';
import { useDebounce } from '../../../hooks/useDebounce';

interface WordCountInputProps {
  value: string;
  onChange: (value: string) => void;
}

export const WordCountInput: React.FC<WordCountInputProps> = ({ value, onChange }) => {
  const [localValue, setLocalValue] = useState(value);

  // Debounce the onChange to avoid excessive recalculations
  const debouncedOnChange = useDebounce(onChange, 300);

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
      
      <textarea
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Enter or paste your text here to analyze..."
        className="w-full h-64 bg-gray-900/50 border border-gray-600/50 rounded-md p-3 text-gray-200 placeholder-gray-500 resize-none focus:outline-none focus:border-blue-500/50 transition-colors font-mono text-sm leading-relaxed"
        spellCheck={false}
      />
      
      {localValue && (
        <div className="mt-2 text-xs text-gray-500">
          {localValue.length} characters
        </div>
      )}
    </div>
  );
};
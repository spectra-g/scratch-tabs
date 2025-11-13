import React, { useState, useCallback } from 'react';
import { Editor } from '@monaco-editor/react';
import { X, Copy, FileText, Check } from 'lucide-react';
import { useJmespath } from '../../hooks/useJmespath';
import { useQueryPanelStore } from '../../stores/useQueryPanelStore';
import { Tab } from '../../../../types';

interface QueryPanelProps {
  content: string;
  addTab: (tab: Tab) => void;
  tabId: string; // Receive tabId as a prop
}

// Constants
const COPY_FEEDBACK_DURATION_MS = 2000;
const DEFAULT_QUERY_EDITOR_HEIGHT = 80;

export const QueryPanel: React.FC<QueryPanelProps> = ({ content, addTab, tabId }) => {
  const [isCopied, setIsCopied] = useState(false);
  const { getStateForTab, setQuery: setQueryInStore, closePanel } = useQueryPanelStore();
  const { query } = getStateForTab(tabId);

  // Execute JMESPath query with debouncing
  const { results, error } = useJmespath(content, query);

  // Format results for display
  const formattedResults = React.useMemo(() => {
    if (error) {
      return error;
    }
    if (results === null) {
      return '';
    }
    try {
      return JSON.stringify(results, null, 2);
    } catch (e) {
      return String(results);
    }
  }, [results, error]);

  // Handle copying results to clipboard
  const handleCopyResults = useCallback(async () => {
    if (!formattedResults) return;

    try {
      await navigator.clipboard.writeText(formattedResults);
      setIsCopied(true);

      setTimeout(() => {
        setIsCopied(false);
      }, COPY_FEEDBACK_DURATION_MS);
    } catch (error) {
      console.error('Failed to copy results to clipboard:', error);
    }
  }, [formattedResults]);

  // Handle exporting results to a new tab
  const handleExportToTab = useCallback(() => {
    if (!formattedResults) return;

    const newTab: Tab = {
      id: crypto.randomUUID(),
      title: 'Query Results',
      content: formattedResults,
      language: 'json',
      languageLocked: false,
      cursorPosition: { lineNumber: 1, column: 1 },
      isPinned: false,
      dateCreated: Date.now(),
      lastModified: Date.now(),
      workspaceId: '', // Will be set by addTab
    };

    addTab(newTab);
  }, [formattedResults, addTab]);

  return (
    <div className="flex flex-col h-full bg-gray-800 border-t border-gray-700">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 bg-gray-800/50">
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-medium text-gray-300">
            JSON Query (JMESPath)
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopyResults}
            disabled={!formattedResults}
            className={`flex items-center space-x-1 px-2 py-1 rounded text-xs transition-colors ${
              isCopied
                ? 'bg-green-500/20 text-green-400'
                : formattedResults
                ? 'hover:bg-gray-700 text-gray-300'
                : 'text-gray-500 cursor-not-allowed'
            }`}
            title={isCopied ? 'Copied!' : 'Copy Results'}
          >
            {isCopied ? <Check size={14} /> : <Copy size={14} />}
            <span>{isCopied ? 'Copied' : 'Copy Results'}</span>
          </button>
          <button
            onClick={handleExportToTab}
            disabled={!formattedResults}
            className={`flex items-center space-x-1 px-2 py-1 rounded text-xs transition-colors ${
              formattedResults
                ? 'hover:bg-gray-700 text-gray-300'
                : 'text-gray-500 cursor-not-allowed'
            }`}
            title="Export to New Tab"
          >
            <FileText size={14} />
            <span>Export to Tab</span>
          </button>
          <button
            onClick={() => closePanel(tabId)}
            className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
            title="Close Query Panel"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Query Editor */}
      <div className="flex flex-col border-b border-gray-700">
        <div className="px-3 py-1 bg-gray-800/30">
          <span className="text-xs text-gray-400">Query Expression:</span>
        </div>
        <div style={{ height: `${DEFAULT_QUERY_EDITOR_HEIGHT}px` }}>
          <Editor
            height="100%"
            language="plaintext"
            theme="vs-dark"
            value={query}
            onChange={(value) => setQueryInStore(tabId, value || '')}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              wordWrap: 'on',
              lineNumbers: 'off',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              folding: false,
              renderLineHighlight: 'none',
              occurrencesHighlight: 'off',
              overviewRulerLanes: 0,
              hideCursorInOverviewRuler: true,
              scrollbar: {
                vertical: 'hidden',
                horizontal: 'auto',
              },
              suggest: {
                showKeywords: false,
              },
            }}
          />
        </div>
      </div>

      {/* Results Viewer */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-3 py-1 bg-gray-800/30 border-b border-gray-700">
          <span className="text-xs text-gray-400">
            {error
              ? 'Error:'
              : results === null
              ? 'Results (enter a query above):'
              : 'Results:'}
          </span>
        </div>
        <div className="flex-1">
          <Editor
            height="100%"
            language={error ? 'plaintext' : 'json'}
            theme="vs-dark"
            value={formattedResults}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 13,
              wordWrap: 'on',
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              renderValidationDecorations: 'off',
              colorDecorators: false,
            }}
          />
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Editor } from '@monaco-editor/react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Copy, 
  Download, 
  Settings,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Info
} from 'lucide-react';
import { ComparisonResult, ComparisonOptions, DiffTreeNode } from '../../utils/jsonStructureComparison';

interface JsonStructureComparisonUIProps {
  sourceJson: string;
  targetJson: string;
  comparisonResult: ComparisonResult | null;
  isComparing: boolean;
  error: string | null;
  options: ComparisonOptions;
  syncScroll: boolean;
  onSourceEditorMount: (editor: monaco.editor.IStandaloneCodeEditor) => void;
  onTargetEditorMount: (editor: monaco.editor.IStandaloneCodeEditor) => void;
  onTargetEditorChange: (value: string | undefined) => void;
  onSyncScrollChange: (sync: boolean) => void;
  onOptionsChange: (options: ComparisonOptions) => void;
  onNavigateToPath: (path: string) => void;
  onCopyReport: () => void;
  onDownloadReport: () => void;
}

export const JsonStructureComparisonUI: React.FC<JsonStructureComparisonUIProps> = ({
  sourceJson,
  targetJson,
  comparisonResult,
  isComparing,
  error,
  options,
  syncScroll,
  onSourceEditorMount,
  onTargetEditorMount,
  onTargetEditorChange,
  onSyncScrollChange,
  onOptionsChange,
  onNavigateToPath,
  onCopyReport,
  onDownloadReport,
}) => {
  const [showOptions, setShowOptions] = React.useState(false);
  const [expandedNodes, setExpandedNodes] = React.useState<Set<string>>(new Set(['/']));

  const toggleNodeExpansion = (path: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedNodes(newExpanded);
  };

  const renderDiffTree = (node: DiffTreeNode, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.path);
    const hasChildren = node.children && node.children.length > 0;
    const indent = depth * 16;

    return (
      <div key={node.path}>
        <div 
          className={`flex items-center py-1 px-2 hover:bg-gray-700/50 rounded cursor-pointer transition-colors ${
            node.hasDiff ? 'bg-red-900/20 border-l-2 border-red-500' : ''
          }`}
          style={{ paddingLeft: `${indent + 8}px` }}
          onClick={() => {
            if (hasChildren) {
              toggleNodeExpansion(node.path);
            } else {
              onNavigateToPath(node.path);
            }
          }}
        >
          {hasChildren ? (
            <button
              className="p-1 hover:bg-gray-600/50 rounded transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                toggleNodeExpansion(node.path);
              }}
            >
              {isExpanded ? (
                <ChevronDown size={14} className="text-gray-400" />
              ) : (
                <ChevronRight size={14} className="text-gray-400" />
              )}
            </button>
          ) : (
            <div className="w-6" />
          )}
          
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <span className="text-sm font-mono text-gray-300 truncate">
              {node.name || 'root'}
            </span>
            
            {node.hasDiff && (
              <div className="flex items-center space-x-1">
                <AlertTriangle size={12} className="text-red-400" />
                <span className="text-xs text-red-400">
                  {node.diffType === 'MISSING_KEY_LEFT' && 'Missing in Source'}
                  {node.diffType === 'MISSING_KEY_RIGHT' && 'Missing in Target'}
                  {node.diffType === 'TYPE_MISMATCH' && 'Type Mismatch'}
                  {node.diffType === 'ARRAY_LENGTH_MISMATCH' && 'Length Mismatch'}
                  {node.diffType === 'POLYMORPHIC_ARRAY' && 'Polymorphic Array'}
                </span>
              </div>
            )}
            
            <span className="text-xs text-gray-500">
              {node.leftValueType && node.rightValueType && node.leftValueType !== node.rightValueType
                ? `${node.leftValueType} → ${node.rightValueType}`
                : node.leftValueType || node.rightValueType}
            </span>
          </div>
        </div>
        
        {isExpanded && hasChildren && (
          <div>
            {node.children!.map(child => renderDiffTree(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Options Panel */}
      <div className="flex-none p-4 border-b border-gray-700/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowOptions(!showOptions)}
              className="flex items-center space-x-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
            >
              <Settings size={14} />
              <span className="text-sm">Options</span>
              {showOptions ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          </div>
          
          {comparisonResult && (
            <div className="flex items-center space-x-2">
              <button
                onClick={onCopyReport}
                className="flex items-center space-x-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
              >
                <Copy size={14} />
                <span className="text-sm">Copy Report</span>
              </button>
              <button
                onClick={onDownloadReport}
                className="flex items-center space-x-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
              >
                <Download size={14} />
                <span className="text-sm">Download JSON</span>
              </button>
            </div>
          )}
        </div>
        
        {showOptions && (
          <div className="mt-4 p-3 bg-gray-800/50 rounded border border-gray-700/60">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Array Sample Count
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={options.arraySampleCount || 3}
                  onChange={(e) => onOptionsChange({
                    ...options,
                    arraySampleCount: parseInt(e.target.value) || 3
                  })}
                  className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-gray-200"
                />
              </div>
              
              <div>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.strictArrayLength || false}
                    onChange={(e) => onOptionsChange({
                      ...options,
                      strictArrayLength: e.target.checked
                    })}
                    className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-300">Strict Array Length</span>
                </label>
              </div>
              
              <div>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.caseSensitiveKeys !== false}
                    onChange={(e) => onOptionsChange({
                      ...options,
                      caseSensitiveKeys: e.target.checked
                    })}
                    className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-300">Case Sensitive Keys</span>
                </label>
              </div>
            </div>
            {/* Array Comparison Strategy */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                Array Comparison Strategy
                <span className="ml-2 text-gray-400 cursor-pointer group relative">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/><text x="12" y="16" textAnchor="middle" fontSize="12" fill="currentColor">i</text></svg>
                  <span className="absolute left-1/2 top-full z-10 w-80 -translate-x-1/2 mt-2 px-3 py-2 bg-gray-900 text-xs text-gray-200 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <b>Strict:</b> Only compares the structure of the first array element.<br/>
                    <b>Union (Squash):</b> Merges all keys/types from every array element into a single superset. Great for polymorphic arrays, but loses per-type context.<br/>
                    <b>Discriminator:</b> Groups array elements by a field (e.g. <code>type</code>), compares the structure of each group. Best for arrays of objects with a type or kind field.
                  </span>
                </span>
              </label>
              <div className="flex flex-col md:flex-row md:items-center md:space-x-6 mt-1 space-y-2 md:space-y-0">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="arrayComparisonStrategy"
                    value="strict"
                    checked={options.arrayComparisonStrategy === undefined || options.arrayComparisonStrategy === 'strict'}
                    onChange={() => onOptionsChange({ ...options, arrayComparisonStrategy: 'strict' })}
                    className="accent-blue-500"
                  />
                  <span className="text-sm text-gray-200">Strict (First Item)</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="arrayComparisonStrategy"
                    value="union"
                    checked={options.arrayComparisonStrategy === 'union'}
                    onChange={() => onOptionsChange({ ...options, arrayComparisonStrategy: 'union' })}
                    className="accent-blue-500"
                  />
                  <span className="text-sm text-gray-200">Union (Squash Items)</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="arrayComparisonStrategy"
                    value="discriminator"
                    checked={options.arrayComparisonStrategy === 'discriminator'}
                    onChange={() => onOptionsChange({ ...options, arrayComparisonStrategy: 'discriminator' })}
                    className="accent-blue-500"
                  />
                  <span className="text-sm text-gray-200">Discriminator (Group by Field)</span>
                </label>
                {options.arrayComparisonStrategy === 'discriminator' && (
                  <input
                    type="text"
                    placeholder="Discriminator field (e.g. type)"
                    value={options.discriminatorField || ''}
                    onChange={e => onOptionsChange({ ...options, discriminatorField: e.target.value })}
                    className="ml-2 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-gray-200 w-48"
                  />
                )}
              </div>
            </div>
            <div className="mt-6">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncScroll}
                  onChange={(e) => onSyncScrollChange(e.target.checked)}
                  className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-300">Sync Scroll</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Editors Section */}
      <div className="flex-1 flex min-h-0">
        {/* Left Panel - Source JSON */}
        <div className="flex-1 flex flex-col border-r border-gray-700/60">
          <div className="flex-none p-2 bg-gray-800/50 border-b border-gray-700/60">
            <h3 className="text-sm font-medium text-gray-300">Source JSON (Read-only)</h3>
          </div>
          <div className="h-[400px]">
            <Editor
              height="100%"
              language="json"
              theme="vs-dark"
              onMount={onSourceEditorMount}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                fontSize: 13,
                lineNumbers: 'on',
                folding: true,
                automaticLayout: true,
              }}
            />
          </div>
        </div>

        {/* Right Panel - Target JSON */}
        <div className="flex-1 flex flex-col">
          <div className="flex-none p-2 bg-gray-800/50 border-b border-gray-700/60">
            <h3 className="text-sm font-medium text-gray-300">Target JSON</h3>
          </div>
          <div className="h-[400px]">
            <Editor
              height="100%"
              language="json"
              theme="vs-dark"
              onMount={onTargetEditorMount}
              onChange={onTargetEditorChange}
              options={{
                readOnly: false,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                fontSize: 13,
                lineNumbers: 'on',
                folding: true,
                automaticLayout: true,
              }}
            />
          </div>
        </div>
      </div>

      {/* Comparison Results Section */}
      <div className="flex-none border-t border-gray-700/60">
        <div className="p-4">
          {/* Status Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              {isComparing ? (
                <>
                  <Loader2 size={20} className="text-blue-400 animate-spin" />
                  <span className="text-lg font-medium text-gray-300">Comparing...</span>
                </>
              ) : comparisonResult ? (
                <>
                  {comparisonResult.matches ? (
                    <CheckCircle2 size={20} className="text-green-400" />
                  ) : (
                    <XCircle size={20} className="text-red-400" />
                  )}
                  <span className="text-lg font-medium text-gray-300">
                    {comparisonResult.matches ? 'Structures Match' : 'Structures Differ'}
                  </span>
                </>
              ) : (
                <>
                  <Info size={20} className="text-gray-400" />
                  <span className="text-lg font-medium text-gray-300">Ready to Compare</span>
                </>
              )}
            </div>
            
            {comparisonResult && (
              <div className="text-sm text-gray-400">
                {comparisonResult.summary.totalDifferences} difference{comparisonResult.summary.totalDifferences !== 1 ? 's' : ''}
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Results Content */}
          {comparisonResult && !comparisonResult.matches && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tree View */}
              <div className="bg-gray-800/30 rounded border border-gray-700/60">
                <div className="p-3 border-b border-gray-700/60">
                  <h4 className="text-sm font-medium text-gray-300">Structure Tree</h4>
                </div>
                <div className="p-2 max-h-64 overflow-y-auto custom-scrollbar">
                  {renderDiffTree(comparisonResult.diffTree)}
                </div>
              </div>

              {/* Detailed List */}
              <div className="bg-gray-800/30 rounded border border-gray-700/60">
                <div className="p-3 border-b border-gray-700/60">
                  <h4 className="text-sm font-medium text-gray-300">Detailed Differences</h4>
                </div>
                <div className="p-2 max-h-64 overflow-y-auto custom-scrollbar">
                  {comparisonResult.diffList.map((diff, index) => (
                    <div
                      key={index}
                      className="p-2 mb-2 bg-gray-700/30 rounded border-l-2 border-red-500 cursor-pointer hover:bg-gray-700/50 transition-colors"
                      onClick={() => onNavigateToPath(diff.path)}
                    >
                      <div className="text-sm font-mono text-gray-300 mb-1">{diff.path}</div>
                      <div className="text-xs text-gray-400">{diff.message}</div>
                      {diff.leftValueType && diff.rightValueType && (
                        <div className="text-xs text-gray-500 mt-1">
                          Types: {diff.leftValueType} → {diff.rightValueType}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Summary Stats */}
          {comparisonResult && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-6 gap-2 text-xs">
              <div className="p-2 bg-gray-800/50 rounded text-center">
                <div className="text-gray-400">Total</div>
                <div className="text-gray-200 font-medium">{comparisonResult.summary.totalDifferences}</div>
              </div>
              <div className="p-2 bg-gray-800/50 rounded text-center">
                <div className="text-gray-400">Missing Left</div>
                <div className="text-gray-200 font-medium">{comparisonResult.summary.missingKeysLeft}</div>
              </div>
              <div className="p-2 bg-gray-800/50 rounded text-center">
                <div className="text-gray-400">Missing Right</div>
                <div className="text-gray-200 font-medium">{comparisonResult.summary.missingKeysRight}</div>
              </div>
              <div className="p-2 bg-gray-800/50 rounded text-center">
                <div className="text-gray-400">Type Mismatch</div>
                <div className="text-gray-200 font-medium">{comparisonResult.summary.typeMismatches}</div>
              </div>
              <div className="p-2 bg-gray-800/50 rounded text-center">
                <div className="text-gray-400">Array Length</div>
                <div className="text-gray-200 font-medium">{comparisonResult.summary.arrayLengthMismatches}</div>
              </div>
              <div className="p-2 bg-gray-800/50 rounded text-center">
                <div className="text-gray-400">Polymorphic</div>
                <div className="text-gray-200 font-medium">{comparisonResult.summary.polymorphicArrays}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 
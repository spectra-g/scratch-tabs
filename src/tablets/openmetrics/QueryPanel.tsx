import React, { useState, useEffect } from 'react';
import { Search, AlertCircle, Play, X } from 'lucide-react';
import { MetricSample, QueryResult } from './types';
import { executeQuery } from './QueryEngine';

interface QueryPanelProps {
  metrics: MetricSample[];
  queryString: string;
  onUpdateQuery: (query: string) => void;
}

export const QueryPanel: React.FC<QueryPanelProps> = ({
  metrics,
  queryString,
  onUpdateQuery
}) => {
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Execute query when button is clicked
  const handleExecuteQuery = () => {
    if (!queryString.trim()) {
      setError('Query cannot be empty');
      setResult(null);
      return;
    }
    
    setIsExecuting(true);
    setError(null);
    
    try {
      const queryResult = executeQuery(metrics, queryString);
      setResult(queryResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setResult(null);
    } finally {
      setIsExecuting(false);
    }
  };

  // Clear query and results
  const handleClearQuery = () => {
    onUpdateQuery('');
    setResult(null);
    setError(null);
  };

  // Format a value for display
  const formatValue = (value: number): string => {
    if (value === 0) return '0';
    
    // Handle very large or small numbers with scientific notation
    if (Math.abs(value) < 0.001 || Math.abs(value) > 1000000) {
      return value.toExponential(4);
    }
    
    // For regular numbers, limit decimal places
    return value.toFixed(value % 1 === 0 ? 0 : 4);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-300">Query Metrics</h3>
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            {showHelp ? 'Hide Help' : 'Show Help'}
          </button>
        </div>
        
        {showHelp && (
          <div className="mb-3 p-3 bg-gray-800 rounded-lg text-sm">
            <h4 className="font-medium text-gray-300 mb-1">Query Syntax</h4>
            <ul className="list-disc pl-5 text-gray-400 space-y-1">
              <li><code className="text-blue-400">metric_name</code> - Select a metric by name</li>
              <li><code className="text-blue-400">metric_name{'{label="value"}'}</code> - Filter by label</li>
              <li><code className="text-blue-400">metric_name{'{label!="value"}'}</code> - Exclude by label</li>
              <li><code className="text-blue-400">sum(metric_name)</code> - Sum values</li>
              <li><code className="text-blue-400">avg(metric_name)</code> - Average values</li>
              <li><code className="text-blue-400">count(metric_name)</code> - Count samples</li>
              <li><code className="text-blue-400">min(metric_name)</code> - Minimum value</li>
              <li><code className="text-blue-400">max(metric_name)</code> - Maximum value</li>
            </ul>
          </div>
        )}
        
        <div className="flex space-x-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={queryString}
              onChange={(e) => onUpdateQuery(e.target.value)}
              placeholder='Enter query (e.g., "http_requests_total" or "sum(http_requests_total{method=\"post\"})")'
              className="w-full bg-gray-800 border border-gray-700 rounded pl-9 pr-9 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleExecuteQuery();
                }
              }}
            />
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
            {queryString && (
              <button
                onClick={handleClearQuery}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={handleExecuteQuery}
            disabled={isExecuting || !queryString.trim()}
            className="px-3 py-2 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 disabled:opacity-50 flex items-center"
          >
            <Play size={16} className="mr-1" />
            Execute
          </button>
        </div>
        
        {error && (
          <div className="mt-2 p-2 bg-red-900/20 border border-red-900/30 rounded text-sm text-red-400 flex items-start">
            <AlertCircle size={16} className="mr-2 flex-shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}
      </div>
      
      <div className="flex-1 p-4 overflow-auto">
        {result ? (
          <div>
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-300">Query Result</h3>
              <div className="text-xs text-gray-400 mt-1">
                {result.metric}
                {result.groupedBy.length > 0 && (
                  <span className="ml-2">
                    Grouped by: {result.groupedBy.join(', ')}
                  </span>
                )}
              </div>
            </div>
            
            {result.values.length === 0 ? (
              <div className="p-4 bg-gray-800 rounded-lg text-center text-gray-400">
                No results found for this query
              </div>
            ) : result.values.length === 1 && Object.keys(result.values[0].labels).length === 0 ? (
              // Single scalar result
              <div className="p-6 bg-gray-800 rounded-lg text-center">
                <div className="text-3xl font-semibold text-blue-400">
                  {formatValue(result.values[0].value)}
                </div>
                <div className="text-sm text-gray-400 mt-2">
                  {result.metric}
                </div>
              </div>
            ) : (
              // Table of results
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-800">
                      {result.groupedBy.length > 0 ? (
                        <>
                          {result.groupedBy.map(label => (
                            <th key={label} className="px-4 py-2 text-left text-sm font-medium text-gray-300 border-b border-gray-700">
                              {label}
                            </th>
                          ))}
                          <th className="px-4 py-2 text-right text-sm font-medium text-gray-300 border-b border-gray-700">
                            Value
                          </th>
                        </>
                      ) : (
                        <>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-300 border-b border-gray-700">
                            Labels
                          </th>
                          <th className="px-4 py-2 text-right text-sm font-medium text-gray-300 border-b border-gray-700">
                            Value
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {result.values.map((value, index) => (
                      <tr key={index} className="hover:bg-gray-800">
                        {result.groupedBy.length > 0 ? (
                          <>
                            {result.groupedBy.map(label => (
                              <td key={label} className="px-4 py-2 text-sm text-gray-300 border-b border-gray-700">
                                {value.labels[label] || ''}
                              </td>
                            ))}
                            <td className="px-4 py-2 text-sm text-right text-blue-400 font-mono border-b border-gray-700">
                              {formatValue(value.value)}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-2 text-sm text-gray-300 border-b border-gray-700">
                              {Object.entries(value.labels).length > 0 ? (
                                <div className="font-mono">
                                  {'{'}
                                  {Object.entries(value.labels).map(([key, val], i, arr) => (
                                    <span key={key}>
                                      <span className="text-gray-400">{key}</span>=
                                      <span className="text-blue-400">"{val}"</span>
                                      {i < arr.length - 1 && ', '}
                                    </span>
                                  ))}
                                  {'}'}
                                </div>
                              ) : (
                                <span className="text-gray-500 italic">no labels</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-sm text-right text-blue-400 font-mono border-b border-gray-700">
                              {formatValue(value.value)}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Search size={48} className="mb-4 opacity-50" />
            <p>Enter a query and click Execute</p>
            <p className="text-sm mt-2">Example: http_requests_total{'{method="post"}'}</p>
          </div>
        )}
      </div>
    </div>
  );
};
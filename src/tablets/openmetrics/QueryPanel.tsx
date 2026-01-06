import React, { useState } from "react";
import { Search, AlertCircle, Play, X } from "lucide-react";
import { MetricSample, QueryResult } from "./types";
import { executeQuery } from "./QueryEngine";

interface QueryPanelProps {
  metrics: MetricSample[]; // Current parsed metrics
  snapshots: { id: string; name: string; metrics: MetricSample[] }[];
  queryString: string;
  onUpdateQuery: (query: string) => void;
}

export const QueryPanel: React.FC<QueryPanelProps> = ({
  metrics,
  snapshots,
  queryString,
  onUpdateQuery,
}) => {
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [selectedDataSources, setSelectedDataSources] = useState<string[]>(["current"]);

  // Combine metrics from selected data sources
  const combinedMetrics = React.useMemo(() => {
    let allMetrics: MetricSample[] = [];
    
    if (selectedDataSources.includes("current")) {
      allMetrics = [...allMetrics, ...metrics];
    }
    
    selectedDataSources.forEach(sourceId => {
      if (sourceId !== "current") {
        const snapshot = snapshots.find(s => s.id === sourceId);
        if (snapshot) {
          allMetrics = [...allMetrics, ...snapshot.metrics];
        }
      }
    });
    
    return allMetrics;
  }, [metrics, snapshots, selectedDataSources]);

  // Execute query when button is clicked
  const handleExecuteQuery = () => {
    if (!queryString.trim()) {
      setError("Query cannot be empty");
      setResult(null);
      return;
    }

    setIsExecuting(true);
    setError(null);

    try {
      const queryResult = executeQuery(combinedMetrics, queryString);
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
    onUpdateQuery("");
    setResult(null);
    setError(null);
  };

  // Toggle data source selection
  const toggleDataSource = (sourceId: string) => {
    const newSources = [...selectedDataSources];
    const index = newSources.indexOf(sourceId);
    
    if (index === -1) {
      newSources.push(sourceId);
    } else {
      // Don't allow removing all sources
      if (newSources.length > 1) {
        newSources.splice(index, 1);
      }
    }
    
    setSelectedDataSources(newSources);
    // Clear results when data sources change
    setResult(null);
    setError(null);
  };

  // Format a value for display
  const formatValue = (value: number): string => {
    if (value === 0) return "0";

    // Handle very large or small numbers with scientific notation
    if (Math.abs(value) < 0.001 || Math.abs(value) > 1000000) {
      return value.toExponential(4);
    }

    // For regular numbers, limit decimal places
    return value.toFixed(value % 1 === 0 ? 0 : 4);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-base">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-secondary">Query Metrics</h3>
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="text-xs text-primary hover:text-primary"
          >
            {showHelp ? "Hide Help" : "Show Help"}
          </button>
        </div>

        {showHelp && (
          <div className="mb-3 p-3 bg-surface-raised rounded-lg text-sm">
            <h4 className="font-medium text-secondary mb-1">Query Syntax</h4>
            <ul className="list-disc pl-5 text-muted space-y-1">
              <li>
                <code className="text-primary">metric_name</code> - Select a
                metric by name
              </li>
              <li>
                <code className="text-primary">
                  metric_name{'{label="value"}'}
                </code>{" "}
                - Filter by label
              </li>
              <li>
                <code className="text-primary">
                  metric_name{'{label!="value"}'}
                </code>{" "}
                - Exclude by label
              </li>
              <li>
                <code className="text-primary">sum(metric_name)</code> - Sum
                values
              </li>
              <li>
                <code className="text-primary">avg(metric_name)</code> -
                Average values
              </li>
              <li>
                <code className="text-primary">count(metric_name)</code> -
                Count samples
              </li>
              <li>
                <code className="text-primary">min(metric_name)</code> -
                Minimum value
              </li>
              <li>
                <code className="text-primary">max(metric_name)</code> -
                Maximum value
              </li>
            </ul>
          </div>
        )}

        {/* Data source selector */}
        <div className="mb-3">
          <div className="text-xs text-muted mb-2">Data Sources</div>
          <div className="flex flex-wrap gap-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={selectedDataSources.includes("current")}
                onChange={() => toggleDataSource("current")}
                className="mr-2"
              />
              <span className="text-sm text-secondary">Current</span>
            </label>
            {snapshots.map((snapshot) => (
              <label key={snapshot.id} className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedDataSources.includes(snapshot.id)}
                  onChange={() => toggleDataSource(snapshot.id)}
                  className="mr-2"
                />
                <span className="text-sm text-secondary">{snapshot.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex space-x-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={queryString}
              onChange={(e) => onUpdateQuery(e.target.value)}
              placeholder='Enter query (e.g., "http_requests_total" or "sum(http_requests_total{method=\"post\"})")'
              className="w-full bg-surface-raised border border-base rounded pl-9 pr-9 py-2 text-sm text-main placeholder-muted focus:outline-none focus:border-primary"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleExecuteQuery();
                }
              }}
            />
            <Search
              size={16}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted"
            />
            {queryString && (
              <button
                onClick={handleClearQuery}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted hover:text-secondary"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={handleExecuteQuery}
            disabled={isExecuting || !queryString.trim()}
            className="px-3 py-2 bg-primary/20 text-primary rounded hover:bg-primary/30 disabled:opacity-50 flex items-center"
          >
            <Play size={16} className="mr-1" />
            Execute
          </button>
        </div>

        {error && (
          <div className="mt-2 p-2 bg-danger-subtle border border-danger rounded text-sm text-danger flex items-start">
            <AlertCircle size={16} className="mr-2 flex-shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}
      </div>

      <div className="flex-1 p-4 overflow-auto custom-scrollbar">
        {result ? (
          <div>
            <div className="mb-4">
              <h3 className="text-sm font-medium text-secondary">
                Query Result
              </h3>
              <div className="text-xs text-muted mt-1">
                {result.metric}
                {result.groupedBy.length > 0 && (
                  <span className="ml-2">
                    Grouped by: {result.groupedBy.join(", ")}
                  </span>
                )}
              </div>
            </div>

            {result.values.length === 0 ? (
              <div className="p-4 bg-surface-raised rounded-lg text-center text-muted">
                No results found for this query
              </div>
            ) : result.values.length === 1 &&
              Object.keys(result.values[0].labels).length === 0 ? (
              // Single scalar result
              <div className="p-6 bg-surface-raised rounded-lg text-center">
                <div className="text-3xl font-semibold text-primary">
                  {formatValue(result.values[0].value)}
                </div>
                <div className="text-sm text-muted mt-2">
                  {result.metric}
                </div>
              </div>
            ) : (
              // Table of results
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-surface-raised">
                      {result.groupedBy.length > 0 ? (
                        <>
                          {result.groupedBy.map((label) => (
                            <th
                              key={label}
                              className="px-4 py-2 text-left text-sm font-medium text-secondary border-b border-base"
                            >
                              {label}
                            </th>
                          ))}
                          <th className="px-4 py-2 text-right text-sm font-medium text-secondary border-b border-base">
                            Value
                          </th>
                        </>
                      ) : (
                        <>
                          <th className="px-4 py-2 text-left text-sm font-medium text-secondary border-b border-base">
                            Labels
                          </th>
                          <th className="px-4 py-2 text-right text-sm font-medium text-secondary border-b border-base">
                            Value
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {result.values.map((value, index) => (
                      <tr key={index} className="hover:bg-surface-raised">
                        {result.groupedBy.length > 0 ? (
                          <>
                            {result.groupedBy.map((label) => (
                              <td
                                key={label}
                                className="px-4 py-2 text-sm text-secondary border-b border-base"
                              >
                                {value.labels[label] || ""}
                              </td>
                            ))}
                            <td className="px-4 py-2 text-sm text-right text-primary font-mono border-b border-base">
                              {formatValue(value.value)}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-2 text-sm text-secondary border-b border-base">
                              {Object.entries(value.labels).length > 0 ? (
                                <div className="font-mono">
                                  {"{"}
                                  {Object.entries(value.labels).map(
                                    ([key, val], i, arr) => (
                                      <span key={key}>
                                        <span className="text-muted">
                                          {key}
                                        </span>
                                        =
                                        <span className="text-primary">
                                          "{val}"
                                        </span>
                                        {i < arr.length - 1 && ", "}
                                      </span>
                                    ),
                                  )}
                                  {"}"}
                                </div>
                              ) : (
                                <span className="text-muted italic">
                                  no labels
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-sm text-right text-primary font-mono border-b border-base">
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
          <div className="flex flex-col items-center justify-center h-full text-muted">
            <Search size={48} className="mb-4 opacity-50" />
            <p>Enter a query and click Execute</p>
            <p className="text-sm mt-2">
              Example: http_requests_total{'{method="post"}'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from "react";
import { Search, X, Play } from "lucide-react";

interface QueryBuilderProps {
  metricNames: string[];
  labelKeys: string[];
  labelValues: Record<string, string[]>;
  onExecuteQuery: (query: string) => void;
  queryString: string;
  onUpdateQuery: (query: string) => void;
}

export const QueryBuilder: React.FC<QueryBuilderProps> = ({
  metricNames,
  labelKeys,
  labelValues,
  onExecuteQuery,
  queryString,
  onUpdateQuery,
}) => {
  const [showMetricSuggestions, setShowMetricSuggestions] = useState(false);
  const [showLabelSuggestions, setShowLabelSuggestions] = useState(false);
  const [showValueSuggestions, setShowValueSuggestions] = useState(false);
  const [currentLabelKey, setCurrentLabelKey] = useState("");

  // Filter suggestions based on current input
  const getFilteredMetrics = () => {
    if (!queryString) return metricNames;

    const term = queryString.toLowerCase();
    return metricNames.filter((name) => name.toLowerCase().includes(term));
  };

  // Handle selecting a metric from suggestions
  const handleSelectMetric = (metricName: string) => {
    onUpdateQuery(metricName);
    setShowMetricSuggestions(false);
  };

  // Handle adding a label filter
  const handleAddLabelFilter = (labelKey: string) => {
    // If query already has labels, add to them
    if (queryString.includes("{")) {
      // Check if the closing brace is the last character
      if (queryString.trim().endsWith("}")) {
        // Insert before the closing brace
        const newQuery = queryString.replace(/}$/, `, ${labelKey}=""}`);
        onUpdateQuery(newQuery);
      } else {
        // Insert at the end of the existing label filters
        const newQuery = queryString.replace(
          /{([^}]*)}/,
          `{$1, ${labelKey}=""}`,
        );
        onUpdateQuery(newQuery);
      }
    } else {
      // Add new label filter
      onUpdateQuery(`${queryString}{${labelKey}=""}`);
    }

    setShowLabelSuggestions(false);
    setCurrentLabelKey(labelKey);
    setShowValueSuggestions(true);
  };

  // Handle selecting a label value
  const handleSelectValue = (value: string) => {
    // Replace the empty value for the current label
    const newQuery = queryString.replace(
      `${currentLabelKey}=""`,
      `${currentLabelKey}="${value}"`,
    );
    onUpdateQuery(newQuery);
    setShowValueSuggestions(false);
  };

  // Clear the query
  const handleClearQuery = () => {
    onUpdateQuery("");
    setShowMetricSuggestions(false);
    setShowLabelSuggestions(false);
    setShowValueSuggestions(false);
  };

  // Execute the query
  const handleExecute = () => {
    if (queryString.trim()) {
      onExecuteQuery(queryString);
    }
  };

  return (
    <div className="p-3 border-b border-base">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-secondary">Query Builder</h3>
      </div>

      <div className="flex space-x-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={queryString}
            onChange={(e) => onUpdateQuery(e.target.value)}
            placeholder='Enter query (e.g., "http_requests_total" or "sum(http_requests_total{method=\"post\"})")'
            className="w-full bg-surface-raised border border-base rounded pl-9 pr-9 py-2 text-sm text-main placeholder-muted focus:outline-none focus:border-primary"
            onFocus={() => {
              if (!queryString) {
                setShowMetricSuggestions(true);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleExecute();
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

          {/* Metric suggestions */}
          {showMetricSuggestions && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-surface-raised border border-base rounded-md shadow-lg z-10 max-h-48 overflow-y-auto custom-scrollbar">
              {getFilteredMetrics().map((metric) => (
                <div
                  key={metric}
                  className="px-3 py-2 hover:bg-surface-secondary cursor-pointer text-sm"
                  onClick={() => handleSelectMetric(metric)}
                >
                  {metric}
                </div>
              ))}
              {getFilteredMetrics().length === 0 && (
                <div className="px-3 py-2 text-sm text-muted">
                  No matching metrics
                </div>
              )}
            </div>
          )}
        </div>

        <button
          onClick={handleExecute}
          disabled={!queryString.trim()}
          className="px-3 py-2 bg-primary/20 text-primary rounded hover:bg-primary/30 disabled:opacity-50 flex items-center"
        >
          <Play size={16} className="mr-1" />
          Execute
        </button>
      </div>

      {/* Label filters */}
      {queryString && !queryString.includes("(") && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs text-muted">Add Label Filters</div>
            <button
              onClick={() => setShowLabelSuggestions(!showLabelSuggestions)}
              className="text-xs text-primary hover:text-primary"
            >
              {showLabelSuggestions ? "Hide" : "Show"} Labels
            </button>
          </div>

          {showLabelSuggestions && (
            <div className="bg-surface-raised border border-base rounded p-2 max-h-32 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-1">
                {labelKeys.map((labelKey) => (
                  <button
                    key={labelKey}
                    className="text-xs text-left px-2 py-1 hover:bg-surface-secondary rounded"
                    onClick={() => handleAddLabelFilter(labelKey)}
                  >
                    {labelKey}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Value suggestions */}
          {showValueSuggestions &&
            currentLabelKey &&
            labelValues[currentLabelKey] && (
              <div className="mt-2">
                <div className="text-xs text-muted mb-1">
                  Select value for "{currentLabelKey}"
                </div>
                <div className="bg-surface-raised border border-base rounded p-2 max-h-32 overflow-y-auto custom-scrollbar">
                  <div className="grid grid-cols-2 gap-1">
                    {labelValues[currentLabelKey].map((value) => (
                      <button
                        key={value}
                        className="text-xs text-left px-2 py-1 hover:bg-surface-secondary rounded"
                        onClick={() => handleSelectValue(value)}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
        </div>
      )}

      {/* Function suggestions */}
      {!queryString.includes("(") &&
        !showLabelSuggestions &&
        !showValueSuggestions && (
          <div className="mt-3">
            <div className="text-xs text-muted mb-1">
              Aggregation Functions
            </div>
            <div className="flex flex-wrap gap-1">
              {["sum", "avg", "min", "max", "count"].map((func) => (
                <button
                  key={func}
                  className="text-xs px-2 py-1 bg-surface-raised hover:bg-surface-secondary rounded"
                  onClick={() => onUpdateQuery(`${func}(${queryString || ""})`)}
                >
                  {func}()
                </button>
              ))}
            </div>
          </div>
        )}
    </div>
  );
};

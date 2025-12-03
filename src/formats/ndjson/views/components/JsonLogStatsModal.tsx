import React, { useState, useMemo } from "react";
import { X, BarChart3, Hash, Type, Calculator, TrendingUp } from "lucide-react";
import { LogColumn, ColumnStats } from "../types";

interface JsonLogStatsModalProps {
  columns: LogColumn[];
  getColumnStats: (columnId: string) => ColumnStats;
  onClose: () => void;
}

export const JsonLogStatsModal: React.FC<JsonLogStatsModalProps> = ({
  columns,
  getColumnStats,
  onClose,
}) => {
  const [selectedColumnId, setSelectedColumnId] = useState<string>(
    columns[0]?.id || ""
  );

  const selectedStats = useMemo(() => {
    if (!selectedColumnId) return null;
    try {
      return getColumnStats(selectedColumnId);
    } catch (e) {
      console.error("Error calculating column stats:", e);
      return null;
    }
  }, [selectedColumnId, getColumnStats]);

  const formatNumber = (num: number, decimals: number = 2): string => {
    return Number.isInteger(num) ? num.toString() : num.toFixed(decimals);
  };

  const getDataTypeIcon = (dataType: ColumnStats["dataType"] | LogColumn["type"]) => {
    switch (dataType) {
      case "number":
        return <Calculator size={16} className="text-token-number" />;
      case "string":
        return <Type size={16} className="text-token-string" />;
      case "boolean":
        return <Hash size={16} className="text-token-boolean" />;
      case "object":
        return <Hash size={16} className="text-token-key" />;
      case "array":
        return <Hash size={16} className="text-token-number" />;
      case "null":
        return <Hash size={16} className="text-token-keyword" />;
      case "mixed":
        return <Hash size={16} className="text-token-keyword" />;
      default:
        return <Hash size={16} className="text-secondary" />;
    }
  };

  const getDataTypeColor = (dataType: ColumnStats["dataType"]) => {
    switch (dataType) {
      case "number":
        return "text-token-number";
      case "string":
        return "text-token-string";
      case "boolean":
        return "text-token-boolean";
      case "object":
        return "text-token-key";
      case "array":
        return "text-token-number";
      case "mixed":
        return "text-token-keyword";
      default:
        return "text-secondary";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-base">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base">
          <div className="flex items-center space-x-2">
            <BarChart3 size={20} className="text-secondary" />
            <h2 className="text-lg font-medium text-main">Column Statistics</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-element-hover rounded transition-colors"
          >
            <X size={20} className="text-secondary" />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Column Selector */}
          <div className="w-64 border-r border-base p-4">
            <h3 className="text-sm font-medium text-main mb-3">Select Column</h3>
            <div className="space-y-1 max-h-96 overflow-y-auto custom-scrollbar">
              {columns.map((column) => (
                <button
                  key={column.id}
                  onClick={() => setSelectedColumnId(column.id)}
                  className={`w-full text-left p-2 rounded text-sm transition-colors ${selectedColumnId === column.id
                    ? "bg-primary/20 text-primary"
                    : "text-main hover:bg-element-hover"
                    }`}
                >
                  <div className="flex items-center space-x-2">
                    {getDataTypeIcon(column.type)}
                    <span className="truncate">{column.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Stats Content */}
          <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
            {selectedStats ? (
              <div className="space-y-6">
                {/* Basic Stats */}
                <div>
                  <h3 className="text-lg font-medium text-main mb-4 flex items-center space-x-2">
                    <span>{selectedStats.columnName}</span>
                    <div className="flex items-center space-x-1">
                      {getDataTypeIcon(selectedStats.dataType)}
                      <span className={`text-sm capitalize ${getDataTypeColor(selectedStats.dataType)}`}>
                        {selectedStats.dataType}
                      </span>
                    </div>
                  </h3>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-element rounded p-3">
                      <div className="text-xs text-secondary uppercase tracking-wide">
                        Total Records
                      </div>
                      <div className="text-lg font-semibold text-main">
                        {selectedStats.totalCount.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-element rounded p-3">
                      <div className="text-xs text-secondary uppercase tracking-wide">
                        Non-Empty
                      </div>
                      <div className="text-lg font-semibold text-main">
                        {selectedStats.nonEmptyCount.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-element rounded p-3">
                      <div className="text-xs text-secondary uppercase tracking-wide">
                        Unique Values
                      </div>
                      <div className="text-lg font-semibold text-main">
                        {selectedStats.uniqueCount.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-element rounded p-3">
                      <div className="text-xs text-secondary uppercase tracking-wide">
                        Fill Rate
                      </div>
                      <div className="text-lg font-semibold text-main">
                        {formatNumber((selectedStats.nonEmptyCount / selectedStats.totalCount) * 100, 1)}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Numeric Statistics */}
                {selectedStats.numericStats && (
                  <div>
                    <h4 className="text-sm font-medium text-main flex items-center space-x-2 mb-3">
                      <Calculator size={14} />
                      <span>Numeric Statistics</span>
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                      <div className="flex justify-between py-1">
                        <span className="text-secondary">Min:</span>
                        <span className="text-main font-mono">
                          {formatNumber(selectedStats.numericStats.min)}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-secondary">Max:</span>
                        <span className="text-main font-mono">
                          {formatNumber(selectedStats.numericStats.max)}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-secondary">Average:</span>
                        <span className="text-main font-mono">
                          {formatNumber(selectedStats.numericStats.average)}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-secondary">Median:</span>
                        <span className="text-main font-mono">
                          {formatNumber(selectedStats.numericStats.median)}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-secondary">Sum:</span>
                        <span className="text-main font-mono">
                          {formatNumber(selectedStats.numericStats.sum)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* String Statistics */}
                {selectedStats.stringStats && (
                  <div>
                    <h4 className="text-sm font-medium text-main flex items-center space-x-2 mb-3">
                      <Type size={14} />
                      <span>String Statistics</span>
                    </h4>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div className="flex justify-between py-1">
                        <span className="text-secondary">Min Length:</span>
                        <span className="text-main font-mono">
                          {formatNumber(selectedStats.stringStats.minLength, 0)} chars
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-secondary">Max Length:</span>
                        <span className="text-main font-mono">
                          {formatNumber(selectedStats.stringStats.maxLength, 0)} chars
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-secondary">Avg Length:</span>
                        <span className="text-main font-mono">
                          {formatNumber(selectedStats.stringStats.avgLength, 1)} chars
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Top Values */}
                {selectedStats.topValues.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-main flex items-center space-x-2 mb-3">
                      <TrendingUp size={14} />
                      <span>Most Frequent Values</span>
                    </h4>
                    <div className="space-y-2">
                      {selectedStats.topValues.slice(0, 10).map((item, index) => (
                        <div key={index} className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-main truncate max-w-[300px] font-mono">
                              {typeof item.value === "string" ? (
                                `"${item.value}"`
                              ) : typeof item.value === "object" ? (
                                JSON.stringify(item.value)
                              ) : (
                                String(item.value)
                              )}
                            </span>
                            <span className="text-secondary ml-2">
                              {item.count} ({formatNumber(item.percentage, 1)}%)
                            </span>
                          </div>
                          <div className="w-full bg-element rounded-full h-1.5">
                            <div
                              className="bg-primary h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(item.percentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-secondary">
                <p>Select a column to view statistics</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
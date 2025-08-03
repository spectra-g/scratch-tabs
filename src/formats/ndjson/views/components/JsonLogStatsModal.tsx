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
        return <Calculator size={16} className="text-blue-400" />;
      case "string":
        return <Type size={16} className="text-green-400" />;
      case "boolean":
        return <Hash size={16} className="text-purple-400" />;
      case "object":
        return <Hash size={16} className="text-orange-400" />;
      case "array":
        return <Hash size={16} className="text-cyan-400" />;
      case "null":
        return <Hash size={16} className="text-gray-500" />;
      case "mixed":
        return <Hash size={16} className="text-yellow-400" />;
      default:
        return <Hash size={16} className="text-gray-400" />;
    }
  };

  const getDataTypeColor = (dataType: ColumnStats["dataType"]) => {
    switch (dataType) {
      case "number":
        return "text-blue-400";
      case "string":
        return "text-green-400";
      case "boolean":
        return "text-purple-400";
      case "object":
        return "text-orange-400";
      case "array":
        return "text-cyan-400";
      case "mixed":
        return "text-yellow-400";
      default:
        return "text-gray-400";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <BarChart3 size={20} className="text-gray-400" />
            <h2 className="text-lg font-medium text-gray-200">Column Statistics</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Column Selector */}
          <div className="w-64 border-r border-gray-700 p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Select Column</h3>
            <div className="space-y-1 max-h-96 overflow-y-auto custom-scrollbar">
              {columns.map((column) => (
                <button
                  key={column.id}
                  onClick={() => setSelectedColumnId(column.id)}
                  className={`w-full text-left p-2 rounded text-sm transition-colors ${
                    selectedColumnId === column.id
                      ? "bg-blue-500/20 text-blue-400"
                      : "text-gray-300 hover:bg-gray-700/50"
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
                  <h3 className="text-lg font-medium text-gray-200 mb-4 flex items-center space-x-2">
                    <span>{selectedStats.columnName}</span>
                    <div className="flex items-center space-x-1">
                      {getDataTypeIcon(selectedStats.dataType)}
                      <span className={`text-sm capitalize ${getDataTypeColor(selectedStats.dataType)}`}>
                        {selectedStats.dataType}
                      </span>
                    </div>
                  </h3>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-700/30 rounded p-3">
                      <div className="text-xs text-gray-400 uppercase tracking-wide">
                        Total Records
                      </div>
                      <div className="text-lg font-semibold text-gray-200">
                        {selectedStats.totalCount.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-gray-700/30 rounded p-3">
                      <div className="text-xs text-gray-400 uppercase tracking-wide">
                        Non-Empty
                      </div>
                      <div className="text-lg font-semibold text-gray-200">
                        {selectedStats.nonEmptyCount.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-gray-700/30 rounded p-3">
                      <div className="text-xs text-gray-400 uppercase tracking-wide">
                        Unique Values
                      </div>
                      <div className="text-lg font-semibold text-gray-200">
                        {selectedStats.uniqueCount.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-gray-700/30 rounded p-3">
                      <div className="text-xs text-gray-400 uppercase tracking-wide">
                        Fill Rate
                      </div>
                      <div className="text-lg font-semibold text-gray-200">
                        {formatNumber((selectedStats.nonEmptyCount / selectedStats.totalCount) * 100, 1)}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Numeric Statistics */}
                {selectedStats.numericStats && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-300 flex items-center space-x-2 mb-3">
                      <Calculator size={14} />
                      <span>Numeric Statistics</span>
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                      <div className="flex justify-between py-1">
                        <span className="text-gray-400">Min:</span>
                        <span className="text-gray-200 font-mono">
                          {formatNumber(selectedStats.numericStats.min)}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-gray-400">Max:</span>
                        <span className="text-gray-200 font-mono">
                          {formatNumber(selectedStats.numericStats.max)}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-gray-400">Average:</span>
                        <span className="text-gray-200 font-mono">
                          {formatNumber(selectedStats.numericStats.average)}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-gray-400">Median:</span>
                        <span className="text-gray-200 font-mono">
                          {formatNumber(selectedStats.numericStats.median)}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-gray-400">Sum:</span>
                        <span className="text-gray-200 font-mono">
                          {formatNumber(selectedStats.numericStats.sum)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* String Statistics */}
                {selectedStats.stringStats && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-300 flex items-center space-x-2 mb-3">
                      <Type size={14} />
                      <span>String Statistics</span>
                    </h4>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div className="flex justify-between py-1">
                        <span className="text-gray-400">Min Length:</span>
                        <span className="text-gray-200 font-mono">
                          {formatNumber(selectedStats.stringStats.minLength, 0)} chars
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-gray-400">Max Length:</span>
                        <span className="text-gray-200 font-mono">
                          {formatNumber(selectedStats.stringStats.maxLength, 0)} chars
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-gray-400">Avg Length:</span>
                        <span className="text-gray-200 font-mono">
                          {formatNumber(selectedStats.stringStats.avgLength, 1)} chars
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Top Values */}
                {selectedStats.topValues.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-300 flex items-center space-x-2 mb-3">
                      <TrendingUp size={14} />
                      <span>Most Frequent Values</span>
                    </h4>
                    <div className="space-y-2">
                      {selectedStats.topValues.slice(0, 10).map((item, index) => (
                        <div key={index} className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-300 truncate max-w-[300px] font-mono">
                              {typeof item.value === "string" ? (
                                `"${item.value}"`
                              ) : typeof item.value === "object" ? (
                                JSON.stringify(item.value)
                              ) : (
                                String(item.value)
                              )}
                            </span>
                            <span className="text-gray-400 ml-2">
                              {item.count} ({formatNumber(item.percentage, 1)}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-1.5">
                            <div
                              className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
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
              <div className="flex items-center justify-center h-full text-gray-400">
                <p>Select a column to view statistics</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
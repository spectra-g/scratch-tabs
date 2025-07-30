import * as React from "react";
import { X, BarChart3, Hash, Type, Calculator } from "../../../../components/Icons";
import { CsvColumnStats } from "../types";

interface ColumnStatsPopoverProps {
  columnName: string;
  stats: CsvColumnStats;
  onClose: () => void;
  position: { x: number; y: number };
}

export const ColumnStatsPopover: React.FC<ColumnStatsPopoverProps> = ({
  columnName,
  stats,
  onClose,
  position,
}) => {
  const formatNumber = (num: number, decimals: number = 2): string => {
    return Number.isInteger(num) ? num.toString() : num.toFixed(decimals);
  };

  const getDataTypeIcon = () => {
    switch (stats.dataType) {
      case "number":
        return <Calculator size={16} className="text-blue-400" />;
      case "string":
        return <Type size={16} className="text-green-400" />;
      case "mixed":
        return <Hash size={16} className="text-yellow-400" />;
    }
  };

  const getDataTypeColor = () => {
    switch (stats.dataType) {
      case "number":
        return "text-blue-400";
      case "string":
        return "text-green-400";
      case "mixed":
        return "text-yellow-400";
    }
  };

  return (
    <div
      className="fixed z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl min-w-[320px] max-w-[400px]"
      style={{
        left: Math.min(position.x, window.innerWidth - 420),
        top: Math.min(position.y, window.innerHeight - 500),
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <BarChart3 size={20} className="text-gray-400" />
          <h3 className="font-medium text-gray-200 truncate">{columnName}</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-700 rounded transition-colors"
        >
          <X size={16} className="text-gray-400" />
        </button>
      </div>

      <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
        {/* Basic Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-700/30 rounded p-3">
            <div className="text-xs text-gray-400 uppercase tracking-wide">
              Total Records
            </div>
            <div className="text-lg font-semibold text-gray-200">
              {stats.count.toLocaleString()}
            </div>
          </div>
          <div className="bg-gray-700/30 rounded p-3">
            <div className="text-xs text-gray-400 uppercase tracking-wide">
              Unique Values
            </div>
            <div className="text-lg font-semibold text-gray-200">
              {stats.unique.toLocaleString()}
            </div>
          </div>
          <div className="bg-gray-700/30 rounded p-3">
            <div className="text-xs text-gray-400 uppercase tracking-wide">
              Empty Cells
            </div>
            <div className="text-lg font-semibold text-gray-200">
              {stats.empty.toLocaleString()}
            </div>
          </div>
          <div className="bg-gray-700/30 rounded p-3">
            <div className="flex items-center space-x-1">
              {getDataTypeIcon()}
              <div className="text-xs text-gray-400 uppercase tracking-wide">
                Data Type
              </div>
            </div>
            <div
              className={`text-lg font-semibold capitalize ${getDataTypeColor()}`}
            >
              {stats.dataType}
            </div>
          </div>
        </div>

        {/* Numeric Statistics */}
        {stats.numericStats && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-300 flex items-center space-x-2">
              <Calculator size={14} />
              <span>Numeric Statistics</span>
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between py-1">
                <span className="text-gray-400">Min:</span>
                <span className="text-gray-200 font-mono">
                  {formatNumber(stats.numericStats.min)}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-400">Max:</span>
                <span className="text-gray-200 font-mono">
                  {formatNumber(stats.numericStats.max)}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-400">Sum:</span>
                <span className="text-gray-200 font-mono">
                  {formatNumber(stats.numericStats.sum)}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-400">Average:</span>
                <span className="text-gray-200 font-mono">
                  {formatNumber(stats.numericStats.average)}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-400">Median:</span>
                <span className="text-gray-200 font-mono">
                  {formatNumber(stats.numericStats.median)}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-400">Std Dev:</span>
                <span className="text-gray-200 font-mono">
                  {formatNumber(stats.numericStats.standardDeviation)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* String Statistics */}
        {stats.stringStats && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-300 flex items-center space-x-2">
              <Type size={14} />
              <span>String Statistics</span>
            </h4>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex justify-between py-1">
                <span className="text-gray-400">Min Length:</span>
                <span className="text-gray-200 font-mono">
                  {formatNumber(stats.stringStats.minLength, 0)} chars
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-400">Max Length:</span>
                <span className="text-gray-200 font-mono">
                  {formatNumber(stats.stringStats.maxLength, 0)} chars
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-400">Avg Length:</span>
                <span className="text-gray-200 font-mono">
                  {formatNumber(stats.stringStats.avgLength, 1)} chars
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Frequency Distribution */}
        {stats.frequencyDistribution.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-300 flex items-center space-x-2">
              <BarChart3 size={14} />
              <span>Top Values</span>
            </h4>
            <div className="space-y-2">
              {stats.frequencyDistribution.map((item, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-300 truncate max-w-[180px] font-mono">
                      {item.value || <em className="text-gray-500">Empty</em>}
                    </span>
                    <span className="text-gray-400">
                      {item.count} ({formatNumber(item.percentage, 1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Most Common Value */}
        {stats.mostCommon && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3">
            <div className="text-xs text-blue-400 uppercase tracking-wide mb-1">
              Most Common Value
            </div>
            <div className="font-mono text-sm text-gray-200 mb-1">
              {stats.mostCommon.value}
            </div>
            <div className="text-xs text-gray-400">
              Appears {stats.mostCommon.count} times (
              {formatNumber(
                (stats.mostCommon.count / (stats.count - stats.empty)) * 100,
                1,
              )}
              %)
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

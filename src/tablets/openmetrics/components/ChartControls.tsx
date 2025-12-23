import React from "react";
import { BarChart, LineChart, PieChart, Tag, X } from "lucide-react";

interface ChartControlsProps {
  metricNames: string[];
  selectedMetricName: string | null;
  availableLabelKeys: string[];
  groupByLabels: string[];
  chartType: "bar" | "line" | "pie";
  onSelectMetric: (metricName: string) => void;
  onToggleGroupByLabel: (labelKey: string) => void;
  onSetChartType: (type: "bar" | "line" | "pie") => void;
}

export const ChartControls: React.FC<ChartControlsProps> = ({
  metricNames,
  selectedMetricName,
  availableLabelKeys,
  groupByLabels,
  chartType,
  onSelectMetric,
  onToggleGroupByLabel,
  onSetChartType,
}) => {
  const [searchTerm, setSearchTerm] = React.useState("");

  // Filter metric names by search term
  const filteredMetricNames = React.useMemo(() => {
    if (!searchTerm) return metricNames;
    const term = searchTerm.toLowerCase();
    return metricNames.filter((name) => name.toLowerCase().includes(term));
  }, [metricNames, searchTerm]);

  return (
    <div className="p-3 border-b border-base">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-3">
        <div className="mb-2 md:mb-0">
          <h3 className="text-sm font-medium text-secondary">
            Chart Configuration
          </h3>
          {selectedMetricName && (
            <div className="text-xs text-muted mt-1">
              {selectedMetricName}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onSetChartType("bar")}
            className={`p-2 rounded ${chartType === "bar" ? "bg-primary/20 text-primary" : "text-muted hover:bg-surface-secondary"}`}
            title="Bar Chart"
          >
            <BarChart size={16} />
          </button>
          <button
            onClick={() => onSetChartType("line")}
            className={`p-2 rounded ${chartType === "line" ? "bg-primary/20 text-primary" : "text-muted hover:bg-surface-secondary"}`}
            title="Line Chart"
          >
            <LineChart size={16} />
          </button>
          <button
            onClick={() => onSetChartType("pie")}
            className={`p-2 rounded ${chartType === "pie" ? "bg-primary/20 text-primary" : "text-muted hover:bg-surface-secondary"}`}
            title="Pie Chart"
          >
            <PieChart size={16} />
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:space-x-4">
        {/* Metric selector */}
        <div className="w-full md:w-1/3 mb-3 md:mb-0">
          <div className="text-xs text-muted mb-1">Select Metric</div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search metrics..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface-raised border border-base rounded px-3 py-2 text-sm text-main placeholder-muted focus:outline-none focus:border-primary"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted hover:text-secondary"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="mt-2 max-h-32 overflow-y-auto custom-scrollbar bg-surface-raised border border-base rounded">
            {filteredMetricNames.length === 0 ? (
              <div className="p-2 text-sm text-muted">No metrics found</div>
            ) : (
              filteredMetricNames.map((name) => (
                <div
                  key={name}
                  className={`p-2 text-sm cursor-pointer hover:bg-surface-secondary ${
                    name === selectedMetricName
                      ? "bg-primary/20 text-primary"
                      : "text-secondary"
                  }`}
                  onClick={() => onSelectMetric(name)}
                >
                  {name}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Group by selector */}
        {selectedMetricName && availableLabelKeys.length > 0 && (
          <div className="w-full md:w-1/3">
            <div className="text-xs text-muted mb-1">Group By Labels</div>
            <div className="bg-surface-raised border border-base rounded p-2 max-h-32 overflow-y-auto custom-scrollbar">
              {availableLabelKeys.map((labelKey) => (
                <div
                  key={labelKey}
                  className="flex items-center mb-1 last:mb-0"
                >
                  <input
                    type="checkbox"
                    id={`group-by-${labelKey}`}
                    checked={groupByLabels.includes(labelKey)}
                    onChange={() => onToggleGroupByLabel(labelKey)}
                    className="mr-2"
                  />
                  <label
                    htmlFor={`group-by-${labelKey}`}
                    className="text-sm text-secondary flex items-center"
                  >
                    <Tag size={12} className="mr-1 text-muted" />
                    {labelKey}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

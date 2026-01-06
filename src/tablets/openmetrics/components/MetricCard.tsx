import React from "react";
import { MetricSample, MetricTypeInfo } from "../types";
import { formatNumber } from "../utils";

interface MetricCardProps {
  metricInfo: MetricTypeInfo;
  samples: MetricSample[];
  onSelect: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  metricInfo,
  samples,
  onSelect,
}) => {
  const getTypeColor = (type: string | undefined) => {
    switch (type) {
      case "counter":
        return "bg-info-subtle text-info border-info";
      case "gauge":
        return "bg-success-subtle text-success border-success";
      case "histogram":
        return "bg-info-subtle text-info border-info";
      case "summary":
        return "bg-warning-subtle text-warning border-warning";
      default:
        return "bg-surface-secondary text-muted border-base";
    }
  };

  // Calculate some basic stats
  const values = samples.map((s) => s.value);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  const avg = values.length ? sum / values.length : 0;

  // Get unique label keys
  const labelKeys = new Set<string>();
  samples.forEach((sample) => {
    Object.keys(sample.labels).forEach((key) => labelKeys.add(key));
  });

  return (
    <div
      className={`p-4 rounded-lg border hover:border-primary/50 cursor-pointer transition-colors ${getTypeColor(metricInfo.type)}`}
      onClick={onSelect}
    >
      <div
        className="font-medium text-sm mb-2 truncate"
        title={metricInfo.name}
      >
        {metricInfo.name}
      </div>

      {metricInfo.help && (
        <div
          className="text-xs text-muted mb-3 line-clamp-2"
          title={metricInfo.help}
        >
          {metricInfo.help}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="text-center p-1 bg-surface-secondary rounded">
          <div className="text-xs text-muted">Count</div>
          <div className="text-sm font-medium">{metricInfo.count}</div>
        </div>

        {metricInfo.type === "counter" || metricInfo.type === "gauge" ? (
          <div className="text-center p-1 bg-surface-secondary rounded">
            <div className="text-xs text-muted">Current</div>
            <div className="text-sm font-medium">
              {formatNumber(samples[0]?.value || 0)}
            </div>
          </div>
        ) : (
          <div className="text-center p-1 bg-surface-secondary rounded">
            <div className="text-xs text-muted">Sum</div>
            <div className="text-sm font-medium">{formatNumber(sum)}</div>
          </div>
        )}

        <div className="text-center p-1 bg-surface-secondary rounded">
          <div className="text-xs text-muted">Min</div>
          <div className="text-sm font-medium">{formatNumber(min)}</div>
        </div>

        <div className="text-center p-1 bg-surface-secondary rounded">
          <div className="text-xs text-muted">Max</div>
          <div className="text-sm font-medium">{formatNumber(max)}</div>
        </div>
      </div>

      {labelKeys.size > 0 && (
        <div className="text-xs text-muted">
          Labels: {Array.from(labelKeys).join(", ")}
        </div>
      )}
    </div>
  );
};

import { MetricSample, ChartData } from "./types";

/**
 * Groups metric samples by specified label keys
 */
export function groupMetricsByLabels(
  metrics: MetricSample[],
  labelKeys: string[],
): ChartData[] {
  // If no label keys provided, return metrics as is
  if (labelKeys.length === 0) {
    return metrics.map((metric) => ({
      name: formatLabelsForDisplay(metric.labels),
      value: metric.value,
    }));
  }

  // Group metrics by the specified label keys
  const groups = new Map<string, MetricSample[]>();

  metrics.forEach((metric) => {
    // Create a key based on the selected label values
    const groupKey = labelKeys
      .map((key) => `${key}=${metric.labels[key] || ""}`)
      .join(",");

    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }

    groups.get(groupKey)!.push(metric);
  });

  // Convert groups to chart data
  return Array.from(groups.entries()).map(([key, groupMetrics]) => {
    // Calculate aggregate value for the group (sum by default)
    const value = groupMetrics.reduce((sum, metric) => sum + metric.value, 0);

    // Create a name for the group based on label values
    const name = labelKeys
      .map((labelKey) => {
        // Use the first metric's label value (should be the same for all in the group)
        const labelValue = groupMetrics[0].labels[labelKey] || "";
        return `${labelKey}="${labelValue}"`;
      })
      .join(", ");

    // Create chart data object with all label values as properties
    const chartData: ChartData = { name, value };

    // Add individual label values as properties
    labelKeys.forEach((labelKey) => {
      const labelValue = groupMetrics[0].labels[labelKey] || "";
      chartData[labelKey] = labelValue;
    });

    return chartData;
  });
}

/**
 * Formats labels for display
 */
export function formatLabelsForDisplay(labels: Record<string, string>): string {
  if (Object.keys(labels).length === 0) {
    return "(no labels)";
  }

  return Object.entries(labels)
    .map(([key, value]) => `${key}="${value}"`)
    .join(", ");
}

/**
 * Gets all unique label keys from a collection of metrics
 */
export function getUniqueLabelKeys(metrics: MetricSample[]): string[] {
  const labelKeys = new Set<string>();

  metrics.forEach((metric) => {
    Object.keys(metric.labels).forEach((key) => {
      labelKeys.add(key);
    });
  });

  return Array.from(labelKeys).sort();
}

/**
 * Gets all unique label values for a specific label key
 */
export function getUniqueLabelValues(
  metrics: MetricSample[],
  labelKey: string,
): string[] {
  const values = new Set<string>();

  metrics.forEach((metric) => {
    if (metric.labels[labelKey] !== undefined) {
      values.add(metric.labels[labelKey]);
    }
  });

  return Array.from(values).sort();
}

/**
 * Formats a timestamp for display
 */
export function formatTimestamp(timestamp: number | undefined): string {
  if (!timestamp) return "N/A";

  const date = new Date(timestamp);
  return date.toLocaleString();
}

/**
 * Calculates the percentage change between two values
 */
export function calculatePercentageChange(
  oldValue: number,
  newValue: number,
): number {
  if (oldValue === 0) return newValue === 0 ? 0 : 100;
  return ((newValue - oldValue) / Math.abs(oldValue)) * 100;
}

/**
 * Formats a number for display
 */
export function formatNumber(value: number): string {
  if (value === 0) return "0";

  // Handle very large or small numbers with scientific notation
  if (Math.abs(value) < 0.001 || Math.abs(value) > 1000000) {
    return value.toExponential(4);
  }

  // For regular numbers, limit decimal places
  return value.toFixed(value % 1 === 0 ? 0 : 4);
}

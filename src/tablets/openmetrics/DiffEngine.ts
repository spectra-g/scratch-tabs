import { MetricSample, DiffResult } from "./types";

/**
 * Creates a unique key for a metric sample based on name and labels
 */
function createMetricKey(sample: MetricSample): string {
  const labelEntries = Object.entries(sample.labels).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  const labelsString = labelEntries
    .map(([key, value]) => `${key}="${value}"`)
    .join(",");

  return `${sample.name}{${labelsString}}`;
}

/**
 * Compares two snapshots and returns the differences
 * @param oldSnapshot The baseline snapshot
 * @param newSnapshot The comparison snapshot
 */
export function diffSnapshots(
  oldSnapshot: { metrics: MetricSample[] },
  newSnapshot: { metrics: MetricSample[] },
): DiffResult {
  const oldMetrics = oldSnapshot.metrics;
  const newMetrics = newSnapshot.metrics;

  const oldMetricsMap = new Map<string, MetricSample>();
  const newMetricsMap = new Map<string, MetricSample>();

  // Create maps for efficient lookup
  oldMetrics.forEach((metric) => {
    oldMetricsMap.set(createMetricKey(metric), metric);
  });

  newMetrics.forEach((metric) => {
    newMetricsMap.set(createMetricKey(metric), metric);
  });

  const added: MetricSample[] = [];
  const removed: MetricSample[] = [];
  const changed: Array<{ from: MetricSample; to: MetricSample }> = [];

  // Find added and changed metrics
  newMetrics.forEach((newMetric) => {
    const key = createMetricKey(newMetric);
    const oldMetric = oldMetricsMap.get(key);

    if (!oldMetric) {
      // Metric exists in new but not in old
      added.push(newMetric);
    } else if (oldMetric.value !== newMetric.value) {
      // Metric exists in both but value changed
      changed.push({ from: oldMetric, to: newMetric });
    }
  });

  // Find removed metrics
  oldMetrics.forEach((oldMetric) => {
    const key = createMetricKey(oldMetric);
    if (!newMetricsMap.has(key)) {
      removed.push(oldMetric);
    }
  });

  return { added, removed, changed };
}

/**
 * Calculates the rate of change between two metric samples
 * @param oldSample The older sample
 * @param newSample The newer sample
 */
export function calculateRate(
  oldSample: MetricSample,
  newSample: MetricSample,
): number | null {
  // Both samples must have timestamps
  if (!oldSample.timestamp || !newSample.timestamp) {
    return null;
  }

  // Ensure samples are for the same metric
  if (
    oldSample.name !== newSample.name ||
    createMetricKey(oldSample) !== createMetricKey(newSample)
  ) {
    return null;
  }

  // Calculate time difference in seconds
  const timeDiffSeconds = (newSample.timestamp - oldSample.timestamp) / 1000;

  // Avoid division by zero
  if (timeDiffSeconds <= 0) {
    return null;
  }

  // For counters, calculate rate of increase
  // For gauges, calculate rate of change
  const valueDiff = newSample.value - oldSample.value;

  return valueDiff / timeDiffSeconds;
}

/**
 * Calculates the delta (absolute change) between two metric samples
 */
export function calculateDelta(
  oldSample: MetricSample,
  newSample: MetricSample,
): number | null {
  // Ensure samples are for the same metric
  if (
    oldSample.name !== newSample.name ||
    createMetricKey(oldSample) !== createMetricKey(newSample)
  ) {
    return null;
  }

  return newSample.value - oldSample.value;
}

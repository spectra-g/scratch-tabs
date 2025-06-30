export interface MetricSample {
  name: string;
  labels: Record<string, string>;
  value: number;
  timestamp?: number;
  type?: string;
  help?: string;
}

export interface Snapshot {
  id: string;
  name: string;
  createdAt: number;
  metrics: MetricSample[];
}

export interface QueryResult {
  metric: string;
  groupedBy: string[];
  values: Array<{ labels: Record<string, string>; value: number }>;
}

export interface ParsedMetric {
  name: string;
  type?: string;
  help?: string;
  samples: MetricSample[];
}

export interface ParseResult {
  metrics: MetricSample[];
  parsedMetrics: ParsedMetric[];
  errors: ParseError[];
  stats: {
    totalMetrics: number;
    uniqueMetricNames: number;
    totalLabels: number;
    uniqueLabelNames: number;
  };
}

export interface ParseError {
  line: number;
  message: string;
  text: string;
}

export interface DiffResult {
  added: MetricSample[];
  removed: MetricSample[];
  changed: Array<{ from: MetricSample; to: MetricSample }>;
}

export interface ChartData {
  name: string;
  value: number;
  [key: string]: string | number;
}

export interface MetricTypeInfo {
  name: string;
  type: string;
  help?: string;
  count: number;
}

export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary' | 'untyped';
import React from "react";
import { Tablet, TabletState } from "../types";
import { OpenMetricsUI } from "./OpenMetricsUI";
import { MetricSample, Snapshot } from "./types";

interface OpenMetricsTabletState extends TabletState {
  type: "openmetrics";
  data: {
    rawText: string;
    snapshots: Snapshot[];
    activeSnapshotId: string | null;
    compareSnapshotId: string | null;
    selectedMetricName: string | null;
    selectedLabels: Record<string, string>;
    chartConfig: {
      type: "bar" | "line" | "pie";
      groupByLabels: string[];
    };
    queryString: string;
    activeTab: "editor" | "explorer" | "diff" | "chart" | "query";
  };
}

export const OpenMetricsTablet: Tablet = {
  id: "openmetrics",
  label: "OpenMetrics Viewer",
  keywords: [
    "metrics",
    "prometheus",
    "openmetrics",
    "monitoring",
    "prom",
    "exposition",
  ],

  createInitialState(): OpenMetricsTabletState {
    const initialSnapshot: Snapshot = {
      id: "initial",
      name: "Initial",
      createdAt: Date.now(),
      metrics: [],
    };

    return {
      type: "openmetrics",
      data: {
        rawText: `# HELP http_requests_total The total number of HTTP requests.
# TYPE http_requests_total counter
http_requests_total{method="post",code="200"} 1027 1719933920000
http_requests_total{method="post",code="500"} 45 1719933920000
# HELP http_request_duration_seconds The HTTP request latencies in seconds.
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.05"} 24054
http_request_duration_seconds_bucket{le="0.1"} 33444
http_request_duration_seconds_bucket{le="0.2"} 100392
http_request_duration_seconds_bucket{le="0.5"} 129389
http_request_duration_seconds_bucket{le="1"} 133988
http_request_duration_seconds_bucket{le="+Inf"} 144320
http_request_duration_seconds_sum 53423
http_request_duration_seconds_count 144320
# HELP process_cpu_seconds_total Total user and system CPU time spent in seconds.
# TYPE process_cpu_seconds_total counter
process_cpu_seconds_total 29323.04
# HELP process_resident_memory_bytes Resident memory size in bytes.
# TYPE process_resident_memory_bytes gauge
process_resident_memory_bytes 2478268416
# EOF`,
        snapshots: [initialSnapshot],
        activeSnapshotId: "initial",
        compareSnapshotId: null,
        selectedMetricName: null,
        selectedLabels: {},
        chartConfig: {
          type: "bar",
          groupByLabels: [],
        },
        queryString: "",
        activeTab: "editor",
      },
    };
  },

  serializeState(state: TabletState): string {
    return JSON.stringify(state);
  },

  deserializeState(json: string): TabletState {
    try {
      const parsed = JSON.parse(json);
      if (parsed.type === "openmetrics" && parsed.data) {
        return parsed as OpenMetricsTabletState;
      }
    } catch (e) {
      console.error("Failed to deserialize OpenMetrics state:", e);
    }
    return this.createInitialState();
  },

  render(state: TabletState, onChange: (state: TabletState) => void) {
    const typedState = state as OpenMetricsTabletState;
    return (
      <OpenMetricsUI
        state={typedState.data}
        onChange={(newData) => {
          onChange({
            ...typedState,
            data: newData,
          });
        }}
      />
    );
  },
};

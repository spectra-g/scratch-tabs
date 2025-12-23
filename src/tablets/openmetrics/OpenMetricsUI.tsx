import React, { useState, useEffect } from "react";
import { Tabs } from "./components/Tabs";
import { OpenMetricsEditor } from "./OpenMetricsEditor";
import { MetricsExplorer } from "./MetricsExplorer";
import { SnapshotManager } from "./SnapshotManager";
import { MetricsChart } from "./MetricsChart";
import { QueryPanel } from "./QueryPanel";
import { parseMetrics } from "./MetricsParser";
import { MetricSample, Snapshot, ParseResult } from "./types";

interface OpenMetricsUIProps {
  state: {
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
  onChange: (newState: typeof OpenMetricsUIProps.prototype.state) => void;
}

export const OpenMetricsUI: React.FC<OpenMetricsUIProps> = ({
  state,
  onChange,
}) => {
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Parse metrics when raw text changes
  useEffect(() => {
    const debouncedParse = setTimeout(() => {
      try {
        setIsLoading(true);
        const result = parseMetrics(state.rawText);
        setParseResult(result);
        setParseError(null);

        // Snapshots are now immutable - no auto-updating
      } catch (error) {
        setParseError(error instanceof Error ? error.message : String(error));
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(debouncedParse);
  }, [state.rawText]);

  const handleTextChange = (newText: string) => {
    onChange({ ...state, rawText: newText });
  };

  const handleTabChange = (
    tab: "editor" | "explorer" | "diff" | "chart" | "query",
  ) => {
    onChange({ ...state, activeTab: tab });
  };

  const handleTakeSnapshot = (name: string) => {
    if (!parseResult) return;

    // Check for duplicate against most recent snapshot
    const mostRecentSnapshot = state.snapshots[0];
    if (mostRecentSnapshot && mostRecentSnapshot.metrics.length === parseResult.metrics.length) {
      const isDuplicate = mostRecentSnapshot.metrics.every((metric, index) => {
        const newMetric = parseResult.metrics[index];
        return metric.name === newMetric.name &&
          metric.value === newMetric.value &&
          JSON.stringify(metric.labels) === JSON.stringify(newMetric.labels);
      });

      if (isDuplicate) {
        return; // Don't create duplicate
      }
    }

    const newSnapshot: Snapshot = {
      id: `snapshot_${Date.now()}`,
      name,
      createdAt: Date.now(),
      metrics: parseResult.metrics,
    };

    // Add new snapshot to the beginning of the array (most recent first)
    const updatedSnapshots = [newSnapshot, ...state.snapshots];

    onChange({
      ...state,
      snapshots: updatedSnapshots,
      activeSnapshotId: newSnapshot.id,
    });
  };

  const handleSelectSnapshot = (snapshotId: string) => {
    onChange({ ...state, activeSnapshotId: snapshotId });
  };

  const handleSelectCompareSnapshot = (snapshotId: string | null) => {
    onChange({ ...state, compareSnapshotId: snapshotId });
  };

  const handleDeleteSnapshot = (snapshotId: string) => {
    const updatedSnapshots = state.snapshots.filter((s) => s.id !== snapshotId);

    // Update active snapshot if the deleted one was active
    let newActiveId = state.activeSnapshotId;
    if (state.activeSnapshotId === snapshotId) {
      newActiveId =
        updatedSnapshots.length > 0
          ? updatedSnapshots[updatedSnapshots.length - 1].id
          : null;
    }

    // Update compare snapshot if the deleted one was being compared
    let newCompareId = state.compareSnapshotId;
    if (state.compareSnapshotId === snapshotId) {
      newCompareId = null;
    }

    onChange({
      ...state,
      snapshots: updatedSnapshots,
      activeSnapshotId: newActiveId,
      compareSnapshotId: newCompareId,
    });
  };

  const handleSelectMetric = (
    metricName: string,
    labels: Record<string, string> = {},
  ) => {
    onChange({
      ...state,
      selectedMetricName: metricName,
      selectedLabels: labels,
      activeTab: "chart", // Switch to chart tab when selecting a metric
    });
  };

  const handleUpdateChartConfig = (config: {
    type: "bar" | "line" | "pie";
    groupByLabels: string[];
  }) => {
    onChange({ ...state, chartConfig: config });
  };

  const handleUpdateQuery = (queryString: string) => {
    onChange({ ...state, queryString });
  };

  const activeSnapshot =
    state.snapshots.find((s) => s.id === state.activeSnapshotId) || null;
  const compareSnapshot = state.compareSnapshotId
    ? state.snapshots.find((s) => s.id === state.compareSnapshotId) || null
    : null;

  return (
    <div className="h-full flex flex-col bg-canvas text-main">
      <Tabs
        activeTab={state.activeTab}
        onTabChange={handleTabChange}
        parseResult={parseResult}
        isLoading={isLoading}
        error={parseError}
      />

      <div className="flex-1 overflow-hidden">
        {state.activeTab === "editor" && (
          <OpenMetricsEditor
            value={state.rawText}
            onChange={handleTextChange}
            parseResult={parseResult}
            parseError={parseError}
            isLoading={isLoading}
          />
        )}

        {state.activeTab === "explorer" && parseResult && (
          <MetricsExplorer
            parsedMetrics={parseResult.parsedMetrics}
            onSelectMetric={handleSelectMetric}
          />
        )}

        {state.activeTab === "diff" && (
          <SnapshotManager
            snapshots={state.snapshots}
            activeSnapshotId={state.activeSnapshotId}
            compareSnapshotId={state.compareSnapshotId}
            onTakeSnapshot={handleTakeSnapshot}
            onSelectSnapshot={handleSelectSnapshot}
            onSelectCompareSnapshot={handleSelectCompareSnapshot}
            onDeleteSnapshot={handleDeleteSnapshot}
          />
        )}

        {state.activeTab === "chart" && (
          <MetricsChart
            metrics={parseResult?.metrics || []}
            snapshots={state.snapshots}
            selectedMetricName={state.selectedMetricName}
            selectedLabels={state.selectedLabels}
            chartConfig={state.chartConfig}
            onUpdateChartConfig={handleUpdateChartConfig}
            onSelectMetric={handleSelectMetric}
          />
        )}

        {state.activeTab === "query" && (
          <QueryPanel
            metrics={parseResult?.metrics || []}
            snapshots={state.snapshots}
            queryString={state.queryString}
            onUpdateQuery={handleUpdateQuery}
          />
        )}
      </div>
    </div>
  );
};

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { OpenMetricsTablet } from "../OpenMetricsTablet";
import { TabletState } from "../../types";

// Mock the OpenMetricsUI component since it's complex
jest.mock("../OpenMetricsUI", () => ({
  OpenMetricsUI: ({ state, onChange }: any) => (
    <div data-testid="openmetrics-ui">
      <div data-testid="raw-text">{state.rawText}</div>
      <div data-testid="active-tab">{state.activeTab}</div>
      <div data-testid="snapshots-count">{state.snapshots.length}</div>
    </div>
  ),
}));

describe("OpenMetricsTablet", () => {
  let mockOnChange: jest.Mock;
  let initialState: TabletState;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnChange = jest.fn();
    initialState = OpenMetricsTablet.createInitialState();
  });

  describe("tablet definition", () => {
    it("should have correct tablet id", () => {
      expect(OpenMetricsTablet.id).toBe("openmetrics");
    });

    it("should have correct label", () => {
      expect(OpenMetricsTablet.label).toBe("OpenMetrics Viewer");
    });

    it("should have proper keywords", () => {
      expect(OpenMetricsTablet.keywords).toContain("metrics");
      expect(OpenMetricsTablet.keywords).toContain("prometheus");
      expect(OpenMetricsTablet.keywords).toContain("openmetrics");
      expect(OpenMetricsTablet.keywords).toContain("monitoring");
      expect(OpenMetricsTablet.keywords).toContain("prom");
      expect(OpenMetricsTablet.keywords).toContain("exposition");
    });
  });

  describe("createInitialState", () => {
    it("should create initial state with default values", () => {
      const state = OpenMetricsTablet.createInitialState();

      expect(state.type).toBe("openmetrics");
      expect(state.data.rawText).toBeDefined();
      expect(state.data.rawText.length).toBeGreaterThan(0);
      expect(state.data.snapshots).toEqual([]);
      expect(state.data.activeSnapshotId).toBeNull();
      expect(state.data.compareSnapshotId).toBeNull();
      expect(state.data.selectedMetricName).toBeNull();
      expect(state.data.selectedLabels).toEqual({});
      expect(state.data.chartConfig).toEqual({
        type: "bar",
        groupByLabels: [],
      });
      expect(state.data.queryString).toBe("");
      expect(state.data.activeTab).toBe("editor");
    });

    it("should include sample metrics in rawText", () => {
      const state = OpenMetricsTablet.createInitialState();

      expect(state.data.rawText).toContain("http_requests_total");
      expect(state.data.rawText).toContain("# HELP");
      expect(state.data.rawText).toContain("# TYPE");
      expect(state.data.rawText).toContain("# EOF");
    });

    it("should have valid OpenMetrics format in rawText", () => {
      const state = OpenMetricsTablet.createInitialState();

      // Check for proper metric format
      expect(state.data.rawText).toMatch(/\w+{.*}.*\d+/);
      // Check for HELP lines
      expect(state.data.rawText).toMatch(/# HELP \w+ .+/);
      // Check for TYPE lines
      expect(state.data.rawText).toMatch(
        /# TYPE \w+ (counter|gauge|histogram|summary)/,
      );
    });

    it("should include different metric types", () => {
      const state = OpenMetricsTablet.createInitialState();

      expect(state.data.rawText).toContain("counter");
      expect(state.data.rawText).toContain("gauge");
      expect(state.data.rawText).toContain("histogram");
    });
  });

  describe("serializeState", () => {
    it("should serialize state to JSON string", () => {
      const state = OpenMetricsTablet.createInitialState();
      const serialized = OpenMetricsTablet.serializeState(state);

      expect(typeof serialized).toBe("string");
      expect(JSON.parse(serialized)).toEqual(state);
    });

    it("should handle complex state with snapshots", () => {
      const state = OpenMetricsTablet.createInitialState();
      if (state.type === "openmetrics") {
        state.data.snapshots = [
          {
            id: "snapshot-1",
            name: "Test Snapshot",
            createdAt: Date.now(),
            metrics: [
              {
                name: "test_metric",
                labels: { label: "value" },
                value: 42,
              },
            ],
          },
        ];
        state.data.activeSnapshotId = "snapshot-1";
      }

      const serialized = OpenMetricsTablet.serializeState(state);
      const parsed = JSON.parse(serialized);

      expect(parsed.data.snapshots).toHaveLength(1);
      expect(parsed.data.snapshots[0].name).toBe("Test Snapshot");
      expect(parsed.data.activeSnapshotId).toBe("snapshot-1");
    });

    it("should preserve all state properties", () => {
      const state = OpenMetricsTablet.createInitialState();
      if (state.type === "openmetrics") {
        state.data.rawText = "custom_metric 123";
        state.data.selectedMetricName = "custom_metric";
        state.data.selectedLabels = { env: "prod" };
        state.data.chartConfig = {
          type: "line",
          groupByLabels: ["env", "region"],
        };
        state.data.queryString = "sum(custom_metric)";
        state.data.activeTab = "chart";
      }

      const serialized = OpenMetricsTablet.serializeState(state);
      const parsed = JSON.parse(serialized);

      expect(parsed.data.rawText).toBe("custom_metric 123");
      expect(parsed.data.selectedMetricName).toBe("custom_metric");
      expect(parsed.data.selectedLabels).toEqual({ env: "prod" });
      expect(parsed.data.chartConfig.type).toBe("line");
      expect(parsed.data.chartConfig.groupByLabels).toEqual(["env", "region"]);
      expect(parsed.data.queryString).toBe("sum(custom_metric)");
      expect(parsed.data.activeTab).toBe("chart");
    });
  });

  describe("deserializeState", () => {
    it("should deserialize valid JSON to state", () => {
      const originalState = OpenMetricsTablet.createInitialState();
      const serialized = OpenMetricsTablet.serializeState(originalState);
      const deserialized = OpenMetricsTablet.deserializeState(serialized);

      expect(deserialized).toEqual(originalState);
    });

    it("should return default state for invalid JSON", () => {
      const deserialized = OpenMetricsTablet.deserializeState(
        "invalid json string",
      );

      expect(deserialized.type).toBe("openmetrics");
      expect(deserialized.data).toBeDefined();
    });

    it("should return default state for empty string", () => {
      const deserialized = OpenMetricsTablet.deserializeState("");

      expect(deserialized.type).toBe("openmetrics");
    });

    it("should return default state for wrong type", () => {
      const wrongType = JSON.stringify({
        type: "wrong-type",
        data: {},
      });

      const deserialized = OpenMetricsTablet.deserializeState(wrongType);

      expect(deserialized.type).toBe("openmetrics");
    });

    it("should handle state without data field", () => {
      const invalidState = JSON.stringify({
        type: "openmetrics",
      });

      const deserialized = OpenMetricsTablet.deserializeState(invalidState);

      expect(deserialized.type).toBe("openmetrics");
      expect(deserialized.data).toBeDefined();
    });

    it("should log error for deserialization failures", () => {
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      OpenMetricsTablet.deserializeState("{invalid json}");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to deserialize OpenMetrics state:",
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("render", () => {
    it("should render the OpenMetrics UI component", () => {
      const rendered = OpenMetricsTablet.render(initialState, mockOnChange);
      render(<>{rendered}</>);

      expect(screen.getByTestId("openmetrics-ui")).toBeInTheDocument();
    });

    it("should pass state data to UI component", () => {
      const rendered = OpenMetricsTablet.render(initialState, mockOnChange);
      render(<>{rendered}</>);

      const rawText = screen.getByTestId("raw-text");
      expect(rawText.textContent).toBeTruthy();
      expect(rawText.textContent?.length).toBeGreaterThan(0);
    });

    it("should pass active tab to UI component", () => {
      const rendered = OpenMetricsTablet.render(initialState, mockOnChange);
      render(<>{rendered}</>);

      const activeTab = screen.getByTestId("active-tab");
      expect(activeTab.textContent).toBe("editor");
    });

    it("should pass snapshots count to UI component", () => {
      const rendered = OpenMetricsTablet.render(initialState, mockOnChange);
      render(<>{rendered}</>);

      const snapshotsCount = screen.getByTestId("snapshots-count");
      expect(snapshotsCount.textContent).toBe("0");
    });

    it("should render with custom state", () => {
      const customState = OpenMetricsTablet.createInitialState();
      if (customState.type === "openmetrics") {
        customState.data.rawText = "custom_metric 999";
        customState.data.activeTab = "explorer";
        customState.data.snapshots = [
          {
            id: "snap1",
            name: "Snapshot 1",
            createdAt: Date.now(),
            metrics: [],
          },
          {
            id: "snap2",
            name: "Snapshot 2",
            createdAt: Date.now(),
            metrics: [],
          },
        ];
      }

      const rendered = OpenMetricsTablet.render(customState, mockOnChange);
      render(<>{rendered}</>);

      expect(screen.getByTestId("raw-text").textContent).toBe(
        "custom_metric 999",
      );
      expect(screen.getByTestId("active-tab").textContent).toBe("explorer");
      expect(screen.getByTestId("snapshots-count").textContent).toBe("2");
    });
  });

  describe("persistence", () => {
    it("should maintain state across serialization and deserialization", () => {
      const state = OpenMetricsTablet.createInitialState();
      if (state.type === "openmetrics") {
        state.data.rawText = "persistent_metric 42";
        state.data.activeTab = "query";
        state.data.queryString = "sum(persistent_metric)";
        state.data.selectedMetricName = "persistent_metric";
        state.data.selectedLabels = { env: "test" };
        state.data.chartConfig = {
          type: "pie",
          groupByLabels: ["env"],
        };
        state.data.snapshots = [
          {
            id: "snapshot-test",
            name: "Test Snapshot",
            createdAt: 1234567890,
            metrics: [
              {
                name: "persistent_metric",
                labels: { env: "test" },
                value: 42,
              },
            ],
          },
        ];
        state.data.activeSnapshotId = "snapshot-test";
        state.data.compareSnapshotId = null;
      }

      const serialized = OpenMetricsTablet.serializeState(state);
      const deserialized = OpenMetricsTablet.deserializeState(serialized);

      expect(deserialized.data.rawText).toBe("persistent_metric 42");
      expect(deserialized.data.activeTab).toBe("query");
      expect(deserialized.data.queryString).toBe("sum(persistent_metric)");
      expect(deserialized.data.selectedMetricName).toBe("persistent_metric");
      expect(deserialized.data.selectedLabels).toEqual({ env: "test" });
      expect(deserialized.data.chartConfig.type).toBe("pie");
      expect(deserialized.data.snapshots).toHaveLength(1);
      expect(deserialized.data.snapshots[0].name).toBe("Test Snapshot");
      expect(deserialized.data.activeSnapshotId).toBe("snapshot-test");
    });

    it("should handle empty snapshots array", () => {
      const state = OpenMetricsTablet.createInitialState();

      const serialized = OpenMetricsTablet.serializeState(state);
      const deserialized = OpenMetricsTablet.deserializeState(serialized);

      expect(deserialized.data.snapshots).toEqual([]);
    });

    it("should preserve null values for optional fields", () => {
      const state = OpenMetricsTablet.createInitialState();

      const serialized = OpenMetricsTablet.serializeState(state);
      const deserialized = OpenMetricsTablet.deserializeState(serialized);

      expect(deserialized.data.activeSnapshotId).toBeNull();
      expect(deserialized.data.compareSnapshotId).toBeNull();
      expect(deserialized.data.selectedMetricName).toBeNull();
    });
  });

  describe("state structure", () => {
    it("should have all required fields in data", () => {
      const state = OpenMetricsTablet.createInitialState();

      expect(state.data).toHaveProperty("rawText");
      expect(state.data).toHaveProperty("snapshots");
      expect(state.data).toHaveProperty("activeSnapshotId");
      expect(state.data).toHaveProperty("compareSnapshotId");
      expect(state.data).toHaveProperty("selectedMetricName");
      expect(state.data).toHaveProperty("selectedLabels");
      expect(state.data).toHaveProperty("chartConfig");
      expect(state.data).toHaveProperty("queryString");
      expect(state.data).toHaveProperty("activeTab");
    });

    it("should have valid chart config structure", () => {
      const state = OpenMetricsTablet.createInitialState();

      expect(state.data.chartConfig).toHaveProperty("type");
      expect(state.data.chartConfig).toHaveProperty("groupByLabels");
      expect(["bar", "line", "pie"]).toContain(state.data.chartConfig.type);
      expect(Array.isArray(state.data.chartConfig.groupByLabels)).toBe(true);
    });

    it("should have valid activeTab value", () => {
      const state = OpenMetricsTablet.createInitialState();

      expect(["editor", "explorer", "diff", "chart", "query"]).toContain(
        state.data.activeTab,
      );
    });

    it("should initialize selectedLabels as empty object", () => {
      const state = OpenMetricsTablet.createInitialState();

      expect(state.data.selectedLabels).toEqual({});
      expect(typeof state.data.selectedLabels).toBe("object");
    });
  });

  describe("integration", () => {
    it("should support complete workflow state", () => {
      const state = OpenMetricsTablet.createInitialState();

      // Simulate a complete workflow
      if (state.type === "openmetrics") {
        // 1. User edits raw text
        state.data.rawText = "custom_metric 100";

        // 2. User creates a snapshot
        state.data.snapshots.push({
          id: "snap-1",
          name: "Before changes",
          createdAt: Date.now(),
          metrics: [
            {
              name: "custom_metric",
              labels: {},
              value: 100,
            },
          ],
        });
        state.data.activeSnapshotId = "snap-1";

        // 3. User selects a metric
        state.data.selectedMetricName = "custom_metric";

        // 4. User configures chart
        state.data.chartConfig = {
          type: "line",
          groupByLabels: ["instance"],
        };
        state.data.activeTab = "chart";

        // 5. User writes a query
        state.data.queryString = "avg(custom_metric)";
      }

      // Verify state is valid and can be serialized
      const serialized = OpenMetricsTablet.serializeState(state);
      const deserialized = OpenMetricsTablet.deserializeState(serialized);

      expect(deserialized.data.snapshots).toHaveLength(1);
      expect(deserialized.data.selectedMetricName).toBe("custom_metric");
      expect(deserialized.data.chartConfig.type).toBe("line");
      expect(deserialized.data.queryString).toBe("avg(custom_metric)");
    });

    it("should handle multiple snapshots", () => {
      const state = OpenMetricsTablet.createInitialState();

      if (state.type === "openmetrics") {
        for (let i = 0; i < 5; i++) {
          state.data.snapshots.push({
            id: `snapshot-${i}`,
            name: `Snapshot ${i}`,
            createdAt: Date.now() + i * 1000,
            metrics: [
              {
                name: `metric_${i}`,
                labels: { index: String(i) },
                value: i * 10,
              },
            ],
          });
        }
      }

      const serialized = OpenMetricsTablet.serializeState(state);
      const deserialized = OpenMetricsTablet.deserializeState(serialized);

      expect(deserialized.data.snapshots).toHaveLength(5);
      expect(deserialized.data.snapshots[0].name).toBe("Snapshot 0");
      expect(deserialized.data.snapshots[4].name).toBe("Snapshot 4");
    });
  });

  describe("default sample metrics", () => {
    it("should include http_requests_total metrics", () => {
      const state = OpenMetricsTablet.createInitialState();

      expect(state.data.rawText).toContain("http_requests_total");
      expect(state.data.rawText).toContain('method="post"');
      expect(state.data.rawText).toContain('code="200"');
    });

    it("should include histogram metrics", () => {
      const state = OpenMetricsTablet.createInitialState();

      expect(state.data.rawText).toContain("http_request_duration_seconds");
      expect(state.data.rawText).toContain("_bucket");
      expect(state.data.rawText).toContain("_sum");
      expect(state.data.rawText).toContain("_count");
    });

    it("should include process metrics", () => {
      const state = OpenMetricsTablet.createInitialState();

      expect(state.data.rawText).toContain("process_cpu_seconds_total");
      expect(state.data.rawText).toContain("process_resident_memory_bytes");
    });

    it("should include proper metric documentation", () => {
      const state = OpenMetricsTablet.createInitialState();

      expect(state.data.rawText).toContain(
        "The total number of HTTP requests",
      );
      expect(state.data.rawText).toContain(
        "The HTTP request latencies in seconds",
      );
    });
  });
});

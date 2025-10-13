import {
  parseMetrics,
  formatMetricSample,
  formatMetrics,
} from "../MetricsParser";
import { MetricSample } from "../types";

describe("MetricsParser", () => {
  describe("parseMetrics", () => {
    it("should parse a simple counter metric", () => {
      const text = `# HELP http_requests_total The total number of HTTP requests.
# TYPE http_requests_total counter
http_requests_total{method="post",code="200"} 1027`;

      const result = parseMetrics(text);

      expect(result.metrics).toHaveLength(1);
      expect(result.metrics[0]).toEqual({
        name: "http_requests_total",
        labels: { method: "post", code: "200" },
        value: 1027,
        timestamp: undefined,
        type: "counter",
        help: "The total number of HTTP requests.",
      });
      expect(result.errors).toHaveLength(0);
    });

    it("should parse metrics with timestamps", () => {
      const text = `http_requests_total{method="post",code="200"} 1027 1719933920000`;

      const result = parseMetrics(text);

      expect(result.metrics).toHaveLength(1);
      expect(result.metrics[0].value).toBe(1027);
      expect(result.metrics[0].timestamp).toBe(1719933920000);
    });

    it("should parse metrics without labels", () => {
      const text = `process_cpu_seconds_total 29323.04`;

      const result = parseMetrics(text);

      expect(result.metrics).toHaveLength(1);
      expect(result.metrics[0]).toEqual({
        name: "process_cpu_seconds_total",
        labels: {},
        value: 29323.04,
        timestamp: undefined,
        type: undefined,
        help: undefined,
      });
    });

    it("should parse multiple metrics", () => {
      const text = `http_requests_total{method="post",code="200"} 1027
http_requests_total{method="post",code="500"} 45
http_requests_total{method="get",code="200"} 2500`;

      const result = parseMetrics(text);

      expect(result.metrics).toHaveLength(3);
      expect(result.metrics[0].value).toBe(1027);
      expect(result.metrics[1].value).toBe(45);
      expect(result.metrics[2].value).toBe(2500);
    });

    it("should parse histogram metrics", () => {
      const text = `# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.05"} 24054
http_request_duration_seconds_bucket{le="0.1"} 33444
http_request_duration_seconds_bucket{le="+Inf"} 144320
http_request_duration_seconds_sum 53423
http_request_duration_seconds_count 144320`;

      const result = parseMetrics(text);

      expect(result.metrics).toHaveLength(5);
      expect(result.metrics[0].name).toBe(
        "http_request_duration_seconds_bucket",
      );
      expect(result.metrics[0].labels.le).toBe("0.05");
      expect(result.metrics[3].name).toBe("http_request_duration_seconds_sum");
      expect(result.metrics[4].name).toBe(
        "http_request_duration_seconds_count",
      );
    });

    it("should handle scientific notation values", () => {
      const text = `metric_name 1.23e+10
metric_name2 4.56e-5`;

      const result = parseMetrics(text);

      expect(result.metrics).toHaveLength(2);
      expect(result.metrics[0].value).toBe(1.23e10);
      expect(result.metrics[1].value).toBe(4.56e-5);
    });

    it("should handle negative values", () => {
      const text = `temperature_celsius -15.5`;

      const result = parseMetrics(text);

      expect(result.metrics).toHaveLength(1);
      expect(result.metrics[0].value).toBe(-15.5);
    });

    it("should skip empty lines", () => {
      const text = `metric1 100

metric2 200

metric3 300`;

      const result = parseMetrics(text);

      expect(result.metrics).toHaveLength(3);
      expect(result.errors).toHaveLength(0);
    });

    it("should skip EOF marker", () => {
      const text = `metric1 100
# EOF`;

      const result = parseMetrics(text);

      expect(result.metrics).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
    });

    it("should skip comment lines", () => {
      const text = `# This is a comment
metric1 100
# Another comment
metric2 200`;

      const result = parseMetrics(text);

      expect(result.metrics).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    it("should track parse errors for invalid lines", () => {
      const text = `metric1 100
invalid line without value
metric2 200`;

      const result = parseMetrics(text);

      expect(result.metrics).toHaveLength(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].line).toBe(2);
      expect(result.errors[0].message).toBe("Invalid metric format");
    });

    it("should track errors for invalid label format", () => {
      const text = `metric{invalid} 100`;

      const result = parseMetrics(text);

      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should track errors for invalid values", () => {
      const text = `metric_name not_a_number`;

      const result = parseMetrics(text);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe("Invalid metric format");
    });

    it("should calculate correct statistics", () => {
      const text = `http_requests{method="GET",code="200"} 100
http_requests{method="POST",code="200"} 50
http_responses{method="GET",code="500"} 5`;

      const result = parseMetrics(text);

      expect(result.stats.totalMetrics).toBe(3);
      expect(result.stats.uniqueMetricNames).toBe(2);
      expect(result.stats.uniqueLabelNames).toBe(2); // method, code
      // totalLabels counts unique label pairs: GET+200, POST+200, GET+500, method:GET, method:POST, code:200, code:500
      // But the implementation counts unique "key=value" pairs
      // So we have: method=GET, method=POST, code=200, code=500 = 4 unique pairs
      expect(result.stats.totalLabels).toBe(4);
    });

    it("should group metrics by name in parsedMetrics", () => {
      const text = `http_requests{method="GET"} 100
http_requests{method="POST"} 50
http_responses{code="200"} 200`;

      const result = parseMetrics(text);

      expect(result.parsedMetrics).toHaveLength(2);
      const httpRequests = result.parsedMetrics.find(
        (m) => m.name === "http_requests",
      );
      const httpResponses = result.parsedMetrics.find(
        (m) => m.name === "http_responses",
      );

      expect(httpRequests?.samples).toHaveLength(2);
      expect(httpResponses?.samples).toHaveLength(1);
    });

    it("should handle empty input", () => {
      const result = parseMetrics("");

      expect(result.metrics).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(result.stats.totalMetrics).toBe(0);
    });

    it("should handle labels with special characters in values", () => {
      const text = `metric{path="/api/v1/users",status="OK"} 100`;

      const result = parseMetrics(text);

      expect(result.metrics).toHaveLength(1);
      expect(result.metrics[0].labels.path).toBe("/api/v1/users");
      expect(result.metrics[0].labels.status).toBe("OK");
    });

    it("should preserve HELP and TYPE metadata", () => {
      const text = `# HELP my_metric This is a helpful metric
# TYPE my_metric gauge
my_metric{label="value"} 42`;

      const result = parseMetrics(text);

      expect(result.metrics[0].help).toBe("This is a helpful metric");
      expect(result.metrics[0].type).toBe("gauge");
      expect(result.parsedMetrics[0].help).toBe("This is a helpful metric");
      expect(result.parsedMetrics[0].type).toBe("gauge");
    });

    it("should handle metrics with underscores and colons in names", () => {
      const text = `my_metric_name:rate5m 100
another_metric_123 200`;

      const result = parseMetrics(text);

      expect(result.metrics).toHaveLength(2);
      expect(result.metrics[0].name).toBe("my_metric_name:rate5m");
      expect(result.metrics[1].name).toBe("another_metric_123");
    });
  });

  describe("formatMetricSample", () => {
    it("should format a metric without labels", () => {
      const sample: MetricSample = {
        name: "simple_metric",
        labels: {},
        value: 42,
      };

      const result = formatMetricSample(sample);

      expect(result).toBe("simple_metric 42");
    });

    it("should format a metric with labels", () => {
      const sample: MetricSample = {
        name: "http_requests",
        labels: { method: "GET", code: "200" },
        value: 100,
      };

      const result = formatMetricSample(sample);

      expect(result).toContain("http_requests{");
      expect(result).toContain('method="GET"');
      expect(result).toContain('code="200"');
      expect(result).toContain("} 100");
    });

    it("should format a metric with timestamp", () => {
      const sample: MetricSample = {
        name: "metric_with_timestamp",
        labels: {},
        value: 42,
        timestamp: 1719933920000,
      };

      const result = formatMetricSample(sample);

      expect(result).toBe("metric_with_timestamp 42 1719933920000");
    });

    it("should format a metric with labels and timestamp", () => {
      const sample: MetricSample = {
        name: "complete_metric",
        labels: { label1: "value1" },
        value: 123.45,
        timestamp: 1719933920000,
      };

      const result = formatMetricSample(sample);

      expect(result).toBe(
        'complete_metric{label1="value1"} 123.45 1719933920000',
      );
    });

    it("should handle scientific notation values", () => {
      const sample: MetricSample = {
        name: "large_number",
        labels: {},
        value: 1.23e10,
      };

      const result = formatMetricSample(sample);

      expect(result).toContain("12300000000");
    });

    it("should handle negative values", () => {
      const sample: MetricSample = {
        name: "negative_metric",
        labels: {},
        value: -42.5,
      };

      const result = formatMetricSample(sample);

      expect(result).toBe("negative_metric -42.5");
    });
  });

  describe("formatMetrics", () => {
    it("should format multiple metrics", () => {
      const metrics: MetricSample[] = [
        { name: "metric1", labels: {}, value: 100 },
        { name: "metric2", labels: {}, value: 200 },
      ];

      const result = formatMetrics(metrics);

      expect(result).toContain("metric1 100");
      expect(result).toContain("metric2 200");
      expect(result).toContain("# EOF");
    });

    it("should include HELP and TYPE metadata", () => {
      const metrics: MetricSample[] = [
        {
          name: "my_metric",
          labels: {},
          value: 42,
          type: "gauge",
          help: "This is helpful",
        },
      ];

      const result = formatMetrics(metrics);

      expect(result).toContain("# HELP my_metric This is helpful");
      expect(result).toContain("# TYPE my_metric gauge");
      expect(result).toContain("my_metric 42");
    });

    it("should group metrics by name", () => {
      const metrics: MetricSample[] = [
        { name: "http_requests", labels: { method: "GET" }, value: 100 },
        { name: "http_requests", labels: { method: "POST" }, value: 50 },
        { name: "http_responses", labels: { code: "200" }, value: 200 },
      ];

      const result = formatMetrics(metrics);

      const lines = result.split("\n");
      const httpRequestsLines = lines.filter((l) =>
        l.startsWith("http_requests{"),
      );
      const httpResponsesLines = lines.filter((l) =>
        l.startsWith("http_responses{"),
      );

      expect(httpRequestsLines).toHaveLength(2);
      expect(httpResponsesLines).toHaveLength(1);
    });

    it("should add blank lines between metric groups", () => {
      const metrics: MetricSample[] = [
        { name: "metric1", labels: {}, value: 100 },
        { name: "metric2", labels: {}, value: 200 },
      ];

      const result = formatMetrics(metrics);
      const lines = result.split("\n");

      // Find blank lines (excluding the last one before EOF)
      const blankLines = lines.filter(
        (line, index) => line === "" && index < lines.length - 2,
      );
      expect(blankLines.length).toBeGreaterThan(0);
    });

    it("should handle empty metrics array", () => {
      const result = formatMetrics([]);

      expect(result).toBe("# EOF");
    });

    it("should preserve metadata only for the first sample of each group", () => {
      const metrics: MetricSample[] = [
        {
          name: "my_metric",
          labels: { label: "a" },
          value: 1,
          type: "counter",
          help: "Help text",
        },
        {
          name: "my_metric",
          labels: { label: "b" },
          value: 2,
          type: "counter",
          help: "Help text",
        },
      ];

      const result = formatMetrics(metrics);

      const helpLines = result.split("\n").filter((l) => l.startsWith("# HELP"));
      const typeLines = result.split("\n").filter((l) => l.startsWith("# TYPE"));

      expect(helpLines).toHaveLength(1);
      expect(typeLines).toHaveLength(1);
    });

    it("should round-trip parse and format", () => {
      const originalText = `# HELP http_requests Total HTTP requests
# TYPE http_requests counter
http_requests{method="GET",code="200"} 100
http_requests{method="POST",code="200"} 50

# EOF`;

      const parsed = parseMetrics(originalText);
      const formatted = formatMetrics(parsed.metrics);
      const reparsed = parseMetrics(formatted);

      expect(reparsed.metrics).toHaveLength(parsed.metrics.length);
      expect(reparsed.metrics[0].name).toBe(parsed.metrics[0].name);
      expect(reparsed.metrics[0].value).toBe(parsed.metrics[0].value);
      expect(reparsed.metrics[0].labels).toEqual(parsed.metrics[0].labels);
    });
  });

  describe("edge cases", () => {
    it("should handle Windows line endings", () => {
      const text = "metric1 100\r\nmetric2 200\r\n";

      const result = parseMetrics(text);

      expect(result.metrics).toHaveLength(2);
    });

    it("should handle mixed line endings", () => {
      const text = "metric1 100\nmetric2 200\r\nmetric3 300";

      const result = parseMetrics(text);

      expect(result.metrics).toHaveLength(3);
    });

    it("should handle metrics with many labels", () => {
      const text = `metric{a="1",b="2",c="3",d="4",e="5",f="6"} 100`;

      const result = parseMetrics(text);

      expect(result.metrics).toHaveLength(1);
      expect(Object.keys(result.metrics[0].labels)).toHaveLength(6);
    });

    it("should handle very large values", () => {
      const text = `large_metric 999999999999999`;

      const result = parseMetrics(text);

      expect(result.metrics).toHaveLength(1);
      expect(result.metrics[0].value).toBe(999999999999999);
    });

    it("should handle very small decimal values", () => {
      const text = `small_metric 0.000000001`;

      const result = parseMetrics(text);

      expect(result.metrics).toHaveLength(1);
      expect(result.metrics[0].value).toBe(0.000000001);
    });
  });
});

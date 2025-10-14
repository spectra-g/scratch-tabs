import { executeQuery } from "../QueryEngine";
import { MetricSample } from "../types";

describe("QueryEngine", () => {
  const sampleMetrics: MetricSample[] = [
    {
      name: "http_requests",
      labels: { method: "GET", code: "200" },
      value: 100,
    },
    {
      name: "http_requests",
      labels: { method: "POST", code: "200" },
      value: 50,
    },
    {
      name: "http_requests",
      labels: { method: "GET", code: "500" },
      value: 5,
    },
    {
      name: "http_requests",
      labels: { method: "POST", code: "500" },
      value: 2,
    },
    { name: "http_responses", labels: { code: "200" }, value: 150 },
    { name: "http_responses", labels: { code: "500" }, value: 7 },
    { name: "cpu_usage", labels: { core: "0" }, value: 45.5 },
    { name: "cpu_usage", labels: { core: "1" }, value: 62.3 },
  ];

  describe("basic metric queries", () => {
    it("should query all samples of a metric", () => {
      const result = executeQuery(sampleMetrics, "http_requests");

      expect(result.metric).toBe("http_requests");
      expect(result.values).toHaveLength(4);
      expect(result.groupedBy).toEqual([]);
    });

    it("should query a metric with specific label", () => {
      const result = executeQuery(
        sampleMetrics,
        'http_requests{method="GET"}',
      );

      expect(result.metric).toBe("http_requests");
      expect(result.values).toHaveLength(2);
      expect(result.values[0].labels.method).toBe("GET");
      expect(result.values[1].labels.method).toBe("GET");
    });

    it("should query a metric with multiple label filters", () => {
      const result = executeQuery(
        sampleMetrics,
        'http_requests{method="GET",code="200"}',
      );

      expect(result.metric).toBe("http_requests");
      expect(result.values).toHaveLength(1);
      expect(result.values[0].labels).toEqual({ method: "GET", code: "200" });
      expect(result.values[0].value).toBe(100);
    });

    it("should return empty result for non-existent metric", () => {
      const result = executeQuery(sampleMetrics, "non_existent_metric");

      expect(result.metric).toBe("non_existent_metric");
      expect(result.values).toHaveLength(0);
    });

    it("should return empty result when label filter doesn't match", () => {
      const result = executeQuery(
        sampleMetrics,
        'http_requests{method="DELETE"}',
      );

      expect(result.metric).toBe("http_requests");
      expect(result.values).toHaveLength(0);
    });

    it("should handle metrics without labels", () => {
      const metricsWithoutLabels: MetricSample[] = [
        { name: "simple_metric", labels: {}, value: 42 },
      ];

      const result = executeQuery(metricsWithoutLabels, "simple_metric");

      expect(result.values).toHaveLength(1);
      expect(result.values[0].value).toBe(42);
    });
  });

  describe("label filter operators", () => {
    it("should support equality operator (=)", () => {
      const result = executeQuery(
        sampleMetrics,
        'http_requests{code="200"}',
      );

      expect(result.values).toHaveLength(2);
      expect(result.values.every((v) => v.labels.code === "200")).toBe(true);
    });

    it("should support inequality operator (!=)", () => {
      const result = executeQuery(
        sampleMetrics,
        'http_requests{code!="500"}',
      );

      expect(result.values).toHaveLength(2);
      expect(result.values.every((v) => v.labels.code !== "500")).toBe(true);
    });

    it("should support regex match operator (=~)", () => {
      const result = executeQuery(sampleMetrics, 'http_requests{code=~"2.."}');

      expect(result.values).toHaveLength(2);
      expect(result.values.every((v) => v.labels.code === "200")).toBe(true);
    });

    it("should support regex non-match operator (!~)", () => {
      const result = executeQuery(sampleMetrics, 'http_requests{code!~"5.."}');

      expect(result.values).toHaveLength(2);
      expect(result.values.every((v) => v.labels.code === "200")).toBe(true);
    });

    it("should combine multiple operators", () => {
      const result = executeQuery(
        sampleMetrics,
        'http_requests{method="GET",code!="500"}',
      );

      expect(result.values).toHaveLength(1);
      expect(result.values[0].labels).toEqual({ method: "GET", code: "200" });
    });
  });

  describe("aggregation functions", () => {
    describe("sum", () => {
      it("should sum all values of a metric", () => {
        const result = executeQuery(sampleMetrics, "sum(http_requests)");

        expect(result.metric).toBe("sum(http_requests)");
        expect(result.values).toHaveLength(1);
        expect(result.values[0].value).toBe(157); // 100 + 50 + 5 + 2
        expect(result.values[0].labels).toEqual({});
      });

      it("should sum filtered metric values", () => {
        const result = executeQuery(
          sampleMetrics,
          'sum(http_requests{code="200"})',
        );

        expect(result.values[0].value).toBe(150); // 100 + 50
      });

      it("should return empty for non-existent metric", () => {
        const result = executeQuery(sampleMetrics, "sum(non_existent)");

        expect(result.values).toHaveLength(0);
      });
    });

    describe("avg", () => {
      it("should calculate average of all values", () => {
        const result = executeQuery(sampleMetrics, "avg(http_requests)");

        expect(result.metric).toBe("avg(http_requests)");
        expect(result.values).toHaveLength(1);
        expect(result.values[0].value).toBe(39.25); // (100 + 50 + 5 + 2) / 4
      });

      it("should calculate average of filtered values", () => {
        const result = executeQuery(
          sampleMetrics,
          'avg(http_requests{code="200"})',
        );

        expect(result.values[0].value).toBe(75); // (100 + 50) / 2
      });
    });

    describe("count", () => {
      it("should count all metric samples", () => {
        const result = executeQuery(sampleMetrics, "count(http_requests)");

        expect(result.metric).toBe("count(http_requests)");
        expect(result.values).toHaveLength(1);
        expect(result.values[0].value).toBe(4);
      });

      it("should count filtered metric samples", () => {
        const result = executeQuery(
          sampleMetrics,
          'count(http_requests{method="GET"})',
        );

        expect(result.values[0].value).toBe(2);
      });
    });

    describe("min", () => {
      it("should find minimum value", () => {
        const result = executeQuery(sampleMetrics, "min(http_requests)");

        expect(result.metric).toBe("min(http_requests)");
        expect(result.values).toHaveLength(1);
        expect(result.values[0].value).toBe(2);
      });

      it("should find minimum of filtered values", () => {
        const result = executeQuery(
          sampleMetrics,
          'min(http_requests{code="200"})',
        );

        expect(result.values[0].value).toBe(50);
      });

      it("should handle decimal values", () => {
        const result = executeQuery(sampleMetrics, "min(cpu_usage)");

        expect(result.values[0].value).toBe(45.5);
      });
    });

    describe("max", () => {
      it("should find maximum value", () => {
        const result = executeQuery(sampleMetrics, "max(http_requests)");

        expect(result.metric).toBe("max(http_requests)");
        expect(result.values).toHaveLength(1);
        expect(result.values[0].value).toBe(100);
      });

      it("should find maximum of filtered values", () => {
        const result = executeQuery(
          sampleMetrics,
          'max(http_requests{code="500"})',
        );

        expect(result.values[0].value).toBe(5);
      });

      it("should handle decimal values", () => {
        const result = executeQuery(sampleMetrics, "max(cpu_usage)");

        expect(result.values[0].value).toBe(62.3);
      });
    });
  });

  describe("error handling", () => {
    it("should throw error for invalid query format", () => {
      expect(() => {
        executeQuery(sampleMetrics, "invalid query format!");
      }).toThrow("Invalid query format");
    });

    it("should throw error for invalid label selector", () => {
      expect(() => {
        executeQuery(sampleMetrics, "http_requests{invalid}");
      }).toThrow();
    });

    it("should throw error for unsupported aggregation function", () => {
      expect(() => {
        executeQuery(sampleMetrics, "unsupported(http_requests)");
      }).toThrow(); // Will throw "Invalid query format" since it's not recognized as a valid aggregation
    });

    it("should throw error for malformed label filter", () => {
      expect(() => {
        executeQuery(sampleMetrics, "http_requests{method}");
      }).toThrow();
    });
  });

  describe("whitespace handling", () => {
    it("should handle queries with leading/trailing whitespace", () => {
      const result = executeQuery(sampleMetrics, "  http_requests  ");

      expect(result.metric).toBe("http_requests");
      expect(result.values).toHaveLength(4);
    });

    it("should handle aggregation with whitespace", () => {
      const result = executeQuery(sampleMetrics, " sum( http_requests ) ");

      expect(result.values[0].value).toBe(157);
    });

    it("should handle label filters with whitespace", () => {
      const result = executeQuery(
        sampleMetrics,
        'http_requests{ method = "GET" }',
      );

      expect(result.values).toHaveLength(2);
    });
  });

  describe("complex queries", () => {
    it("should handle query with regex and inequality", () => {
      const result = executeQuery(
        sampleMetrics,
        'http_requests{method=~"GET|POST",code!="500"}',
      );

      expect(result.values).toHaveLength(2);
      expect(result.values.every((v) => v.labels.code === "200")).toBe(true);
    });

    it("should handle aggregation with complex filters", () => {
      const result = executeQuery(
        sampleMetrics,
        'sum(http_requests{method=~".*ET"})',
      );

      expect(result.values[0].value).toBe(105); // 100 + 5
    });

    it("should handle empty label selector", () => {
      const result = executeQuery(sampleMetrics, "http_requests{}");

      expect(result.values).toHaveLength(4);
    });
  });

  describe("metric name validation", () => {
    it("should accept metric names with underscores", () => {
      const result = executeQuery(sampleMetrics, "http_requests");

      expect(result.metric).toBe("http_requests");
    });

    it("should accept metric names with colons", () => {
      const metricsWithColons: MetricSample[] = [
        { name: "metric:rate5m", labels: {}, value: 42 },
      ];

      const result = executeQuery(metricsWithColons, "metric:rate5m");

      expect(result.metric).toBe("metric:rate5m");
      expect(result.values).toHaveLength(1);
    });

    it("should accept metric names with numbers", () => {
      const metricsWithNumbers: MetricSample[] = [
        { name: "metric123", labels: {}, value: 42 },
      ];

      const result = executeQuery(metricsWithNumbers, "metric123");

      expect(result.metric).toBe("metric123");
      expect(result.values).toHaveLength(1);
    });
  });

  describe("edge cases", () => {
    it("should handle empty metrics array", () => {
      const result = executeQuery([], "any_metric");

      expect(result.values).toHaveLength(0);
    });

    it("should handle single metric", () => {
      const singleMetric: MetricSample[] = [
        { name: "single", labels: {}, value: 42 },
      ];

      const result = executeQuery(singleMetric, "single");

      expect(result.values).toHaveLength(1);
      expect(result.values[0].value).toBe(42);
    });

    it("should handle metrics with zero values", () => {
      const zeroMetrics: MetricSample[] = [
        { name: "zero_metric", labels: {}, value: 0 },
      ];

      const result = executeQuery(zeroMetrics, "sum(zero_metric)");

      expect(result.values[0].value).toBe(0);
    });

    it("should handle negative values in aggregations", () => {
      const negativeMetrics: MetricSample[] = [
        { name: "temp", labels: {}, value: -10 },
        { name: "temp", labels: {}, value: 5 },
        { name: "temp", labels: {}, value: -5 },
      ];

      const sumResult = executeQuery(negativeMetrics, "sum(temp)");
      const avgResult = executeQuery(negativeMetrics, "avg(temp)");
      const minResult = executeQuery(negativeMetrics, "min(temp)");
      const maxResult = executeQuery(negativeMetrics, "max(temp)");

      expect(sumResult.values[0].value).toBe(-10);
      expect(avgResult.values[0].value).toBeCloseTo(-3.33, 2);
      expect(minResult.values[0].value).toBe(-10);
      expect(maxResult.values[0].value).toBe(5);
    });

    it("should handle very large numbers", () => {
      const largeMetrics: MetricSample[] = [
        { name: "large", labels: {}, value: 1e15 },
        { name: "large", labels: {}, value: 2e15 },
      ];

      const result = executeQuery(largeMetrics, "sum(large)");

      expect(result.values[0].value).toBe(3e15);
    });

    it("should handle metrics with many labels", () => {
      const complexMetrics: MetricSample[] = [
        {
          name: "complex",
          labels: { a: "1", b: "2", c: "3", d: "4", e: "5" },
          value: 100,
        },
      ];

      const result = executeQuery(
        complexMetrics,
        'complex{a="1",b="2",c="3",d="4",e="5"}',
      );

      expect(result.values).toHaveLength(1);
      expect(result.values[0].value).toBe(100);
    });
  });

  describe("label filter edge cases", () => {
    it("should handle label values with special characters", () => {
      const specialMetrics: MetricSample[] = [
        {
          name: "api_calls",
          labels: { path: "/api/v1/users", method: "GET" },
          value: 100,
        },
      ];

      const result = executeQuery(
        specialMetrics,
        'api_calls{path="/api/v1/users"}',
      );

      expect(result.values).toHaveLength(1);
    });

    it("should handle label values with spaces (if properly quoted)", () => {
      const spacedMetrics: MetricSample[] = [
        {
          name: "messages",
          labels: { content: "hello world" },
          value: 42,
        },
      ];

      const result = executeQuery(spacedMetrics, 'messages{content="hello world"}');

      expect(result.values).toHaveLength(1);
    });

    it("should handle empty label values", () => {
      const emptyLabelMetrics: MetricSample[] = [
        { name: "empty", labels: { key: "" }, value: 42 },
      ];

      const result = executeQuery(emptyLabelMetrics, 'empty{key=""}');

      expect(result.values).toHaveLength(1);
    });
  });

  describe("aggregation with no matches", () => {
    it("should return empty result for sum with no matches", () => {
      const result = executeQuery(sampleMetrics, "sum(non_existent)");

      expect(result.values).toHaveLength(0);
    });

    it("should return empty result for avg with no matches", () => {
      const result = executeQuery(sampleMetrics, "avg(non_existent)");

      expect(result.values).toHaveLength(0);
    });

    it("should return empty result for count with no matches", () => {
      const result = executeQuery(sampleMetrics, "count(non_existent)");

      expect(result.values).toHaveLength(0);
    });
  });
});

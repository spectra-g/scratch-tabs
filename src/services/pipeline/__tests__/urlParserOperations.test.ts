import { operationRegistry } from "../OperationRegistry";
import { runPipeline, createStep, createPipeline } from "../PipelineRunner";
import "../init"; // Ensure common categories are registered
import "../../../tablets/urlparser/pipelineOperations"; // Ensure URL parser operations are registered

// Mock crypto.randomUUID for test environment
Object.defineProperty(global, "crypto", {
  value: {
    randomUUID: () => "test-uuid-" + Math.random().toString(36).substring(7),
  },
  writable: true,
});

describe("URL Parser Pipeline Operations", () => {
  describe("Registration", () => {
    it("should register all URL operations", () => {
      const operations = [
        "url.encode",
        "url.decode",
        "url.parse",
        "url.extract-host",
        "url.extract-path",
        "url.extract-query",
        "url.to-curl",
        "url.compose",
      ];

      operations.forEach((id) => {
        const op = operationRegistry.getById(id);
        expect(op).toBeDefined();
        expect(op?.source).toBe("tablet");
      });
    });

    it("should have encoding category for encode/decode operations", () => {
      const encode = operationRegistry.getById("url.encode");
      const decode = operationRegistry.getById("url.decode");
      expect(encode?.categories).toContain("encoding");
      expect(decode?.categories).toContain("encoding");
    });

    it("should have parsing category for extraction operations", () => {
      const parse = operationRegistry.getById("url.parse");
      const extractHost = operationRegistry.getById("url.extract-host");
      expect(parse?.categories).toContain("parsing");
      expect(extractHost?.categories).toContain("parsing");
    });
  });

  describe("url.encode", () => {
    it("should encode text using component mode by default", async () => {
      const step = createStep("url.encode", {});
      const pipeline = createPipeline();
      pipeline.steps = [step];

      const result = await runPipeline("hello world", pipeline);
      expect(result.output).toBe("hello%20world");
    });

    it("should encode special characters", async () => {
      const step = createStep("url.encode", { mode: "component" });
      const pipeline = createPipeline();
      pipeline.steps = [step];

      const result = await runPipeline("hello&world=test", pipeline);
      expect(result.output).toBe("hello%26world%3Dtest");
    });

    it("should use URI mode when specified", async () => {
      const step = createStep("url.encode", { mode: "uri" });
      const pipeline = createPipeline();
      pipeline.steps = [step];

      // encodeURI doesn't encode certain characters like :/?#
      const result = await runPipeline(
        "https://example.com/path?q=hello world",
        pipeline
      );
      expect(result.output).toBe("https://example.com/path?q=hello%20world");
    });

    it("should handle empty input", async () => {
      const step = createStep("url.encode", {});
      const pipeline = createPipeline();
      pipeline.steps = [step];

      const result = await runPipeline("", pipeline);
      expect(result.output).toBe("");
    });

    it("should work in line-by-line mode", async () => {
      const step = createStep("url.encode", {});
      step.applyPerLine = true;
      const pipeline = createPipeline();
      pipeline.steps = [step];

      const result = await runPipeline("hello world\nfoo bar", pipeline);
      expect(result.output).toBe("hello%20world\nfoo%20bar");
    });
  });

  describe("url.decode", () => {
    it("should decode URL-encoded text", async () => {
      const step = createStep("url.decode", {});
      const pipeline = createPipeline();
      pipeline.steps = [step];

      const result = await runPipeline("hello%20world", pipeline);
      expect(result.output).toBe("hello world");
    });

    it("should decode special characters", async () => {
      const step = createStep("url.decode", { mode: "component" });
      const pipeline = createPipeline();
      pipeline.steps = [step];

      const result = await runPipeline("hello%26world%3Dtest", pipeline);
      expect(result.output).toBe("hello&world=test");
    });

    it("should use URI mode when specified", async () => {
      const step = createStep("url.decode", { mode: "uri" });
      const pipeline = createPipeline();
      pipeline.steps = [step];

      const result = await runPipeline(
        "https://example.com/path?q=hello%20world",
        pipeline
      );
      expect(result.output).toBe("https://example.com/path?q=hello world");
    });

    it("should handle empty input", async () => {
      const step = createStep("url.decode", {});
      const pipeline = createPipeline();
      pipeline.steps = [step];

      const result = await runPipeline("", pipeline);
      expect(result.output).toBe("");
    });

    it("should throw error for invalid encoding", async () => {
      const step = createStep("url.decode", {});
      const pipeline = createPipeline();
      pipeline.steps = [step];

      const result = await runPipeline("%E0%A4%A", pipeline);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to decode URL");
    });
  });

  describe("url.parse", () => {
    it("should parse URL into JSON components", async () => {
      const step = createStep("url.parse", { format: "json" });
      const pipeline = createPipeline();
      pipeline.steps = [step];

      const result = await runPipeline(
        "https://user:pass@example.com:8080/path?q=test#section",
        pipeline
      );
      const parsed = JSON.parse(result.output);

      expect(parsed.scheme).toBe("https");
      expect(parsed.username).toBe("user");
      expect(parsed.password).toBe("pass");
      expect(parsed.host).toBe("example.com");
      expect(parsed.port).toBe("8080");
      expect(parsed.path).toBe("/path");
      expect(parsed.query).toBe("q=test");
      expect(parsed.fragment).toBe("section");
      expect(parsed.queryParams).toEqual({ q: "test" });
    });

    it("should output pretty-printed JSON when requested", async () => {
      const step = createStep("url.parse", { format: "json-pretty" });
      const pipeline = createPipeline();
      pipeline.steps = [step];

      const result = await runPipeline("https://example.com", pipeline);
      expect(result.output).toContain("\n");
      expect(result.output).toContain("  ");
    });

    it("should include warnings when requested", async () => {
      const step = createStep("url.parse", {
        format: "json",
        includeWarnings: true,
      });
      const pipeline = createPipeline();
      pipeline.steps = [step];

      const result = await runPipeline("example.com", pipeline);
      const parsed = JSON.parse(result.output);

      expect(parsed).toHaveProperty("components");
      expect(parsed).toHaveProperty("warnings");
      expect(Array.isArray(parsed.warnings)).toBe(true);
    });

    it("should handle empty input", async () => {
      const step = createStep("url.parse", {});
      const pipeline = createPipeline();
      pipeline.steps = [step];

      const result = await runPipeline("", pipeline);
      expect(result.output).toBe("{}");
    });
  });

  describe("url.extract-host", () => {
    it("should extract hostname from URL", async () => {
      const step = createStep("url.extract-host", {});
      const pipeline = createPipeline();
      pipeline.steps = [step];

      const result = await runPipeline("https://example.com/path", pipeline);
      expect(result.output).toBe("example.com");
    });

    it("should include port when requested", async () => {
      const step = createStep("url.extract-host", { includePort: true });
      const pipeline = createPipeline();
      pipeline.steps = [step];

      const result = await runPipeline(
        "https://example.com:8080/path",
        pipeline
      );
      expect(result.output).toBe("example.com:8080");
    });

    it("should include scheme when requested", async () => {
      const step = createStep("url.extract-host", { includeScheme: true });
      const pipeline = createPipeline();
      pipeline.steps = [step];

      const result = await runPipeline("https://example.com/path", pipeline);
      expect(result.output).toBe("https://example.com");
    });

    it("should include both scheme and port", async () => {
      const step = createStep("url.extract-host", {
        includeScheme: true,
        includePort: true,
      });
      const pipeline = createPipeline();
      pipeline.steps = [step];

      const result = await runPipeline(
        "https://example.com:8080/path",
        pipeline
      );
      expect(result.output).toBe("https://example.com:8080");
    });

    it("should work in line-by-line mode", async () => {
      const step = createStep("url.extract-host", {});
      step.applyPerLine = true;
      const pipeline = createPipeline();
      pipeline.steps = [step];

      const result = await runPipeline(
        "https://example.com/path\nhttps://other.com/page",
        pipeline
      );
      expect(result.output).toBe("example.com\nother.com");
    });

    it("should handle empty input", async () => {
      const step = createStep("url.extract-host", {});
      const pipeline = createPipeline();
      pipeline.steps = [step];

      const result = await runPipeline("", pipeline);
      expect(result.output).toBe("");
    });
  });

  describe("url.extract-path", () => {
    it("should extract path from URL", async () => {
      const step = createStep("url.extract-path", {});
      const pipeline = createPipeline();
      pipeline.steps = [step];

      const result = await runPipeline(
        "https://example.com/api/v1/users",
        pipeline
      );
      expect(result.output).toBe("/api/v1/users");
    });

    it("should include query when requested", async () => {
      const step = createStep("url.extract-path", { includeQuery: true });
      const pipeline = createPipeline();
      pipeline.steps = [step];

      const result = await runPipeline(
        "https://example.com/path?q=test",
        pipeline
      );
      expect(result.output).toBe("/path?q=test");
    });

    it("should include fragment when requested", async () => {
      const step = createStep("url.extract-path", { includeFragment: true });
      const pipeline = createPipeline();
      pipeline.steps = [step];

      const result = await runPipeline(
        "https://example.com/path#section",
        pipeline
      );
      expect(result.output).toBe("/path#section");
    });

    it("should include both query and fragment", async () => {
      const step = createStep("url.extract-path", {
        includeQuery: true,
        includeFragment: true,
      });
      const pipeline = createPipeline();
      pipeline.steps = [step];

      const result = await runPipeline(
        "https://example.com/path?q=test#section",
        pipeline
      );
      expect(result.output).toBe("/path?q=test#section");
    });

    it("should handle empty input", async () => {
      const step = createStep("url.extract-path", {});
      const pipeline = createPipeline();
      pipeline.steps = [step];

      const result = await runPipeline("", pipeline);
      expect(result.output).toBe("");
    });
  });

  describe("url.extract-query", () => {
    it("should extract query params as JSON", async () => {
      const step = createStep("url.extract-query", { format: "json" });
      const pipeline = createPipeline();
      pipeline.steps = [step];

      const result = await runPipeline(
        "https://example.com/path?foo=bar&baz=qux",
        pipeline
      );
      expect(JSON.parse(result.output)).toEqual({ foo: "bar", baz: "qux" });
    });

    it("should output pretty-printed JSON", async () => {
      const step = createStep("url.extract-query", { format: "json-pretty" });
      const pipeline = createPipeline();
      pipeline.steps = [step];

      const result = await runPipeline(
        "https://example.com?foo=bar",
        pipeline
      );
      expect(result.output).toContain("\n");
    });

    it("should output raw query string", async () => {
      const step = createStep("url.extract-query", { format: "raw" });
      const pipeline = createPipeline();
      pipeline.steps = [step];

      const result = await runPipeline(
        "https://example.com/path?foo=bar&baz=qux",
        pipeline
      );
      expect(result.output).toBe("foo=bar&baz=qux");
    });

    it("should output one param per line", async () => {
      const step = createStep("url.extract-query", { format: "lines" });
      const pipeline = createPipeline();
      pipeline.steps = [step];

      const result = await runPipeline(
        "https://example.com?foo=bar&baz=qux",
        pipeline
      );
      expect(result.output).toBe("foo=bar\nbaz=qux");
    });

    it("should handle URL without query params", async () => {
      const step = createStep("url.extract-query", { format: "json" });
      const pipeline = createPipeline();
      pipeline.steps = [step];

      const result = await runPipeline("https://example.com/path", pipeline);
      expect(JSON.parse(result.output)).toEqual({});
    });

    it("should handle empty input", async () => {
      const step = createStep("url.extract-query", {});
      const pipeline = createPipeline();
      pipeline.steps = [step];

      const result = await runPipeline("", pipeline);
      expect(result.output).toBe("");
    });
  });

  describe("url.to-curl", () => {
    it("should convert URL to curl command", async () => {
      const step = createStep("url.to-curl", {});
      const pipeline = createPipeline();
      pipeline.steps = [step];

      const result = await runPipeline("https://example.com/api", pipeline);
      expect(result.output).toContain('curl "https://example.com/api"');
      expect(result.output).toContain("-H");
      expect(result.output).toContain("User-Agent");
    });

    it("should include basic auth for URLs with credentials", async () => {
      const step = createStep("url.to-curl", {});
      const pipeline = createPipeline();
      pipeline.steps = [step];

      const result = await runPipeline(
        "https://user:pass@example.com/api",
        pipeline
      );
      expect(result.output).toContain('-u "user:pass"');
    });

    it("should handle empty input", async () => {
      const step = createStep("url.to-curl", {});
      const pipeline = createPipeline();
      pipeline.steps = [step];

      const result = await runPipeline("", pipeline);
      expect(result.output).toBe("curl");
    });
  });

  describe("url.compose", () => {
    it("should compose URL from JSON components", async () => {
      const step = createStep("url.compose", {});
      const pipeline = createPipeline();
      pipeline.steps = [step];

      const input = JSON.stringify({
        scheme: "https",
        host: "example.com",
        path: "/api/v1",
        query: "page=1",
      });

      const result = await runPipeline(input, pipeline);
      expect(result.output).toBe("https://example.com/api/v1?page=1");
    });

    it("should handle URL with all components", async () => {
      const step = createStep("url.compose", {});
      const pipeline = createPipeline();
      pipeline.steps = [step];

      const input = JSON.stringify({
        scheme: "https",
        username: "user",
        password: "pass",
        host: "example.com",
        port: "8080",
        path: "/path",
        query: "q=test",
        fragment: "section",
      });

      const result = await runPipeline(input, pipeline);
      expect(result.output).toContain("https://");
      expect(result.output).toContain("example.com");
      expect(result.output).toContain(":8080");
      expect(result.output).toContain("/path");
      expect(result.output).toContain("?q=test");
      expect(result.output).toContain("#section");
    });

    it("should throw error for invalid JSON", async () => {
      const step = createStep("url.compose", {});
      const pipeline = createPipeline();
      pipeline.steps = [step];

      const result = await runPipeline("not valid json", pipeline);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid JSON input");
    });

    it("should handle empty input", async () => {
      const step = createStep("url.compose", {});
      const pipeline = createPipeline();
      pipeline.steps = [step];

      const result = await runPipeline("", pipeline);
      expect(result.output).toBe("");
    });
  });

  describe("Pipeline Integration", () => {
    it("should chain encode and decode operations", async () => {
      const encode = createStep("url.encode", {});
      const decode = createStep("url.decode", {});
      const pipeline = createPipeline();
      pipeline.steps = [encode, decode];

      const input = "hello world & special=chars";
      const result = await runPipeline(input, pipeline);
      expect(result.output).toBe(input);
    });

    it("should chain parse and compose to roundtrip a URL", async () => {
      const parse = createStep("url.parse", { format: "json" });
      const compose = createStep("url.compose", {});
      const pipeline = createPipeline();
      pipeline.steps = [parse, compose];

      const input = "https://example.com/path?q=test";
      const result = await runPipeline(input, pipeline);
      expect(result.output).toBe(input);
    });

    it("should extract host from multiple URLs line by line", async () => {
      const extractHost = createStep("url.extract-host", {});
      extractHost.applyPerLine = true;
      const pipeline = createPipeline();
      pipeline.steps = [extractHost];

      const input = [
        "https://google.com/search?q=test",
        "https://github.com/user/repo",
        "https://example.org:8080/api",
      ].join("\n");

      const result = await runPipeline(input, pipeline);
      expect(result.output).toBe("google.com\ngithub.com\nexample.org");
    });
  });
});

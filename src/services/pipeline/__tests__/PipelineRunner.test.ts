import { describe, it, expect, beforeEach } from "@jest/globals";
import { operationRegistry } from "../OperationRegistry";
import {
  runPipeline,
  runSingleOperation,
  validatePipeline,
  createStep,
  createPipeline,
} from "../PipelineRunner";
import { Pipeline, PipelineStep, OperationDefinition } from "../types";

describe("PipelineRunner", () => {
  beforeEach(() => {
    // Clear the registry before each test
    operationRegistry.clear();

    // Register test operations
    const testOperations: OperationDefinition[] = [
      {
        id: "test.uppercase",
        name: "Uppercase",
        description: "Convert to uppercase",
        categories: ["test"],
        parameters: [],
        execute: (input) => input.toUpperCase(),
      },
      {
        id: "test.lowercase",
        name: "Lowercase",
        description: "Convert to lowercase",
        categories: ["test"],
        parameters: [],
        execute: (input) => input.toLowerCase(),
      },
      {
        id: "test.trim",
        name: "Trim",
        description: "Trim whitespace",
        categories: ["test"],
        parameters: [],
        execute: (input) => input.trim(),
      },
      {
        id: "test.prefix",
        name: "Add Prefix",
        description: "Add prefix to input",
        categories: ["test"],
        parameters: [
          {
            name: "prefix",
            label: "Prefix",
            type: "string",
            default: "",
          },
        ],
        execute: (input, params) => `${params.prefix || ""}${input}`,
      },
      {
        id: "test.suffix",
        name: "Add Suffix",
        description: "Add suffix to input",
        categories: ["test"],
        parameters: [
          {
            name: "suffix",
            label: "Suffix",
            type: "string",
            default: "",
          },
        ],
        execute: (input, params) => `${input}${params.suffix || ""}`,
      },
      {
        id: "test.error",
        name: "Error Operation",
        description: "Always throws an error",
        categories: ["test"],
        parameters: [],
        execute: () => {
          throw new Error("Intentional test error");
        },
      },
      {
        id: "test.async",
        name: "Async Operation",
        description: "Async operation that delays",
        categories: ["test"],
        parameters: [],
        execute: async (input) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return input.split("").reverse().join("");
        },
      },
    ];

    testOperations.forEach((op) => operationRegistry.register(op));
  });

  describe("runPipeline", () => {
    it("should execute a single step pipeline", async () => {
      const pipeline: Pipeline = {
        id: "test-pipeline",
        name: "Test Pipeline",
        steps: [
          {
            id: "step1",
            operationId: "test.uppercase",
            params: {},
            enabled: true,
          },
        ],
      };

      const result = await runPipeline("hello world", pipeline);

      expect(result.success).toBe(true);
      expect(result.output).toBe("HELLO WORLD");
      expect(result.stepResults).toHaveLength(1);
      expect(result.stepResults[0].skipped).toBe(false);
    });

    it("should execute multi-step pipeline in order", async () => {
      const pipeline: Pipeline = {
        id: "test-pipeline",
        name: "Test Pipeline",
        steps: [
          {
            id: "step1",
            operationId: "test.trim",
            params: {},
            enabled: true,
          },
          {
            id: "step2",
            operationId: "test.uppercase",
            params: {},
            enabled: true,
          },
          {
            id: "step3",
            operationId: "test.prefix",
            params: { prefix: ">>> " },
            enabled: true,
          },
        ],
      };

      const result = await runPipeline("  hello world  ", pipeline);

      expect(result.success).toBe(true);
      expect(result.output).toBe(">>> HELLO WORLD");
      expect(result.stepResults).toHaveLength(3);
    });

    it("should skip disabled steps", async () => {
      const pipeline: Pipeline = {
        id: "test-pipeline",
        name: "Test Pipeline",
        steps: [
          {
            id: "step1",
            operationId: "test.uppercase",
            params: {},
            enabled: true,
          },
          {
            id: "step2",
            operationId: "test.lowercase",
            params: {},
            enabled: false, // Disabled
          },
        ],
      };

      const result = await runPipeline("Hello World", pipeline);

      expect(result.success).toBe(true);
      expect(result.output).toBe("HELLO WORLD"); // Lowercase was skipped
      expect(result.stepResults[1].skipped).toBe(true);
    });

    it("should handle operation parameters", async () => {
      const pipeline: Pipeline = {
        id: "test-pipeline",
        name: "Test Pipeline",
        steps: [
          {
            id: "step1",
            operationId: "test.prefix",
            params: { prefix: "Hello, " },
            enabled: true,
          },
          {
            id: "step2",
            operationId: "test.suffix",
            params: { suffix: "!" },
            enabled: true,
          },
        ],
      };

      const result = await runPipeline("World", pipeline);

      expect(result.success).toBe(true);
      expect(result.output).toBe("Hello, World!");
    });

    it("should handle operation errors gracefully", async () => {
      const pipeline: Pipeline = {
        id: "test-pipeline",
        name: "Test Pipeline",
        steps: [
          {
            id: "step1",
            operationId: "test.uppercase",
            params: {},
            enabled: true,
          },
          {
            id: "step2",
            operationId: "test.error",
            params: {},
            enabled: true,
          },
          {
            id: "step3",
            operationId: "test.lowercase",
            params: {},
            enabled: true,
          },
        ],
      };

      const result = await runPipeline("hello", pipeline);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Intentional test error");
      expect(result.stepResults).toHaveLength(2); // Stops at error
      expect(result.stepResults[1].error).toBe("Intentional test error");
    });

    it("should handle missing operations", async () => {
      const pipeline: Pipeline = {
        id: "test-pipeline",
        name: "Test Pipeline",
        steps: [
          {
            id: "step1",
            operationId: "nonexistent.operation",
            params: {},
            enabled: true,
          },
        ],
      };

      const result = await runPipeline("hello", pipeline);

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found in registry");
    });

    it("should handle async operations", async () => {
      const pipeline: Pipeline = {
        id: "test-pipeline",
        name: "Test Pipeline",
        steps: [
          {
            id: "step1",
            operationId: "test.async",
            params: {},
            enabled: true,
          },
        ],
      };

      const result = await runPipeline("hello", pipeline);

      expect(result.success).toBe(true);
      expect(result.output).toBe("olleh"); // Reversed
    });

    it("should handle empty pipeline", async () => {
      const pipeline: Pipeline = {
        id: "test-pipeline",
        name: "Test Pipeline",
        steps: [],
      };

      const result = await runPipeline("hello", pipeline);

      expect(result.success).toBe(true);
      expect(result.output).toBe("hello"); // Unchanged
    });

    it("should track step results with timing", async () => {
      const pipeline: Pipeline = {
        id: "test-pipeline",
        name: "Test Pipeline",
        steps: [
          {
            id: "step1",
            operationId: "test.uppercase",
            params: {},
            enabled: true,
          },
        ],
      };

      const result = await runPipeline("hello", pipeline);

      expect(result.stepResults[0].duration).toBeGreaterThanOrEqual(0);
      expect(result.stepResults[0].input).toBe("hello");
      expect(result.stepResults[0].output).toBe("HELLO");
      expect(result.totalDuration).toBeGreaterThanOrEqual(0);
    });

    it("should reject oversized input", async () => {
      const pipeline: Pipeline = {
        id: "test-pipeline",
        name: "Test Pipeline",
        steps: [
          {
            id: "step1",
            operationId: "test.uppercase",
            params: {},
            enabled: true,
          },
        ],
      };

      // Create input larger than 1KB for testing (with low maxInputSize)
      const largeInput = "x".repeat(2000);

      const result = await runPipeline(largeInput, pipeline, {
        maxInputSize: 1000,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("exceeds maximum");
    });

    it("should reject pipelines with too many steps", async () => {
      const steps: PipelineStep[] = Array.from({ length: 60 }, (_, i) => ({
        id: `step${i}`,
        operationId: "test.uppercase",
        params: {},
        enabled: true,
      }));

      const pipeline: Pipeline = {
        id: "test-pipeline",
        name: "Test Pipeline",
        steps,
      };

      const result = await runPipeline("hello", pipeline, { maxSteps: 50 });

      expect(result.success).toBe(false);
      expect(result.error).toContain("maximum allowed is 50");
    });

    it("should call onStepComplete callback", async () => {
      const stepResults: number[] = [];

      const pipeline: Pipeline = {
        id: "test-pipeline",
        name: "Test Pipeline",
        steps: [
          {
            id: "step1",
            operationId: "test.uppercase",
            params: {},
            enabled: true,
          },
          {
            id: "step2",
            operationId: "test.trim",
            params: {},
            enabled: true,
          },
        ],
      };

      await runPipeline("hello", pipeline, {
        onStepComplete: (_, index) => {
          stepResults.push(index);
        },
      });

      expect(stepResults).toEqual([0, 1]);
    });

    it("should provide execution context to operations", async () => {
      let capturedContext: any = null;

      operationRegistry.register({
        id: "test.captureContext",
        name: "Capture Context",
        description: "Captures execution context",
        categories: ["test"],
        parameters: [],
        execute: (input, params, context) => {
          capturedContext = { ...context };
          return input;
        },
      });

      const pipeline: Pipeline = {
        id: "test-pipeline",
        name: "Test Pipeline",
        steps: [
          {
            id: "step1",
            operationId: "test.uppercase",
            params: {},
            enabled: true,
          },
          {
            id: "step2",
            operationId: "test.captureContext",
            params: {},
            enabled: true,
          },
        ],
      };

      await runPipeline("hello", pipeline);

      expect(capturedContext).not.toBeNull();
      expect(capturedContext.stepIndex).toBe(1);
      expect(capturedContext.totalSteps).toBe(2);
      expect(capturedContext._input).toBe("hello");
      expect(capturedContext._previousOutput).toBe("HELLO");
    });
  });

  describe("runSingleOperation", () => {
    it("should execute a single operation", async () => {
      const result = await runSingleOperation("test.uppercase", "hello");

      expect(result.success).toBe(true);
      expect(result.output).toBe("HELLO");
    });

    it("should handle operation parameters", async () => {
      const result = await runSingleOperation("test.prefix", "World", {
        prefix: "Hello, ",
      });

      expect(result.success).toBe(true);
      expect(result.output).toBe("Hello, World");
    });

    it("should handle missing operations", async () => {
      const result = await runSingleOperation("nonexistent", "hello");

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should handle operation errors", async () => {
      const result = await runSingleOperation("test.error", "hello");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Intentional test error");
    });
  });

  describe("validatePipeline", () => {
    it("should validate a valid pipeline", () => {
      const pipeline: Pipeline = {
        id: "test-pipeline",
        name: "Test Pipeline",
        steps: [
          {
            id: "step1",
            operationId: "test.uppercase",
            params: {},
            enabled: true,
          },
        ],
      };

      const result = validatePipeline(pipeline);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject empty pipeline", () => {
      const pipeline: Pipeline = {
        id: "test-pipeline",
        name: "Test Pipeline",
        steps: [],
      };

      const result = validatePipeline(pipeline);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Pipeline has no steps");
    });

    it("should detect missing operations", () => {
      const pipeline: Pipeline = {
        id: "test-pipeline",
        name: "Test Pipeline",
        steps: [
          {
            id: "step1",
            operationId: "nonexistent.operation",
            params: {},
            enabled: true,
          },
        ],
      };

      const result = validatePipeline(pipeline);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("not found in registry");
    });

    it("should detect missing step IDs", () => {
      const pipeline: Pipeline = {
        id: "test-pipeline",
        name: "Test Pipeline",
        steps: [
          {
            id: "",
            operationId: "test.uppercase",
            params: {},
            enabled: true,
          },
        ],
      };

      const result = validatePipeline(pipeline);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Missing step ID");
    });
  });

  describe("createStep", () => {
    it("should create a step with default parameters", () => {
      const step = createStep("test.prefix");

      expect(step.operationId).toBe("test.prefix");
      expect(step.params.prefix).toBe(""); // Default value
      expect(step.enabled).toBe(true);
      expect(step.id).toBeTruthy(); // UUID generated
    });

    it("should override default parameters", () => {
      const step = createStep("test.prefix", { prefix: "Custom: " });

      expect(step.params.prefix).toBe("Custom: ");
    });

    it("should handle operations without parameters", () => {
      const step = createStep("test.uppercase");

      expect(step.operationId).toBe("test.uppercase");
      expect(step.params).toEqual({});
    });
  });

  describe("createPipeline", () => {
    it("should create an empty pipeline", () => {
      const pipeline = createPipeline();

      expect(pipeline.id).toBeTruthy();
      expect(pipeline.name).toBeNull();
      expect(pipeline.steps).toEqual([]);
    });

    it("should create a named pipeline", () => {
      const pipeline = createPipeline("My Pipeline");

      expect(pipeline.name).toBe("My Pipeline");
    });
  });

  describe("Integration: JSON + Base64 style pipeline", () => {
    beforeEach(() => {
      // Simulate JSON and Base64 operations
      operationRegistry.register({
        id: "json.format",
        name: "Format JSON",
        description: "Pretty-print JSON",
        categories: ["json"],
        parameters: [
          { name: "indent", label: "Indent", type: "number", default: 2 },
        ],
        execute: (input, params) => {
          const json = JSON.parse(input);
          return JSON.stringify(json, null, params.indent as number);
        },
      });

      operationRegistry.register({
        id: "base64.encode",
        name: "Base64 Encode",
        description: "Encode to Base64",
        categories: ["encoding"],
        parameters: [],
        execute: (input) => btoa(input),
      });

      operationRegistry.register({
        id: "base64.decode",
        name: "Base64 Decode",
        description: "Decode from Base64",
        categories: ["encoding"],
        parameters: [],
        execute: (input) => atob(input),
      });
    });

    it("should execute a realistic pipeline: JSON format → Base64 encode", async () => {
      const pipeline: Pipeline = {
        id: "realistic-pipeline",
        name: "Format and Encode",
        steps: [
          {
            id: "step1",
            operationId: "json.format",
            params: { indent: 2 },
            enabled: true,
          },
          {
            id: "step2",
            operationId: "base64.encode",
            params: {},
            enabled: true,
          },
        ],
      };

      const input = '{"name":"test","value":123}';
      const result = await runPipeline(input, pipeline);

      expect(result.success).toBe(true);

      // Decode to verify
      const decoded = atob(result.output);
      expect(decoded).toContain('"name": "test"');
      expect(decoded).toContain('"value": 123');
    });

    it("should execute reverse pipeline: Base64 decode → JSON format", async () => {
      const formattedJson = '{\n  "name": "test"\n}';
      const encoded = btoa(formattedJson);

      const pipeline: Pipeline = {
        id: "reverse-pipeline",
        name: "Decode and Format",
        steps: [
          {
            id: "step1",
            operationId: "base64.decode",
            params: {},
            enabled: true,
          },
          {
            id: "step2",
            operationId: "json.format",
            params: { indent: 4 },
            enabled: true,
          },
        ],
      };

      const result = await runPipeline(encoded, pipeline);

      expect(result.success).toBe(true);
      expect(result.output).toContain('"name": "test"');
    });
  });
});

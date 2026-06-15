import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { operationRegistry } from "../../pipeline/OperationRegistry";
import { OperationDefinition, SavedPipeline } from "../../pipeline/types";
import { QuickTransformItem } from "../types";
import {
  executeQuickTransformItem,
  buildInitialParams,
  validateParams,
} from "../quickTransformExecutor";

const makeOp = (overrides: Partial<OperationDefinition> = {}): OperationDefinition => ({
  id: "test.upper",
  name: "Uppercase",
  description: "Converts to uppercase",
  categories: ["test"],
  parameters: [],
  execute: (input) => input.toUpperCase(),
  ...overrides,
});

const makePipeline = (overrides: Partial<SavedPipeline> = {}): SavedPipeline => ({
  id: "pipe-1",
  name: "My Pipeline",
  steps: JSON.stringify([
    { id: "step-1", operationId: "test.upper", params: {}, enabled: true },
  ]),
  createdAt: 0,
  lastModified: 0,
  lastUsedAt: 0,
  isFavorite: false,
  ...overrides,
});

beforeEach(() => operationRegistry.clear());
afterEach(() => operationRegistry.clear());

describe("buildInitialParams", () => {
  it("returns empty object for no parameters", () => {
    expect(buildInitialParams([])).toEqual({});
  });

  it("uses declared defaults", () => {
    const params = buildInitialParams([
      { name: "suffix", label: "Suffix", type: "string", default: "!!" },
      { name: "count", label: "Count", type: "number", default: 5 },
    ]);
    expect(params).toEqual({ suffix: "!!", count: 5 });
  });

  it("falls back to type defaults when no declared default", () => {
    const params = buildInitialParams([
      { name: "text", label: "Text", type: "string" },
      { name: "num", label: "Num", type: "number" },
      { name: "flag", label: "Flag", type: "boolean" },
      { name: "area", label: "Area", type: "textarea" },
      { name: "opt", label: "Opt", type: "select" },
    ]);
    expect(params["text"]).toBe("");
    expect(params["num"]).toBe(0);
    expect(params["flag"]).toBe(false);
    expect(params["area"]).toBe("");
    expect(params["opt"]).toBe("");
  });
});

describe("validateParams", () => {
  it("returns null when all required params are filled", () => {
    const params = [{ name: "key", label: "Key", type: "string" as const, required: true }];
    expect(validateParams(params, { key: "secret" })).toBeNull();
  });

  it("returns error message for empty required string param", () => {
    const params = [{ name: "key", label: "API Key", type: "string" as const, required: true }];
    expect(validateParams(params, { key: "" })).toMatch(/"API Key" is required/);
  });

  it("returns error for undefined required param", () => {
    const params = [{ name: "key", label: "Key", type: "string" as const, required: true }];
    expect(validateParams(params, {})).toBeTruthy();
  });

  it("ignores optional params with empty values", () => {
    const params = [{ name: "suffix", label: "Suffix", type: "string" as const }];
    expect(validateParams(params, { suffix: "" })).toBeNull();
  });

  it("validates only the first failing required param", () => {
    const params = [
      { name: "a", label: "Field A", type: "string" as const, required: true },
      { name: "b", label: "Field B", type: "string" as const, required: true },
    ];
    const error = validateParams(params, { a: "", b: "" });
    expect(error).toMatch(/"Field A"/);
  });
});

describe("executeQuickTransformItem — operation", () => {
  it("executes an operation with default params when none provided", async () => {
    operationRegistry.register(makeOp());
    const item: QuickTransformItem = { type: "operation", id: "test.upper", name: "Uppercase", description: "" };

    const result = await executeQuickTransformItem(item, "hello", []);
    expect(result.success).toBe(true);
    expect(result.output).toBe("HELLO");
  });

  it("uses provided params instead of building defaults", async () => {
    let receivedParams: Record<string, unknown> = {};
    operationRegistry.register(
      makeOp({
        id: "test.suffix",
        parameters: [{ name: "suffix", label: "Suffix", type: "string", default: "DEFAULT" }],
        execute: (input, params) => {
          receivedParams = params;
          return `${input}${params.suffix}`;
        },
      }),
    );
    const item: QuickTransformItem = { type: "operation", id: "test.suffix", name: "Suffix", description: "" };

    await executeQuickTransformItem(item, "hello", [], { suffix: "!!!" });
    expect(receivedParams["suffix"]).toBe("!!!");
  });

  it("passes applyPerLine to executeSingleOperation for line processing", async () => {
    operationRegistry.register(
      makeOp({
        id: "test.suffix",
        name: "Add Suffix",
        processingMode: "configurable",
        parameters: [{ name: "suffix", label: "Suffix", type: "string", default: "" }],
        execute: (input, params) => `${input}${params.suffix ?? ""}`,
      }),
    );
    const item: QuickTransformItem = { type: "operation", id: "test.suffix", name: "Add Suffix", description: "" };

    const result = await executeQuickTransformItem(
      item,
      "line1\nline2",
      [],
      { suffix: "!" },
      true,
    );
    expect(result.success).toBe(true);
    expect(result.output).toBe("line1!\nline2!");
  });

  it("applies to whole content when applyPerLine is false", async () => {
    operationRegistry.register(
      makeOp({
        id: "test.suffix",
        processingMode: "configurable",
        parameters: [{ name: "suffix", label: "Suffix", type: "string", default: "" }],
        execute: (input, params) => `${input}${params.suffix ?? ""}`,
      }),
    );
    const item: QuickTransformItem = { type: "operation", id: "test.suffix", name: "Suffix", description: "" };

    const result = await executeQuickTransformItem(
      item,
      "line1\nline2",
      [],
      { suffix: "!" },
      false,
    );
    expect(result.success).toBe(true);
    expect(result.output).toBe("line1\nline2!");
  });

  it("returns error result when operation not in registry", async () => {
    const item: QuickTransformItem = { type: "operation", id: "missing.op", name: "Missing", description: "" };
    const result = await executeQuickTransformItem(item, "input", []);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("returns error result when operation throws", async () => {
    operationRegistry.register(
      makeOp({ id: "test.error", execute: () => { throw new Error("intentional"); } }),
    );
    const item: QuickTransformItem = { type: "operation", id: "test.error", name: "Error", description: "" };
    const result = await executeQuickTransformItem(item, "input", []);
    expect(result.success).toBe(false);
    expect(result.error).toContain("intentional");
  });
});

describe("executeQuickTransformItem — pipeline", () => {
  it("executes a saved pipeline against input", async () => {
    operationRegistry.register(makeOp());
    const item: QuickTransformItem = { type: "pipeline", id: "pipe-1", name: "My Pipeline", description: "" };

    const result = await executeQuickTransformItem(item, "hello", [makePipeline()]);
    expect(result.success).toBe(true);
    expect(result.output).toBe("HELLO");
  });

  it("returns error when pipeline id not found", async () => {
    const item: QuickTransformItem = { type: "pipeline", id: "missing-pipe", name: "Missing", description: "" };
    const result = await executeQuickTransformItem(item, "input", []);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });

  it("returns error when pipeline steps JSON is invalid", async () => {
    const item: QuickTransformItem = { type: "pipeline", id: "pipe-1", name: "Pipe", description: "" };
    const result = await executeQuickTransformItem(item, "input", [makePipeline({ steps: "{{bad" })]);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/parse/i);
  });

  it("preserves input on pipeline failure", async () => {
    const item: QuickTransformItem = { type: "pipeline", id: "pipe-1", name: "Pipe", description: "" };
    const result = await executeQuickTransformItem(item, "original", [makePipeline({ steps: "{{bad" })]);
    expect(result.output).toBe("original");
  });
});

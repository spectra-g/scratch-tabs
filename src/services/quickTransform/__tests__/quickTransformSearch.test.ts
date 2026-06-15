import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { operationRegistry } from "../../pipeline/OperationRegistry";
import { OperationDefinition, SavedPipeline } from "../../pipeline/types";
import { RecentItem } from "../types";
import { searchItems, filterByRecents } from "../quickTransformSearch";

const makePipeline = (overrides: Partial<SavedPipeline> = {}): SavedPipeline => ({
  id: "pipe-1",
  name: "My Pipeline",
  description: "does things",
  steps: "[]",
  createdAt: 0,
  lastModified: 0,
  lastUsedAt: 0,
  isFavorite: false,
  ...overrides,
});

const baseOp = (overrides: Partial<OperationDefinition> = {}): OperationDefinition => ({
  id: "test.op",
  name: "Test Op",
  description: "does stuff",
  categories: ["test"],
  parameters: [],
  execute: (input) => input,
  ...overrides,
});

beforeEach(() => operationRegistry.clear());
afterEach(() => operationRegistry.clear());

describe("searchItems", () => {
  it("returns empty array when registry is empty", () => {
    expect(searchItems("anything", [])).toHaveLength(0);
  });

  it("returns matching operations on name match", () => {
    operationRegistry.register(baseOp({ id: "text.trim", name: "Trim Whitespace" }));
    operationRegistry.register(baseOp({ id: "text.upper", name: "Uppercase" }));

    const results = searchItems("Trim", []);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ type: "operation", id: "text.trim" });
  });

  it("includes operations with required parameters", () => {
    operationRegistry.register(
      baseOp({
        id: "crypto.aes",
        name: "AES Encrypt",
        parameters: [{ name: "key", label: "Key", type: "string", required: true }],
      }),
    );

    const results = searchItems("AES", []);
    expect(results.some((r) => r.id === "crypto.aes")).toBe(true);
  });

  it("includes operations with only optional parameters", () => {
    operationRegistry.register(
      baseOp({
        id: "text.pad",
        name: "Pad",
        parameters: [{ name: "width", label: "Width", type: "number", default: 10 }],
      }),
    );

    const results = searchItems("Pad", []);
    expect(results[0]).toMatchObject({ type: "operation", id: "text.pad" });
  });

  it("returns matching pipelines", () => {
    const pipelines = [makePipeline({ id: "p1", name: "Remove Blanks" })];
    const results = searchItems("remove", pipelines);
    expect(results.some((r) => r.type === "pipeline" && r.id === "p1")).toBe(true);
  });

  it("matches pipelines by description", () => {
    const pipelines = [
      makePipeline({ id: "p1", name: "Cleanup", description: "removes duplicate lines" }),
    ];
    const results = searchItems("duplicate", pipelines);
    expect(results.some((r) => r.id === "p1")).toBe(true);
  });

  it("places operations before pipelines", () => {
    operationRegistry.register(baseOp({ id: "text.trim", name: "Trim" }));
    const pipelines = [makePipeline({ id: "p1", name: "Trim Pipeline" })];

    const results = searchItems("trim", pipelines);
    const opIndex = results.findIndex((r) => r.type === "operation");
    const pipeIndex = results.findIndex((r) => r.type === "pipeline");
    expect(opIndex).toBeLessThan(pipeIndex);
  });

  it("caps results at 5", () => {
    for (let i = 0; i < 8; i++) {
      operationRegistry.register(baseOp({ id: `test.op${i}`, name: `Op ${i}` }));
    }
    expect(searchItems("", [])).toHaveLength(5);
  });

  it("excludes pipelines with null name", () => {
    const pipelines = [makePipeline({ id: "p1", name: null })];
    expect(searchItems("", pipelines).some((r) => r.id === "p1")).toBe(false);
  });
});

describe("filterByRecents", () => {
  it("returns empty array when recents is empty", () => {
    expect(filterByRecents([], [])).toHaveLength(0);
  });

  it("returns recent operations in order", () => {
    operationRegistry.register(baseOp({ id: "text.a", name: "Alpha" }));
    operationRegistry.register(baseOp({ id: "text.b", name: "Beta" }));

    const recents: RecentItem[] = [
      { type: "operation", id: "text.b" },
      { type: "operation", id: "text.a" },
    ];
    const results = filterByRecents(recents, []);
    expect(results[0].id).toBe("text.b");
    expect(results[1].id).toBe("text.a");
  });

  it("skips recent operations not in registry", () => {
    const recents: RecentItem[] = [{ type: "operation", id: "missing.op" }];
    expect(filterByRecents(recents, [])).toHaveLength(0);
  });

  it("includes recent operations with required params", () => {
    operationRegistry.register(
      baseOp({
        id: "crypto.aes",
        name: "AES",
        parameters: [{ name: "key", label: "Key", type: "string", required: true }],
      }),
    );
    const recents: RecentItem[] = [{ type: "operation", id: "crypto.aes" }];
    const results = filterByRecents(recents, []);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("crypto.aes");
  });

  it("returns recent pipelines", () => {
    const pipelines = [makePipeline({ id: "p1", name: "My Pipe" })];
    const recents: RecentItem[] = [{ type: "pipeline", id: "p1" }];
    const results = filterByRecents(recents, pipelines);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ type: "pipeline", id: "p1", name: "My Pipe" });
  });

  it("skips recent pipelines not in savedPipelines", () => {
    const recents: RecentItem[] = [{ type: "pipeline", id: "missing" }];
    expect(filterByRecents(recents, [])).toHaveLength(0);
  });

  it("caps at 5 items", () => {
    for (let i = 0; i < 8; i++) {
      operationRegistry.register(baseOp({ id: `text.op${i}`, name: `Op ${i}` }));
    }
    const recents: RecentItem[] = Array.from({ length: 8 }, (_, i) => ({
      type: "operation" as const,
      id: `text.op${i}`,
    }));
    expect(filterByRecents(recents, [])).toHaveLength(5);
  });
});

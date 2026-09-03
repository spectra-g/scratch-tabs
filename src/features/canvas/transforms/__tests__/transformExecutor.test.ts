import { operationRegistry } from "../../../../services/pipeline/OperationRegistry";
import {
  executeCanvasTransform,
  getTransformOperation,
  resolveDefaultParams,
} from "../transformExecutor";

describe("resolveDefaultParams", () => {
  it("picks up operation defaults", () => {
    expect(
      resolveDefaultParams({
        parameters: [
          { name: "query", label: "Query", type: "string", default: "." },
          { name: "mode", label: "Mode", type: "select" },
        ],
      }),
    ).toEqual({ query: "." });
  });
});

describe("getTransformOperation", () => {
  afterEach(() => operationRegistry.clear());

  it("returns registered operations and throws for unknown ids", () => {
    operationRegistry.register({
      id: "test.upper",
      name: "Upper",
      description: "upper",
      categories: ["Text"],
      parameters: [],
      execute: (input) => input.toUpperCase(),
    });
    expect(getTransformOperation("test.upper").name).toBe("Upper");
    expect(() => getTransformOperation("missing.op")).toThrow(
      "not available",
    );
  });
});

describe("executeCanvasTransform", () => {
  it("returns output on success via the injected runner", async () => {
    const runner = jest.fn().mockResolvedValue({ success: true, output: "OUT" });
    await expect(
      executeCanvasTransform("in", "test.op", { a: 1 }, runner),
    ).resolves.toEqual({ ok: true, output: "OUT" });
    expect(runner).toHaveBeenCalledWith("test.op", "in", { a: 1 });
  });

  it("maps runner failures to a result with the original input", async () => {
    const runner = jest
      .fn()
      .mockResolvedValue({ success: false, output: "in", error: "bad query" });
    await expect(executeCanvasTransform("in", "test.op", {}, runner)).resolves.toEqual({
      ok: false,
      output: "in",
      error: "bad query",
    });
  });
});

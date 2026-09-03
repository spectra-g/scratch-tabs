import type { CanvasCodeItem, CanvasEdge, CanvasItem, CanvasTextItem } from "../../types";
import {
  applyRefreshOutcomes,
  collectRefreshOrder,
  detachDerivedItem,
  getTransformSourceContent,
  isTransformableSource,
  planQuickTransform,
  removeItemsWithEdges,
  stripDerivations,
} from "../transformGraph";

const textItem = (id: string, text = "hello"): CanvasTextItem => ({
  id,
  type: "text",
  x: 10,
  y: 20,
  width: 280,
  height: 180,
  zIndex: 1,
  createdAt: 100,
  updatedAt: 100,
  text,
});

const codeItem = (id: string, source = '{"a":1}'): CanvasCodeItem => ({
  id,
  type: "code",
  x: 10,
  y: 20,
  width: 480,
  height: 320,
  zIndex: 1,
  createdAt: 100,
  updatedAt: 100,
  source,
  language: "json",
  languageLocked: true,
  collapsed: false,
  wrap: false,
});

const operation = { id: "base64.encode", name: "Base64 encode" };

describe("getTransformSourceContent", () => {
  it("reads code source and text content", () => {
    expect(getTransformSourceContent(codeItem("a", "x"))).toBe("x");
    expect(getTransformSourceContent(textItem("b", "y"))).toBe("y");
  });

  it("rejects non-textual cards", () => {
    const image = { ...codeItem("c"), type: "image" } as unknown as CanvasItem;
    expect(getTransformSourceContent(image)).toBeNull();
    expect(isTransformableSource(image)).toBe(false);
  });
});

describe("planQuickTransform", () => {
  it("creates a derived code card plus a labelled edge", () => {
    const source = codeItem("src");
    const plan = planQuickTransform({
      items: [source],
      edges: [],
      sourceId: "src",
      operation,
      params: {},
      output: "aGVsbG8=",
      targetId: "out-1",
      edgeId: "edge-1",
      now: 500,
    });

    expect(plan.targetId).toBe("out-1");
    expect(plan.items).toHaveLength(2);
    const target = plan.items[1];
    expect(target.type).toBe("code");
    if (target.type !== "code") throw new Error("expected code target");
    expect(target.source).toBe("aGVsbG8=");
    expect(target.derivedFrom).toEqual({
      sourceItemId: "src",
      operationId: "base64.encode",
      operationName: "Base64 encode",
      params: {},
    });
    expect(target.zIndex).toBe(2);
    expect(plan.edges).toEqual([
      {
        id: "edge-1",
        sourceItemId: "src",
        targetItemId: "out-1",
        label: "Base64 encode",
      },
    ]);
  });

  it("fans out from one source without overlapping", () => {
    const source = codeItem("src");
    const first = planQuickTransform({
      items: [source],
      edges: [],
      sourceId: "src",
      operation,
      params: {},
      output: "one",
      targetId: "out-1",
      edgeId: "edge-1",
      now: 1,
    });
    const second = planQuickTransform({
      ...first,
      sourceId: "src",
      operation,
      params: {},
      output: "two",
      targetId: "out-2",
      edgeId: "edge-2",
      now: 2,
    });
    const positions = second.items
      .filter((item) => item.id !== "src")
      .map((item) => `${item.x},${item.y}`);
    expect(new Set(positions).size).toBe(2);
    expect(second.edges).toHaveLength(2);
  });

  it("chains transforms off derived cards", () => {
    const source = codeItem("src");
    const first = planQuickTransform({
      items: [source],
      edges: [],
      sourceId: "src",
      operation,
      params: {},
      output: "one",
      targetId: "out-1",
      edgeId: "edge-1",
      now: 1,
    });
    const second = planQuickTransform({
      ...first,
      sourceId: "out-1",
      operation: { id: "text.uppercase", name: "Uppercase" },
      params: {},
      output: "ONE",
      targetId: "out-2",
      edgeId: "edge-2",
      now: 2,
    });
    const target = second.items.find((item) => item.id === "out-2");
    expect(target?.type).toBe("code");
    if (target?.type !== "code") throw new Error("expected code target");
    expect(target.derivedFrom?.sourceItemId).toBe("out-1");
  });

  it("throws for missing sources and non-textual cards", () => {
    expect(() =>
      planQuickTransform({
        items: [],
        edges: [],
        sourceId: "gone",
        operation,
        params: {},
        output: "x",
      }),
    ).toThrow("no longer available");

    const image = { ...codeItem("img"), type: "image" } as unknown as CanvasItem;
    expect(() =>
      planQuickTransform({
        items: [image],
        edges: [],
        sourceId: "img",
        operation,
        params: {},
        output: "x",
      }),
    ).toThrow("Only text and code cards");
  });
});

describe("collectRefreshOrder", () => {
  const chain = (): CanvasItem[] => {
    const src = codeItem("src");
    const first = planQuickTransform({
      items: [src],
      edges: [],
      sourceId: "src",
      operation,
      params: {},
      output: "one",
      targetId: "a",
      edgeId: "e1",
      now: 1,
    });
    const second = planQuickTransform({
      ...first,
      sourceId: "a",
      operation,
      params: {},
      output: "two",
      targetId: "b",
      edgeId: "e2",
      now: 2,
    });
    return second.items;
  };

  it("returns downstream cards parents-first", () => {
    expect(collectRefreshOrder(chain(), "src")).toEqual(["a", "b"]);
    expect(collectRefreshOrder(chain(), "a")).toEqual(["b"]);
    expect(collectRefreshOrder(chain(), "b")).toEqual([]);
  });

  it("is cycle-safe", () => {
    const items = chain().map((item) =>
      item.id === "src" && item.type === "code"
        ? { ...item, derivedFrom: { sourceItemId: "b", operationId: "x", operationName: "X", params: {} } }
        : item,
    );
    expect(collectRefreshOrder(items, "src")).toEqual(["a", "b"]);
  });
});

describe("applyRefreshOutcomes", () => {
  it("updates outputs and clears stale errors", () => {
    const items = [
      codeItem("src", "new"),
      {
        ...codeItem("a", "old"),
        derivedFrom: { sourceItemId: "src", operationId: "op", operationName: "Op", params: {} },
        transformError: "boom",
      },
    ];
    const next = applyRefreshOutcomes(
      items,
      new Map([["a", { ok: true, output: "fresh" }]]),
      999,
    );
    const updated = next.find((item) => item.id === "a");
    expect(updated?.type).toBe("code");
    if (updated?.type !== "code") throw new Error("expected code item");
    expect(updated.source).toBe("fresh");
    expect(updated.transformError).toBeUndefined();
    expect(updated.updatedAt).toBe(999);
  });

  it("keeps old output and records the error on failure", () => {
    const items = [
      {
        ...codeItem("a", "old"),
        derivedFrom: { sourceItemId: "src", operationId: "op", operationName: "Op", params: {} },
      },
    ];
    const next = applyRefreshOutcomes(
      items,
      new Map([["a", { ok: false, error: "bad input" }]]),
    );
    const updated = next.find((item) => item.id === "a");
    if (updated?.type !== "code") throw new Error("expected code item");
    expect(updated.source).toBe("old");
    expect(updated.transformError).toBe("bad input");
  });
});

describe("detachDerivedItem", () => {
  it("makes the card independent and drops its incoming edge", () => {
    const src = codeItem("src");
    const plan = planQuickTransform({
      items: [src],
      edges: [],
      sourceId: "src",
      operation,
      params: {},
      output: "one",
      targetId: "a",
      edgeId: "e1",
      now: 1,
    });
    const detached = detachDerivedItem(plan.items, plan.edges, "a");
    const target = detached.items.find((item) => item.id === "a");
    if (target?.type !== "code") throw new Error("expected code item");
    expect(target.derivedFrom).toBeUndefined();
    expect(detached.edges).toEqual([]);
    expect(detached.items).toHaveLength(2);
  });

  it("leaves independent cards untouched", () => {
    const items = [codeItem("src")];
    const edges: CanvasEdge[] = [];
    expect(detachDerivedItem(items, edges, "src")).toEqual({ items, edges });
  });
});

describe("removeItemsWithEdges", () => {
  it("drops incident edges and keeps survivors", () => {
    const src = codeItem("src");
    const plan = planQuickTransform({
      items: [src, codeItem("other")],
      edges: [],
      sourceId: "src",
      operation,
      params: {},
      output: "one",
      targetId: "a",
      edgeId: "e1",
      now: 1,
    });
    const removed = removeItemsWithEdges(plan.items, plan.edges, new Set(["src"]));
    expect(removed.items.map((item) => item.id).sort()).toEqual(["a", "other"]);
    expect(removed.edges).toEqual([]);
  });
});

describe("stripDerivations", () => {
  it("turns copies into independent cards", () => {
    const derived = {
      ...codeItem("a"),
      derivedFrom: { sourceItemId: "src", operationId: "op", operationName: "Op", params: {} },
      transformError: "stale",
    };
    const [stripped] = stripDerivations([derived]);
    if (stripped.type !== "code") throw new Error("expected code item");
    expect(stripped.derivedFrom).toBeUndefined();
    expect(stripped.transformError).toBeUndefined();
    expect(stripped.source).toBe(derived.source);
  });
});

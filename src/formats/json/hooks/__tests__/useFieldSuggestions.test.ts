import { renderHook } from "@testing-library/react";
import { buildTree, JsonNodeData } from "../../components/JsonTreeView/JsonTreeView";
import {
  buildFieldIndex,
  getFieldSuggestions,
  useFieldSuggestions,
} from "../useFieldSuggestions";

const doc = {
  toplevel: {
    second: "some value",
    other: 1,
  },
  totally: "unrelated string",
  tokens: [{ token: "abc" }],
};

const buildRoot = (data: unknown): JsonNodeData => buildTree("", data, 0, "");

describe("buildFieldIndex", () => {
  it("returns an empty index for null root", () => {
    expect(buildFieldIndex(null)).toEqual({ entries: [], childrenByParentPath: new Map() });
  });

  it("flattens every node with its parent path", () => {
    const index = buildFieldIndex(buildRoot(doc));
    const paths = index.entries.map((e) => e.path).sort();
    expect(paths).toEqual(
      [
        "toplevel",
        "toplevel.second",
        "toplevel.other",
        "totally",
        "tokens",
        "tokens[0]",
        "tokens[0].token",
      ].sort(),
    );

    const toplevelEntry = index.entries.find((e) => e.path === "toplevel")!;
    expect(toplevelEntry.isExpandable).toBe(true);
    expect(toplevelEntry.hasChildren).toBe(true);
    expect(toplevelEntry.parentPath).toBe("");

    const secondEntry = index.entries.find((e) => e.path === "toplevel.second")!;
    expect(secondEntry.parentPath).toBe("toplevel");
    expect(secondEntry.isExpandable).toBe(false);

    const children = index.childrenByParentPath.get("toplevel") ?? [];
    expect(children.map((c) => c.path).sort()).toEqual(["toplevel.other", "toplevel.second"]);
  });
});

describe("getFieldSuggestions", () => {
  const index = buildFieldIndex(buildRoot(doc));

  it("returns nothing for an empty/whitespace term", () => {
    expect(getFieldSuggestions(index, "")).toEqual([]);
    expect(getFieldSuggestions(index, "   ")).toEqual([]);
  });

  it("suggests every key containing the typed substring, ranked by match strength", () => {
    const suggestions = getFieldSuggestions(index, "to");
    const keySuggestions = suggestions.filter((s) => s.kind === "key");
    const keys = keySuggestions.map((s) => s.matchedKey);

    // "toplevel", "totally" and "tokens" all start with "to"
    expect(keys).toContain("toplevel");
    expect(keys).toContain("totally");
    expect(keys).toContain("tokens");
    // ties within the startsWith rank are broken by shortest path first
    expect(keys[0]).toBe("tokens");
  });

  it("does not suggest child paths when the match is weak and ambiguous", () => {
    const suggestions = getFieldSuggestions(index, "to");
    const pathSuggestions = suggestions.filter((s) => s.kind === "path");
    expect(pathSuggestions).toEqual([]);
  });

  it("suggests full child paths once a single field is unambiguously matched", () => {
    const suggestions = getFieldSuggestions(index, "toplevel");
    const pathSuggestions = suggestions.filter((s) => s.kind === "path");
    const paths = pathSuggestions.map((s) => s.path).sort();
    expect(paths).toEqual(["toplevel.other", "toplevel.second"]);
  });

  it("suggests child paths as soon as the typed prefix crosses the strong-match threshold", () => {
    // "topleve" is 7/8 = 87.5% of "toplevel" and is the only match at that point
    const suggestions = getFieldSuggestions(index, "topleve");
    const pathSuggestions = suggestions.filter((s) => s.kind === "path");
    expect(pathSuggestions.map((s) => s.path).sort()).toEqual([
      "toplevel.other",
      "toplevel.second",
    ]);
  });

  it("is case-insensitive", () => {
    const suggestions = getFieldSuggestions(index, "TOPLEVEL");
    const pathSuggestions = suggestions.filter((s) => s.kind === "path");
    expect(pathSuggestions.length).toBe(2);
  });

  it("suggests child paths for a leaf-adjacent unique match even without a full-word typed", () => {
    // "tokens" only key containing "tokens" -> unique match -> children suggested
    const suggestions = getFieldSuggestions(index, "tokens");
    const pathSuggestions = suggestions.filter((s) => s.kind === "path");
    expect(pathSuggestions.map((s) => s.path)).toEqual(["tokens[0]"]);
  });

  it("returns no suggestions when nothing matches", () => {
    expect(getFieldSuggestions(index, "zzzz")).toEqual([]);
  });
});

describe("getFieldSuggestions with a typed path prefix", () => {
  const featuresDoc = {
    features: {
      autoDetection: "Paste any JSON to see it transform automatically",
      treeView: "Navigate nested objects with expand/collapse",
      search: "Find keys and values instantly",
      copyPath: "Hover over nodes to copy JSON paths",
    },
  };
  const index = buildFieldIndex(buildRoot(featuresDoc));

  it("still suggests full paths for a bare (undotted) prefix match", () => {
    const suggestions = getFieldSuggestions(index, "features");
    const paths = suggestions.filter((s) => s.kind === "path").map((s) => s.path).sort();
    expect(paths).toEqual([
      "features.autoDetection",
      "features.copyPath",
      "features.search",
      "features.treeView",
    ]);
  });

  it("suggests every child once the prefix ends in a separator", () => {
    const suggestions = getFieldSuggestions(index, "features.");
    expect(suggestions.every((s) => s.kind === "path")).toBe(true);
    expect(suggestions.map((s) => s.path).sort()).toEqual([
      "features.autoDetection",
      "features.copyPath",
      "features.search",
      "features.treeView",
    ]);
  });

  it("filters children by the text typed after the separator", () => {
    const suggestions = getFieldSuggestions(index, "features.se");
    expect(suggestions.map((s) => s.path)).toEqual(["features.search"]);
  });

  it("is case-insensitive when resolving the prefix", () => {
    const suggestions = getFieldSuggestions(index, "FEATURES.se");
    expect(suggestions.map((s) => s.path)).toEqual(["features.search"]);
  });

  it("returns nothing once the typed prefix doesn't resolve to a real path", () => {
    expect(getFieldSuggestions(index, "nope.se")).toEqual([]);
  });

  it("returns nothing when the remainder after the separator matches no child", () => {
    expect(getFieldSuggestions(index, "features.zzzz")).toEqual([]);
  });
});

describe("useFieldSuggestions", () => {
  it("recomputes suggestions as the input value changes", () => {
    const root = buildRoot(doc);
    const { result, rerender } = renderHook(
      ({ input }) => useFieldSuggestions(root, input),
      { initialProps: { input: "to" } },
    );

    expect(result.current.some((s) => s.kind === "path")).toBe(false);

    rerender({ input: "toplevel" });
    expect(result.current.some((s) => s.kind === "path" && s.path === "toplevel.second")).toBe(
      true,
    );
  });

  it("returns an empty array when there is no root node", () => {
    const { result } = renderHook(() => useFieldSuggestions(null, "toplevel"));
    expect(result.current).toEqual([]);
  });
});

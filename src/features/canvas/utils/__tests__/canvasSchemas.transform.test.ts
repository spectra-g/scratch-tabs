import { parseCanvasDocument } from "../canvasSchemas";

const baseDocument = {
  id: "doc-1",
  tabId: "tab-1",
  workspaceId: "ws-1",
  schemaVersion: 1,
  revision: 0,
  settings: { background: "dots", snapToGrid: false },
  searchText: "",
  createdAt: 1,
  updatedAt: 1,
};

const codeCard = {
  id: "code-1",
  type: "code",
  x: 0,
  y: 0,
  width: 480,
  height: 320,
  zIndex: 1,
  createdAt: 1,
  updatedAt: 1,
  source: "aGVsbG8=",
  language: "plaintext",
  languageLocked: false,
  collapsed: false,
  wrap: false,
};

describe("canvas transform schema", () => {
  it("preserves derivation and edge labels through a round trip", () => {
    const document = parseCanvasDocument({
      ...baseDocument,
      items: [
        { ...codeCard, id: "src" },
        {
          ...codeCard,
          id: "out",
          derivedFrom: {
            sourceItemId: "src",
            operationId: "base64.encode",
            operationName: "Base64 encode",
            params: {},
          },
        },
      ],
      edges: [
        {
          id: "edge-1",
          sourceItemId: "src",
          targetItemId: "out",
          label: "Base64 encode",
        },
      ],
    });

    const target = document.items.find((item) => item.id === "out");
    expect(target?.type).toBe("code");
    if (target?.type !== "code") throw new Error("expected code item");
    expect(target.derivedFrom).toEqual({
      sourceItemId: "src",
      operationId: "base64.encode",
      operationName: "Base64 encode",
      params: {},
    });
    expect(document.edges).toEqual([
      {
        id: "edge-1",
        sourceItemId: "src",
        targetItemId: "out",
        label: "Base64 encode",
      },
    ]);
  });

  it("still parses documents written before transforms existed", () => {
    const document = parseCanvasDocument({
      ...baseDocument,
      items: [codeCard, { ...codeCard, id: "code-2" }],
      edges: [{ id: "e", sourceItemId: "code-1", targetItemId: "code-2" }],
    });
    const item = document.items[0];
    if (item.type !== "code") throw new Error("expected code item");
    expect(item.derivedFrom).toBeUndefined();
    expect(document.edges[0].label).toBeUndefined();
  });

  it("rejects malformed derivations and edge labels", () => {
    expect(() =>
      parseCanvasDocument({
        ...baseDocument,
        items: [{ ...codeCard, derivedFrom: { sourceItemId: "src" } }],
        edges: [],
      }),
    ).toThrow("derivedFrom");

    expect(() =>
      parseCanvasDocument({
        ...baseDocument,
        items: [
          { ...codeCard, id: "a" },
          { ...codeCard, id: "b" },
        ],
        edges: [
          { id: "e", sourceItemId: "a", targetItemId: "b", label: 42 },
        ],
      }),
    ).toThrow("edge label");
  });
});

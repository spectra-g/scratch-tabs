import {
  createDefaultCanvasSession,
  createEmptyCanvasDocument,
  parseCanvasDocument,
  parseCanvasSession,
} from "../canvasSchemas";

describe("Canvas schemas", () => {
  it("creates a valid empty document with stable defaults", () => {
    const document = createEmptyCanvasDocument({
      id: "document-1",
      tabId: "tab-1",
      workspaceId: "workspace-1",
      now: 123,
    });

    expect(parseCanvasDocument(document)).toEqual(document);
    expect(document).toMatchObject({
      schemaVersion: 1,
      revision: 0,
      items: [],
      edges: [],
      settings: { background: "dots", snapToGrid: false },
      searchText: "",
      createdAt: 123,
      updatedAt: 123,
    });
  });

  it("creates and validates the default viewport session", () => {
    const session = createDefaultCanvasSession("tab-1", 456);

    expect(parseCanvasSession(session)).toEqual(session);
    expect(session.viewport).toEqual({ x: 0, y: 0, zoom: 1 });
    expect(session.lastTool).toBe("select");
  });

  it("rejects unsupported and malformed documents", () => {
    const valid = createEmptyCanvasDocument({
      id: "document-1",
      tabId: "tab-1",
      workspaceId: "workspace-1",
      now: 123,
    });

    expect(() => parseCanvasDocument({ ...valid, schemaVersion: 2 })).toThrow(
      "Unsupported Canvas schema version",
    );
    expect(() => parseCanvasDocument({ ...valid, items: [{}] })).toThrow(
      "increment 1 documents must be empty",
    );
    expect(() => parseCanvasSession({})).toThrow("session and viewport");
  });
});

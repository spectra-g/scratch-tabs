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

  it("round-trips populated documents without discarding items or edges", () => {
    const document = createEmptyCanvasDocument({
      id: "document-1",
      tabId: "tab-1",
      workspaceId: "workspace-1",
      now: 123,
    });
    document.items = [
      {
        id: "item-1",
        type: "text",
        x: -120,
        y: 40,
        width: 280,
        height: 180,
        zIndex: 2,
        rotation: 0,
        createdAt: 124,
        updatedAt: 125,
        text: "First note",
        noteColor: "yellow",
      },
      {
        id: "item-2",
        type: "text",
        x: 400,
        y: 40,
        width: 320,
        height: 220,
        zIndex: 3,
        createdAt: 126,
        updatedAt: 127,
        text: "Second note",
      },
      {
        id: "item-3",
        type: "code",
        x: 800,
        y: -100,
        width: 480,
        height: 320,
        zIndex: 4,
        createdAt: 128,
        updatedAt: 129,
        source: '{"ok":true}',
        language: "json",
        languageLocked: true,
        collapsed: true,
        expandedHeight: 320,
        wrap: true,
      },
    ];
    document.edges = [
      { id: "edge-1", sourceItemId: "item-1", targetItemId: "item-2" },
    ];

    const parsed = parseCanvasDocument(document);

    expect(parsed).toEqual(document);
    expect(parsed.items).not.toBe(document.items);
    expect(parsed.items[0]).not.toBe(document.items[0]);
  });

  it("rejects malformed code-card settings", () => {
    const valid = createEmptyCanvasDocument({
      id: "document-1",
      tabId: "tab-1",
      workspaceId: "workspace-1",
      now: 123,
    });
    const codeItem = {
      id: "code-1",
      type: "code",
      x: 0,
      y: 0,
      width: 480,
      height: 320,
      zIndex: 1,
      createdAt: 1,
      updatedAt: 1,
      source: "const value = 1;",
      language: "javascript",
      languageLocked: true,
      collapsed: false,
      wrap: false,
    };

    expect(() =>
      parseCanvasDocument({
        ...valid,
        items: [{ ...codeItem, source: 123 }],
      }),
    ).toThrow("code item source must be a string");
    expect(() =>
      parseCanvasDocument({
        ...valid,
        items: [{ ...codeItem, wrap: "yes" }],
      }),
    ).toThrow("wrap must be a boolean");
    expect(() =>
      parseCanvasDocument({
        ...valid,
        items: [{ ...codeItem, expandedHeight: -1 }],
      }),
    ).toThrow("expandedHeight must be positive");
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
      "unsupported item type",
    );
    expect(() =>
      parseCanvasDocument({
        ...valid,
        items: [
          {
            id: "item-1",
            type: "text",
            x: 0,
            y: 0,
            width: 0,
            height: 100,
            zIndex: 1,
            createdAt: 1,
            updatedAt: 1,
            text: "invalid size",
          },
        ],
      }),
    ).toThrow("dimensions must be positive");
    expect(() =>
      parseCanvasDocument({
        ...valid,
        edges: [
          {
            id: "edge-1",
            sourceItemId: "missing-1",
            targetItemId: "missing-2",
          },
        ],
      }),
    ).toThrow("references a missing item");
    expect(() => parseCanvasSession({})).toThrow("session and viewport");
  });
});

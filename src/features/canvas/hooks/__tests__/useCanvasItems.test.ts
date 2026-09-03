import { act, renderHook } from "@testing-library/react";
import { operationRegistry } from "../../../../services/pipeline/OperationRegistry";
import type { CanvasCodeItem, CanvasTextItem } from "../../types";
import { useCanvasItems } from "../useCanvasItems";

const makeItem = (
  id: string,
  overrides: Partial<CanvasTextItem> = {},
): CanvasTextItem => ({
  id,
  type: "text",
  x: 10,
  y: 20,
  width: 280,
  height: 180,
  zIndex: 1,
  createdAt: 100,
  updatedAt: 100,
  text: id,
  ...overrides,
});

const makeCodeItem = (
  id: string,
  overrides: Partial<CanvasCodeItem> = {},
): CanvasCodeItem => ({
  id,
  type: "code",
  x: 10,
  y: 20,
  width: 480,
  height: 320,
  zIndex: 1,
  createdAt: 100,
  updatedAt: 100,
  source: '{"value":1}',
  language: "json",
  languageLocked: true,
  collapsed: false,
  wrap: false,
  ...overrides,
});

describe("useCanvasItems", () => {
  beforeAll(() => {
    Object.defineProperty(globalThis.crypto, "randomUUID", {
      configurable: true,
      value: jest
        .fn()
        .mockImplementation(
          () => `generated-${Math.random().toString(16).slice(2)}`,
        ),
    });
  });

  it("undoes and redoes card creation", () => {
    const persistItems = jest.fn();
    const { result } = renderHook(() => useCanvasItems([], persistItems));

    act(() => result.current.createTextItem({ x: -20, y: 40 }));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]).toEqual(
      expect.objectContaining({ x: -20, y: 40 }),
    );

    act(() => result.current.undo());
    expect(result.current.items).toEqual([]);
    act(() => result.current.redo());
    expect(result.current.items).toHaveLength(1);
  });

  it("accepts a persisted ingestion batch as one selected undo step", () => {
    const persistItems = jest.fn();
    const existing = makeItem("existing");
    const pasted = [
      makeItem("pasted-one", { x: 400 }),
      makeItem("pasted-two", { x: 720 }),
    ];
    const { result } = renderHook(() =>
      useCanvasItems([existing], persistItems),
    );

    act(() => result.current.acceptIngestedItems(pasted));

    expect(result.current.items.map(({ id }) => id)).toEqual([
      "existing",
      "pasted-one",
      "pasted-two",
    ]);
    expect(result.current.interactionState.selectedItemIds).toEqual([
      "pasted-one",
      "pasted-two",
    ]);
    expect(result.current.focusedItemId).toBe("pasted-one");
    expect(persistItems).not.toHaveBeenCalled();

    act(() => result.current.undo());
    expect(result.current.items).toEqual([existing]);
    act(() => result.current.redo());
    expect(result.current.items.map(({ id }) => id)).toEqual([
      "existing",
      "pasted-one",
      "pasted-two",
    ]);
  });

  it("keeps transient group movement local and records one completed operation", () => {
    const persistItems = jest.fn();
    const items = [makeItem("one"), makeItem("two", { zIndex: 2 })];
    const { result } = renderHook(() => useCanvasItems(items, persistItems));

    act(() => {
      result.current.onNodesChange([
        { id: "one", type: "select", selected: true },
        { id: "two", type: "select", selected: true },
        {
          id: "one",
          type: "position",
          position: { x: 50, y: 60 },
          dragging: true,
        },
        {
          id: "two",
          type: "position",
          position: { x: 80, y: 90 },
          dragging: true,
        },
      ]);
    });
    expect(persistItems).not.toHaveBeenCalled();

    act(() => result.current.commitNodePositions());
    expect(persistItems).toHaveBeenCalledTimes(1);
    expect(result.current.items).toEqual([
      expect.objectContaining({ id: "one", x: 50, y: 60 }),
      expect.objectContaining({ id: "two", x: 80, y: 90 }),
    ]);

    act(() => result.current.undo());
    expect(result.current.items.map(({ x, y }) => ({ x, y }))).toEqual([
      { x: 10, y: 20 },
      { x: 10, y: 20 },
    ]);
    act(() => result.current.redo());
    expect(result.current.items.map(({ x, y }) => ({ x, y }))).toEqual([
      { x: 50, y: 60 },
      { x: 80, y: 90 },
    ]);
  });

  it("records text and resize commits as separate undo steps", () => {
    const persistItems = jest.fn();
    const item = makeItem("one", { text: "Original" });
    const { result } = renderHook(() => useCanvasItems([item], persistItems));

    act(() => result.current.beginEditing(item.id));
    act(() => result.current.interaction.commitText(item.id, "Updated"));
    act(() =>
      result.current.interaction.commitResize(item.id, {
        x: 30,
        y: 40,
        width: 360,
        height: 240,
      }),
    );

    act(() => result.current.undo());
    expect(result.current.items[0]).toEqual(
      expect.objectContaining({ text: "Updated", x: 10, width: 280 }),
    );
    act(() => result.current.undo());
    expect(result.current.items[0]).toEqual(
      expect.objectContaining({ text: "Original", x: 10, width: 280 }),
    );
    act(() => result.current.redo());
    expect(result.current.items[0].text).toBe("Updated");
  });

  it("creates, edits, formats, and configures code cards through undo boundaries", () => {
    const persistItems = jest.fn();
    const item = makeCodeItem("code", { source: '{"value":1}' });
    const { result } = renderHook(() =>
      useCanvasItems([item], persistItems, "canvas-tab"),
    );

    act(() => result.current.interaction.commitCode(item.id, '{"value":2}'));
    expect(result.current.items[0]).toEqual(
      expect.objectContaining({ source: '{"value":2}', language: "json" }),
    );

    act(() => {
      expect(result.current.interaction.formatCode(item.id)).toEqual({
        ok: true,
        source: '{\n  "value": 2\n}',
      });
    });
    act(() => result.current.interaction.toggleCodeWrap(item.id));
    act(() => result.current.interaction.toggleCodeCollapsed(item.id));

    expect(result.current.items[0]).toEqual(
      expect.objectContaining({
        source: '{\n  "value": 2\n}',
        language: "json",
        languageLocked: true,
        wrap: true,
        collapsed: true,
        height: 40,
        expandedHeight: 320,
      }),
    );
    act(() => result.current.undo());
    expect(result.current.items[0]).toEqual(
      expect.objectContaining({
        wrap: true,
        collapsed: false,
        height: 320,
      }),
    );
  });

  it("keeps a locked language while editing and detects an unlocked source", () => {
    const locked = makeCodeItem("locked", {
      language: "javascript",
      languageLocked: true,
      source: "const oldValue = 1;",
    });
    const unlocked = makeCodeItem("unlocked", {
      language: "plaintext",
      languageLocked: false,
      source: "",
    });
    const { result } = renderHook(() =>
      useCanvasItems([locked, unlocked], jest.fn()),
    );

    act(() =>
      result.current.interaction.commitCode("locked", '{"now":"json"}'),
    );
    act(() =>
      result.current.interaction.commitCode("unlocked", '{"now":"json"}'),
    );

    expect(result.current.items[0]).toEqual(
      expect.objectContaining({
        language: "javascript",
        languageLocked: true,
      }),
    );
    expect(result.current.items[1]).toEqual(
      expect.objectContaining({ language: "json", languageLocked: true }),
    );
  });

  it("expands a collapsed code card before entering editing mode", () => {
    const item = makeCodeItem("code", {
      collapsed: true,
      height: 40,
      expandedHeight: 360,
    });
    const { result } = renderHook(() => useCanvasItems([item], jest.fn()));

    act(() => result.current.beginEditing(item.id));

    expect(result.current.interactionState.mode).toBe("editing");
    expect(result.current.items[0]).toEqual(
      expect.objectContaining({ collapsed: false, height: 360 }),
    );
    act(() => result.current.undo());
    expect(result.current.items[0]).toEqual(
      expect.objectContaining({
        collapsed: true,
        height: 40,
        expandedHeight: 360,
      }),
    );
  });

  it("duplicates all selected items and makes the duplicates primary selection", () => {
    const persistItems = jest.fn();
    const items = [makeItem("one"), makeItem("two", { zIndex: 2 })];
    const { result } = renderHook(() => useCanvasItems(items, persistItems));

    act(() => result.current.selectOnly("two"));
    act(() => result.current.interaction.preparePointerSelection("one", true));
    act(() => {
      result.current.onNodesChange([
        { id: "one", type: "select", selected: true },
        { id: "two", type: "select", selected: false },
      ]);
    });
    act(() => result.current.completePointerSelection("one"));
    expect(
      result.current.nodes.filter((node) => node.selected).map(({ id }) => id),
    ).toEqual(["one", "two"]);
    act(() => result.current.duplicateSelection());

    const duplicates = result.current.items.slice(2);
    expect(duplicates).toHaveLength(2);
    expect(duplicates.map(({ x, y }) => ({ x, y }))).toEqual([
      { x: 42, y: 52 },
      { x: 42, y: 52 },
    ]);
    expect(
      result.current.nodes.filter((node) => node.selected).map(({ id }) => id),
    ).toEqual(duplicates.map(({ id }) => id));
    expect(result.current.focusedItemId).toBe(duplicates[0].id);
  });

  it("deletes a multi-selection in one step and selects the next item", () => {
    const persistItems = jest.fn();
    const items = [
      makeItem("one"),
      makeItem("two", { zIndex: 2 }),
      makeItem("three", { zIndex: 3 }),
    ];
    const { result } = renderHook(() => useCanvasItems(items, persistItems));

    act(() => {
      result.current.onNodesChange([
        { id: "one", type: "select", selected: true },
        { id: "two", type: "select", selected: true },
      ]);
    });
    act(() => result.current.deleteSelection());

    expect(result.current.items.map(({ id }) => id)).toEqual(["three"]);
    expect(result.current.focusedItemId).toBe("three");
    expect(result.current.nodes[0].selected).toBe(true);

    act(() => result.current.undo());
    expect(result.current.items.map(({ id }) => id)).toEqual([
      "one",
      "two",
      "three",
    ]);
    expect(
      result.current.nodes.filter((node) => node.selected).map(({ id }) => id),
    ).toEqual(["one", "two"]);
  });

  it("records deterministic layering as an undoable operation", () => {
    const persistItems = jest.fn();
    const items = [makeItem("one"), makeItem("two", { zIndex: 2 })];
    const { result } = renderHook(() => useCanvasItems(items, persistItems));

    act(() => result.current.selectOnly("one"));
    act(() => result.current.moveSelectionOneLayer("forward"));
    expect(result.current.items.find(({ id }) => id === "one")?.zIndex).toBe(2);

    act(() => result.current.undo());
    expect(result.current.items.find(({ id }) => id === "one")?.zIndex).toBe(1);
    act(() => result.current.redo());
    expect(result.current.items.find(({ id }) => id === "one")?.zIndex).toBe(2);
  });

  it("synchronizes keyboard focus with a single primary selection", () => {
    const items = [makeItem("one"), makeItem("two", { x: 400 })];
    const { result } = renderHook(() => useCanvasItems(items, jest.fn()));

    act(() => result.current.selectForKeyboardNavigation("two"));

    expect(result.current.interactionState).toEqual({
      mode: "navigation",
      focusedItemId: "two",
      selectedItemIds: ["two"],
      focusOrigin: "keyboard",
    });
    expect(
      result.current.nodes.find(({ id }) => id === "two")?.data.isFocused,
    ).toBe(true);
  });

  it("chooses deletion fallback from spatial reading order, not array order", () => {
    const items = [
      makeItem("right", { x: 400 }),
      makeItem("left", { x: 0 }),
      makeItem("middle", { x: 200 }),
    ];
    const { result } = renderHook(() => useCanvasItems(items, jest.fn()));

    act(() => result.current.selectForKeyboardNavigation("middle"));
    act(() => result.current.deleteSelection());

    expect(result.current.focusedItemId).toBe("right");
  });

  it("selects every card without adding an undo boundary", () => {
    const items = [makeItem("one"), makeItem("two", { x: 400 })];
    const { result } = renderHook(() => useCanvasItems(items, jest.fn()));

    act(() => result.current.selectAll());

    expect(result.current.interactionState.selectedItemIds).toEqual([
      "one",
      "two",
    ]);
    expect(result.current.focusedItemId).toBe("one");
    expect(result.current.canUndo).toBe(false);
  });

  it("nudges a multi-selection as one undoable operation", () => {
    const items = [makeItem("one"), makeItem("two", { x: 400 })];
    const { result } = renderHook(() => useCanvasItems(items, jest.fn()));

    act(() => result.current.selectAll());
    act(() => result.current.nudgeSelection("right", 10));

    expect(result.current.items.map(({ x }) => x)).toEqual([20, 410]);
    act(() => result.current.undo());
    expect(result.current.items.map(({ x }) => x)).toEqual([10, 400]);
    act(() => result.current.redo());
    expect(result.current.items.map(({ x }) => x)).toEqual([20, 410]);
  });

  describe("quick transforms", () => {
    const upperRunner = jest.fn(
      async (operationId: string, input: string) => ({
        success: true as const,
        output: `${input.toUpperCase()} [${operationId}]`,
      }),
    );

    beforeAll(() => {
      operationRegistry.register({
        id: "test.upper",
        name: "Upper",
        description: "Uppercase for tests",
        categories: ["Text"],
        parameters: [],
        execute: (input: string) => input.toUpperCase(),
      });
    });

    afterAll(() => {
      operationRegistry.clear();
    });

    beforeEach(() => {
      upperRunner.mockClear();
    });

    const renderWithUpper = (
      items: Array<CanvasTextItem | CanvasCodeItem>,
      persistItems = jest.fn(),
    ) =>
      renderHook(() =>
        useCanvasItems(items, persistItems, "canvas-tab", undefined, [], {
          transformRunner: upperRunner,
        }),
      );

    it("creates a linked derived card plus an edge in one undo step", async () => {
      const persistItems = jest.fn();
      const { result } = renderWithUpper(
        [makeCodeItem("src", { source: "hello" })],
        persistItems,
      );

      let targetId = "";
      await act(async () => {
        targetId = await result.current.quickTransform("src", "test.upper");
      });

      expect(result.current.items).toHaveLength(2);
      const target = result.current.items.find(
        (item) => item.id === targetId,
      );
      expect(target).toEqual(
        expect.objectContaining({
          type: "code",
          source: "HELLO [test.upper]",
        }),
      );
      if (target?.type !== "code") throw new Error("expected code target");
      expect(target.derivedFrom).toEqual({
        sourceItemId: "src",
        operationId: "test.upper",
        operationName: "Upper",
        params: {},
      });
      expect(result.current.edges).toEqual([
        expect.objectContaining({
          sourceItemId: "src",
          targetItemId: targetId,
          label: "Upper",
        }),
      ]);
      expect(result.current.interactionState.selectedItemIds).toEqual([
        targetId,
      ]);
      expect(persistItems).toHaveBeenLastCalledWith(
        result.current.items,
        result.current.edges,
      );

      act(() => result.current.undo());
      expect(result.current.items.map(({ id }) => id)).toEqual(["src"]);
      expect(result.current.edges).toEqual([]);
      act(() => result.current.redo());
      expect(result.current.items.map(({ id }) => id)).toEqual([
        "src",
        targetId,
      ]);
    });

    it("fans out many outputs from one source without overlapping", async () => {
      const { result } = renderWithUpper([
        makeCodeItem("src", { source: "hello" }),
      ]);

      await act(async () => {
        await result.current.quickTransform("src", "test.upper");
      });
      await act(async () => {
        await result.current.quickTransform("src", "test.upper");
      });

      expect(result.current.items).toHaveLength(3);
      expect(result.current.edges).toHaveLength(2);
      const positions = result.current.items
        .slice(1)
        .map((item) => `${item.x},${item.y}`);
      expect(new Set(positions).size).toBe(2);
    });

    it("surfaces runner failures without creating cards", async () => {
      const failing = jest.fn().mockResolvedValue({
        success: false,
        output: "hello",
        error: "bad query",
      });
      const persistItems = jest.fn();
      const { result } = renderHook(() =>
        useCanvasItems([makeCodeItem("src")], persistItems, "canvas-tab", undefined, [], {
          transformRunner: failing,
        }),
      );

      await act(async () => {
        await expect(
          result.current.quickTransform("src", "test.upper"),
        ).rejects.toThrow("bad query");
      });
      expect(result.current.items).toHaveLength(1);
      expect(result.current.edges).toEqual([]);
      expect(persistItems).not.toHaveBeenCalled();
    });

    it("refreshes derived cards when their source is edited", async () => {
      const { result } = renderWithUpper([
        makeCodeItem("src", { source: "hello" }),
      ]);

      await act(async () => {
        await result.current.quickTransform("src", "test.upper");
      });
      act(() => result.current.interaction.commitCode("src", "bye"));
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const target = result.current.items.find((item) => item.id !== "src");
      expect(target?.type).toBe("code");
      if (target?.type !== "code") throw new Error("expected code target");
      expect(target.source).toBe("BYE [test.upper]");
    });

    it("keeps derived cards read-only until detached", async () => {
      const { result } = renderWithUpper([
        makeCodeItem("src", { source: "hello" }),
      ]);

      let targetId = "";
      await act(async () => {
        targetId = await result.current.quickTransform("src", "test.upper");
      });

      act(() => result.current.beginEditing(targetId));
      expect(result.current.interactionState.mode).toBe("navigation");
      act(() => result.current.interaction.commitCode(targetId, "hacked"));
      expect(
        result.current.items.find((item) => item.id === targetId),
      ).toEqual(expect.objectContaining({ source: "HELLO [test.upper]" }));
      expect(result.current.interaction.formatCode(targetId)).toEqual({
        ok: false,
        error: expect.stringContaining("Detach"),
      });

      act(() => result.current.interaction.detachDerived(targetId));
      const detached = result.current.items.find(
        (item) => item.id === targetId,
      );
      if (detached?.type !== "code") throw new Error("expected code target");
      expect(detached.derivedFrom).toBeUndefined();
      expect(result.current.edges).toEqual([]);

      act(() => result.current.interaction.commitCode(targetId, "edited"));
      expect(
        result.current.items.find((item) => item.id === targetId),
      ).toEqual(expect.objectContaining({ source: "edited" }));
    });

    it("drops incident edges on delete and strips derivation on duplicate", async () => {
      const { result } = renderWithUpper([
        makeCodeItem("src", { source: "hello" }),
      ]);

      let targetId = "";
      await act(async () => {
        targetId = await result.current.quickTransform("src", "test.upper");
      });

      act(() => result.current.selectOnly("src"));
      act(() => result.current.deleteSelection());
      expect(result.current.items.map(({ id }) => id)).toEqual([targetId]);
      expect(result.current.edges).toEqual([]);

      act(() => result.current.selectOnly(targetId));
      act(() => result.current.duplicateSelection());
      const copy = result.current.items.find(
        (item) => item.id !== targetId,
      );
      if (copy?.type !== "code") throw new Error("expected code copy");
      expect(copy.derivedFrom).toBeUndefined();
      expect(copy.source).toBe("HELLO [test.upper]");
    });
  });
});

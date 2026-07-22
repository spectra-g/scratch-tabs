import { act, renderHook } from "@testing-library/react";
import type { CanvasTextItem } from "../../types";
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
});

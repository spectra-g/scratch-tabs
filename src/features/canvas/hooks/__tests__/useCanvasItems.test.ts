import { act, renderHook } from "@testing-library/react";
import type { CanvasTextItem } from "../../types";
import { useCanvasItems } from "../useCanvasItems";

const item: CanvasTextItem = {
  id: "item-1",
  type: "text",
  x: 10,
  y: 20,
  width: 280,
  height: 180,
  zIndex: 1,
  createdAt: 100,
  updatedAt: 100,
  text: "Original",
};

describe("useCanvasItems", () => {
  it("keeps transient node changes local and persists completed edits and moves", () => {
    const persistItems = jest.fn();
    const { result } = renderHook(() =>
      useCanvasItems([item], persistItems),
    );

    act(() => {
      result.current.onNodesChange([
        {
          id: item.id,
          type: "position",
          position: { x: 50, y: 60 },
          dragging: true,
        },
      ]);
    });
    expect(persistItems).not.toHaveBeenCalled();

    act(() => {
      result.current.commitNodePosition(result.current.nodes[0]);
    });
    expect(persistItems).toHaveBeenLastCalledWith([
      expect.objectContaining({ id: item.id, x: 50, y: 60 }),
    ]);

    act(() => result.current.beginEditing(item.id));
    expect(result.current.editingItemId).toBe(item.id);
    act(() => result.current.interaction.commitText(item.id, "Updated"));

    expect(result.current.editingItemId).toBeNull();
    expect(persistItems).toHaveBeenLastCalledWith([
      expect.objectContaining({ id: item.id, text: "Updated" }),
    ]);
  });

  it("deletes the selected item as one completed operation", () => {
    const persistItems = jest.fn();
    const { result } = renderHook(() =>
      useCanvasItems([item], persistItems),
    );

    act(() => {
      result.current.onNodesChange([
        { id: item.id, type: "select", selected: true },
      ]);
    });
    act(() => result.current.deleteSelection());

    expect(result.current.items).toEqual([]);
    expect(persistItems).toHaveBeenCalledWith([]);
  });
});

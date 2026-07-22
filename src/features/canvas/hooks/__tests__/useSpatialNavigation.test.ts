import { renderHook } from "@testing-library/react";
import type { RefObject } from "react";
import type { CanvasInteractionState, CanvasTextItem } from "../../types";
import { useSpatialNavigation } from "../useSpatialNavigation";

const makeItem = (x: number): CanvasTextItem => ({
  id: "one",
  type: "text",
  x,
  y: 20,
  width: 280,
  height: 180,
  zIndex: 1,
  createdAt: 100,
  updatedAt: 100,
  text: "Repeated nudge",
});

const interactionState: CanvasInteractionState = {
  mode: "navigation",
  focusedItemId: "one",
  selectedItemIds: ["one"],
  focusOrigin: "keyboard",
};

describe("useSpatialNavigation announcements", () => {
  it("does not re-announce the same focused card during repeated movement", () => {
    const revealItem = jest.fn();
    const rootRef = {
      current: document.createElement("div"),
    } as RefObject<HTMLDivElement>;
    const options = {
      rootRef,
      interactionState,
      selectForKeyboardNavigation: jest.fn(),
      beginEditing: jest.fn(),
      clearSelection: jest.fn(),
      revealItem,
    };

    const { result, rerender } = renderHook(
      ({ items }: { items: CanvasTextItem[] }) =>
        useSpatialNavigation({ ...options, items }),
      { initialProps: { items: [makeItem(10)] } },
    );

    expect(result.current.announcement).toBe("Text card, Repeated nudge");
    expect(revealItem).toHaveBeenCalledTimes(1);

    rerender({ items: [makeItem(20)] });

    expect(result.current.announcement).toBe("Text card, Repeated nudge");
    expect(revealItem).toHaveBeenCalledTimes(1);
  });
});

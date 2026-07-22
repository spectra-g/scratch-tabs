import { fireEvent, render, screen } from "@testing-library/react";
import type { CanvasInteractionState } from "../../types";
import { useCanvasKeyboardShortcuts } from "../useCanvasKeyboardShortcuts";

const interactionState: CanvasInteractionState = {
  mode: "navigation",
  focusedItemId: "one",
  selectedItemIds: ["one"],
  focusOrigin: "keyboard",
};

describe("useCanvasKeyboardShortcuts", () => {
  it("consumes handled Canvas commands before window-level shortcuts", () => {
    const selectAll = jest.fn();
    const globalKeydown = jest.fn();
    window.addEventListener("keydown", globalKeydown);

    const Harness = () => {
      const keyboard = useCanvasKeyboardShortcuts({
        interactionState,
        itemCount: 2,
        markKeyboardInteraction: jest.fn(),
        navigateDirection: jest.fn(),
        navigateSequentially: jest.fn(() => false),
        enterFocusedItem: jest.fn(),
        escapeNavigation: jest.fn(),
        selectAll,
        deleteSelection: jest.fn(),
        duplicateSelection: jest.fn(),
        nudgeSelection: jest.fn(),
        undo: jest.fn(),
        redo: jest.fn(),
        fitSelection: jest.fn(),
        resetZoom: jest.fn(),
        announce: jest.fn(),
      });
      return <div data-testid="root" onKeyDown={keyboard.handleKeyDown} />;
    };

    render(<Harness />);
    fireEvent.keyDown(screen.getByTestId("root"), {
      key: "a",
      ctrlKey: true,
    });

    expect(selectAll).toHaveBeenCalledTimes(1);
    expect(globalKeydown).not.toHaveBeenCalled();
    window.removeEventListener("keydown", globalKeydown);
  });

  it("does not intercept commands from a semantic editable descendant", () => {
    const duplicateSelection = jest.fn();
    const Harness = () => {
      const keyboard = useCanvasKeyboardShortcuts({
        interactionState,
        itemCount: 1,
        markKeyboardInteraction: jest.fn(),
        navigateDirection: jest.fn(),
        navigateSequentially: jest.fn(() => false),
        enterFocusedItem: jest.fn(),
        escapeNavigation: jest.fn(),
        selectAll: jest.fn(),
        deleteSelection: jest.fn(),
        duplicateSelection,
        nudgeSelection: jest.fn(),
        undo: jest.fn(),
        redo: jest.fn(),
        fitSelection: jest.fn(),
        resetZoom: jest.fn(),
        announce: jest.fn(),
      });
      return (
        <div onKeyDown={keyboard.handleKeyDown}>
          <div data-testid="textbox" role="textbox" tabIndex={0} />
        </div>
      );
    };

    render(<Harness />);
    fireEvent.keyDown(screen.getByTestId("textbox"), {
      key: "d",
      ctrlKey: true,
    });

    expect(duplicateSelection).not.toHaveBeenCalled();
  });
});

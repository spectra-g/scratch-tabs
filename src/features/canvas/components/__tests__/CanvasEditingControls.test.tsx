import { fireEvent, render, screen } from "@testing-library/react";
import { CanvasContextMenu } from "../CanvasContextMenu";
import { CanvasSelectionToolbar } from "../CanvasSelectionToolbar";
import { CanvasToolbar } from "../CanvasToolbar";

describe("Canvas editing controls", () => {
  it("routes every selection-toolbar action through its focused callback", () => {
    const onDuplicate = jest.fn();
    const onBringForward = jest.fn();
    const onSendBackward = jest.fn();
    const onDelete = jest.fn();
    render(
      <CanvasSelectionToolbar
        selectedCount={2}
        onDuplicate={onDuplicate}
        onBringForward={onBringForward}
        onSendBackward={onSendBackward}
        onDelete={onDelete}
      />,
    );

    expect(screen.getByTestId("canvas-selection-toolbar")).toHaveAccessibleName(
      "2 selected cards",
    );
    fireEvent.click(screen.getByTestId("canvas-duplicate-selection"));
    fireEvent.click(screen.getByTestId("canvas-bring-forward"));
    fireEvent.click(screen.getByTestId("canvas-send-backward"));
    fireEvent.click(screen.getByTestId("canvas-delete-selection"));

    expect(onDuplicate).toHaveBeenCalledTimes(1);
    expect(onBringForward).toHaveBeenCalledTimes(1);
    expect(onSendBackward).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("closes the context menu after running an action", () => {
    const onDuplicate = jest.fn();
    const onClose = jest.fn();
    render(
      <CanvasContextMenu
        position={{ x: 100, y: 120 }}
        selectedCount={1}
        onDuplicate={onDuplicate}
        onBringForward={jest.fn()}
        onSendBackward={jest.fn()}
        onDelete={jest.fn()}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByTestId("canvas-context-duplicate"));

    expect(onDuplicate).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("reflects undo and redo availability", () => {
    const onUndo = jest.fn();
    const onRedo = jest.fn();
    render(
      <CanvasToolbar
        onAddText={jest.fn()}
        canUndo
        canRedo={false}
        onUndo={onUndo}
        onRedo={onRedo}
      />,
    );

    fireEvent.click(screen.getByTestId("canvas-undo"));
    fireEvent.click(screen.getByTestId("canvas-redo"));

    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onRedo).not.toHaveBeenCalled();
    expect(screen.getByTestId("canvas-redo")).toBeDisabled();
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { CanvasContextMenu } from "../CanvasContextMenu";
import { CanvasSelectionToolbar } from "../CanvasSelectionToolbar";
import { CanvasToolbar } from "../CanvasToolbar";
import { CanvasShortcutHelp } from "../CanvasShortcutHelp";
import { CodeNodeActions } from "../nodes/CodeNodeActions";
import { ImageNodeActions } from "../nodes/ImageNodeActions";

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
    const onShowShortcuts = jest.fn();
    const onAddImage = jest.fn();
    render(
      <CanvasToolbar
        onAddText={jest.fn()}
        onAddCode={jest.fn()}
        onAddImage={onAddImage}
        canUndo
        canRedo={false}
        onUndo={onUndo}
        onRedo={onRedo}
        onShowShortcuts={onShowShortcuts}
      />,
    );

    expect(screen.getByTestId("canvas-add-code")).toHaveTextContent("Code");
    expect(screen.getByTestId("canvas-add-code")).not.toHaveTextContent("JSON");

    fireEvent.click(screen.getByTestId("canvas-undo"));
    fireEvent.click(screen.getByTestId("canvas-redo"));
    fireEvent.click(screen.getByTestId("canvas-show-shortcut-help"));
    const image = new File(["image"], "diagram.png", { type: "image/png" });
    fireEvent.change(screen.getByTestId("canvas-image-input"), {
      target: { files: [image] },
    });

    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onRedo).not.toHaveBeenCalled();
    expect(onShowShortcuts).toHaveBeenCalledTimes(1);
    expect(onAddImage).toHaveBeenCalledWith(image);
    expect(screen.getByTestId("canvas-redo")).toBeDisabled();
  });

  it("lists the available clipboard shortcuts in shortcut help", () => {
    const onClose = jest.fn();
    render(<CanvasShortcutHelp onClose={onClose} />);

    expect(screen.getByRole("dialog")).toHaveAccessibleName(
      "Canvas keyboard shortcuts",
    );
    expect(screen.getByText("Cmd/Ctrl+C")).toBeInTheDocument();
    expect(screen.getByText("Copy selected cards")).toBeInTheDocument();
    expect(screen.getByText("Cmd/Ctrl+X")).toBeInTheDocument();
    expect(screen.getByText("Cut selected cards")).toBeInTheDocument();
    expect(screen.getByText("Cmd/Ctrl+V")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Paste cards or external content (Text, Images, Links, Videos)",
      ),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("canvas-close-shortcut-help"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("routes code-card actions and exposes persistent toggle state", () => {
    const onCopy = jest.fn();
    const onFormat = jest.fn();
    const onToggleCollapsed = jest.fn();
    const onToggleWrap = jest.fn();
    const onOpenInTab = jest.fn();
    render(
      <CodeNodeActions
        collapsed
        wrap
        formatError={null}
        copyState="copied"
        onCopy={onCopy}
        onFormat={onFormat}
        onToggleCollapsed={onToggleCollapsed}
        onToggleWrap={onToggleWrap}
        onOpenInTab={onOpenInTab}
      />,
    );

    fireEvent.click(screen.getByTestId("canvas-code-copy"));
    fireEvent.click(screen.getByTestId("canvas-code-format"));
    fireEvent.click(screen.getByTestId("canvas-code-collapse"));
    fireEvent.click(screen.getByTestId("canvas-code-wrap"));
    fireEvent.click(screen.getByTestId("canvas-code-open-tab"));

    expect(onCopy).toHaveBeenCalledTimes(1);
    expect(onFormat).toHaveBeenCalledTimes(1);
    expect(onToggleCollapsed).toHaveBeenCalledTimes(1);
    expect(onToggleWrap).toHaveBeenCalledTimes(1);
    expect(onOpenInTab).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("canvas-code-copy")).toHaveAccessibleName(
      "Copied code",
    );
    expect(
      screen.getByTestId("canvas-code-copy").querySelector(".text-success"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("canvas-code-collapse")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByTestId("canvas-code-wrap")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    for (const action of screen.getAllByRole("button")) {
      expect(action).not.toHaveClass("focus:ring-primary");
      expect(action).toHaveClass("focus-visible:ring-primary");
    }
  });

  it("shows image copy success and only displays focus rings for keyboard focus", () => {
    const onCopy = jest.fn();
    render(
      <ImageNodeActions
        disabled={false}
        copyState="copied"
        onCopy={onCopy}
        onDownload={jest.fn()}
        onOpen={jest.fn()}
        onReplace={jest.fn()}
      />,
    );

    const copyButton = screen.getByTestId("canvas-image-copy");
    fireEvent.click(copyButton);

    expect(onCopy).toHaveBeenCalledTimes(1);
    expect(copyButton).toHaveAccessibleName("Copied image");
    expect(copyButton.querySelector(".text-success")).toBeInTheDocument();
    for (const action of screen.getAllByRole("button")) {
      expect(action).not.toHaveClass("focus:ring-primary");
      expect(action).toHaveClass("focus-visible:ring-primary");
    }
  });
});

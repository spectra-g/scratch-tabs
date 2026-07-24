import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ImageToolbar } from "../components/ImageToolbar";
import { ImageExportFormat } from "../utils/canvasExport";

const noop = () => {};

const defaultProps = {
  title: "test-image.png",
  zoom: 1,
  canUndo: false,
  canRedo: false,
  isModified: false,
  onZoomIn: noop,
  onZoomOut: noop,
  onFit: noop,
  onFill: noop,
  onActualSize: noop,
  onRotateCw: noop,
  onRotateCcw: noop,
  onFlipHorizontal: noop,
  onFlipVertical: noop,
  onUndo: noop,
  onRedo: noop,
  onResetEdits: noop,
  onExport: () => {},
  onCopyImage: noop,
  onDownloadOriginal: noop,
  onOpenPalette: noop,
  onSendPalette: noop,
  onBackgroundChange: noop,
};

describe("ImageToolbar", () => {
  it("renders the Copy image button", () => {
    render(<ImageToolbar {...defaultProps} />);
    expect(screen.getByRole("button", { name: "Copy image" })).toBeInTheDocument();
  });

  it("calls onCopyImage when Copy image button is clicked", () => {
    const onCopyImage = jest.fn();
    render(<ImageToolbar {...defaultProps} onCopyImage={onCopyImage} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy image" }));
    expect(onCopyImage).toHaveBeenCalledTimes(1);
  });

  it("renders the Download original button", () => {
    render(<ImageToolbar {...defaultProps} />);
    expect(screen.getByRole("button", { name: "Download original" })).toBeInTheDocument();
  });

  it("exposes Send to Canvas only when the action is available", () => {
    const onSendCanvas = jest.fn();
    const { rerender } = render(
      <ImageToolbar {...defaultProps} onSendCanvas={onSendCanvas} />,
    );

    fireEvent.click(screen.getByTestId("image-send-to-canvas"));
    expect(onSendCanvas).toHaveBeenCalledTimes(1);

    rerender(<ImageToolbar {...defaultProps} />);
    expect(screen.queryByTestId("image-send-to-canvas")).not.toBeInTheDocument();
  });
});

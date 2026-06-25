import React from "react";
import { render } from "@testing-library/react";
import { ImageStage } from "../components/ImageStage";

describe("ImageStage", () => {
  it("mounts the canvas directly without encoding it to a data URL on rerender", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 20;
    canvas.height = 10;
    const toDataUrl = jest.spyOn(canvas, "toDataURL");
    const stageRef = React.createRef<HTMLDivElement>();

    const props = {
      stageRef,
      canvas,
      viewport: { zoom: 1, offsetX: 0, offsetY: 0 },
      background: "checkerboard" as const,
      selection: null,
      onPanBy: jest.fn(),
      onWheelZoom: jest.fn(),
      onProbe: jest.fn(),
      onSelectionChange: jest.fn(),
      sampleCanvas: jest.fn(),
      onDoubleClick: jest.fn(),
    };

    const { getByTestId, rerender } = render(<ImageStage {...props} />);
    expect(getByTestId("image-rendered")).toContainElement(canvas);

    rerender(
      <ImageStage
        {...props}
        viewport={{ zoom: 2, offsetX: 12, offsetY: 8 }}
      />,
    );

    expect(toDataUrl).not.toHaveBeenCalled();
    expect(canvas.style.transform).toBe("translate(12px, 8px) scale(2)");
  });
});

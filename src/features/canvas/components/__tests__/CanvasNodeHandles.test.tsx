import { render } from "@testing-library/react";
import { CanvasNodeHandles } from "../nodes/CanvasNodeHandles";

const seen: Array<Record<string, unknown>> = [];
jest.mock("@xyflow/react", () => ({
  Handle: (props: Record<string, unknown>) => {
    seen.push(props);
    return null;
  },
  Position: { Top: "top", Bottom: "bottom", Left: "left", Right: "right" },
}));

describe("CanvasNodeHandles", () => {
  beforeEach(() => {
    seen.length = 0;
  });

  it("anchors one target and one source handle without manual connections", () => {
    render(<CanvasNodeHandles />);

    expect(seen).toEqual([
      expect.objectContaining({
        type: "target",
        position: "left",
        isConnectable: false,
      }),
      expect.objectContaining({
        type: "source",
        position: "right",
        isConnectable: false,
      }),
    ]);
  });
});

import type { CanvasTextItem } from "../../types";
import {
  canvasEdgesToFlowEdges,
  canvasItemToFlowNode,
  flowEdgesToCanvasEdges,
  updateItemFromFlowNode,
} from "../canvasFlowMapping";

const item: CanvasTextItem = {
  id: "item-1",
  type: "text",
  x: -20,
  y: 30,
  width: 280,
  height: 180,
  zIndex: 4,
  createdAt: 100,
  updatedAt: 100,
  text: "Mapped note",
};

describe("Canvas React Flow mapping", () => {
  it("maps domain geometry and ephemeral interaction state to a node", () => {
    const node = canvasItemToFlowNode(
      item,
      item.id,
      new Set([item.id]),
    );

    expect(node).toMatchObject({
      id: "item-1",
      type: "text",
      position: { x: -20, y: 30 },
      width: 280,
      height: 180,
      zIndex: 4,
      selected: true,
      draggable: false,
      data: { isEditing: true },
    });
    expect(node.data.item).toEqual(item);
    expect(node.data.item).not.toBe(item);
  });

  it("maps completed flow geometry back without changing item identity", () => {
    expect(
      updateItemFromFlowNode(
        item,
        {
          position: { x: 120, y: -80 },
          width: 360,
          height: 240,
        },
        200,
      ),
    ).toEqual({
      ...item,
      x: 120,
      y: -80,
      width: 360,
      height: 240,
      updatedAt: 200,
    });
  });

  it("round-trips edge endpoint names", () => {
    const domainEdges = [
      { id: "edge-1", sourceItemId: "item-1", targetItemId: "item-2" },
    ];
    expect(flowEdgesToCanvasEdges(canvasEdgesToFlowEdges(domainEdges))).toEqual(
      domainEdges,
    );
  });
});

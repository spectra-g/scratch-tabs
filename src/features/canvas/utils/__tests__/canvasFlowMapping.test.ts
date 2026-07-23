import type {
  CanvasCodeItem,
  CanvasImageItem,
  CanvasLinkItem,
  CanvasTextItem,
  CanvasVideoItem,
} from "../../types";
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
      item.id,
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
      data: { isEditing: true, isFocused: true },
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

  it("maps code cards to the dedicated renderer without losing settings", () => {
    const codeItem: CanvasCodeItem = {
      ...item,
      id: "code-1",
      type: "code",
      source: "const x = 1;",
      language: "javascript",
      languageLocked: true,
      collapsed: false,
      wrap: true,
    };

    const node = canvasItemToFlowNode(codeItem);

    expect(node).toMatchObject({
      id: "code-1",
      type: "code",
      data: { item: codeItem },
    });
  });

  it("maps image cards to the dedicated renderer", () => {
    const imageItem: CanvasImageItem = {
      ...item,
      id: "image-1",
      type: "image",
      assetId: "asset-1",
      altText: "Architecture",
      objectFit: "contain",
    };

    expect(canvasItemToFlowNode(imageItem)).toMatchObject({
      id: "image-1",
      type: "image",
      ariaLabel: "Image, Architecture",
      data: { item: imageItem },
    });
  });

  it("maps link and video cards to their dedicated renderers", () => {
    const linkItem: CanvasLinkItem = {
      ...item,
      id: "link-1",
      type: "link",
      canonicalUrl: "https://example.com/",
      hostname: "example.com",
    };
    const videoItem: CanvasVideoItem = {
      ...item,
      id: "video-1",
      type: "video",
      canonicalUrl: "https://vimeo.com/76979871",
      hostname: "vimeo.com",
      provider: "vimeo",
      videoId: "76979871",
    };

    expect(canvasItemToFlowNode(linkItem)).toMatchObject({
      id: "link-1",
      type: "link",
      ariaLabel: "Link card, example.com",
      data: { item: linkItem },
    });
    expect(canvasItemToFlowNode(videoItem)).toMatchObject({
      id: "video-1",
      type: "video",
      ariaLabel: "Vimeo video card, 76979871",
      data: { item: videoItem },
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

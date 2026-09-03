import { fireEvent, render, screen } from "@testing-library/react";
import type { CanvasCodeItem } from "../../types";
import { CanvasNodeInteractionContext } from "../nodes/CanvasNodeInteractionContext";
import { CodeNode } from "../nodes/CodeNode";

jest.mock("@xyflow/react", () => ({
  NodeResizer: () => null,
  Handle: () => null,
  Position: { Top: "top", Bottom: "bottom", Left: "left", Right: "right" },
}));

const baseItem: CanvasCodeItem = {
  id: "code-1",
  type: "code",
  source: '{"draggable":true}',
  language: "json",
  languageLocked: true,
  collapsed: true,
  wrap: false,
  x: 20,
  y: 30,
  width: 480,
  height: 40,
  zIndex: 1,
  createdAt: 1,
  updatedAt: 1,
};

const baseInteraction = () => ({
  beginEditing: jest.fn(),
  cancelEditing: jest.fn(),
  commitText: jest.fn(),
  commitCode: jest.fn(),
  commitImageAlt: jest.fn(),
  formatCode: jest.fn(() => ({ ok: true as const })),
  toggleCodeCollapsed: jest.fn(),
  toggleCodeWrap: jest.fn(),
  openCodeInTab: jest.fn(),
  detachDerived: jest.fn(),
  requestTransform: jest.fn(),
  replaceImage: jest.fn(),
  copyImage: jest.fn(),
  downloadImage: jest.fn(),
  openImageInSmartView: jest.fn(),
  commitResize: jest.fn(),
  preparePointerSelection: jest.fn(),
  completePointerSelection: jest.fn(),
  syncFocusedItem: jest.fn(),
});

const renderCodeNode = (item: CanvasCodeItem, interaction: ReturnType<typeof baseInteraction>) =>
  render(
    <CanvasNodeInteractionContext.Provider value={interaction}>
      <CodeNode
        id={item.id}
        data={{ item, isEditing: false, isFocused: false }}
        selected={false}
        type="code"
        dragging={false}
        draggable
        selectable
        deletable
        zIndex={1}
        isConnectable={false}
        positionAbsoluteX={item.x}
        positionAbsoluteY={item.y}
      />
    </CanvasNodeInteractionContext.Provider>,
  );

describe("CodeNode", () => {
  it("keeps a collapsed card header draggable while excluding its actions", () => {
    const interaction = baseInteraction();
    renderCodeNode(baseItem, interaction);

    expect(screen.getByTestId("canvas-code-drag-handle")).not.toHaveClass(
      "nodrag",
    );
    expect(screen.getByTestId("canvas-code-actions")).toHaveClass("nodrag");
  });

  it("opens the transform dialog from the card actions", () => {
    const interaction = baseInteraction();
    renderCodeNode({ ...baseItem, collapsed: false }, interaction);

    fireEvent.click(screen.getByTestId("canvas-code-transform"));
    expect(interaction.requestTransform).toHaveBeenCalledWith("code-1");
  });

  it("marks derived cards read-only with a detachable badge", () => {
    const interaction = baseInteraction();
    const derived: CanvasCodeItem = {
      ...baseItem,
      collapsed: false,
      source: "AEVSBG8=",
      derivedFrom: {
        sourceItemId: "src-1",
        operationId: "base64.encode",
        operationName: "Base64 encode",
        params: {},
      },
    };
    renderCodeNode(derived, interaction);

    expect(screen.getByTestId("canvas-item-code-1")).toHaveAttribute(
      "data-derived",
      "true",
    );
    expect(screen.getByTestId("canvas-code-derived-badge")).toHaveTextContent(
      "Base64 encode",
    );
    expect(screen.queryByTestId("canvas-code-editor")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("canvas-code-detach"));
    expect(interaction.detachDerived).toHaveBeenCalledWith("code-1");
  });

  it("shows transform errors on the derived badge", () => {
    renderCodeNode(
      {
        ...baseItem,
        collapsed: false,
        derivedFrom: {
          sourceItemId: "src-1",
          operationId: "test.op",
          operationName: "Upper",
          params: {},
        },
        transformError: "bad query",
      },
      baseInteraction(),
    );

    expect(screen.getByTestId("canvas-code-derived-badge")).toHaveTextContent(
      "bad query",
    );
  });
});

import { render, screen } from "@testing-library/react";
import type { CanvasCodeItem } from "../../types";
import { CanvasNodeInteractionContext } from "../nodes/CanvasNodeInteractionContext";
import { CodeNode } from "../nodes/CodeNode";

jest.mock("@xyflow/react", () => ({
  NodeResizer: () => null,
}));

describe("CodeNode", () => {
  it("keeps a collapsed card header draggable while excluding its actions", () => {
    const item: CanvasCodeItem = {
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
    const interaction = {
      beginEditing: jest.fn(),
      cancelEditing: jest.fn(),
      commitText: jest.fn(),
      commitCode: jest.fn(),
      commitImageAlt: jest.fn(),
      formatCode: jest.fn(() => ({ ok: true as const })),
      toggleCodeCollapsed: jest.fn(),
      toggleCodeWrap: jest.fn(),
      openCodeInTab: jest.fn(),
      replaceImage: jest.fn(),
      copyImage: jest.fn(),
      downloadImage: jest.fn(),
      openImageInSmartView: jest.fn(),
      commitResize: jest.fn(),
      preparePointerSelection: jest.fn(),
      completePointerSelection: jest.fn(),
      syncFocusedItem: jest.fn(),
    };

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

    expect(screen.getByTestId("canvas-code-drag-handle")).not.toHaveClass(
      "nodrag",
    );
    expect(screen.getByTestId("canvas-code-actions")).toHaveClass("nodrag");
  });
});

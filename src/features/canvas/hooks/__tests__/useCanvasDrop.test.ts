import { act, renderHook } from "@testing-library/react";
import type { DragEvent } from "react";
import { useCanvasDrop } from "../useCanvasDrop";
import { normalizeCanvasDataTransfer } from "../../utils/clipboardClassification";
import { isCanvasEditableEvent } from "../../utils/canvasKeyboard";

jest.mock("../../utils/clipboardClassification", () => ({
  normalizeCanvasDataTransfer: jest.fn(() => []),
}));

jest.mock("../../utils/canvasKeyboard", () => ({
  isCanvasEditableEvent: jest.fn(() => false),
}));

const mockNormalize = normalizeCanvasDataTransfer as jest.Mock;
const mockIsEditable = isCanvasEditableEvent as jest.Mock;

const createDragEvent = (
  overrides: Record<string, unknown> = {},
): DragEvent<HTMLDivElement> =>
  ({
    nativeEvent: { composedPath: () => [] },
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    dataTransfer: { dropEffect: "none", items: [] },
    clientX: 10,
    clientY: 20,
    ...overrides,
  }) as unknown as DragEvent<HTMLDivElement>;

describe("useCanvasDrop", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNormalize.mockReturnValue([]);
    mockIsEditable.mockReturnValue(false);
  });

  const renderCanvasDrop = () => {
    const rememberPointer = jest.fn();
    const ingestInputs = jest.fn().mockResolvedValue(undefined);
    const hook = renderHook(() =>
      useCanvasDrop({ rememberPointer, ingestInputs }),
    );
    return { ...hook, rememberPointer, ingestInputs };
  };

  it("marks the canvas as an active drop target while dragging over it", () => {
    const { result } = renderCanvasDrop();
    expect(result.current.isDragOver).toBe(false);

    const event = createDragEvent();
    act(() => {
      result.current.handleDragOver(event);
    });

    expect(result.current.isDragOver).toBe(true);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(event.stopPropagation).toHaveBeenCalledTimes(1);
    expect(event.dataTransfer!.dropEffect).toBe("copy");
  });

  it("stays active while moving across nested elements inside the canvas", () => {
    const { result } = renderCanvasDrop();

    act(() => {
      result.current.handleDragOver(createDragEvent());
      result.current.handleDragLeave(
        createDragEvent({
          currentTarget: { contains: () => true },
          relatedTarget: {},
        }),
      );
    });

    expect(result.current.isDragOver).toBe(true);
  });

  it("clears the active state once the drag leaves the canvas", () => {
    const { result } = renderCanvasDrop();

    act(() => {
      result.current.handleDragOver(createDragEvent());
      result.current.handleDragLeave(
        createDragEvent({
          currentTarget: { contains: () => false },
          relatedTarget: null,
        }),
      );
    });

    expect(result.current.isDragOver).toBe(false);
  });

  it("ingests dropped inputs and clears the active state", async () => {
    const { result, rememberPointer, ingestInputs } = renderCanvasDrop();
    const inputs = [{ kind: "text" as const, text: "hello" }];
    mockNormalize.mockReturnValue(inputs);

    result.current.handleDragOver(createDragEvent());
    const event = createDragEvent();
    act(() => {
      result.current.handleDrop(event);
    });

    expect(result.current.isDragOver).toBe(false);
    expect(rememberPointer).toHaveBeenCalledWith({ x: 10, y: 20 });
    expect(mockNormalize).toHaveBeenCalledWith(event.dataTransfer);
    expect(ingestInputs).toHaveBeenCalledWith(inputs);
    await Promise.resolve();
  });

  it("ignores drags that start inside editable elements", () => {
    mockIsEditable.mockReturnValue(true);
    const { result } = renderCanvasDrop();

    const overEvent = createDragEvent();
    act(() => {
      result.current.handleDragOver(overEvent);
    });
    const dropEvent = createDragEvent();
    act(() => {
      result.current.handleDrop(dropEvent);
    });

    expect(result.current.isDragOver).toBe(false);
    expect(overEvent.stopPropagation).toHaveBeenCalledTimes(1);
    expect(overEvent.preventDefault).not.toHaveBeenCalled();
    expect(dropEvent.stopPropagation).toHaveBeenCalledTimes(1);
    expect(dropEvent.preventDefault).not.toHaveBeenCalled();
  });
});

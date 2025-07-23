import { renderHook, act } from "@testing-library/react";
import { useMouseEventCoordinator } from "../useMouseEventCoordinator";
import { Shape, ShapeSnapTool } from "../../types";

// Mock the individual handlers
jest.mock("../useDragHandler");
jest.mock("../useResizeHandler");
jest.mock("../useLineResizeHandler");
jest.mock("../useArrowTipHandler");
jest.mock("../useClickHandler");

const mockDragHandler = {
  startDrag: jest.fn(),
  updateDrag: jest.fn(),
  endDrag: jest.fn(),
  isDragging: false,
  draggedShape: null,
  dragGuides: null,
  dragState: {
    draggingShapeId: null,
    dragOffset: null,
    draggedShape: null,
    hasMoved: false,
    dragGuides: null,
  },
};

const mockResizeHandler = {
  detectResizeHandle: jest.fn(),
  startResize: jest.fn(),
  updateResize: jest.fn(),
  endResize: jest.fn(),
  isResizing: false,
  resizeHandle: null,
  resizeState: { resizeMode: null, resizeHandle: null, resizeStartData: null },
};

const mockLineResizeHandler = {
  detectLineDragMode: jest.fn(),
  startLineResize: jest.fn(),
  updateLineResize: jest.fn(),
  endLineResize: jest.fn(),
  isLineResizing: false,
  lineResizeState: { isLineResizing: false },
};

const mockArrowTipHandler = {
  detectArrowTipClick: jest.fn(),
  handleArrowTipClick: jest.fn(),
};

const mockClickHandler = {
  handleShapeClick: jest.fn(),
  handleLabelSave: jest.fn(),
  handleLabelCancel: jest.fn(),
  handleCanvasDoubleClick: jest.fn(),
  setEditingShape: jest.fn(),
  setSelectedShapeId: jest.fn(),
  editingShape: null,
  selectedShapeId: undefined,
  clickState: { selectedShapeId: undefined, editingShape: null },
};

// Import the mocked modules
const { useDragHandler } = require("../useDragHandler");
const { useResizeHandler } = require("../useResizeHandler");
const { useLineResizeHandler } = require("../useLineResizeHandler");
const { useArrowTipHandler } = require("../useArrowTipHandler");
const { useClickHandler } = require("../useClickHandler");

// Setup mocks
useDragHandler.mockReturnValue(mockDragHandler);
useResizeHandler.mockReturnValue(mockResizeHandler);
useLineResizeHandler.mockReturnValue(mockLineResizeHandler);
useArrowTipHandler.mockReturnValue(mockArrowTipHandler);
useClickHandler.mockReturnValue(mockClickHandler);

describe("useMouseEventCoordinator", () => {
  const mockShapes: Shape[] = [
    {
      id: "shape-1",
      type: "rectangle",
      x: 100,
      y: 100,
      width: 50,
      height: 30,
      style: { stroke: "#000", fill: "transparent", strokeWidth: 2 },
      zIndex: 1,
    } as Shape,
  ];

  const mockCanvasSettings = { mode: "light" };
  const mockOnUpdateShape = jest.fn();
  const mockOnShapeClick = jest.fn();
  const mockOnUpdateLabel = jest.fn();
  const mockOnDeleteShape = jest.fn();
  const mockOnAddShape = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Double-click handling", () => {
    it("should handle shape double-click in draw mode", () => {
      const { result } = renderHook(() =>
        useMouseEventCoordinator({
          shapes: mockShapes,
          canvasSettings: mockCanvasSettings,
          currentTool: "draw" as ShapeSnapTool,
          onUpdateShape: mockOnUpdateShape,
          onShapeClick: mockOnShapeClick,
          onUpdateLabel: mockOnUpdateLabel,
          onDeleteShape: mockOnDeleteShape,
          onAddShape: mockOnAddShape,
        }),
      );

      act(() => {
        result.current.handleShapeDoubleClick(mockShapes[0]);
      });

      expect(mockClickHandler.setEditingShape).toHaveBeenCalledWith(
        mockShapes[0],
      );
    });

    it("should handle shape double-click in select mode", () => {
      const { result } = renderHook(() =>
        useMouseEventCoordinator({
          shapes: mockShapes,
          canvasSettings: mockCanvasSettings,
          currentTool: "select" as ShapeSnapTool,
          onUpdateShape: mockOnUpdateShape,
          onShapeClick: mockOnShapeClick,
          onUpdateLabel: mockOnUpdateLabel,
          onDeleteShape: mockOnDeleteShape,
          onAddShape: mockOnAddShape,
        }),
      );

      act(() => {
        result.current.handleShapeDoubleClick(mockShapes[0]);
      });

      expect(mockClickHandler.setEditingShape).toHaveBeenCalledWith(mockShapes[0]);
    });

    it("should handle canvas double-click", () => {
      const { result } = renderHook(() =>
        useMouseEventCoordinator({
          shapes: mockShapes,
          canvasSettings: mockCanvasSettings,
          currentTool: "draw" as ShapeSnapTool,
          onUpdateShape: mockOnUpdateShape,
          onShapeClick: mockOnShapeClick,
          onUpdateLabel: mockOnUpdateLabel,
          onDeleteShape: mockOnDeleteShape,
          onAddShape: mockOnAddShape,
        }),
      );

      const mockEvent = {
        nativeEvent: { offsetX: 100, offsetY: 100 },
      } as React.MouseEvent;

      act(() => {
        result.current.handleCanvasDoubleClick(mockEvent);
      });

      expect(mockClickHandler.handleCanvasDoubleClick).toHaveBeenCalledWith(
        mockEvent,
      );
    });
  });

  describe("Shape mouse down handling", () => {
    it("should handle arrow tip click", () => {
      mockArrowTipHandler.detectArrowTipClick.mockReturnValue({
        isArrowTipClick: true,
        arrowTipMode: "resize-start",
      });

      const { result } = renderHook(() =>
        useMouseEventCoordinator({
          shapes: mockShapes,
          canvasSettings: mockCanvasSettings,
          currentTool: "select" as ShapeSnapTool,
          onUpdateShape: mockOnUpdateShape,
          onShapeClick: mockOnShapeClick,
          onUpdateLabel: mockOnUpdateLabel,
          onDeleteShape: mockOnDeleteShape,
          onAddShape: mockOnAddShape,
        }),
      );

      const mockEvent = {
        nativeEvent: { offsetX: 100, offsetY: 100 },
      } as React.MouseEvent;

      act(() => {
        result.current.handleShapeMouseDown(mockShapes[0], mockEvent);
      });

      expect(mockArrowTipHandler.detectArrowTipClick).toHaveBeenCalledWith(
        mockShapes[0],
        { x: 100, y: 100 },
      );
    });

    it("should handle resize handle detection", () => {
      mockArrowTipHandler.detectArrowTipClick.mockReturnValue({
        isArrowTipClick: false,
      });
      mockResizeHandler.detectResizeHandle.mockReturnValue("se");

      const { result } = renderHook(() =>
        useMouseEventCoordinator({
          shapes: mockShapes,
          canvasSettings: mockCanvasSettings,
          currentTool: "select" as ShapeSnapTool,
          onUpdateShape: mockOnUpdateShape,
          onShapeClick: mockOnShapeClick,
          onUpdateLabel: mockOnUpdateLabel,
          onDeleteShape: mockOnDeleteShape,
          onAddShape: mockOnAddShape,
        }),
      );

      const mockEvent = {
        nativeEvent: { offsetX: 100, offsetY: 100 },
      } as React.MouseEvent;

      act(() => {
        result.current.handleShapeMouseDown(mockShapes[0], mockEvent);
      });

      expect(mockResizeHandler.detectResizeHandle).toHaveBeenCalledWith(
        mockShapes[0],
        { x: 100, y: 100 },
      );
      expect(mockResizeHandler.startResize).toHaveBeenCalledWith(
        mockShapes[0],
        { x: 100, y: 100 },
        "se",
      );
    });

    it("should handle line resize detection", () => {
      const lineShape: Shape = {
        id: "line-1",
        type: "line",
        points: [
          { x: 100, y: 100 },
          { x: 200, y: 200 },
        ],
        style: { stroke: "#000", fill: "transparent", strokeWidth: 2 },
        zIndex: 1,
      };
      mockArrowTipHandler.detectArrowTipClick.mockReturnValue({
        isArrowTipClick: false,
      });
      mockResizeHandler.detectResizeHandle.mockReturnValue(null);
      mockLineResizeHandler.detectLineDragMode.mockReturnValue("resize-start");

      const { result } = renderHook(() =>
        useMouseEventCoordinator({
          shapes: [lineShape],
          canvasSettings: mockCanvasSettings,
          currentTool: "select" as ShapeSnapTool,
          onUpdateShape: mockOnUpdateShape,
          onShapeClick: mockOnShapeClick,
          onUpdateLabel: mockOnUpdateLabel,
          onDeleteShape: mockOnDeleteShape,
          onAddShape: mockOnAddShape,
        }),
      );

      const mockEvent = {
        nativeEvent: { offsetX: 100, offsetY: 100 },
      } as React.MouseEvent;

      act(() => {
        result.current.handleShapeMouseDown(lineShape, mockEvent);
      });

      expect(mockLineResizeHandler.detectLineDragMode).toHaveBeenCalledWith(
        lineShape,
        { x: 100, y: 100 },
      );
      expect(mockLineResizeHandler.startLineResize).toHaveBeenCalledWith(
        lineShape,
        { x: 100, y: 100 },
      );
    });

    it("should handle drag operation as default", () => {
      mockArrowTipHandler.detectArrowTipClick.mockReturnValue({
        isArrowTipClick: false,
      });
      mockResizeHandler.detectResizeHandle.mockReturnValue(null);

      const { result } = renderHook(() =>
        useMouseEventCoordinator({
          shapes: mockShapes,
          canvasSettings: mockCanvasSettings,
          currentTool: "select" as ShapeSnapTool,
          onUpdateShape: mockOnUpdateShape,
          onShapeClick: mockOnShapeClick,
          onUpdateLabel: mockOnUpdateLabel,
          onDeleteShape: mockOnDeleteShape,
          onAddShape: mockOnAddShape,
        }),
      );

      const mockEvent = {
        nativeEvent: { offsetX: 100, offsetY: 100 },
      } as React.MouseEvent;

      act(() => {
        result.current.handleShapeMouseDown(mockShapes[0], mockEvent);
      });

      expect(mockDragHandler.startDrag).toHaveBeenCalledWith(mockShapes[0], {
        x: 100,
        y: 100,
      });
    });
  });

  describe("Mouse move handling", () => {
    it("should handle resize operations during mouse move", () => {
      mockResizeHandler.isResizing = true;

      const { result } = renderHook(() =>
        useMouseEventCoordinator({
          shapes: mockShapes,
          canvasSettings: mockCanvasSettings,
          currentTool: "select" as ShapeSnapTool,
          onUpdateShape: mockOnUpdateShape,
          onShapeClick: mockOnShapeClick,
          onUpdateLabel: mockOnUpdateLabel,
          onDeleteShape: mockOnDeleteShape,
          onAddShape: mockOnAddShape,
        }),
      );

      const mockEvent = {
        nativeEvent: { offsetX: 150, offsetY: 150 },
      } as React.MouseEvent;

      act(() => {
        result.current.handleMouseMove(mockEvent);
      });

      expect(mockResizeHandler.updateResize).toHaveBeenCalledWith({
        x: 150,
        y: 150,
      });
    });

    it("should handle line resize operations during mouse move", () => {
      mockLineResizeHandler.isLineResizing = true;
      mockResizeHandler.isResizing = false;
      mockDragHandler.isDragging = false;

      const { result } = renderHook(() =>
        useMouseEventCoordinator({
          shapes: mockShapes,
          canvasSettings: mockCanvasSettings,
          currentTool: "select" as ShapeSnapTool,
          onUpdateShape: mockOnUpdateShape,
          onShapeClick: mockOnShapeClick,
          onUpdateLabel: mockOnUpdateLabel,
          onDeleteShape: mockOnDeleteShape,
          onAddShape: mockOnAddShape,
        }),
      );

      const mockEvent = {
        nativeEvent: { offsetX: 150, offsetY: 150 },
      } as React.MouseEvent;

      act(() => {
        result.current.handleMouseMove(mockEvent);
      });

      expect(mockLineResizeHandler.updateLineResize).toHaveBeenCalledWith({
        x: 150,
        y: 150,
      });
    });

    it("should handle drag operations during mouse move", () => {
      mockDragHandler.isDragging = true;
      mockResizeHandler.isResizing = false;
      mockLineResizeHandler.isLineResizing = false;

      const { result } = renderHook(() =>
        useMouseEventCoordinator({
          shapes: mockShapes,
          canvasSettings: mockCanvasSettings,
          currentTool: "select" as ShapeSnapTool,
          onUpdateShape: mockOnUpdateShape,
          onShapeClick: mockOnShapeClick,
          onUpdateLabel: mockOnUpdateLabel,
          onDeleteShape: mockOnDeleteShape,
          onAddShape: mockOnAddShape,
        }),
      );

      const mockEvent = {
        nativeEvent: { offsetX: 150, offsetY: 150 },
      } as React.MouseEvent;

      act(() => {
        result.current.handleMouseMove(mockEvent);
      });

      expect(mockDragHandler.updateDrag).toHaveBeenCalledWith({
        x: 150,
        y: 150,
      });
    });
  });

  describe("Mouse up handling", () => {
    it("should handle resize end", () => {
      mockResizeHandler.isResizing = true;

      const { result } = renderHook(() =>
        useMouseEventCoordinator({
          shapes: mockShapes,
          canvasSettings: mockCanvasSettings,
          currentTool: "select" as ShapeSnapTool,
          onUpdateShape: mockOnUpdateShape,
          onShapeClick: mockOnShapeClick,
          onUpdateLabel: mockOnUpdateLabel,
          onDeleteShape: mockOnDeleteShape,
          onAddShape: mockOnAddShape,
        }),
      );

      const mockEvent = {
        nativeEvent: { offsetX: 150, offsetY: 150 },
      } as React.MouseEvent;

      act(() => {
        result.current.handleMouseUp(mockEvent);
      });

      expect(mockResizeHandler.endResize).toHaveBeenCalledWith({
        x: 150,
        y: 150,
      });
    });

    it("should handle line resize end", () => {
      mockLineResizeHandler.isLineResizing = true;
      mockResizeHandler.isResizing = false;
      mockDragHandler.isDragging = false;

      const { result } = renderHook(() =>
        useMouseEventCoordinator({
          shapes: mockShapes,
          canvasSettings: mockCanvasSettings,
          currentTool: "select" as ShapeSnapTool,
          onUpdateShape: mockOnUpdateShape,
          onShapeClick: mockOnShapeClick,
          onUpdateLabel: mockOnUpdateLabel,
          onDeleteShape: mockOnDeleteShape,
          onAddShape: mockOnAddShape,
        }),
      );

      const mockEvent = {
        nativeEvent: { offsetX: 150, offsetY: 150 },
      } as React.MouseEvent;

      act(() => {
        result.current.handleMouseUp(mockEvent);
      });

      expect(mockLineResizeHandler.endLineResize).toHaveBeenCalledWith();
    });

    it("should handle drag end", () => {
      mockDragHandler.isDragging = true;
      mockResizeHandler.isResizing = false;
      mockLineResizeHandler.isLineResizing = false;
      mockDragHandler.endDrag.mockReturnValue({ wasClick: false });

      const { result } = renderHook(() =>
        useMouseEventCoordinator({
          shapes: mockShapes,
          canvasSettings: mockCanvasSettings,
          currentTool: "select" as ShapeSnapTool,
          onUpdateShape: mockOnUpdateShape,
          onShapeClick: mockOnShapeClick,
          onUpdateLabel: mockOnUpdateLabel,
          onDeleteShape: mockOnDeleteShape,
          onAddShape: mockOnAddShape,
        }),
      );

      const mockEvent = {
        nativeEvent: { offsetX: 150, offsetY: 150 },
      } as React.MouseEvent;

      act(() => {
        result.current.handleMouseUp(mockEvent);
      });

      expect(mockDragHandler.endDrag).toHaveBeenCalledWith({ x: 150, y: 150 });
    });
  });

  describe("Label handling", () => {
    it("should handle label save", () => {
      const { result } = renderHook(() =>
        useMouseEventCoordinator({
          shapes: mockShapes,
          canvasSettings: mockCanvasSettings,
          currentTool: "draw" as ShapeSnapTool,
          onUpdateShape: mockOnUpdateShape,
          onShapeClick: mockOnShapeClick,
          onUpdateLabel: mockOnUpdateLabel,
          onDeleteShape: mockOnDeleteShape,
          onAddShape: mockOnAddShape,
        }),
      );

      act(() => {
        result.current.handleLabelSave("shape-1", "New Label");
      });

      expect(mockClickHandler.handleLabelSave).toHaveBeenCalledWith(
        "shape-1",
        "New Label",
      );
    });

    it("should handle label cancel", () => {
      const { result } = renderHook(() =>
        useMouseEventCoordinator({
          shapes: mockShapes,
          canvasSettings: mockCanvasSettings,
          currentTool: "draw" as ShapeSnapTool,
          onUpdateShape: mockOnUpdateShape,
          onShapeClick: mockOnShapeClick,
          onUpdateLabel: mockOnUpdateLabel,
          onDeleteShape: mockOnDeleteShape,
          onAddShape: mockOnAddShape,
        }),
      );

      act(() => {
        result.current.handleLabelCancel();
      });

      expect(mockClickHandler.handleLabelCancel).toHaveBeenCalled();
    });
  });
});

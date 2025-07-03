import { renderHook, act } from '@testing-library/react';
import { useClickHandler } from '../hooks/useClickHandler';
import { Shape, Point, ShapeSnapTool } from '../types';

// Mock the shape detection utility
jest.mock('../utils/shapeDetection', () => ({
  detectShape: jest.fn()
}));

import { detectShape } from '../utils/shapeDetection';

describe('useClickHandler', () => {
  const mockShapes: Shape[] = [
    {
      id: 'rect-1',
      type: 'rectangle',
      x: 100,
      y: 100,
      width: 50,
      height: 30,
      style: { stroke: '#000', fill: 'transparent', strokeWidth: 2 },
      zIndex: 1
    } as Shape,
    {
      id: 'text-1',
      type: 'text',
      x: 200,
      y: 200,
      text: 'Sample text',
      fontSize: 16,
      style: { stroke: 'transparent', fill: '#000', strokeWidth: 0 },
      zIndex: 2
    } as Shape
  ];

  const mockOnShapeClick = jest.fn();
  const mockOnUpdateLabel = jest.fn();
  const mockOnAddShape = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (detectShape as jest.Mock).mockReturnValue(null);
  });

  describe('initial state', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() =>
        useClickHandler({
          shapes: mockShapes,
          currentTool: 'select',
          onShapeClick: mockOnShapeClick,
          onUpdateLabel: mockOnUpdateLabel,
          onAddShape: mockOnAddShape
        })
      );

      expect(result.current.clickState).toEqual({
        selectedShapeId: undefined,
        editingShape: null
      });
      expect(result.current.selectedShapeId).toBe(undefined);
      expect(result.current.editingShape).toBe(null);
    });
  });

  describe('handleShapeClick', () => {
    it('should handle shape click and update selection', () => {
      const { result } = renderHook(() =>
        useClickHandler({
          shapes: mockShapes,
          currentTool: 'select',
          onShapeClick: mockOnShapeClick,
          onUpdateLabel: mockOnUpdateLabel,
          onAddShape: mockOnAddShape
        })
      );

      const shape = mockShapes[0];
      const position = { x: 125, y: 115 };

      act(() => {
        result.current.handleShapeClick(shape, position);
      });

      expect(result.current.selectedShapeId).toBe('rect-1');
      expect(result.current.editingShape).toBe(null);
      expect(mockOnShapeClick).toHaveBeenCalledWith(shape, position);
    });

    it('should handle shape click without onShapeClick callback', () => {
      const { result } = renderHook(() =>
        useClickHandler({
          shapes: mockShapes,
          currentTool: 'select',
          onUpdateLabel: mockOnUpdateLabel,
          onAddShape: mockOnAddShape
        })
      );

      const shape = mockShapes[0];
      const position = { x: 125, y: 115 };

      act(() => {
        result.current.handleShapeClick(shape, position);
      });

      expect(result.current.selectedShapeId).toBe('rect-1');
      expect(result.current.editingShape).toBe(null);
    });
  });

  describe('handleLabelSave', () => {
    it('should save label and clear editing state', () => {
      const { result } = renderHook(() =>
        useClickHandler({
          shapes: mockShapes,
          currentTool: 'select',
          onShapeClick: mockOnShapeClick,
          onUpdateLabel: mockOnUpdateLabel,
          onAddShape: mockOnAddShape
        })
      );

      // Set editing state first
      act(() => {
        result.current.setEditingShape(mockShapes[1]);
      });

      expect(result.current.editingShape).toBe(mockShapes[1]);

      // Save label
      act(() => {
        result.current.handleLabelSave('text-1', 'Updated text');
      });

      expect(mockOnUpdateLabel).toHaveBeenCalledWith('text-1', 'Updated text');
      expect(result.current.editingShape).toBe(null);
    });

    it('should handle label save without onUpdateLabel callback', () => {
      const { result } = renderHook(() =>
        useClickHandler({
          shapes: mockShapes,
          currentTool: 'select',
          onShapeClick: mockOnShapeClick,
          onAddShape: mockOnAddShape
        })
      );

      // Set editing state first
      act(() => {
        result.current.setEditingShape(mockShapes[1]);
      });

      // Save label
      act(() => {
        result.current.handleLabelSave('text-1', 'Updated text');
      });

      expect(result.current.editingShape).toBe(null);
    });
  });

  describe('handleLabelCancel', () => {
    it('should clear editing state', () => {
      const { result } = renderHook(() =>
        useClickHandler({
          shapes: mockShapes,
          currentTool: 'select',
          onShapeClick: mockOnShapeClick,
          onUpdateLabel: mockOnUpdateLabel,
          onAddShape: mockOnAddShape
        })
      );

      // Set editing state first
      act(() => {
        result.current.setEditingShape(mockShapes[1]);
      });

      expect(result.current.editingShape).toBe(mockShapes[1]);

      // Cancel editing
      act(() => {
        result.current.handleLabelCancel();
      });

      expect(result.current.editingShape).toBe(null);
    });
  });

  describe('handleCanvasDoubleClick', () => {
    it('should create text shape when text tool is active', () => {
      const { result } = renderHook(() =>
        useClickHandler({
          shapes: mockShapes,
          currentTool: 'text',
          currentFontSize: 18,
          onShapeClick: mockOnShapeClick,
          onUpdateLabel: mockOnUpdateLabel,
          onAddShape: mockOnAddShape
        })
      );

      const mockEvent = {
        nativeEvent: {
          offsetX: 150,
          offsetY: 150
        }
      } as React.MouseEvent;

      act(() => {
        result.current.handleCanvasDoubleClick(mockEvent);
      });

      expect(mockOnAddShape).toHaveBeenCalledWith(expect.objectContaining({
        type: 'text',
        x: 150,
        y: 150,
        text: 'Double-click to edit',
        fontSize: 18
      }));

      // Should start editing the new text shape
      expect(result.current.selectedShapeId).toBeDefined();
      expect(result.current.editingShape).toBeDefined();
    });

    it('should not create text shape when text tool is not active', () => {
      const { result } = renderHook(() =>
        useClickHandler({
          shapes: mockShapes,
          currentTool: 'select',
          onShapeClick: mockOnShapeClick,
          onUpdateLabel: mockOnUpdateLabel,
          onAddShape: mockOnAddShape
        })
      );

      const mockEvent = {
        nativeEvent: {
          offsetX: 150,
          offsetY: 150
        }
      } as React.MouseEvent;

      act(() => {
        result.current.handleCanvasDoubleClick(mockEvent);
      });

      expect(mockOnAddShape).not.toHaveBeenCalled();
    });

    it('should use default font size when not provided', () => {
      const { result } = renderHook(() =>
        useClickHandler({
          shapes: mockShapes,
          currentTool: 'text',
          onShapeClick: mockOnShapeClick,
          onUpdateLabel: mockOnUpdateLabel,
          onAddShape: mockOnAddShape
        })
      );

      const mockEvent = {
        nativeEvent: {
          offsetX: 150,
          offsetY: 150
        }
      } as React.MouseEvent;

      act(() => {
        result.current.handleCanvasDoubleClick(mockEvent);
      });

      expect(mockOnAddShape).toHaveBeenCalledWith(expect.objectContaining({
        fontSize: 16 // Default font size
      }));
    });
  });

  describe('handleShapeDoubleClick', () => {
    it('should start editing text shapes', () => {
      const { result } = renderHook(() =>
        useClickHandler({
          shapes: mockShapes,
          currentTool: 'select',
          onShapeClick: mockOnShapeClick,
          onUpdateLabel: mockOnUpdateLabel,
          onAddShape: mockOnAddShape
        })
      );

      const textShape = mockShapes[1];

      act(() => {
        result.current.handleShapeDoubleClick(textShape);
      });

      expect(result.current.selectedShapeId).toBe('text-1');
      expect(result.current.editingShape).toBe(textShape);
    });

    it('should not start editing non-text shapes', () => {
      const { result } = renderHook(() =>
        useClickHandler({
          shapes: mockShapes,
          currentTool: 'select',
          onShapeClick: mockOnShapeClick,
          onUpdateLabel: mockOnUpdateLabel,
          onAddShape: mockOnAddShape
        })
      );

      const rectShape = mockShapes[0];

      act(() => {
        result.current.handleShapeDoubleClick(rectShape);
      });

      expect(result.current.selectedShapeId).toBe(undefined);
      expect(result.current.editingShape).toBe(null);
    });
  });

  describe('handleDrawingClick', () => {
    it('should create shape when draw tool is active and shape is detected', () => {
      const detectedShape = {
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 50,
        height: 30
      };

      (detectShape as jest.Mock).mockReturnValue(detectedShape);

      const { result } = renderHook(() =>
        useClickHandler({
          shapes: mockShapes,
          currentTool: 'draw',
          onShapeClick: mockOnShapeClick,
          onUpdateLabel: mockOnUpdateLabel,
          onAddShape: mockOnAddShape
        })
      );

      const points = [{ x: 100, y: 100 }, { x: 150, y: 130 }];

      let createdShape: Shape | null = null;

      act(() => {
        createdShape = result.current.handleDrawingClick(points);
      });

      expect(detectShape).toHaveBeenCalledWith(points);
      expect(mockOnAddShape).toHaveBeenCalledWith(expect.objectContaining({
        ...detectedShape,
        id: expect.any(String),
        style: {
          stroke: '#000000',
          fill: 'transparent',
          strokeWidth: 2,
        },
        zIndex: expect.any(Number)
      }));
      expect(createdShape).toBeDefined();
    });

    it('should add arrow tip to straight lines', () => {
      const detectedLine = {
        type: 'line',
        points: [{ x: 100, y: 100 }, { x: 200, y: 200 }]
      };

      (detectShape as jest.Mock).mockReturnValue(detectedLine);

      const { result } = renderHook(() =>
        useClickHandler({
          shapes: mockShapes,
          currentTool: 'draw',
          onShapeClick: mockOnShapeClick,
          onUpdateLabel: mockOnUpdateLabel,
          onAddShape: mockOnAddShape
        })
      );

      const points = [{ x: 100, y: 100 }, { x: 200, y: 200 }];

      act(() => {
        result.current.handleDrawingClick(points);
      });

      expect(mockOnAddShape).toHaveBeenCalledWith(expect.objectContaining({
        ...detectedLine,
        arrowTipEnd: 'simple',
        arrowTipSize: 10
      }));
    });

    it('should not create shape when draw tool is not active', () => {
      const { result } = renderHook(() =>
        useClickHandler({
          shapes: mockShapes,
          currentTool: 'select',
          onShapeClick: mockOnShapeClick,
          onUpdateLabel: mockOnUpdateLabel,
          onAddShape: mockOnAddShape
        })
      );

      const points = [{ x: 100, y: 100 }, { x: 150, y: 130 }];

      let createdShape: Shape | null = null;

      act(() => {
        createdShape = result.current.handleDrawingClick(points);
      });

      expect(detectShape).not.toHaveBeenCalled();
      expect(mockOnAddShape).not.toHaveBeenCalled();
      expect(createdShape).toBe(null);
    });

    it('should not create shape when no shape is detected', () => {
      (detectShape as jest.Mock).mockReturnValue(null);

      const { result } = renderHook(() =>
        useClickHandler({
          shapes: mockShapes,
          currentTool: 'draw',
          onShapeClick: mockOnShapeClick,
          onUpdateLabel: mockOnUpdateLabel,
          onAddShape: mockOnAddShape
        })
      );

      const points = [{ x: 100, y: 100 }, { x: 150, y: 130 }];

      let createdShape: Shape | null = null;

      act(() => {
        createdShape = result.current.handleDrawingClick(points);
      });

      expect(detectShape).toHaveBeenCalledWith(points);
      expect(mockOnAddShape).not.toHaveBeenCalled();
      expect(createdShape).toBe(null);
    });
  });

  describe('setters', () => {
    it('should set selected shape ID', () => {
      const { result } = renderHook(() =>
        useClickHandler({
          shapes: mockShapes,
          currentTool: 'select',
          onShapeClick: mockOnShapeClick,
          onUpdateLabel: mockOnUpdateLabel,
          onAddShape: mockOnAddShape
        })
      );

      act(() => {
        result.current.setSelectedShapeId('rect-1');
      });

      expect(result.current.selectedShapeId).toBe('rect-1');
    });

    it('should set editing shape', () => {
      const { result } = renderHook(() =>
        useClickHandler({
          shapes: mockShapes,
          currentTool: 'select',
          onShapeClick: mockOnShapeClick,
          onUpdateLabel: mockOnUpdateLabel,
          onAddShape: mockOnAddShape
        })
      );

      const textShape = mockShapes[1];

      act(() => {
        result.current.setEditingShape(textShape);
      });

      expect(result.current.editingShape).toBe(textShape);
    });

    it('should clear editing shape when set to null', () => {
      const { result } = renderHook(() =>
        useClickHandler({
          shapes: mockShapes,
          currentTool: 'select',
          onShapeClick: mockOnShapeClick,
          onUpdateLabel: mockOnUpdateLabel,
          onAddShape: mockOnAddShape
        })
      );

      // Set editing shape first
      act(() => {
        result.current.setEditingShape(mockShapes[1]);
      });

      expect(result.current.editingShape).toBe(mockShapes[1]);

      // Clear it
      act(() => {
        result.current.setEditingShape(null);
      });

      expect(result.current.editingShape).toBe(null);
    });
  });

  describe('ID generation', () => {
    it('should generate unique IDs for new shapes', () => {
      const { result } = renderHook(() =>
        useClickHandler({
          shapes: mockShapes,
          currentTool: 'text',
          onShapeClick: mockOnShapeClick,
          onUpdateLabel: mockOnUpdateLabel,
          onAddShape: mockOnAddShape
        })
      );

      const mockEvent1 = {
        nativeEvent: { offsetX: 100, offsetY: 100 }
      } as React.MouseEvent;

      const mockEvent2 = {
        nativeEvent: { offsetX: 200, offsetY: 200 }
      } as React.MouseEvent;

      act(() => {
        result.current.handleCanvasDoubleClick(mockEvent1);
      });

      const firstId = result.current.selectedShapeId;

      act(() => {
        result.current.handleCanvasDoubleClick(mockEvent2);
      });

      const secondId = result.current.selectedShapeId;

      expect(firstId).toBeDefined();
      expect(secondId).toBeDefined();
      expect(firstId).not.toBe(secondId);
    });
  });
}); 
import { SelectionManager } from '../core/SelectionManager';
import { ShapeSnapData, Shape } from '../types';

describe('SelectionManager', () => {
  let mockState: ShapeSnapData;
  let mockOnChange: jest.Mock;
  let selectionManager: SelectionManager;

  const createMockShape = (id: string, type: 'rectangle' | 'line' = 'rectangle'): Shape => ({
    id,
    type,
    style: { stroke: '#000', strokeWidth: 2 },
    zIndex: Date.now() + Math.random(), // Ensure unique zIndex
    ...(type === 'rectangle' ? { x: 0, y: 0, width: 100, height: 100 } : { points: [{ x: 0, y: 0 }, { x: 100, y: 100 }] })
  } as Shape);

  beforeEach(() => {
    const shapes = [
      { ...createMockShape('shape1'), x: 0, y: 0 } as Shape,      // Top-left
      { ...createMockShape('shape2'), x: 150, y: 0 } as Shape,    // Top-right
      { ...createMockShape('shape3'), x: 0, y: 150 } as Shape     // Bottom-left
    ];
    
    mockState = {
      shapes,
      canvas: { background: '#fff', mode: 'light' },
      currentTool: 'select',
      history: [[]],
      historyIndex: 0,
      currentFontSize: 16,
      selectedShapeIds: [],
      clipboard: []
    };
    
    mockOnChange = jest.fn((newState) => {
      mockState = newState;
    });
    
    selectionManager = new SelectionManager(mockState, mockOnChange);
  });

  describe('Basic Selection', () => {
    it('should select a single shape', () => {
      selectionManager.selectShape('shape1');

      expect(mockOnChange).toHaveBeenCalled();
      const newState = mockOnChange.mock.calls[0][0];
      expect(newState.selectedShapeIds).toEqual(['shape1']);
    });

    it('should select multiple shapes', () => {
      selectionManager.selectShapes(['shape1', 'shape2']);

      expect(mockOnChange).toHaveBeenCalled();
      const newState = mockOnChange.mock.calls[0][0];
      expect(newState.selectedShapeIds).toEqual(['shape1', 'shape2']);
    });

    it('should clear selection', () => {
      mockState.selectedShapeIds = ['shape1', 'shape2'];
      selectionManager = new SelectionManager(mockState, mockOnChange);
      
      selectionManager.clearSelection();

      expect(mockOnChange).toHaveBeenCalled();
      const newState = mockOnChange.mock.calls[0][0];
      expect(newState.selectedShapeIds).toEqual([]);
    });

    it('should select all shapes', () => {
      selectionManager.selectAll();

      expect(mockOnChange).toHaveBeenCalled();
      const newState = mockOnChange.mock.calls[0][0];
      expect(newState.selectedShapeIds).toEqual(['shape1', 'shape2', 'shape3']);
    });
  });

  describe('Multi-Selection Operations', () => {
    it('should add shape to existing selection', () => {
      mockState.selectedShapeIds = ['shape1'];
      selectionManager = new SelectionManager(mockState, mockOnChange);
      
      selectionManager.addToSelection('shape2');

      expect(mockOnChange).toHaveBeenCalled();
      const newState = mockOnChange.mock.calls[0][0];
      expect(newState.selectedShapeIds).toEqual(['shape1', 'shape2']);
    });

    it('should not add duplicate shapes to selection', () => {
      mockState.selectedShapeIds = ['shape1', 'shape2'];
      selectionManager = new SelectionManager(mockState, mockOnChange);
      
      selectionManager.addToSelection('shape1');

      expect(mockOnChange).not.toHaveBeenCalled();
      expect(mockState.selectedShapeIds).toEqual(['shape1', 'shape2']);
    });

    it('should remove shape from selection', () => {
      mockState.selectedShapeIds = ['shape1', 'shape2', 'shape3'];
      selectionManager = new SelectionManager(mockState, mockOnChange);
      
      selectionManager.removeFromSelection('shape2');

      expect(mockOnChange).toHaveBeenCalled();
      const newState = mockOnChange.mock.calls[0][0];
      expect(newState.selectedShapeIds).toEqual(['shape1', 'shape3']);
    });

    it('should toggle shape selection', () => {
      mockState.selectedShapeIds = ['shape1'];
      selectionManager = new SelectionManager(mockState, mockOnChange);
      
      // Toggle off
      selectionManager.toggleSelection('shape1');
      expect(mockOnChange.mock.calls[0][0].selectedShapeIds).toEqual([]);
      
      // Update state and reset mock
      mockState.selectedShapeIds = [];
      selectionManager = new SelectionManager(mockState, mockOnChange);
      mockOnChange.mockClear();
      
      // Toggle on
      selectionManager.toggleSelection('shape2');
      expect(mockOnChange.mock.calls[0][0].selectedShapeIds).toEqual(['shape2']);
    });
  });

  describe('Selection Queries', () => {
    beforeEach(() => {
      mockState.selectedShapeIds = ['shape1', 'shape3'];
      selectionManager = new SelectionManager(mockState, mockOnChange);
    });

    it('should return selected shapes', () => {
      const selectedShapes = selectionManager.getSelectedShapes();
      expect(selectedShapes.length).toBe(2);
      expect(selectedShapes.map(s => s.id)).toEqual(['shape1', 'shape3']);
    });

    it('should return selected shape IDs', () => {
      const selectedIds = selectionManager.getSelectedShapeIds();
      expect(selectedIds).toEqual(['shape1', 'shape3']);
    });

    it('should check if shape is selected', () => {
      expect(selectionManager.isSelected('shape1')).toBe(true);
      expect(selectionManager.isSelected('shape2')).toBe(false);
      expect(selectionManager.isSelected('shape3')).toBe(true);
    });
  });

  describe('Selection Bounds', () => {
    it('should calculate selection bounds for single shape', () => {
      mockState.selectedShapeIds = ['shape1'];
      selectionManager = new SelectionManager(mockState, mockOnChange);
      
      const bounds = selectionManager.getSelectionBounds();
      
      expect(bounds).toBeDefined();
      expect(bounds?.left).toBe(0);
      expect(bounds?.right).toBe(100);
      expect(bounds?.top).toBe(0);
      expect(bounds?.bottom).toBe(100);
      expect(bounds?.width).toBe(100);
      expect(bounds?.height).toBe(100);
      expect(bounds?.center).toEqual({ x: 50, y: 50 });
    });

    it('should calculate selection bounds for multiple shapes', () => {
      // Modify shapes to have different positions
      mockState.shapes[1] = { ...mockState.shapes[1], x: 200, y: 200, width: 100, height: 100 } as Shape;
      mockState.selectedShapeIds = ['shape1', 'shape2'];
      selectionManager = new SelectionManager(mockState, mockOnChange);
      
      const bounds = selectionManager.getSelectionBounds();
      
      expect(bounds).toBeDefined();
      expect(bounds?.left).toBe(0);
      expect(bounds?.right).toBe(300); // shape2.x + shape2.width
      expect(bounds?.top).toBe(0);
      expect(bounds?.bottom).toBe(300); // shape2.y + shape2.height
    });

    it('should return null bounds for empty selection', () => {
      const bounds = selectionManager.getSelectionBounds();
      expect(bounds).toBeNull();
    });

    it('should return selection center', () => {
      mockState.selectedShapeIds = ['shape1'];
      selectionManager = new SelectionManager(mockState, mockOnChange);
      
      const center = selectionManager.getSelectionCenter();
      expect(center).toEqual({ x: 50, y: 50 });
    });
  });

  describe('Shape Type Selection', () => {
    beforeEach(() => {
      // Add different shape types
      mockState.shapes = [
        createMockShape('rect1', 'rectangle'),
        createMockShape('rect2', 'rectangle'),
        createMockShape('line1', 'line'),
        createMockShape('line2', 'line')
      ];
      selectionManager = new SelectionManager(mockState, mockOnChange);
    });

    it('should select shapes by type', () => {
      selectionManager.selectByType('rectangle');

      expect(mockOnChange).toHaveBeenCalled();
      const newState = mockOnChange.mock.calls[0][0];
      expect(newState.selectedShapeIds).toEqual(['rect1', 'rect2']);
    });

    it('should select line shapes by type', () => {
      selectionManager.selectByType('line');

      expect(mockOnChange).toHaveBeenCalled();
      const newState = mockOnChange.mock.calls[0][0];
      expect(newState.selectedShapeIds).toEqual(['line1', 'line2']);
    });
  });

  describe('Area Selection', () => {
    beforeEach(() => {
      mockState.shapes = [
        { ...createMockShape('shape1'), x: 0, y: 0, width: 50, height: 50 } as Shape,
        { ...createMockShape('shape2'), x: 100, y: 100, width: 50, height: 50 } as Shape,
        { ...createMockShape('shape3'), x: 200, y: 200, width: 50, height: 50 } as Shape
      ];
      selectionManager = new SelectionManager(mockState, mockOnChange);
    });

    it('should select shapes within area', () => {
      selectionManager.selectInArea({ x: -10, y: -10 }, { x: 160, y: 160 });

      expect(mockOnChange).toHaveBeenCalled();
      const newState = mockOnChange.mock.calls[0][0];
      expect(newState.selectedShapeIds).toEqual(['shape1', 'shape2']);
    });

    it('should select all shapes in large area', () => {
      selectionManager.selectInArea({ x: -50, y: -50 }, { x: 300, y: 300 });

      expect(mockOnChange).toHaveBeenCalled();
      const newState = mockOnChange.mock.calls[0][0];
      expect(newState.selectedShapeIds).toEqual(['shape1', 'shape2', 'shape3']);
    });
  });

  describe('Point Hit Testing', () => {
    it('should find shapes at point', () => {
      const shapes = selectionManager.getShapesAtPoint({ x: 50, y: 50 });
      expect(shapes.length).toBe(1);
      expect(shapes[0].id).toBe('shape1');
    });

    it('should find top shape at point with multiple overlapping shapes', () => {
      // Create overlapping shapes with different z-indices
      mockState.shapes = [
        { ...createMockShape('bottom'), x: 0, y: 0, zIndex: 1 } as Shape,
        { ...createMockShape('top'), x: 0, y: 0, zIndex: 2 } as Shape
      ];
      selectionManager = new SelectionManager(mockState, mockOnChange);
      
      const topShape = selectionManager.getTopShapeAtPoint({ x: 50, y: 50 });
      expect(topShape?.id).toBe('top');
    });

    it('should return null when no shapes at point', () => {
      const topShape = selectionManager.getTopShapeAtPoint({ x: 1000, y: 1000 });
      expect(topShape).toBeNull();
    });
  });

  describe('Click Handling', () => {
    it('should handle single click without modifiers', () => {
      const shape = mockState.shapes[0];
      const modifiers = { ctrl: false, shift: false, alt: false };
      
      selectionManager.handleShapeClick(shape, { x: 50, y: 50 }, modifiers);

      expect(mockOnChange).toHaveBeenCalled();
      const newState = mockOnChange.mock.calls[0][0];
      expect(newState.selectedShapeIds).toEqual(['shape1']);
    });

    it('should handle multi-select click with ctrl modifier', () => {
      mockState.selectedShapeIds = ['shape1'];
      selectionManager = new SelectionManager(mockState, mockOnChange);
      
      const shape = mockState.shapes[1]; // shape2
      const modifiers = { ctrl: true, shift: false, alt: false };
      
      selectionManager.handleShapeClick(shape, { x: 50, y: 50 }, modifiers);

      expect(mockOnChange).toHaveBeenCalled();
      const newState = mockOnChange.mock.calls[0][0];
      expect(newState.selectedShapeIds).toEqual(['shape1', 'shape2']);
    });

    it('should handle canvas click without modifiers', () => {
      mockState.selectedShapeIds = ['shape1', 'shape2'];
      selectionManager = new SelectionManager(mockState, mockOnChange);
      
      const modifiers = { ctrl: false, shift: false, alt: false };
      selectionManager.handleCanvasClick({ x: 500, y: 500 }, modifiers);

      expect(mockOnChange).toHaveBeenCalled();
      const newState = mockOnChange.mock.calls[0][0];
      expect(newState.selectedShapeIds).toEqual([]);
    });

    it('should not clear selection on canvas click with ctrl modifier', () => {
      mockState.selectedShapeIds = ['shape1', 'shape2'];
      selectionManager = new SelectionManager(mockState, mockOnChange);
      
      const modifiers = { ctrl: true, shift: false, alt: false };
      selectionManager.handleCanvasClick({ x: 500, y: 500 }, modifiers);

      expect(mockOnChange).not.toHaveBeenCalled();
      expect(mockState.selectedShapeIds).toEqual(['shape1', 'shape2']);
    });
  });

  describe('Clipboard Operations', () => {
    beforeEach(() => {
      mockState.selectedShapeIds = ['shape1', 'shape2'];
      selectionManager = new SelectionManager(mockState, mockOnChange);
    });

    it('should copy selected shapes to clipboard', () => {
      const copiedShapes = selectionManager.copyToClipboard();

      expect(copiedShapes.length).toBe(2);
      expect(mockOnChange).toHaveBeenCalled();
      const newState = mockOnChange.mock.calls[0][0];
      expect(newState.clipboard?.length).toBe(2);
      // Should have different IDs than originals
      expect(newState.clipboard?.[0].id).not.toBe('shape1');
      expect(newState.clipboard?.[1].id).not.toBe('shape2');
    });

    it('should cut selected shapes to clipboard', () => {
      const cutShapes = selectionManager.cutToClipboard();

      expect(cutShapes.length).toBe(2);
      expect(mockOnChange).toHaveBeenCalled();
      const newState = mockOnChange.mock.calls[0][0];
      // Should be copied to clipboard
      expect(newState.clipboard?.length).toBe(2);
      // Should be removed from canvas
      expect(newState.shapes.length).toBe(1);
      expect(newState.shapes[0].id).toBe('shape3');
      // Selection should be cleared
      expect(newState.selectedShapeIds).toEqual([]);
    });

    it('should delete selected shapes', () => {
      selectionManager.deleteSelected();

      expect(mockOnChange).toHaveBeenCalled();
      const newState = mockOnChange.mock.calls[0][0];
      expect(newState.shapes.length).toBe(1);
      expect(newState.shapes[0].id).toBe('shape3');
      expect(newState.selectedShapeIds).toEqual([]);
    });
  });

  describe('Operation Availability', () => {
    beforeEach(() => {
      mockState.selectedShapeIds = ['shape1'];
      selectionManager = new SelectionManager(mockState, mockOnChange);
    });

    it('should check if operation can be performed', () => {
      expect(selectionManager.canPerformOperation('move')).toBe(true);
      expect(selectionManager.canPerformOperation('copy')).toBe(true);
      expect(selectionManager.canPerformOperation('delete')).toBe(true);
    });

    it('should return available operations', () => {
      const operations = selectionManager.getAvailableOperations();
      expect(operations).toContain('copy');
      expect(operations).toContain('delete');
      expect(operations).toContain('move');
    });

    it('should return empty operations for no selection', () => {
      mockState.selectedShapeIds = [];
      selectionManager = new SelectionManager(mockState, mockOnChange);
      
      const operations = selectionManager.getAvailableOperations();
      expect(operations).toEqual([]);
    });
  });

  describe('Future Multi-Shape Features', () => {
    it('should group selected shapes (placeholder)', () => {
      mockState.selectedShapeIds = ['shape1', 'shape2'];
      selectionManager = new SelectionManager(mockState, mockOnChange);
      
      const groupId = selectionManager.groupSelectedShapes();
      
      expect(groupId).toBeDefined();
      expect(typeof groupId).toBe('string');
      expect(groupId?.startsWith('group-')).toBe(true);
    });

    it('should not group single shape', () => {
      mockState.selectedShapeIds = ['shape1'];
      selectionManager = new SelectionManager(mockState, mockOnChange);
      
      const groupId = selectionManager.groupSelectedShapes();
      expect(groupId).toBeNull();
    });

    it('should not group empty selection', () => {
      mockState.selectedShapeIds = [];
      selectionManager = new SelectionManager(mockState, mockOnChange);
      
      const groupId = selectionManager.groupSelectedShapes();
      expect(groupId).toBeNull();
    });
  });

  describe('Invalid Shape ID Handling', () => {
    it('should filter out invalid shape IDs when updating selection', () => {
      selectionManager.selectShapes(['shape1', 'nonexistent', 'shape2']);

      expect(mockOnChange).toHaveBeenCalled();
      const newState = mockOnChange.mock.calls[0][0];
      expect(newState.selectedShapeIds).toEqual(['shape1', 'shape2']);
    });
  });
}); 
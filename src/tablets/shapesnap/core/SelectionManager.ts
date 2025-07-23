import { Shape, Point, ShapeSnapData } from "../types";
import { shapeRegistry } from "./ShapeRegistry";
import { getShapeBoundingBox } from "../utils/geometryUtils";

export interface SelectionBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
  center: Point;
}

export class SelectionManager {
  private state: ShapeSnapData;
  private onChange: (newState: ShapeSnapData) => void;

  constructor(
    state: ShapeSnapData,
    onChange: (newState: ShapeSnapData) => void,
  ) {
    this.state = state;
    this.onChange = onChange;
  }

  // Get currently selected shapes
  getSelectedShapes(): Shape[] {
    const selectedIds = this.state.selectedShapeIds || [];
    return this.state.shapes.filter((shape) => selectedIds.includes(shape.id));
  }

  // Get selected shape IDs
  getSelectedShapeIds(): string[] {
    return this.state.selectedShapeIds || [];
  }

  // Check if a shape is selected
  isSelected(shapeId: string): boolean {
    return this.getSelectedShapeIds().includes(shapeId);
  }

  // Select a single shape
  selectShape(shapeId: string): void {
    this.updateSelection([shapeId]);
  }

  // Select multiple shapes
  selectShapes(shapeIds: string[]): void {
    this.updateSelection(shapeIds);
  }

  // Add shape to selection (for multi-select)
  addToSelection(shapeId: string): void {
    const currentSelection = this.getSelectedShapeIds();
    if (!currentSelection.includes(shapeId)) {
      this.updateSelection([...currentSelection, shapeId]);
    }
  }

  // Remove shape from selection
  removeFromSelection(shapeId: string): void {
    const currentSelection = this.getSelectedShapeIds();
    this.updateSelection(currentSelection.filter((id) => id !== shapeId));
  }

  // Toggle shape selection
  toggleSelection(shapeId: string): void {
    if (this.isSelected(shapeId)) {
      this.removeFromSelection(shapeId);
    } else {
      this.addToSelection(shapeId);
    }
  }

  // Clear selection
  clearSelection(): void {
    this.updateSelection([]);
  }

  // Select all shapes
  selectAll(): void {
    const allShapeIds = this.state.shapes.map((shape) => shape.id);
    this.updateSelection(allShapeIds);
  }

  // Select shapes by type
  selectByType(shapeType: string): void {
    const shapeIds = this.state.shapes
      .filter((shape) => shape.type === shapeType)
      .map((shape) => shape.id);
    this.updateSelection(shapeIds);
  }

  // Select shapes in a rectangular area
  selectInArea(startPoint: Point, endPoint: Point): void {
    const bounds = {
      left: Math.min(startPoint.x, endPoint.x),
      right: Math.max(startPoint.x, endPoint.x),
      top: Math.min(startPoint.y, endPoint.y),
      bottom: Math.max(startPoint.y, endPoint.y),
    };

    const shapesInArea = this.state.shapes.filter((shape) => {
      const shapeBounds = getShapeBoundingBox(shape);
      return (
        shapeBounds.left >= bounds.left &&
        shapeBounds.right <= bounds.right &&
        shapeBounds.top >= bounds.top &&
        shapeBounds.bottom <= bounds.bottom
      );
    });

    this.updateSelection(shapesInArea.map((shape) => shape.id));
  }

  // Get bounding box of selected shapes
  getSelectionBounds(): SelectionBounds | null {
    const selectedShapes = this.getSelectedShapes();
    if (selectedShapes.length === 0) return null;

    const bounds = selectedShapes.map(getShapeBoundingBox);
    const left = Math.min(...bounds.map((b) => b.left));
    const right = Math.max(...bounds.map((b) => b.right));
    const top = Math.min(...bounds.map((b) => b.top));
    const bottom = Math.max(...bounds.map((b) => b.bottom));

    return {
      left,
      right,
      top,
      bottom,
      width: right - left,
      height: bottom - top,
      center: {
        x: (left + right) / 2,
        y: (top + bottom) / 2,
      },
    };
  }

  // Get center point of selection
  getSelectionCenter(): Point | null {
    const bounds = this.getSelectionBounds();
    return bounds ? bounds.center : null;
  }

  // Check if selection can perform a specific operation
  canPerformOperation(operation: string): boolean {
    const selectedShapes = this.getSelectedShapes();
    if (selectedShapes.length === 0) return false;

    return selectedShapes.every((shape) =>
      shapeRegistry.canPerformOperation(shape, operation as any),
    );
  }

  // Get available operations for current selection
  getAvailableOperations(): string[] {
    const selectedShapes = this.getSelectedShapes();
    if (selectedShapes.length === 0) return [];

    const operations = ["copy", "delete"]; // Basic operations always available

    // Check each operation
    const potentialOperations = [
      "move",
      "resize",
      "rotate",
      "editLabel",
      "changeStyle",
    ];

    for (const operation of potentialOperations) {
      if (this.canPerformOperation(operation)) {
        operations.push(operation);
      }
    }

    return operations;
  }

  // Group selected shapes (for future multi-shape operations)
  groupSelectedShapes(): string | null {
    const selectedShapes = this.getSelectedShapes();
    if (selectedShapes.length < 2) return null;

    // This is a placeholder for future group functionality
    // For now, just return a group ID
    const groupId = `group-${Date.now()}`;

    // TODO: Implement actual grouping logic
    // This would involve creating a new shape type 'group' that contains other shapes

    return groupId;
  }

  // Get shapes that intersect with a point
  getShapesAtPoint(point: Point, tolerance: number = 5): Shape[] {
    return this.state.shapes.filter((shape) => {
      const bounds = getShapeBoundingBox(shape);
      return (
        point.x >= bounds.left - tolerance &&
        point.x <= bounds.right + tolerance &&
        point.y >= bounds.top - tolerance &&
        point.y <= bounds.bottom + tolerance
      );
    });
  }

  // Get top-most shape at a point
  getTopShapeAtPoint(point: Point, tolerance: number = 5): Shape | null {
    const shapes = this.getShapesAtPoint(point, tolerance);
    if (shapes.length === 0) return null;

    // Return shape with highest z-index
    return shapes.reduce((topShape, shape) =>
      shape.zIndex > topShape.zIndex ? shape : topShape,
    );
  }

  // Handle shape click with modifier keys
  handleShapeClick(
    shape: Shape,
    _point: Point,
    modifiers: { ctrl: boolean; shift: boolean; alt: boolean },
  ): void {
    if (modifiers.ctrl || modifiers.shift) {
      // Multi-select mode
      this.toggleSelection(shape.id);
    } else {
      // Single select mode
      this.selectShape(shape.id);
    }
  }

  // Handle canvas click (deselect if no modifiers)
  handleCanvasClick(
    _point: Point,
    modifiers: { ctrl: boolean; shift: boolean; alt: boolean },
  ): void {
    if (!modifiers.ctrl && !modifiers.shift) {
      this.clearSelection();
    }
  }

  // Copy selected shapes to clipboard
  copyToClipboard(): Shape[] {
    const selectedShapes = this.getSelectedShapes();
    const copiedShapes = selectedShapes.map((shape) => ({
      ...shape,
      id: `copy-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    }));

    this.onChange({
      ...this.state,
      clipboard: copiedShapes,
    });

    return copiedShapes;
  }

  // Cut selected shapes to clipboard
  cutToClipboard(): Shape[] {
    const selectedShapes = this.getSelectedShapes();
    const copiedShapes = selectedShapes.map((shape) => ({
      ...shape,
      id: `copy-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    }));

    // Remove selected shapes and update clipboard in one operation
    const selectedIds = this.getSelectedShapeIds();
    const newShapes = this.state.shapes.filter(
      (shape) => !selectedIds.includes(shape.id),
    );

    this.onChange({
      ...this.state,
      shapes: newShapes,
      selectedShapeIds: [],
      clipboard: copiedShapes,
    });

    return copiedShapes;
  }

  // Delete selected shapes
  deleteSelected(): void {
    const selectedIds = this.getSelectedShapeIds();
    if (selectedIds.length === 0) return;

    const newShapes = this.state.shapes.filter(
      (shape) => !selectedIds.includes(shape.id),
    );

    this.onChange({
      ...this.state,
      shapes: newShapes,
      selectedShapeIds: [],
    });
  }

  // Private method to update selection
  private updateSelection(shapeIds: string[]): void {
    // Filter out invalid shape IDs
    const validShapeIds = shapeIds.filter((id) =>
      this.state.shapes.some((shape) => shape.id === id),
    );
    
    this.onChange({
      ...this.state,
      selectedShapeIds: validShapeIds,
    });
  }
}

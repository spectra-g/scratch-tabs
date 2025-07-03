import { Shape, Point, ShapeSnapData, ShapeSnapTool } from '../types';
import { SelectionManager } from './SelectionManager';
import { shapeRegistry } from './ShapeRegistry';
import { getShapeCenter, getShapeBoundingBox, snapToGrid } from '../utils/geometryUtils';

export interface InteractionContext {
  state: ShapeSnapData;
  onChange: (newState: ShapeSnapData) => void;
  selectionManager: SelectionManager;
  gridSnappingEnabled: boolean;
  currentTool: ShapeSnapTool;
}

export abstract class BaseInteractionHandler {
  protected context: InteractionContext;

  constructor(context: InteractionContext) {
    this.context = context;
  }

  protected snapPoint(point: Point, gridSize: number = 20): Point {
    return {
      x: snapToGrid(point.x, gridSize, this.context.gridSnappingEnabled),
      y: snapToGrid(point.y, gridSize, this.context.gridSnappingEnabled)
    };
  }

  protected updateShape(shapeId: string, updates: any): void {
    const shapeIndex = this.context.state.shapes.findIndex(s => s.id === shapeId);
    if (shapeIndex === -1) return;

    const updatedShapes = [...this.context.state.shapes];
    updatedShapes[shapeIndex] = { ...updatedShapes[shapeIndex], ...updates };

    this.context.onChange({
      ...this.context.state,
      shapes: updatedShapes
    });
  }
}

export class DragHandler extends BaseInteractionHandler {
  private draggingShapeId: string | null = null;
  private dragStartPoint: Point | null = null;
  private dragOffset: Point | null = null;
  private dragMode: 'move' | 'resize-start' | 'resize-end' | null = null;

  startDrag(shape: Shape, startPoint: Point, mode: 'move' | 'resize-start' | 'resize-end' = 'move'): void {
    this.draggingShapeId = shape.id;
    this.dragStartPoint = startPoint;
    this.dragMode = mode;

    const shapeCenter = getShapeCenter(shape);
    this.dragOffset = {
      x: startPoint.x - shapeCenter.x,
      y: startPoint.y - shapeCenter.y
    };
  }

  updateDrag(currentPoint: Point): void {
    if (!this.draggingShapeId || !this.dragStartPoint || !this.dragOffset) return;

    const shape = this.context.state.shapes.find(s => s.id === this.draggingShapeId);
    if (!shape) return;

    const snappedPoint = this.snapPoint(currentPoint);
    
    if (this.dragMode === 'move') {
      this.handleMove(shape, snappedPoint);
    } else if (this.dragMode === 'resize-start' || this.dragMode === 'resize-end') {
      this.handleResize(shape, snappedPoint);
    }
  }

  private handleMove(shape: Shape, currentPoint: Point): void {
    const newCenter = {
      x: currentPoint.x - this.dragOffset!.x,
      y: currentPoint.y - this.dragOffset!.y
    };

    let updates: any = {};

    switch (shape.type) {
      case 'line':
        const center = getShapeCenter(shape);
        const dx = newCenter.x - center.x;
        const dy = newCenter.y - center.y;
        updates = {
          points: (shape as any).points.map((p: Point) => ({ x: p.x + dx, y: p.y + dy }))
        };
        break;

      case 'arrow':
        const arrowCenter = getShapeCenter(shape);
        const arrowDx = newCenter.x - arrowCenter.x;
        const arrowDy = newCenter.y - arrowCenter.y;
        updates = {
          from: { x: (shape as any).from.x + arrowDx, y: (shape as any).from.y + arrowDy },
          to: { x: (shape as any).to.x + arrowDx, y: (shape as any).to.y + arrowDy }
        };
        break;

      case 'rectangle':
      case 'square':
        updates = {
          x: newCenter.x - (shape as any).width / 2,
          y: newCenter.y - (shape as any).height / 2
        };
        break;

      default:
        updates = { x: newCenter.x, y: newCenter.y };
        break;
    }

    this.updateShape(shape.id, updates);
  }

  private handleResize(shape: Shape, currentPoint: Point): void {
    if (shape.type !== 'line') return;

    const lineShape = shape as any;
    const snappedPoint = this.snapPoint(currentPoint);

    let updates: any = {};

    if (this.dragMode === 'resize-start') {
      updates = {
        points: [snappedPoint, ...lineShape.points.slice(1)]
      };
    } else if (this.dragMode === 'resize-end') {
      updates = {
        points: [...lineShape.points.slice(0, -1), snappedPoint]
      };
    }

    this.updateShape(shape.id, updates);
  }

  endDrag(): void {
    this.draggingShapeId = null;
    this.dragStartPoint = null;
    this.dragOffset = null;
    this.dragMode = null;
  }

  isDragging(): boolean {
    return this.draggingShapeId !== null;
  }

  getDraggingShapeId(): string | null {
    return this.draggingShapeId;
  }
}

export class ResizeHandler extends BaseInteractionHandler {
  private resizingShapeId: string | null = null;
  private resizeHandle: string | null = null;
  private originalBounds: any = null;
  private resizeStartPoint: Point | null = null;

  startResize(shape: Shape, handle: string, startPoint: Point): void {
    this.resizingShapeId = shape.id;
    this.resizeHandle = handle;
    this.resizeStartPoint = startPoint;
    this.originalBounds = this.getShapeBounds(shape);
  }

  updateResize(currentPoint: Point): void {
    if (!this.resizingShapeId || !this.resizeHandle || !this.resizeStartPoint || !this.originalBounds) return;

    const shape = this.context.state.shapes.find(s => s.id === this.resizingShapeId);
    if (!shape) return;

    const snappedPoint = this.snapPoint(currentPoint);
    const deltaX = snappedPoint.x - this.resizeStartPoint.x;
    const deltaY = snappedPoint.y - this.resizeStartPoint.y;

    const newBounds = this.calculateNewBounds(this.originalBounds, this.resizeHandle, deltaX, deltaY, shape.type);
    const updates = this.convertBoundsToShapeUpdates(newBounds, shape.type);

    this.updateShape(shape.id, updates);
  }

  private getShapeBounds(shape: Shape): any {
    switch (shape.type) {
      case 'rectangle':
      case 'square':
      case 'diamond':
      case 'triangle':
        return {
          x: (shape as any).x,
          y: (shape as any).y,
          width: (shape as any).width,
          height: (shape as any).height
        };

      case 'circle':
        const radius = (shape as any).radius;
        return {
          x: (shape as any).x - radius,
          y: (shape as any).y - radius,
          width: radius * 2,
          height: radius * 2,
          radius: radius
        };

      default:
        return null;
    }
  }

  private calculateNewBounds(originalBounds: any, handle: string, deltaX: number, deltaY: number, shapeType: string): any {
    const { x, y, width, height, radius } = originalBounds;
    let newX = x;
    let newY = y;
    let newWidth = width;
    let newHeight = height;
    let newRadius = radius;

    const snappedDeltaX = snapToGrid(deltaX, 20, this.context.gridSnappingEnabled);
    const snappedDeltaY = snapToGrid(deltaY, 20, this.context.gridSnappingEnabled);

    switch (handle) {
      case 'nw':
        newX = x + snappedDeltaX;
        newY = y + snappedDeltaY;
        newWidth = Math.max(20, width - snappedDeltaX);
        newHeight = Math.max(20, height - snappedDeltaY);
        break;
      case 'ne':
        newY = y + snappedDeltaY;
        newWidth = Math.max(20, width + snappedDeltaX);
        newHeight = Math.max(20, height - snappedDeltaY);
        break;
      case 'se':
        newWidth = Math.max(20, width + snappedDeltaX);
        newHeight = Math.max(20, height + snappedDeltaY);
        break;
      case 'sw':
        newX = x + snappedDeltaX;
        newWidth = Math.max(20, width - snappedDeltaX);
        newHeight = Math.max(20, height + snappedDeltaY);
        break;
      case 'n':
        newY = y + snappedDeltaY;
        newHeight = Math.max(20, height - snappedDeltaY);
        break;
      case 'e':
        newWidth = Math.max(20, width + snappedDeltaX);
        break;
      case 's':
        newHeight = Math.max(20, height + snappedDeltaY);
        break;
      case 'w':
        newX = x + snappedDeltaX;
        newWidth = Math.max(20, width - snappedDeltaX);
        break;
    }

    // Handle circle special case
    if (shapeType === 'circle') {
      if (handle === 'n' || handle === 's') {
        newRadius = Math.max(10, newHeight / 2);
      } else if (handle === 'e' || handle === 'w') {
        newRadius = Math.max(10, newWidth / 2);
      } else {
        newRadius = Math.max(10, Math.min(newWidth, newHeight) / 2);
      }
    }

    return { x: newX, y: newY, width: newWidth, height: newHeight, radius: newRadius };
  }

  private convertBoundsToShapeUpdates(bounds: any, shapeType: string): any {
    switch (shapeType) {
      case 'rectangle':
      case 'square':
      case 'diamond':
      case 'triangle':
        return {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height
        };

      case 'circle':
        return {
          x: bounds.x + bounds.radius,
          y: bounds.y + bounds.radius,
          radius: bounds.radius
        };

      default:
        return {};
    }
  }

  endResize(): void {
    this.resizingShapeId = null;
    this.resizeHandle = null;
    this.originalBounds = null;
    this.resizeStartPoint = null;
  }

  isResizing(): boolean {
    return this.resizingShapeId !== null;
  }

  getResizingShapeId(): string | null {
    return this.resizingShapeId;
  }

  getResizeHandle(): string | null {
    return this.resizeHandle;
  }
}

export class ClickHandler extends BaseInteractionHandler {
  handleShapeClick(shape: Shape, point: Point, modifiers: { ctrl: boolean; shift: boolean; alt: boolean }): void {
    switch (this.context.currentTool) {
      case 'select':
        this.context.selectionManager.handleShapeClick(shape, point, modifiers);
        break;

      case 'eraser':
        this.deleteShape(shape.id);
        break;

      case 'text':
        // Handle text tool click
        break;

      default:
        // For draw tool, don't select shapes
        break;
    }
  }

  handleCanvasClick(point: Point, modifiers: { ctrl: boolean; shift: boolean; alt: boolean }): void {
    this.context.selectionManager.handleCanvasClick(point, modifiers);
  }

  handleDoubleClick(shape: Shape, point: Point): void {
    // Enter edit mode for the shape
    if (shapeRegistry.canPerformOperation(shape, 'editLabel')) {
      // TODO: Trigger label editing
    }
  }

  private deleteShape(shapeId: string): void {
    const newShapes = this.context.state.shapes.filter(s => s.id !== shapeId);
    this.context.onChange({
      ...this.context.state,
      shapes: newShapes,
      selectedShapeIds: (this.context.state.selectedShapeIds || []).filter(id => id !== shapeId)
    });
  }
}

export class HitTestHandler extends BaseInteractionHandler {
  detectResizeHandle(shape: Shape, point: Point): string | null {
    if (shape.type === 'line') return null;

    const bounds = getShapeBoundingBox(shape);
    const handleSize = 12;
    const threshold = handleSize / 2;

    // Check corners first
    const corners = [
      { name: 'nw', x: bounds.left, y: bounds.top },
      { name: 'ne', x: bounds.right, y: bounds.top },
      { name: 'se', x: bounds.right, y: bounds.bottom },
      { name: 'sw', x: bounds.left, y: bounds.bottom }
    ];

    for (const corner of corners) {
      if (Math.abs(point.x - corner.x) <= threshold && Math.abs(point.y - corner.y) <= threshold) {
        return corner.name;
      }
    }

    // Check edges
    const edges = [
      { name: 'n', x: (bounds.left + bounds.right) / 2, y: bounds.top },
      { name: 'e', x: bounds.right, y: (bounds.top + bounds.bottom) / 2 },
      { name: 's', x: (bounds.left + bounds.right) / 2, y: bounds.bottom },
      { name: 'w', x: bounds.left, y: (bounds.top + bounds.bottom) / 2 }
    ];

    for (const edge of edges) {
      if (Math.abs(point.x - edge.x) <= threshold && Math.abs(point.y - edge.y) <= threshold) {
        return edge.name;
      }
    }

    return null;
  }

  detectLineDragMode(shape: Shape, point: Point): 'move' | 'resize-start' | 'resize-end' {
    if (shape.type !== 'line') return 'move';

    const lineShape = shape as any;
    if (!lineShape.points || lineShape.points.length < 2) return 'move';

    const startPoint = lineShape.points[0];
    const endPoint = lineShape.points[lineShape.points.length - 1];
    const threshold = 15;

    const distanceToStart = Math.sqrt(
      Math.pow(point.x - startPoint.x, 2) + Math.pow(point.y - startPoint.y, 2)
    );
    
    const distanceToEnd = Math.sqrt(
      Math.pow(point.x - endPoint.x, 2) + Math.pow(point.y - endPoint.y, 2)
    );

    if (distanceToStart <= threshold) {
      return 'resize-start';
    } else if (distanceToEnd <= threshold) {
      return 'resize-end';
    } else {
      return 'move';
    }
  }

  isPointInShape(shape: Shape, point: Point, tolerance: number = 5): boolean {
    const bounds = getShapeBoundingBox(shape);
    return point.x >= bounds.left - tolerance &&
           point.x <= bounds.right + tolerance &&
           point.y >= bounds.top - tolerance &&
           point.y <= bounds.bottom + tolerance;
  }
}

export class InteractionManager {
  private context: InteractionContext;
  private dragHandler: DragHandler;
  private resizeHandler: ResizeHandler;
  private clickHandler: ClickHandler;
  private hitTestHandler: HitTestHandler;

  constructor(context: InteractionContext) {
    this.context = context;
    this.dragHandler = new DragHandler(context);
    this.resizeHandler = new ResizeHandler(context);
    this.clickHandler = new ClickHandler(context);
    this.hitTestHandler = new HitTestHandler(context);
  }

  getDragHandler(): DragHandler {
    return this.dragHandler;
  }

  getResizeHandler(): ResizeHandler {
    return this.resizeHandler;
  }

  getClickHandler(): ClickHandler {
    return this.clickHandler;
  }

  getHitTestHandler(): HitTestHandler {
    return this.hitTestHandler;
  }

  updateContext(newContext: InteractionContext): void {
    this.context = newContext;
    this.dragHandler = new DragHandler(newContext);
    this.resizeHandler = new ResizeHandler(newContext);
    this.clickHandler = new ClickHandler(newContext);
    this.hitTestHandler = new HitTestHandler(newContext);
  }
} 
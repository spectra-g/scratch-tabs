import { useState, useCallback } from 'react';
import { Shape, Point, ShapeSnapTool, ArrowTipStyle } from '../types';
import { distance, getShapeCenter, getShapeBoundingBox, snapToGrid } from '../utils/geometryUtils';
import { cycleArrowTip } from '../utils/arrowTipUtils';

interface MouseEventHandlersProps {
  shapes: Shape[];
  currentTool: ShapeSnapTool;
  gridSnappingEnabled?: boolean;
  onShapeClick?: (shape: Shape, position: Point) => void;
  onUpdateShape?: (shapeId: string, updates: Partial<Shape>) => void;
  onDeleteShape?: (shapeId: string) => void;
  onAddShape?: (shape: Shape) => void;
}

interface MouseDownShape {
  shape: Shape;
  initialPos: Point;
  center: Point;
  isArrowTipClick?: boolean;
  arrowTipMode?: 'resize-start' | 'resize-end';
}

export const useMouseEventHandlers = ({
  shapes,
  currentTool,
  gridSnappingEnabled = false,
  onShapeClick,
  onUpdateShape,
  onDeleteShape,
  onAddShape
}: MouseEventHandlersProps) => {
  const [selectedShapeId, setSelectedShapeId] = useState<string | undefined>(undefined);
  const [editingShape, setEditingShape] = useState<Shape | null>(null);
  const [draggingShapeId, setDraggingShapeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [draggedShape, setDraggedShape] = useState<Shape | null>(null);
  const [dragTimeout, setDragTimeout] = useState<NodeJS.Timeout | null>(null);
  const [lineDragMode, setLineDragMode] = useState<'move' | 'resize-start' | 'resize-end' | null>(null);
  const [lineDragPoint, setLineDragPoint] = useState<Point | null>(null);
  const [mouseDownShape, setMouseDownShape] = useState<MouseDownShape | null>(null);
  const [hasMoved, setHasMoved] = useState(false);
  const [resizeMode, setResizeMode] = useState<'none' | 'resize' | null>(null);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [resizeStartData, setResizeStartData] = useState<{
    shape: Shape;
    startPoint: Point;
    originalBounds: { x: number; y: number; width: number; height: number; radius?: number };
  } | null>(null);
  const [dragGuides, setDragGuides] = useState<{
    left: number;
    right: number;
    top: number;
    bottom: number;
  } | null>(null);

  // Helper function to detect line drag mode
  const detectLineDragMode = useCallback((shape: Shape, mousePoint: Point): 'move' | 'resize-start' | 'resize-end' => {
    if (shape.type !== 'line') return 'move';
    
    const lineShape = shape as Shape & { points: Point[] };
    if (!lineShape.points || lineShape.points.length < 2) return 'move';
    
    const startPoint = lineShape.points[0];
    const endPoint = lineShape.points[lineShape.points.length - 1];
    const lineLength = distance(startPoint, endPoint);
    
    // Threshold for endpoint detection (15px or 10% of line length, whichever is smaller)
    const threshold = Math.min(15, lineLength * 0.1);
    
    const distanceToStart = distance(mousePoint, startPoint);
    const distanceToEnd = distance(mousePoint, endPoint);
    
    if (distanceToStart <= threshold) {
      return 'resize-start';
    } else if (distanceToEnd <= threshold) {
      return 'resize-end';
    } else {
      return 'move';
    }
  }, []);

  // Helper function to detect resize handle for non-line shapes
  const detectResizeHandle = useCallback((shape: Shape, mousePoint: Point): string | null => {
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
      if (Math.abs(mousePoint.x - corner.x) <= threshold && Math.abs(mousePoint.y - corner.y) <= threshold) {
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
      if (Math.abs(mousePoint.x - edge.x) <= threshold && Math.abs(mousePoint.y - edge.y) <= threshold) {
        return edge.name;
      }
    }
    
    return null;
  }, []);

  const handleShapeClick = useCallback((shape: Shape, position: Point) => {
    if (onShapeClick) {
      onShapeClick(shape, position);
    }
    
    // Handle different tools
    switch (currentTool) {
      case 'select':
        // Only allow editing when in select mode
        if (selectedShapeId === shape.id) {
          // If already selected, open label editor
          setEditingShape(shape);
        } else {
          // Select the shape
          setSelectedShapeId(shape.id);
        }
        break;
      case 'eraser':
        // Delete the shape when in eraser mode
        if (onDeleteShape) {
          onDeleteShape(shape.id);
        }
        break;
      default:
        // For other tools (draw, text), just select the shape
        setSelectedShapeId(shape.id);
        break;
    }
  }, [currentTool, selectedShapeId, onShapeClick, onDeleteShape]);

  const handleShapeMouseDown = useCallback((shape: Shape, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Clear any existing timeout
    if (dragTimeout) {
      clearTimeout(dragTimeout);
      setDragTimeout(null);
    }
    
    const mouseX = e.nativeEvent.offsetX;
    const mouseY = e.nativeEvent.offsetY;
    const mousePoint = { x: mouseX, y: mouseY };
    
    // Check for resize handle first (for non-line shapes)
    if (shape.type !== 'line') {
      const handle = detectResizeHandle(shape, mousePoint);
      if (handle) {
        // Select the shape if it's not already selected
        if (selectedShapeId !== shape.id) {
          setSelectedShapeId(shape.id);
        }
        
        setResizeMode('resize');
        setResizeHandle(handle);
        
        // Get original bounds for the shape
        let originalBounds;
        switch (shape.type) {
          case 'rectangle':
          case 'square':
          case 'diamond':
          case 'triangle': {
            const rectShape = shape as Shape & { x: number; y: number; width: number; height: number };
            originalBounds = {
              x: rectShape.x,
              y: rectShape.y,
              width: rectShape.width || 40,
              height: rectShape.height || 40
            };
            break;
          }
          case 'circle': {
            const circleShape = shape as Shape & { x: number; y: number; radius: number };
            const radius = circleShape.radius || 20;
            originalBounds = {
              x: circleShape.x - radius,
              y: circleShape.y - radius,
              width: radius * 2,
              height: radius * 2,
              radius: radius
            };
            break;
          }
          case 'text': {
            const textShape = shape as Shape & { x: number; y: number; fontSize?: number };
            const fontSize = textShape.fontSize || 16;
            const textWidth = (textShape as any).text ? (textShape as any).text.length * fontSize * 0.6 : 50;
            const textHeight = fontSize;
            originalBounds = {
              x: textShape.x - textWidth / 2,
              y: textShape.y - textHeight / 2,
              width: textWidth,
              height: textHeight
            };
            break;
          }
          default:
            return;
        }
        
        setResizeStartData({
          shape,
          startPoint: mousePoint,
          originalBounds
        });
        return;
      }
    }
    
    // Special handling for line shapes - check if clicking on arrow tip
    if (shape.type === 'line' && (currentTool === 'select' || currentTool === 'draw')) {
      const lineShape = shape as Shape & { 
        points: Point[]; 
        arrowTipStart?: ArrowTipStyle; 
        arrowTipEnd?: ArrowTipStyle; 
      };

      // Use the same logic as drag detection to check if we're near an endpoint
      const dragMode = detectLineDragMode(shape, mousePoint);

      if (dragMode === 'resize-end' || dragMode === 'resize-start') {
        // This is an arrow tip click - set up for both cycling and dragging
        setMouseDownShape({ 
          shape, 
          initialPos: mousePoint, 
          center: getShapeCenter(shape),
          isArrowTipClick: true,
          arrowTipMode: dragMode
        });
        setHasMoved(false);
        return;
      }
    }
    
    // Store the initial mouse position and shape info for potential dragging
    const center = getShapeCenter(shape);
    setMouseDownShape({ shape, initialPos: mousePoint, center });
    setHasMoved(false);
  }, [currentTool, selectedShapeId, dragTimeout, detectResizeHandle, detectLineDragMode]);

  return {
    // State
    selectedShapeId,
    setSelectedShapeId,
    editingShape,
    setEditingShape,
    draggingShapeId,
    setDraggingShapeId,
    dragOffset,
    setDragOffset,
    draggedShape,
    setDraggedShape,
    dragTimeout,
    setDragTimeout,
    lineDragMode,
    setLineDragMode,
    lineDragPoint,
    setLineDragPoint,
    mouseDownShape,
    setMouseDownShape,
    hasMoved,
    setHasMoved,
    resizeMode,
    setResizeMode,
    resizeHandle,
    setResizeHandle,
    resizeStartData,
    setResizeStartData,
    dragGuides,
    setDragGuides,
    
    // Handlers
    handleShapeClick,
    handleShapeMouseDown,
    
    // Utilities
    detectLineDragMode,
    detectResizeHandle
  };
}; 
import React, { useState, useRef } from 'react';
import { CanvasSettings, Shape, Point, ShapeSnapTool, ArrowTipStyle } from '../types';
import { renderShape, getShapeCenter, renderRoughShapeSVG, renderShapeOverlay, renderResizeHandles, hashCode } from '../utils/renderUtils';
import { ShapeLabelEditor } from './ShapeLabelEditor';
import { ShapeSnapInfoModal } from './ShapeSnapInfoModal';
import { cloneDeep } from 'lodash';

// Arrow tip styles in cycling order
const ARROW_TIP_STYLES: ArrowTipStyle[] = [
  'none',
  'simple',
  'filled-triangle',
  'outline-triangle',
  'filled-circle',
  'outline-circle',
  'filled-diamond',
  'outline-diamond',
  'cross-circle',
  'dot',
  'arrowhead',
  'double-line'
];

interface ShapeSnapCanvasProps {
  shapes: Shape[];
  canvasSettings: CanvasSettings;
  currentPoints: Point[];
  width: number;
  height: number;
  currentTool: ShapeSnapTool;
  currentFontSize?: number;
  onShapeClick?: (shape: Shape, position: Point) => void;
  onUpdateLabel?: (shapeId: string, label: string) => void;
  onUpdateShape?: (shapeId: string, updates: Partial<Shape>) => void;
  onDeleteShape?: (shapeId: string) => void;
  onAddShape?: (shape: Shape) => void;
  onDrawEnd?: (points: Point[]) => Shape | null;
  gridSnappingEnabled?: boolean;
  sketchModeEnabled?: boolean;
}

export const ShapeSnapCanvas: React.FC<ShapeSnapCanvasProps> = ({
  shapes,
  canvasSettings,
  currentPoints,
  width,
  height,
  currentTool,
  currentFontSize,
  onShapeClick,
  onUpdateLabel,
  onUpdateShape,
  onDeleteShape,
  onAddShape,
  gridSnappingEnabled,
  sketchModeEnabled
}) => {
  const [selectedShapeId, setSelectedShapeId] = useState<string | undefined>(undefined);
  const [editingShape, setEditingShape] = useState<Shape | null>(null);
  const [draggingShapeId, setDraggingShapeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [draggedShape, setDraggedShape] = useState<Shape | null>(null);
  const [dragTimeout, setDragTimeout] = useState<NodeJS.Timeout | null>(null);
  const [lineDragMode, setLineDragMode] = useState<'move' | 'resize-start' | 'resize-end' | null>(null);
  const [lineDragPoint, setLineDragPoint] = useState<Point | null>(null);
  const [mouseDownShape, setMouseDownShape] = useState<{ shape: Shape; initialPos: Point; center: Point } | null>(null);
  const [hasMoved, setHasMoved] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [resizeMode, setResizeMode] = useState<'none' | 'resize' | null>(null);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [resizeStartData, setResizeStartData] = useState<{
    shape: Shape;
    startPoint: Point;
    originalBounds: { x: number; y: number; width: number; height: number; radius?: number };
  } | null>(null);
  
  // Drag guides state
  const [dragGuides, setDragGuides] = useState<{
    left: number;
    right: number;
    top: number;
    bottom: number;
  } | null>(null);
  
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Sort shapes by zIndex for proper rendering order
  const sortedShapes = [...shapes].sort((a, b) => a.zIndex - b.zIndex);
  
  // If we're dragging a shape, replace it with the dragged version for visual feedback
  const shapesToRender = draggedShape 
    ? sortedShapes.map(shape => shape.id === draggedShape.id ? draggedShape : shape)
    : sortedShapes;
  
  // Determine stroke color based on canvas mode
  const strokeColor = canvasSettings.mode === 'dark' ? '#ffffff' : '#000000';
  
  // Helper: snap a value to the nearest grid
  const snapToGrid = (value: number, grid: number) => gridSnappingEnabled ? Math.round(value / grid) * grid : value;

  // Helper function to calculate distance between two points
  const distance = (p1: Point, p2: Point): number => 
    Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

  // Helper function to cycle through arrow tip styles
  const cycleArrowTip = (currentTip: ArrowTipStyle | undefined): ArrowTipStyle => {
    // If no current tip, start with 'simple' instead of 'none'
    if (!currentTip) {
      return 'simple';
    }
    
    const currentIndex = ARROW_TIP_STYLES.indexOf(currentTip);
    const nextIndex = (currentIndex + 1) % ARROW_TIP_STYLES.length;
    return ARROW_TIP_STYLES[nextIndex];
  };

  // Helper function to detect line drag mode
  const detectLineDragMode = (shape: Shape, mousePoint: Point): 'move' | 'resize-start' | 'resize-end' => {
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
  };

  // Helper function to detect resize handle for non-line shapes
  const detectResizeHandle = (shape: Shape, mousePoint: Point): string | null => {
    if (shape.type === 'line') return null;
    
    const bounds = getShapeBoundingBox(shape);
    const handleSize = 12; // Increased from 8
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
  };

  // Helper function to calculate new bounds during resize
  const calculateResizeBounds = (
    originalBounds: { x: number; y: number; width: number; height: number; radius?: number },
    handle: string,
    deltaX: number,
    deltaY: number,
    shapeType: string
  ): { x: number; y: number; width: number; height: number; radius?: number } => {
    const { x, y, width, height, radius } = originalBounds;
    let newX = x;
    let newY = y;
    let newWidth = width;
    let newHeight = height;
    let newRadius = radius;
    
    // Snap to grid
    const snappedDeltaX = snapToGrid(deltaX, 20);
    const snappedDeltaY = snapToGrid(deltaY, 20);
    
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
    
    // For circles, maintain aspect ratio and use radius
    if (shapeType === 'circle') {
      const newRadius = Math.max(10, Math.min(newWidth, newHeight) / 2);
      return {
        x: newX + newRadius,
        y: newY + newRadius,
        width: newRadius * 2,
        height: newRadius * 2,
        radius: newRadius
      };
    }
    
    return { x: newX, y: newY, width: newWidth, height: newHeight, radius: newRadius };
  };

  // Helper function to get editor rectangle for label editing
  const getEditorRect = (shape: Shape) => {
    const center = getShapeCenter(shape);
    const width = 120;
    const height = 60;
    return {
      x: center.x - width / 2,
      y: center.y - height / 2,
      width,
      height
    };
  };

  // Helper function to calculate bounding box of a shape
  const getShapeBoundingBox = (shape: Shape): { left: number; right: number; top: number; bottom: number } => {
    switch (shape.type) {
      case 'rectangle':
      case 'square': {
        const rectShape = shape as Shape & { x: number; y: number; width: number; height: number };
        return {
          left: rectShape.x,
          right: rectShape.x + rectShape.width,
          top: rectShape.y,
          bottom: rectShape.y + rectShape.height
        };
      }
      case 'circle': {
        const circleShape = shape as Shape & { x: number; y: number; radius: number };
        const radius = circleShape.radius || 20;
        return {
          left: circleShape.x - radius,
          right: circleShape.x + radius,
          top: circleShape.y - radius,
          bottom: circleShape.y + radius
        };
      }
      case 'diamond':
      case 'triangle': {
        const polyShape = shape as Shape & { x: number; y: number; width: number; height: number };
        const halfWidth = (polyShape.width || 40) / 2;
        const halfHeight = (polyShape.height || 40) / 2;
        return {
          left: polyShape.x - halfWidth,
          right: polyShape.x + halfWidth,
          top: polyShape.y - halfHeight,
          bottom: polyShape.y + halfHeight
        };
      }
      case 'text': {
        const textShape = shape as Shape & { x: number; y: number; fontSize?: number };
        const fontSize = textShape.fontSize || 16;
        const textWidth = (textShape as any).text ? (textShape as any).text.length * fontSize * 0.6 : 50; // rough estimate
        const textHeight = fontSize;
        return {
          left: textShape.x - textWidth / 2,
          right: textShape.x + textWidth / 2,
          top: textShape.y - textHeight / 2,
          bottom: textShape.y + textHeight / 2
        };
      }
      case 'line': {
        const lineShape = shape as Shape & { points: Point[] };
        if (!lineShape.points || lineShape.points.length === 0) {
          return { left: 0, right: 0, top: 0, bottom: 0 };
        }
        const xCoords = lineShape.points.map(p => p.x);
        const yCoords = lineShape.points.map(p => p.y);
        return {
          left: Math.min(...xCoords),
          right: Math.max(...xCoords),
          top: Math.min(...yCoords),
          bottom: Math.max(...yCoords)
        };
      }
      default:
        return { left: 0, right: 0, top: 0, bottom: 0 };
    }
  };

  // Helper function to render resize indicators
  const renderResizeIndicators = (shape: Shape): React.ReactNode => {
    if (shape.type === 'line' || selectedShapeId !== shape.id) {
      return null;
    }
    
    const bounds = getShapeBoundingBox(shape);
    const handleSize = 12;
    const strokeColor = canvasSettings.mode === 'dark' ? '#ffffff' : '#000000';
    const fillColor = canvasSettings.mode === 'dark' ? '#1e1e1e' : '#ffffff';
    
    const handles = [
      { name: 'nw', x: bounds.left, y: bounds.top },
      { name: 'ne', x: bounds.right, y: bounds.top },
      { name: 'se', x: bounds.right, y: bounds.bottom },
      { name: 'sw', x: bounds.left, y: bounds.bottom },
      { name: 'n', x: (bounds.left + bounds.right) / 2, y: bounds.top },
      { name: 'e', x: bounds.right, y: (bounds.top + bounds.bottom) / 2 },
      { name: 's', x: (bounds.left + bounds.right) / 2, y: bounds.bottom },
      { name: 'w', x: bounds.left, y: (bounds.top + bounds.bottom) / 2 }
    ];
    
    const handleMouseDown = (e: React.MouseEvent, handleName: string) => {
      e.stopPropagation();
      
      const mouseX = e.nativeEvent.offsetX;
      const mouseY = e.nativeEvent.offsetY;
      const mousePoint = { x: mouseX, y: mouseY };
      
      setResizeMode('resize');
      setResizeHandle(handleName);
      
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
    };
    
    return (
      <g key={`${shape.id}-resize-handles`}>
        {handles.map(handle => (
          <rect
            key={`${shape.id}-handle-${handle.name}`}
            x={handle.x - handleSize / 2}
            y={handle.y - handleSize / 2}
            width={handleSize}
            height={handleSize}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={1}
            style={{ cursor: getResizeCursor(handle.name) }}
            onMouseDown={(e) => handleMouseDown(e, handle.name)}
          />
        ))}
      </g>
    );
  };

  // Helper function to get cursor style for resize handles
  const getResizeCursor = (handle: string | null): string => {
    if (!handle) return 'default';
    
    switch (handle) {
      case 'nw':
      case 'se':
        return 'nw-resize';
      case 'ne':
      case 'sw':
        return 'ne-resize';
      case 'n':
      case 's':
        return 'ns-resize';
      case 'e':
      case 'w':
        return 'ew-resize';
      default:
        return 'default';
    }
  };

  const generateId = (): string => `shape-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const handleShapeClick = (shape: Shape, position: Point) => {
    if (onShapeClick) {
      onShapeClick(shape, position);
    }
    
    // Check if this is a click on a line endpoint (for arrow tip cycling)
    if (shape.type === 'line' && (currentTool === 'select' || currentTool === 'draw')) {
      const lineShape = shape as Shape & { 
        points: Point[]; 
        arrowTipStart?: ArrowTipStyle; 
        arrowTipEnd?: ArrowTipStyle; 
      };

      // Use the same logic as drag detection to check if we're near an endpoint
      const dragMode = detectLineDragMode(shape, position);

      if (dragMode === 'resize-end') {
        const newArrowTipEnd = cycleArrowTip(lineShape.arrowTipEnd);

        if (onUpdateShape) {
          onUpdateShape(shape.id, { arrowTipEnd: newArrowTipEnd });
        }
        return; // Don't proceed with other click handling
      } else if (dragMode === 'resize-start') {
        const newArrowTipStart = cycleArrowTip(lineShape.arrowTipStart);

        if (onUpdateShape) {
          onUpdateShape(shape.id, { arrowTipStart: newArrowTipStart });
        }
        return; // Don't proceed with other click handling
      }
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
  };
  
  const handleLabelSave = (shapeId: string, label: string) => {
    // Find the shape to determine its type
    const shape = shapes.find(s => s.id === shapeId);
    
    if (shape && shape.type === 'text') {
      // For text shapes, update the 'text' property
      if (onUpdateShape) {
        onUpdateShape(shapeId, { text: label });
      }
    } else {
      // For all other shapes, update the 'label' property
      if (onUpdateLabel) {
        onUpdateLabel(shapeId, label);
      }
    }
    setEditingShape(null);
  };
  
  const handleLabelCancel = () => {
    setEditingShape(null);
  };
  
  const handleCanvasDoubleClick = (e: React.MouseEvent) => {
    // Only handle canvas double clicks if we're not clicking on a shape
    if (e.target === e.currentTarget) {
      // If already editing a label, do nothing
      if (editingShape) return;
      
      // Get click position relative to SVG
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Snap to grid if enabled
      const snappedX = snapToGrid(x, 20);
      const snappedY = snapToGrid(y, 20);
      
      // Create new text shape
      const newTextShape: Shape = {
        id: generateId(),
        type: 'text',
        x: snappedX,
        y: snappedY,
        text: '',
        fontSize: currentFontSize || 16,
        style: {
          stroke: strokeColor,
          fill: 'transparent',
          strokeWidth: 1,
        },
        zIndex: Date.now(),
      };
      
      // Add the shape and immediately start editing
      if (onAddShape) {
        onAddShape(newTextShape);
        setEditingShape(newTextShape);
      }
    }
  };
  
  // Double-click handler for shapes (works in any mode)
  const handleShapeDoubleClick = (shape: Shape) => {
    // Cancel the drag timeout to prevent drag from starting
    if (dragTimeout) {
      clearTimeout(dragTimeout);
      setDragTimeout(null);
    }
    setEditingShape(shape);
  };
  
  // Mouse down on shape: prepare for potential dragging
  const handleShapeMouseDown = (shape: Shape, e: React.MouseEvent) => {
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
    
    // Store the initial mouse position and shape info for potential dragging
    const center = getShapeCenter(shape);
    setMouseDownShape({ shape, initialPos: mousePoint, center });
    setHasMoved(false);
  };

  // Mouse move: if dragging, update shape position
  const handleMouseMove = (e: React.MouseEvent) => {
    const mouseX = e.nativeEvent.offsetX;
    const mouseY = e.nativeEvent.offsetY;
    const mousePoint = { x: mouseX, y: mouseY };
    
    // Handle resize operations
    if (resizeMode === 'resize' && resizeHandle && resizeStartData) {
      const deltaX = mouseX - resizeStartData.startPoint.x;
      const deltaY = mouseY - resizeStartData.startPoint.y;
      
      const newBounds = calculateResizeBounds(
        resizeStartData.originalBounds,
        resizeHandle,
        deltaX,
        deltaY,
        resizeStartData.shape.type
      );
      
      // Create updated shape for visual feedback
      const updatedShape = cloneDeep(resizeStartData.shape);
      
      switch (updatedShape.type) {
        case 'rectangle':
        case 'square':
        case 'diamond':
        case 'triangle': {
          (updatedShape as Shape & { x: number; y: number; width: number; height: number }).x = newBounds.x;
          (updatedShape as Shape & { x: number; y: number; width: number; height: number }).y = newBounds.y;
          (updatedShape as Shape & { x: number; y: number; width: number; height: number }).width = newBounds.width;
          (updatedShape as Shape & { x: number; y: number; width: number; height: number }).height = newBounds.height;
          break;
        }
        case 'circle': {
          (updatedShape as Shape & { x: number; y: number; radius: number }).x = newBounds.x;
          (updatedShape as Shape & { x: number; y: number; radius: number }).y = newBounds.y;
          (updatedShape as Shape & { x: number; y: number; radius: number }).radius = newBounds.radius || 20;
          break;
        }
        case 'text': {
          (updatedShape as Shape & { x: number; y: number }).x = newBounds.x + newBounds.width / 2;
          (updatedShape as Shape & { x: number; y: number }).y = newBounds.y + newBounds.height / 2;
          break;
        }
      }
      
      setDraggedShape(updatedShape);
      
      // Calculate and update drag guides
      const boundingBox = getShapeBoundingBox(updatedShape);
      setDragGuides(boundingBox);
      return;
    }
    
    // Check if we should start dragging (mouse moved from initial position)
    if (mouseDownShape && !draggingShapeId && !hasMoved) {
      const distance = Math.sqrt(
        Math.pow(mousePoint.x - mouseDownShape.initialPos.x, 2) + 
        Math.pow(mousePoint.y - mouseDownShape.initialPos.y, 2)
      );
      
      // Start dragging if mouse moved more than 5 pixels
      if (distance > 5) {
        const shape = mouseDownShape.shape;
        
        // For lines, detect drag mode
        if (shape.type === 'line') {
          const dragMode = detectLineDragMode(shape, mouseDownShape.initialPos);
          setLineDragMode(dragMode);
          
          if (dragMode === 'resize-start' || dragMode === 'resize-end') {
            // For resizing, store the fixed point (the endpoint we're NOT dragging)
            const lineShape = shape as Shape & { points: Point[] };
            const fixedPoint = dragMode === 'resize-start' ? lineShape.points[lineShape.points.length - 1] : lineShape.points[0];
            setLineDragPoint(fixedPoint);
          }
        }
        
        setDraggingShapeId(shape.id);
        setDragOffset({ 
          x: mouseDownShape.initialPos.x - mouseDownShape.center.x, 
          y: mouseDownShape.initialPos.y - mouseDownShape.center.y 
        });
        setHasMoved(true);
      }
    }
    
    if (!draggingShapeId || !dragOffset) {
      return;
    }
    
    const idx = shapes.findIndex(s => s.id === draggingShapeId);
    if (idx === -1) {
      return;
    }
    const shape = shapes[idx];
    
    // Create updated shape for visual feedback
    const updatedShape = cloneDeep(shape);
    
    if (shape.type === 'line' && lineDragMode && lineDragPoint) {
      // Handle line resizing
      const snappedX = snapToGrid(mouseX, 20);
      const snappedY = snapToGrid(mouseY, 20);
      
      if (lineDragMode === 'resize-start') {
        // Move start point to mouse position, keep end point fixed
        (updatedShape as Shape & { points: Point[] }).points = [
          { x: snappedX, y: snappedY },
          lineDragPoint
        ];
      } else if (lineDragMode === 'resize-end') {
        // Move end point to mouse position, keep start point fixed
        (updatedShape as Shape & { points: Point[] }).points = [
          lineDragPoint,
          { x: snappedX, y: snappedY }
        ];
      } else {
        // Move entire line
        const center = getShapeCenter(shape);
        const newCenterX = snapToGrid(mouseX - dragOffset.x, 20);
        const newCenterY = snapToGrid(mouseY - dragOffset.y, 20);
        const dx = newCenterX - center.x;
        const dy = newCenterY - center.y;
        const lineShape = shape as Shape & { points: Point[] };
        (updatedShape as Shape & { points: Point[] }).points = lineShape.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
      }
    } else {
      // Handle other shapes (normal dragging)
      const newCenterX = snapToGrid(mouseX - dragOffset.x, 20);
      const newCenterY = snapToGrid(mouseY - dragOffset.y, 20);
      
      // Defensive: ensure shape is valid
      if (!shape || typeof (shape as any).type !== 'string') {
        return;
      }
      switch ((shape as Shape).type) {
        case 'rectangle':
        case 'square': {
          const boxShape = shape as Shape & { x: number; y: number; width: number; height: number };
          (updatedShape as Shape & { x: number; y: number }).x = newCenterX - boxShape.width / 2;
          (updatedShape as Shape & { x: number; y: number }).y = newCenterY - boxShape.height / 2;
          break;
        }
        case 'diamond':
        case 'triangle': {
          // For diamond and triangle, x and y represent the center, not top-left corner
          (updatedShape as Shape & { x: number; y: number }).x = newCenterX;
          (updatedShape as Shape & { x: number; y: number }).y = newCenterY;
          break;
        }
        case 'circle': {
          (updatedShape as Shape & { x: number; y: number }).x = newCenterX;
          (updatedShape as Shape & { x: number; y: number }).y = newCenterY;
          break;
        }
        case 'arrow': {
          const center = getShapeCenter(shape);
          const dx = newCenterX - center.x;
          const dy = newCenterY - center.y;
          const arrowShape = shape as Shape & { from: Point; to: Point };
          (updatedShape as Shape & { from: Point; to: Point }).from = { x: arrowShape.from.x + dx, y: arrowShape.from.y + dy };
          (updatedShape as Shape & { from: Point; to: Point }).to = { x: arrowShape.to.x + dx, y: arrowShape.to.y + dy };
          break;
        }
        case 'text': {
          (updatedShape as Shape & { x: number; y: number }).x = newCenterX;
          (updatedShape as Shape & { x: number; y: number }).y = newCenterY;
          break;
        }
        case 'line': {
          // Move all points by the delta
          const center = getShapeCenter(shape);
          const dx = newCenterX - center.x;
          const dy = newCenterY - center.y;
          const lineShape = shape as Shape & { points: Point[] };
          (updatedShape as Shape & { points: Point[] }).points = lineShape.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
          break;
        }
        default:
          break;
      }
    }
    
    // Update the dragged shape for visual feedback
    setDraggedShape(updatedShape);
    
    // Calculate and update drag guides
    const boundingBox = getShapeBoundingBox(updatedShape);
    setDragGuides(boundingBox);
  };

  // Mouse up: stop dragging and update shape in state
  const handleMouseUp = (e: React.MouseEvent) => {
    // Handle resize operations
    if (resizeMode === 'resize' && resizeHandle && resizeStartData) {
      const mouseX = e.nativeEvent.offsetX;
      const mouseY = e.nativeEvent.offsetY;
      const deltaX = mouseX - resizeStartData.startPoint.x;
      const deltaY = mouseY - resizeStartData.startPoint.y;
      
      const newBounds = calculateResizeBounds(
        resizeStartData.originalBounds,
        resizeHandle,
        deltaX,
        deltaY,
        resizeStartData.shape.type
      );
      
      // Prepare updates based on shape type
      let updates: Partial<Shape> = {};
      
      switch (resizeStartData.shape.type) {
        case 'rectangle':
        case 'square':
        case 'diamond':
        case 'triangle': {
          updates = {
            x: newBounds.x,
            y: newBounds.y,
            width: newBounds.width,
            height: newBounds.height
          } as Partial<Shape & { x: number; y: number; width: number; height: number }>;
          break;
        }
        case 'circle': {
          updates = {
            x: newBounds.x,
            y: newBounds.y,
            radius: newBounds.radius || 20
          } as Partial<Shape & { x: number; y: number; radius: number }>;
          break;
        }
        case 'text': {
          updates = {
            x: newBounds.x + newBounds.width / 2,
            y: newBounds.y + newBounds.height / 2
          } as Partial<Shape & { x: number; y: number }>;
          break;
        }
      }
      
      // Update the shape in global state
      if (onUpdateShape && Object.keys(updates).length > 0) {
        onUpdateShape(resizeStartData.shape.id, updates);
      }
      
      // Reset resize state
      setResizeMode(null);
      setResizeHandle(null);
      setResizeStartData(null);
      setDraggedShape(null);
      setDragGuides(null);
      return;
    }
    
    // If we have a mouse down shape but no dragging occurred, treat it as a click
    if (mouseDownShape && !draggingShapeId) {
      const currentMousePos = {
        x: e.nativeEvent.offsetX,
        y: e.nativeEvent.offsetY
      };
      handleShapeClick(mouseDownShape.shape, currentMousePos);
      
      // Clean up mouse down state
      setMouseDownShape(null);
      setHasMoved(false);
      return;
    }
    
    if (!draggingShapeId || !dragOffset) {
      return;
    }
    
    const mouseX = e.nativeEvent.offsetX;
    const mouseY = e.nativeEvent.offsetY;
    const idx = shapes.findIndex(s => s.id === draggingShapeId);
    if (idx === -1) {
      return;
    }
    const shape = shapes[idx];
    
    // Prepare updates based on shape type and drag mode
    let updates: Partial<Shape> = {};
    
    if (shape.type === 'line' && lineDragMode && lineDragPoint) {
      // Handle line resizing updates
      const snappedX = snapToGrid(mouseX, 20);
      const snappedY = snapToGrid(mouseY, 20);
      
      if (lineDragMode === 'resize-start') {
        updates = {
          points: [
            { x: snappedX, y: snappedY },
            lineDragPoint
          ]
        } as Partial<Shape & { points: Point[] }>;
      } else if (lineDragMode === 'resize-end') {
        updates = {
          points: [
            lineDragPoint,
            { x: snappedX, y: snappedY }
          ]
        } as Partial<Shape & { points: Point[] }>;
      } else {
        // Move entire line
        const center = getShapeCenter(shape);
        const newCenterX = snapToGrid(mouseX - dragOffset.x, 20);
        const newCenterY = snapToGrid(mouseY - dragOffset.y, 20);
        const dx = newCenterX - center.x;
        const dy = newCenterY - center.y;
        const lineShape = shape as Shape & { points: Point[] };
        updates = {
          points: lineShape.points.map(p => ({ x: p.x + dx, y: p.y + dy }))
        } as Partial<Shape & { points: Point[] }>;
      }
    } else {
      // Handle other shapes (normal dragging)
      const center = getShapeCenter(shape);
      const newCenterX = snapToGrid(mouseX - dragOffset.x, 20);
      const newCenterY = snapToGrid(mouseY - dragOffset.y, 20);
      
      // Defensive: ensure shape is valid
      if (!shape || typeof (shape as any).type !== 'string') {
        return;
      }
      switch ((shape as Shape).type) {
        case 'rectangle':
        case 'square': {
          const boxShape = shape as Shape & { x: number; y: number; width: number; height: number };
          updates = {
            x: newCenterX - boxShape.width / 2,
            y: newCenterY - boxShape.height / 2
          } as Partial<Shape & { x: number; y: number }>;
          break;
        }
        case 'diamond':
        case 'triangle': {
          // For diamond and triangle, x and y represent the center, not top-left corner
          updates = {
            x: newCenterX,
            y: newCenterY
          } as Partial<Shape & { x: number; y: number }>;
          break;
        }
        case 'circle': {
          updates = {
            x: newCenterX,
            y: newCenterY
          } as Partial<Shape & { x: number; y: number }>;
          break;
        }
        case 'arrow': {
          const dx = newCenterX - center.x;
          const dy = newCenterY - center.y;
          const arrowShape = shape as Shape & { from: Point; to: Point };
          updates = {
            from: { x: arrowShape.from.x + dx, y: arrowShape.from.y + dy },
            to: { x: arrowShape.to.x + dx, y: arrowShape.to.y + dy }
          } as Partial<Shape & { from: Point; to: Point }>;
          break;
        }
        case 'text': {
          updates = {
            x: newCenterX,
            y: newCenterY
          } as Partial<Shape & { x: number; y: number }>;
          break;
        }
        case 'line': {
          // Move all points by the delta
          const dx = newCenterX - center.x;
          const dy = newCenterY - center.y;
          const lineShape = shape as Shape & { points: Point[] };
          updates = {
            points: lineShape.points.map(p => ({ x: p.x + dx, y: p.y + dy }))
          } as Partial<Shape & { points: Point[] }>;
          break;
        }
        default:
          break;
      }
    }
    
    // Update the shape in global state
    if (onUpdateShape && Object.keys(updates).length > 0) {
      onUpdateShape(draggingShapeId, updates);
    }
    
    setDraggingShapeId(null);
    setDragOffset(null);
    setDraggedShape(null);
    setLineDragMode(null);
    setLineDragPoint(null);
    setMouseDownShape(null);
    setHasMoved(false);
    setDragGuides(null);
    
    // Clear any pending drag timeout
    if (dragTimeout) {
      clearTimeout(dragTimeout);
      setDragTimeout(null);
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Information Icon */}
      <button
        onClick={() => setShowInfoModal(true)}
        className={`absolute top-4 right-4 z-10 p-2 rounded-full shadow-lg transition-all duration-200 hover:scale-110 ${
          canvasSettings.mode === 'dark' 
            ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' 
            : 'bg-white hover:bg-gray-100 text-gray-700'
        }`}
        title="Shape Snap Help"
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      </button>

      <svg 
        ref={svgRef}
        width={width} 
        height={height}
        style={{ 
          backgroundColor: canvasSettings.background,
          touchAction: 'none',
          cursor: getResizeCursor(resizeHandle)
        }}
        onDoubleClick={handleCanvasDoubleClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Render all shapes */}
        {shapesToRender.map(shape => (
          sketchModeEnabled && svgRef.current ? (
            (() => {
              switch (shape.type) {
                case 'rectangle':
                case 'square':
                case 'circle':
                case 'diamond':
                case 'triangle':
                case 'line': {
                  const roughMarkup = renderRoughShapeSVG(svgRef.current, shape.type, shape, {
                    roughness: 2.2,
                    stroke: shape.style?.stroke || '#000',
                    strokeWidth: shape.style?.strokeWidth || 2,
                    fill: shape.style?.fill || undefined,
                    fillStyle: 'hachure',
                    seed: hashCode(shape.id),
                  });
                  // Render roughjs shape for visuals, then the normal SVG shape (with event handlers) on top, but invisible
                  return roughMarkup ? (
                    <g key={shape.id}>
                      <g dangerouslySetInnerHTML={{ __html: roughMarkup }} />
                      {/* Invisible hit area for interactivity */}
                      {renderShape(
                        // Clone the shape and override style for hit area
                        { ...shape, style: { ...shape.style, stroke: 'transparent', fill: 'transparent' } },
                        (s, pos) => { handleShapeClick(s, pos); },
                        selectedShapeId,
                        editingShape ? editingShape.id : undefined,
                        handleShapeDoubleClick,
                        handleShapeMouseDown,
                        currentTool,
                        sketchModeEnabled,
                        currentFontSize
                      )}
                      {renderShapeOverlay(shape, editingShape ? editingShape.id : undefined, sketchModeEnabled, currentFontSize)}
                    </g>
                  ) : null;
                }
                default:
                  return renderShape(shape, (s, pos) => { handleShapeClick(s, pos); }, selectedShapeId, editingShape ? editingShape.id : undefined, handleShapeDoubleClick, handleShapeMouseDown, currentTool, sketchModeEnabled, currentFontSize);
              }
            })()
          ) : (
            renderShape(
              shape, 
              (s, pos) => { handleShapeClick(s, pos); },
              selectedShapeId,
              editingShape ? editingShape.id : undefined,
              handleShapeDoubleClick,
              handleShapeMouseDown,
              currentTool,
              sketchModeEnabled,
              currentFontSize
            )
          )
        ))}
        
        {/* Render current drawing stroke */}
        {currentPoints.length > 1 && (
          <path
            d={`M ${currentPoints.map(p => `${p.x},${p.y}`).join(' L ')}`}
            stroke={strokeColor}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.8}
          />
        )}

        {/* Render label editor INSIDE the SVG */}
        {editingShape && (
          (() => {
            const { x, y, width, height } = getEditorRect(editingShape);
            return (
              <ShapeLabelEditor
                shape={editingShape}
                onSave={handleLabelSave}
                onCancel={handleLabelCancel}
                x={x}
                y={y}
                width={width}
                height={height}
                canvasMode={canvasSettings.mode}
              />
            );
          })()
        )}

        {/* Render drag guides */}
        {dragGuides && (
          <g>
            {/* Vertical guides */}
            <line
              key="drag-guide-left"
              x1={dragGuides.left}
              y1={0}
              x2={dragGuides.left}
              y2={height}
              stroke={canvasSettings.mode === 'dark' ? '#ffffff' : '#000000'}
              strokeWidth={1}
              strokeDasharray="5,5"
              opacity={0.3}
            />
            <line
              key="drag-guide-right"
              x1={dragGuides.right}
              y1={0}
              x2={dragGuides.right}
              y2={height}
              stroke={canvasSettings.mode === 'dark' ? '#ffffff' : '#000000'}
              strokeWidth={1}
              strokeDasharray="5,5"
              opacity={0.3}
            />
            {/* Horizontal guides */}
            <line
              key="drag-guide-top"
              x1={0}
              y1={dragGuides.top}
              x2={width}
              y2={dragGuides.top}
              stroke={canvasSettings.mode === 'dark' ? '#ffffff' : '#000000'}
              strokeWidth={1}
              strokeDasharray="5,5"
              opacity={0.3}
            />
            <line
              key="drag-guide-bottom"
              x1={0}
              y1={dragGuides.bottom}
              x2={width}
              y2={dragGuides.bottom}
              stroke={canvasSettings.mode === 'dark' ? '#ffffff' : '#000000'}
              strokeWidth={1}
              strokeDasharray="5,5"
              opacity={0.3}
            />
          </g>
        )}

        {/* Render resize indicators */}
        {shapesToRender.map(shape => renderResizeIndicators(shape))}
      </svg>

      {/* Information Modal */}
      <ShapeSnapInfoModal
        isOpen={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        canvasMode={canvasSettings.mode}
      />
    </div>
  );
};
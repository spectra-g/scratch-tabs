import React, { useState, useRef } from 'react';
import { CanvasSettings, Shape, Point, ShapeSnapTool, ArrowTipStyle } from '../types';
import { renderShape, getShapeCenter, renderRoughShapeSVG, renderShapeOverlay, hashCode } from '../utils/renderUtils';
import { ShapeLabelEditor } from './ShapeLabelEditor';
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

  const generateId = (): string => `shape-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const handleShapeClick = (shape: Shape, position: Point) => {
    console.log('🖱️ handleShapeClick called:', { shapeId: shape.id, shapeType: shape.type, position });
    
    if (onShapeClick) {
      onShapeClick(shape, position);
    }
    
    // Check if this is a click on a line endpoint (for arrow tip cycling)
    if (shape.type === 'line' && (currentTool === 'select' || currentTool === 'draw')) {
      console.log('📏 Checking if click is near line endpoint...');
      const lineShape = shape as Shape & { 
        points: Point[]; 
        arrowTipStart?: ArrowTipStyle; 
        arrowTipEnd?: ArrowTipStyle; 
      };
      console.log('📏 Line points:', lineShape.points.map(p => ({ x: p.x, y: p.y })));
      console.log('📏 Start point:', lineShape.points[0]);
      console.log('📏 End point:', lineShape.points[lineShape.points.length - 1]);
      console.log('📏 Current arrow tips:', { start: lineShape.arrowTipStart, end: lineShape.arrowTipEnd });
      
      // Use the same logic as drag detection to check if we're near an endpoint
      const dragMode = detectLineDragMode(shape, position);
      console.log('📏 Drag mode detected:', dragMode);
      
      if (dragMode === 'resize-end') {
        console.log('🎯 Click detected on line end point, cycling end arrow tip');
        const newArrowTipEnd = cycleArrowTip(lineShape.arrowTipEnd);
        console.log('🔄 Cycling end arrow tip from', lineShape.arrowTipEnd, 'to', newArrowTipEnd);
        
        if (onUpdateShape) {
          onUpdateShape(shape.id, { arrowTipEnd: newArrowTipEnd });
        } else {
          console.log('❌ No onUpdateShape function available');
        }
        return; // Don't proceed with other click handling
      } else if (dragMode === 'resize-start') {
        console.log('🎯 Click detected on line start point, cycling start arrow tip');
        const newArrowTipStart = cycleArrowTip(lineShape.arrowTipStart);
        console.log('🔄 Cycling start arrow tip from', lineShape.arrowTipStart, 'to', newArrowTipStart);
        
        if (onUpdateShape) {
          onUpdateShape(shape.id, { arrowTipStart: newArrowTipStart });
        } else {
          console.log('❌ No onUpdateShape function available');
        }
        return; // Don't proceed with other click handling
      } else {
        console.log('❌ Click not near line endpoint (drag mode:', dragMode, ')');
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
          console.log('🗑️ Deleting shape in eraser mode:', shape.id);
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
        fontSize: 16,
        style: {
          stroke: strokeColor,
          fill: 'transparent',
          strokeWidth: 1,
        },
        zIndex: Date.now(),
      };
      
      console.log('📝 Creating new text shape at:', { x: snappedX, y: snappedY });
      
      // Add the shape and immediately start editing
      if (onAddShape) {
        onAddShape(newTextShape);
        setEditingShape(newTextShape);
      }
    }
  };
  
  // Double-click handler for shapes (works in any mode)
  const handleShapeDoubleClick = (shape: Shape) => {
    console.log('🖱️ Double-click detected, canceling drag timeout');
    // Cancel the drag timeout to prevent drag from starting
    if (dragTimeout) {
      clearTimeout(dragTimeout);
      setDragTimeout(null);
    }
    setEditingShape(shape);
  };
  
  // Mouse down on shape: prepare for potential dragging
  const handleShapeMouseDown = (shape: Shape, e: React.MouseEvent) => {
    console.log('🔍 Shape mouse down:', shape.id, shape.type);
    e.stopPropagation();
    
    // Clear any existing timeout
    if (dragTimeout) {
      clearTimeout(dragTimeout);
      setDragTimeout(null);
    }
    
    const mouseX = e.nativeEvent.offsetX;
    const mouseY = e.nativeEvent.offsetY;
    const mousePoint = { x: mouseX, y: mouseY };
    
    // Store the initial mouse position and shape info for potential dragging
    const center = getShapeCenter(shape);
    setMouseDownShape({ shape, initialPos: mousePoint, center });
    setHasMoved(false);
    
    console.log('📍 Mouse position:', { mouseX, mouseY });
    console.log('🎯 Shape center:', center);
  };

  // Mouse move: if dragging, update shape position
  const handleMouseMove = (e: React.MouseEvent) => {
    const mouseX = e.nativeEvent.offsetX;
    const mouseY = e.nativeEvent.offsetY;
    const mousePoint = { x: mouseX, y: mouseY };
    
    // Check if we should start dragging (mouse moved from initial position)
    if (mouseDownShape && !draggingShapeId && !hasMoved) {
      const distance = Math.sqrt(
        Math.pow(mousePoint.x - mouseDownShape.initialPos.x, 2) + 
        Math.pow(mousePoint.y - mouseDownShape.initialPos.y, 2)
      );
      
      // Start dragging if mouse moved more than 5 pixels
      if (distance > 5) {
        console.log('🔄 Starting drag due to mouse movement');
        const shape = mouseDownShape.shape;
        
        // For lines, detect drag mode
        if (shape.type === 'line') {
          const dragMode = detectLineDragMode(shape, mouseDownShape.initialPos);
          console.log('📏 Line drag mode detected:', dragMode);
          setLineDragMode(dragMode);
          
          if (dragMode === 'resize-start' || dragMode === 'resize-end') {
            // For resizing, store the fixed point (the endpoint we're NOT dragging)
            const lineShape = shape as Shape & { points: Point[] };
            const fixedPoint = dragMode === 'resize-start' ? lineShape.points[lineShape.points.length - 1] : lineShape.points[0];
            setLineDragPoint(fixedPoint);
            console.log('📍 Fixed point for resizing:', fixedPoint);
          }
        }
        
        setDraggingShapeId(shape.id);
        setDragOffset({ 
          x: mouseDownShape.initialPos.x - mouseDownShape.center.x, 
          y: mouseDownShape.initialPos.y - mouseDownShape.center.y 
        });
        setHasMoved(true);
        console.log('📏 Drag offset set:', { 
          x: mouseDownShape.initialPos.x - mouseDownShape.center.x, 
          y: mouseDownShape.initialPos.y - mouseDownShape.center.y 
        });
      }
    }
    
    if (!draggingShapeId || !dragOffset) {
      return;
    }
    
    console.log('🔄 Mouse move while dragging:', draggingShapeId);
    const idx = shapes.findIndex(s => s.id === draggingShapeId);
    if (idx === -1) {
      console.log('❌ Shape not found:', draggingShapeId);
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
        console.log('📏 Resizing line start:', { start: { x: snappedX, y: snappedY }, end: lineDragPoint });
      } else if (lineDragMode === 'resize-end') {
        // Move end point to mouse position, keep start point fixed
        (updatedShape as Shape & { points: Point[] }).points = [
          lineDragPoint,
          { x: snappedX, y: snappedY }
        ];
        console.log('📏 Resizing line end:', { start: lineDragPoint, end: { x: snappedX, y: snappedY } });
      } else {
        // Move entire line
        const center = getShapeCenter(shape);
        const newCenterX = snapToGrid(mouseX - dragOffset.x, 20);
        const newCenterY = snapToGrid(mouseY - dragOffset.y, 20);
        const dx = newCenterX - center.x;
        const dy = newCenterY - center.y;
        const lineShape = shape as Shape & { points: Point[] };
        (updatedShape as Shape & { points: Point[] }).points = lineShape.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
        console.log('📏 Moving entire line:', (updatedShape as Shape & { points: Point[] }).points);
      }
    } else {
      // Handle other shapes (normal dragging)
      const newCenterX = snapToGrid(mouseX - dragOffset.x, 20);
      const newCenterY = snapToGrid(mouseY - dragOffset.y, 20);
      console.log('🎯 New center position:', { newCenterX, newCenterY });
      
      // Defensive: ensure shape is valid
      if (!shape || typeof (shape as any).type !== 'string') {
        console.log('❓ Invalid shape for switch');
        return;
      }
      switch ((shape as Shape).type) {
        case 'rectangle':
        case 'square': {
          const boxShape = shape as Shape & { x: number; y: number; width: number; height: number };
          (updatedShape as Shape & { x: number; y: number }).x = newCenterX - boxShape.width / 2;
          (updatedShape as Shape & { x: number; y: number }).y = newCenterY - boxShape.height / 2;
          console.log('📦 Updated box shape position:', { x: (updatedShape as Shape & { x: number; y: number }).x, y: (updatedShape as Shape & { x: number; y: number }).y });
          break;
        }
        case 'diamond':
        case 'triangle': {
          // For diamond and triangle, x and y represent the center, not top-left corner
          (updatedShape as Shape & { x: number; y: number }).x = newCenterX;
          (updatedShape as Shape & { x: number; y: number }).y = newCenterY;
          console.log('🔷 Updated diamond/triangle position:', { x: (updatedShape as Shape & { x: number; y: number }).x, y: (updatedShape as Shape & { x: number; y: number }).y });
          break;
        }
        case 'circle': {
          (updatedShape as Shape & { x: number; y: number }).x = newCenterX;
          (updatedShape as Shape & { x: number; y: number }).y = newCenterY;
          console.log('⭕ Updated circle position:', { x: (updatedShape as Shape & { x: number; y: number }).x, y: (updatedShape as Shape & { x: number; y: number }).y });
          break;
        }
        case 'arrow': {
          const center = getShapeCenter(shape);
          const dx = newCenterX - center.x;
          const dy = newCenterY - center.y;
          const arrowShape = shape as Shape & { from: Point; to: Point };
          (updatedShape as Shape & { from: Point; to: Point }).from = { x: arrowShape.from.x + dx, y: arrowShape.from.y + dy };
          (updatedShape as Shape & { from: Point; to: Point }).to = { x: arrowShape.to.x + dx, y: arrowShape.to.y + dy };
          console.log('➡️ Updated arrow position:', { from: (updatedShape as Shape & { from: Point; to: Point }).from, to: (updatedShape as Shape & { from: Point; to: Point }).to });
          break;
        }
        case 'text': {
          (updatedShape as Shape & { x: number; y: number }).x = newCenterX;
          (updatedShape as Shape & { x: number; y: number }).y = newCenterY;
          console.log('📝 Updated text position:', { x: (updatedShape as Shape & { x: number; y: number }).x, y: (updatedShape as Shape & { x: number; y: number }).y });
          break;
        }
        case 'line': {
          // Move all points by the delta
          const center = getShapeCenter(shape);
          const dx = newCenterX - center.x;
          const dy = newCenterY - center.y;
          const lineShape = shape as Shape & { points: Point[] };
          (updatedShape as Shape & { points: Point[] }).points = lineShape.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
          console.log('📏 Updated line points (move):', (updatedShape as Shape & { points: Point[] }).points);
          break;
        }
        default:
          console.log('❓ Unknown shape type:', (shape as Shape).type);
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
    // If we have a mouse down shape but no dragging occurred, treat it as a click
    if (mouseDownShape && !draggingShapeId) {
      console.log('🖱️ Mouse up without dragging - treating as click');
      console.log('📍 Mouse down shape:', mouseDownShape.shape.id, mouseDownShape.shape.type);
      console.log('📍 Initial position:', mouseDownShape.initialPos);
      const currentMousePos = {
        x: e.nativeEvent.offsetX,
        y: e.nativeEvent.offsetY
      };
      console.log('📍 Current mouse position:', currentMousePos);
      handleShapeClick(mouseDownShape.shape, currentMousePos);
      
      // Clean up mouse down state
      setMouseDownShape(null);
      setHasMoved(false);
      return;
    }
    
    if (!draggingShapeId || !dragOffset) {
      console.log('❌ Mouse up but not dragging:', { draggingShapeId, dragOffset });
      return;
    }
    
    console.log('🛑 Mouse up - finishing drag for:', draggingShapeId);
    const mouseX = e.nativeEvent.offsetX;
    const mouseY = e.nativeEvent.offsetY;
    const idx = shapes.findIndex(s => s.id === draggingShapeId);
    if (idx === -1) {
      console.log('❌ Shape not found in original shapes:', draggingShapeId);
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
        console.log('📏 Line resize-start updates:', updates);
      } else if (lineDragMode === 'resize-end') {
        updates = {
          points: [
            lineDragPoint,
            { x: snappedX, y: snappedY }
          ]
        } as Partial<Shape & { points: Point[] }>;
        console.log('📏 Line resize-end updates:', updates);
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
        console.log('📏 Line move updates:', updates);
      }
    } else {
      // Handle other shapes (normal dragging)
      const center = getShapeCenter(shape);
      const newCenterX = snapToGrid(mouseX - dragOffset.x, 20);
      const newCenterY = snapToGrid(mouseY - dragOffset.y, 20);
      console.log('🎯 Final position:', { newCenterX, newCenterY });
      
      // Defensive: ensure shape is valid
      if (!shape || typeof (shape as any).type !== 'string') {
        console.log('❓ Invalid shape for switch');
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
          console.log('📦 Box shape updates:', updates);
          break;
        }
        case 'diamond':
        case 'triangle': {
          // For diamond and triangle, x and y represent the center, not top-left corner
          updates = {
            x: newCenterX,
            y: newCenterY
          } as Partial<Shape & { x: number; y: number }>;
          console.log('🔷 Diamond/triangle updates:', updates);
          break;
        }
        case 'circle': {
          updates = {
            x: newCenterX,
            y: newCenterY
          } as Partial<Shape & { x: number; y: number }>;
          console.log('⭕ Circle updates:', updates);
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
          console.log('➡️ Arrow updates:', updates);
          break;
        }
        case 'text': {
          updates = {
            x: newCenterX,
            y: newCenterY
          } as Partial<Shape & { x: number; y: number }>;
          console.log('📝 Text updates:', updates);
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
          console.log('📏 Line updates (move):', updates);
          break;
        }
        default:
          console.log('❓ Unknown shape type for updates:', (shape as Shape).type);
          break;
      }
    }
    
    // Update the shape in global state
    if (onUpdateShape && Object.keys(updates).length > 0) {
      console.log('💾 Calling onUpdateShape with:', { shapeId: draggingShapeId, updates });
      onUpdateShape(draggingShapeId, updates);
    } else {
      console.log('❌ No onUpdateShape function or no updates to apply');
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
    
    console.log('✅ Drag finished, state reset');
  };

  return (
    <div className="relative w-full h-full">
      <svg 
        ref={svgRef}
        width={width} 
        height={height}
        style={{ 
          backgroundColor: canvasSettings.background,
          touchAction: 'none'
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
                        sketchModeEnabled
                      )}
                      {renderShapeOverlay(shape, selectedShapeId, editingShape ? editingShape.id : undefined, sketchModeEnabled)}
                    </g>
                  ) : null;
                }
                default:
                  return renderShape(shape, (s, pos) => { handleShapeClick(s, pos); }, selectedShapeId, editingShape ? editingShape.id : undefined, handleShapeDoubleClick, handleShapeMouseDown, currentTool, sketchModeEnabled);
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
              sketchModeEnabled
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
      </svg>
    </div>
  );
};
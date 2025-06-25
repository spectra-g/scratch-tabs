import React from 'react';
import { Shape, Point } from '../types';

// Calculate the arrowhead points
const calculateArrowhead = (from: Point, to: Point, headSize = 10): [Point, Point] => {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  
  const point1 = {
    x: to.x - headSize * Math.cos(angle - Math.PI / 6),
    y: to.y - headSize * Math.sin(angle - Math.PI / 6)
  };
  
  const point2 = {
    x: to.x - headSize * Math.cos(angle + Math.PI / 6),
    y: to.y - headSize * Math.sin(angle + Math.PI / 6)
  };
  
  return [point1, point2];
};

// Create a diamond path
const createDiamondPath = (x: number, y: number, width: number, height: number): string => {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  
  return `
    M ${x}, ${y - halfHeight}
    L ${x + halfWidth}, ${y}
    L ${x}, ${y + halfHeight}
    L ${x - halfWidth}, ${y}
    Z
  `;
};

// Create a triangle path
const createTrianglePath = (x: number, y: number, width: number, height: number): string => {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  
  return `
    M ${x}, ${y - halfHeight}
    L ${x - halfWidth}, ${y + halfHeight}
    L ${x + halfWidth}, ${y + halfHeight}
    Z
  `;
};

// Helper function to get shape center for label positioning
export const getShapeCenter = (shape: Shape): Point => {
  switch (shape.type) {
    case 'line':
      const midIndex = Math.floor(shape.points.length / 2);
      return shape.points[midIndex] || { x: 0, y: 0 };
    case 'rectangle':
    case 'square':
      return { x: shape.x + shape.width / 2, y: shape.y + shape.height / 2 };
    case 'circle':
      return { x: shape.x, y: shape.y };
    case 'diamond':
    case 'triangle':
      // For diamond and triangle, x and y represent the center, not top-left corner
      return { x: shape.x, y: shape.y };
    case 'arrow':
      return { 
        x: (shape.from.x + shape.to.x) / 2, 
        y: (shape.from.y + shape.to.y) / 2 
      };
    case 'text':
      return { x: shape.x, y: shape.y };
    default:
      return { x: 0, y: 0 };
  }
};

// Helper function to calculate line label position based on orientation
const getLineLabelPosition = (shape: Shape & { points: Point[] }): { x: number; y: number; textAnchor: string; dominantBaseline: string } => {
  if (!shape.points || shape.points.length < 2) {
    return { x: 0, y: 0, textAnchor: 'middle', dominantBaseline: 'middle' };
  }
  
  const start = shape.points[0];
  const end = shape.points[shape.points.length - 1];
  
  // Calculate the middle point of the line
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  
  // Calculate the angle of the line
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  
  // Determine if the line is more horizontal or vertical
  const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
  
  if (isHorizontal) {
    // For horizontal lines, place label above the line
    return {
      x: midX,
      y: midY - 15, // 15 pixels above the line
      textAnchor: 'middle',
      dominantBaseline: 'bottom'
    };
  } else {
    // For vertical lines, place label to the right of the line
    return {
      x: midX + 15, // 15 pixels to the right of the line
      y: midY,
      textAnchor: 'start',
      dominantBaseline: 'middle'
    };
  }
};

// Render a shape with label and click handlers
export const renderShape = (
  shape: Shape, 
  onShapeClick?: (shape: Shape, position: Point) => void,
  selectedShapeId?: string,
  editingShapeId?: string,
  onDoubleClick?: (shape: Shape, position: Point) => void,
  onMouseDown?: (shape: Shape, e: React.MouseEvent) => void,
  currentTool?: string
): React.ReactNode => {
  const isSelected = selectedShapeId === shape.id;
  const isEditing = editingShapeId === shape.id;
  const center = getShapeCenter(shape);
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onShapeClick) {
      const rect = e.currentTarget.getBoundingClientRect();
      const position = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      onShapeClick(shape, position);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDoubleClick) {
      const rect = e.currentTarget.getBoundingClientRect();
      const position = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      onDoubleClick(shape, position);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    console.log('🖱️ Shape mouse down triggered:', shape.id, shape.type);
    e.stopPropagation();
    if (onMouseDown) {
      console.log('📞 Calling onMouseDown for shape:', shape.id);
      onMouseDown(shape, e);
    } else {
      console.log('❌ No onMouseDown handler provided');
    }
  };
  
  const baseProps = {
    onClick: handleClick,
    onDoubleClick: handleDoubleClick,
    onMouseDown: handleMouseDown,
    style: {
      cursor: currentTool === 'eraser' ? 'crosshair' : 'pointer',
      ...(isSelected && {
        filter: 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.5))'
      })
    }
  };

  const shapeElement = (() => {
    switch (shape.type) {
      case 'line':
        return (
          <path
            key={shape.id}
            {...baseProps}
            d={`M ${shape.points.map(p => `${p.x},${p.y}`).join(' L ')}`}
            stroke={shape.style.stroke}
            strokeWidth={shape.style.strokeWidth || 2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      case 'rectangle':
        return (
          <rect
            key={shape.id}
            {...baseProps}
            x={shape.x}
            y={shape.y}
            width={shape.width}
            height={shape.height}
            stroke={shape.style.stroke}
            fill={shape.style.fill || 'transparent'}
            strokeWidth={shape.style.strokeWidth || 2}
          />
        );
      case 'square':
        return (
          <rect
            key={shape.id}
            {...baseProps}
            x={shape.x}
            y={shape.y}
            width={shape.width}
            height={shape.height}
            stroke={shape.style.stroke}
            fill={shape.style.fill || 'transparent'}
            strokeWidth={shape.style.strokeWidth || 2}
          />
        );
      case 'triangle':
        return (
          <path
            key={shape.id}
            {...baseProps}
            d={createTrianglePath(shape.x, shape.y, shape.width, shape.height)}
            stroke={shape.style.stroke}
            fill={shape.style.fill || 'transparent'}
            strokeWidth={shape.style.strokeWidth || 2}
          />
        );
      case 'circle':
        return (
          <circle
            key={shape.id}
            {...baseProps}
            cx={shape.x}
            cy={shape.y}
            r={shape.radius}
            stroke={shape.style.stroke}
            fill={shape.style.fill || 'transparent'}
            strokeWidth={shape.style.strokeWidth || 2}
          />
        );
      case 'diamond':
        return (
          <path
            key={shape.id}
            {...baseProps}
            d={createDiamondPath(shape.x, shape.y, shape.width, shape.height)}
            stroke={shape.style.stroke}
            fill={shape.style.fill || 'transparent'}
            strokeWidth={shape.style.strokeWidth || 2}
          />
        );
      case 'arrow':
        const [arrowPoint1, arrowPoint2] = calculateArrowhead(shape.from, shape.to);
        return (
          <g key={shape.id} {...baseProps}>
            <line
              x1={shape.from.x}
              y1={shape.from.y}
              x2={shape.to.x}
              y2={shape.to.y}
              stroke={shape.style.stroke}
              strokeWidth={shape.style.strokeWidth || 2}
              strokeLinecap="round"
            />
            <polyline
              points={`${shape.to.x},${shape.to.y} ${arrowPoint1.x},${arrowPoint1.y} ${arrowPoint2.x},${arrowPoint2.y} ${shape.to.x},${shape.to.y}`}
              fill={shape.style.stroke}
              stroke={shape.style.stroke}
              strokeWidth={shape.style.strokeWidth || 2}
              strokeLinejoin="round"
            />
          </g>
        );
      case 'text':
        return (
          <text
            key={shape.id}
            {...baseProps}
            x={shape.x}
            y={shape.y}
            fill={shape.style.stroke}
            fontSize={shape.fontSize || 16}
            dominantBaseline="middle"
            textAnchor="middle"
          >
            {shape.text}
          </text>
        );
      default:
        return null;
    }
  })();

  // Render label if it exists and not editing
  const labelElement = (!isEditing && shape.label) ? (() => {
    if (shape.type === 'line') {
      // Use special positioning for lines based on orientation
      const labelPos = getLineLabelPosition(shape as Shape & { points: Point[] });
      return (
        <text
          key={`${shape.id}-label`}
          x={labelPos.x}
          y={labelPos.y}
          fill={shape.style.stroke}
          fontSize="12"
          dominantBaseline={labelPos.dominantBaseline}
          textAnchor={labelPos.textAnchor}
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
            textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
          }}
        >
          {shape.label}
        </text>
      );
    } else {
      // Use standard center positioning for other shapes
      return (
        <text
          key={`${shape.id}-label`}
          x={center.x}
          y={center.y}
          fill={shape.style.stroke}
          fontSize="12"
          dominantBaseline="middle"
          textAnchor="middle"
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
            textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
          }}
        >
          {shape.label}
        </text>
      );
    }
  })() : null;

  return (
    <g key={shape.id}>
      {shapeElement}
      {labelElement}
    </g>
  );
};
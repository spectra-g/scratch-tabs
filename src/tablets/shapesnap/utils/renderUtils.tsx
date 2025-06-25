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

// Render a shape with label and click handlers
export const renderShape = (
  shape: Shape, 
  onShapeClick?: (shape: Shape, position: Point) => void,
  selectedShapeId?: string
): React.ReactNode => {
  const isSelected = selectedShapeId === shape.id;
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
  
  const baseProps = {
    key: shape.id,
    onClick: handleClick,
    style: {
      cursor: 'pointer',
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
          <g {...baseProps}>
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

  // Render label if it exists
  const labelElement = shape.label ? (
    <text
      key={`${shape.id}-label`}
      x={center.x}
      y={center.y + (shape.type === 'line' ? 20 : 0)}
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
  ) : null;

  return (
    <g key={shape.id}>
      {shapeElement}
      {labelElement}
    </g>
  );
};

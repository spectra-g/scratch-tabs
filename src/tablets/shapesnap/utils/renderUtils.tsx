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

// Render a shape based on its type
export const renderShape = (shape: Shape): React.ReactNode => {
  switch (shape.type) {
    case 'line':
      return (
        <path
          key={shape.id}
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
          d={createDiamondPath(shape.x, shape.y, shape.width, shape.height)}
          stroke={shape.style.stroke}
          fill={shape.style.fill || 'transparent'}
          strokeWidth={shape.style.strokeWidth || 2}
        />
      );
      
    case 'arrow':
      const [arrowPoint1, arrowPoint2] = calculateArrowhead(shape.from, shape.to);
      
      return (
        <g key={shape.id}>
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
};
import React from 'react';
import { Shape, Point, ArrowTipStyle } from '../types';
import rough from 'roughjs/bin/rough';

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

// Helper function to detect if mouse is near line endpoint (start or end)
const isNearLineEndpoint = (shape: Shape & { points: Point[] }, mousePos: Point, threshold: number = 15): 'start' | 'end' | null => {
  if (shape.type !== 'line' || shape.points.length < 2) {
    return null;
  }
  
  const startPoint = shape.points[0];
  const endPoint = shape.points[shape.points.length - 1];
  
  const startDistance = Math.sqrt(
    Math.pow(mousePos.x - startPoint.x, 2) + 
    Math.pow(mousePos.y - startPoint.y, 2)
  );
  
  const endDistance = Math.sqrt(
    Math.pow(mousePos.x - endPoint.x, 2) + 
    Math.pow(mousePos.y - endPoint.y, 2)
  );
  
  if (startDistance <= threshold) {
    return 'start';
  } else if (endDistance <= threshold) {
    return 'end';
  }
  
  return null;
};

// Render arrow tip based on style
const renderArrowTip = (
  endPoint: Point, 
  fromPoint: Point, 
  style: ArrowTipStyle, 
  size: number = 10, 
  strokeColor: string, 
  strokeWidth: number = 2,
  clickHandlers?: any
) => {
  switch (style) {
    case 'none':
      return null;
      
    case 'simple':
      const [point1, point2] = calculateArrowhead(fromPoint, endPoint, size);
      return (
        <path
          {...clickHandlers}
          d={`M ${point1.x},${point1.y} L ${endPoint.x},${endPoint.y} L ${point2.x},${point2.y}`}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
      
    case 'filled-triangle':
      const [p1, p2] = calculateArrowhead(fromPoint, endPoint, size);
      return (
        <polygon
          {...clickHandlers}
          points={`${endPoint.x},${endPoint.y} ${p1.x},${p1.y} ${p2.x},${p2.y}`}
          fill={strokeColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />
      );
      
    case 'outline-triangle':
      const [p3, p4] = calculateArrowhead(fromPoint, endPoint, size);
      return (
        <polygon
          {...clickHandlers}
          points={`${endPoint.x},${endPoint.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />
      );
      
    case 'filled-circle':
      return (
        <circle
          {...clickHandlers}
          cx={endPoint.x}
          cy={endPoint.y}
          r={size / 2}
          fill={strokeColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />
      );
      
    case 'outline-circle':
      return (
        <circle
          {...clickHandlers}
          cx={endPoint.x}
          cy={endPoint.y}
          r={size / 2}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />
      );
      
    case 'filled-diamond':
      const diamondSize = size / 2;
      const diamondPoints = [
        { x: endPoint.x, y: endPoint.y - diamondSize },
        { x: endPoint.x + diamondSize, y: endPoint.y },
        { x: endPoint.x, y: endPoint.y + diamondSize },
        { x: endPoint.x - diamondSize, y: endPoint.y }
      ];
      return (
        <polygon
          {...clickHandlers}
          points={diamondPoints.map(p => `${p.x},${p.y}`).join(' ')}
          fill={strokeColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />
      );
      
    case 'outline-diamond':
      const diamondSize2 = size / 2;
      const diamondPoints2 = [
        { x: endPoint.x, y: endPoint.y - diamondSize2 },
        { x: endPoint.x + diamondSize2, y: endPoint.y },
        { x: endPoint.x, y: endPoint.y + diamondSize2 },
        { x: endPoint.x - diamondSize2, y: endPoint.y }
      ];
      return (
        <polygon
          {...clickHandlers}
          points={diamondPoints2.map(p => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />
      );
      
    case 'cross-circle':
      const crossRadius = size / 2;
      const crossSize = size / 3;
      return (
        <g {...clickHandlers}>
          <circle
            key="cross-circle"
            cx={endPoint.x}
            cy={endPoint.y}
            r={crossRadius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
          <line
            key="cross-line1"
            x1={endPoint.x - crossSize}
            y1={endPoint.y - crossSize}
            x2={endPoint.x + crossSize}
            y2={endPoint.y + crossSize}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <line
            key="cross-line2"
            x1={endPoint.x - crossSize}
            y1={endPoint.y + crossSize}
            x2={endPoint.x + crossSize}
            y2={endPoint.y - crossSize}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </g>
      );
      
    case 'dot':
      return (
        <circle
          {...clickHandlers}
          cx={endPoint.x}
          cy={endPoint.y}
          r={size / 4}
          fill={strokeColor}
          stroke="none"
        />
      );
      
    case 'arrowhead':
      const [p5, p6] = calculateArrowhead(fromPoint, endPoint, size);
      return (
        <g {...clickHandlers}>
          <path
            key="arrowhead-path"
            d={`M ${p5.x},${p5.y} L ${endPoint.x},${endPoint.y} L ${p6.x},${p6.y}`}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polygon
            key="arrowhead-fill"
            points={`${endPoint.x},${endPoint.y} ${p5.x},${p5.y} ${p6.x},${p6.y}`}
            fill={strokeColor}
            stroke="none"
          />
        </g>
      );
      
    case 'double-line':
      const [p7, p8] = calculateArrowhead(fromPoint, endPoint, size);
      const [p9, p10] = calculateArrowhead(fromPoint, endPoint, size * 0.7);
      return (
        <g {...clickHandlers}>
          <path
            key="double-line-outer"
            d={`M ${p7.x},${p7.y} L ${endPoint.x},${endPoint.y} L ${p8.x},${p8.y}`}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            key="double-line-inner"
            d={`M ${p9.x},${p9.y} L ${endPoint.x},${endPoint.y} L ${p10.x},${p10.y}`}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      );
      
    default:
      return null;
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
  currentTool?: string,
  sketchFont?: boolean,
  currentFontSize?: number
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
    e.stopPropagation();
    if (onMouseDown) {
      onMouseDown(shape, e);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Update cursor based on position relative to line endpoints
    if (shape.type === 'line') {
      const rect = e.currentTarget.getBoundingClientRect();
      const position = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      
      const lineShape = shape as Shape & { points: Point[] };
      const element = e.currentTarget as HTMLElement;
      if (isNearLineEndpoint(lineShape, position)) {
        element.style.cursor = 'pointer';
      } else {
        element.style.cursor = currentTool === 'eraser' ? 'crosshair' : 'pointer';
      }
    }
  };
  
  const baseProps = {
    onClick: handleClick,
    onDoubleClick: handleDoubleClick,
    onMouseDown: handleMouseDown,
    onMouseMove: handleMouseMove,
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
        const lineShape = shape as Shape & { 
          points: Point[]; 
          arrowTipStart?: ArrowTipStyle; 
          arrowTipEnd?: ArrowTipStyle; 
          arrowTipSize?: number 
        };
        const hasStartArrow = lineShape.arrowTipStart && lineShape.arrowTipStart !== 'none' && lineShape.points.length >= 2;
        const hasEndArrow = lineShape.arrowTipEnd && lineShape.arrowTipEnd !== 'none' && lineShape.points.length >= 2;
        
        if (hasStartArrow || hasEndArrow) {
          const arrowTipSize = lineShape.arrowTipSize || 10;
          const arrowTips = [];
          
          // Render start arrow tip
          if (hasStartArrow) {
            const startPoint = lineShape.points[0];
            const directionPoint = lineShape.points[1];
            arrowTips.push(
              renderArrowTip(startPoint, directionPoint, lineShape.arrowTipStart!, arrowTipSize, shape.style.stroke, shape.style.strokeWidth || 2, baseProps)
            );
          }
          
          // Render end arrow tip
          if (hasEndArrow) {
            const endPoint = lineShape.points[lineShape.points.length - 1];
            const directionPoint = lineShape.points[lineShape.points.length - 2];
            arrowTips.push(
              renderArrowTip(endPoint, directionPoint, lineShape.arrowTipEnd!, arrowTipSize, shape.style.stroke, shape.style.strokeWidth || 2, baseProps)
            );
          }
          
          return (
            <g key={shape.id}>
              <path
                key={`${shape.id}-path`}
                {...baseProps}
                d={`M ${lineShape.points.map(p => `${p.x},${p.y}`).join(' L ')}`}
                stroke={shape.style.stroke}
                strokeWidth={shape.style.strokeWidth || 2}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {arrowTips.map((tip, index) => (
                <React.Fragment key={`${shape.id}-arrow-${index}`}>
                  {tip}
                </React.Fragment>
              ))}
            </g>
          );
        } else {
          return (
            <path
              key={shape.id}
              {...baseProps}
              d={`M ${lineShape.points.map(p => `${p.x},${p.y}`).join(' L ')}`}
              stroke={shape.style.stroke}
              strokeWidth={shape.style.strokeWidth || 2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        }
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
              key={`${shape.id}-line`}
              x1={shape.from.x}
              y1={shape.from.y}
              x2={shape.to.x}
              y2={shape.to.y}
              stroke={shape.style.stroke}
              strokeWidth={shape.style.strokeWidth || 2}
              strokeLinecap="round"
            />
            <polyline
              key={`${shape.id}-arrowhead`}
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
            key={`${shape.id}-${shape.fontSize || 16}`}
            {...baseProps}
            x={shape.x}
            y={shape.y}
            fill={shape.style.stroke}
            fontSize={shape.fontSize || 16}
            dominantBaseline="middle"
            textAnchor="middle"
            style={{
              fontFamily: sketchFont ? '"Architects Daughter", Arial, sans-serif' : undefined,
              fontSize: `${shape.fontSize || 16}px !important`
            }}
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
          fontSize={currentFontSize || 12}
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
          fontSize={currentFontSize || 12}
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

// Helper to render a shape in sketch mode using roughjs
export function renderRoughShape(svgRef: SVGSVGElement | null, type: string, props: any, roughOptions: any) {
  if (!svgRef) return null;
  const rc = rough.svg(svgRef);
  switch (type) {
    case 'rectangle':
      return rc.rectangle(props.x, props.y, props.width, props.height, roughOptions);
    case 'square':
      return rc.rectangle(props.x, props.y, props.width, props.height, roughOptions);
    case 'circle':
      return rc.circle(props.x, props.y, props.radius * 2, roughOptions);
    case 'diamond': {
      // Draw as polygon
      const halfW = props.width / 2, halfH = props.height / 2;
      const points: [number, number][] = [
        [props.x, props.y - halfH],
        [props.x + halfW, props.y],
        [props.x, props.y + halfH],
        [props.x - halfW, props.y]
      ];
      return rc.polygon(points, roughOptions);
    }
    case 'triangle': {
      const halfW = props.width / 2, halfH = props.height / 2;
      const points: [number, number][] = [
        [props.x, props.y - halfH],
        [props.x - halfW, props.y + halfH],
        [props.x + halfW, props.y + halfH]
      ];
      return rc.polygon(points, roughOptions);
    }
    case 'line': {
      const { points } = props;
      if (points.length < 2) return null;
      return rc.linearPath(points.map((p: {x: number, y: number}) => [p.x, p.y] as [number, number]), roughOptions);
    }
    default:
      return null;
  }
}

// Helper to render a shape in sketch mode using roughjs and return SVG markup as a string
export function renderRoughShapeSVG(svgRef: SVGSVGElement | null, type: string, props: any, roughOptions: any): string | null {
  if (!svgRef) return null;
  const rc = rough.svg(svgRef);
  let node: SVGElement | null = null;
  switch (type) {
    case 'rectangle':
      node = rc.rectangle(props.x, props.y, props.width, props.height, roughOptions);
      break;
    case 'square':
      node = rc.rectangle(props.x, props.y, props.width, props.height, roughOptions);
      break;
    case 'circle':
      node = rc.circle(props.x, props.y, props.radius * 2, roughOptions);
      break;
    case 'diamond': {
      const halfW = props.width / 2, halfH = props.height / 2;
      const points: [number, number][] = [
        [props.x, props.y - halfH],
        [props.x + halfW, props.y],
        [props.x, props.y + halfH],
        [props.x - halfW, props.y]
      ];
      node = rc.polygon(points, roughOptions);
      break;
    }
    case 'triangle': {
      const halfW = props.width / 2, halfH = props.height / 2;
      const points: [number, number][] = [
        [props.x, props.y - halfH],
        [props.x - halfW, props.y + halfH],
        [props.x + halfW, props.y + halfH]
      ];
      node = rc.polygon(points, roughOptions);
      break;
    }
    case 'line': {
      const { points } = props;
      if (points.length < 2) return null;
      node = rc.linearPath(points.map((p: {x: number, y: number}) => [p.x, p.y] as [number, number]), roughOptions);
      break;
    }
    default:
      return null;
  }
  return node ? node.outerHTML : null;
}

export const renderShapeOverlay = (
  shape: Shape,
  editingShapeId?: string,
  sketchFont?: boolean,
  currentFontSize?: number
): React.ReactNode => {
  const isEditing = editingShapeId === shape.id;
  const center = getShapeCenter(shape);

  // Render label if it exists and not editing
  const labelElement = (!isEditing && shape.label) ? (() => {
    const fontFamily = sketchFont ? '"Architects Daughter", Arial, sans-serif' : undefined;
    if (shape.type === 'line') {
      // Use special positioning for lines based on orientation
      const labelPos = getLineLabelPosition(shape as Shape & { points: Point[] });
      return (
        <text
          key={`${shape.id}-label`}
          x={labelPos.x}
          y={labelPos.y}
          fill={shape.style.stroke}
          fontSize={currentFontSize || 12}
          dominantBaseline={labelPos.dominantBaseline}
          textAnchor={labelPos.textAnchor}
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
            textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
            fontFamily
          }}
        >
          {shape.label}
        </text>
      );
    } else {
      // For circles and all other shapes, label is centered
      return (
        <text
          key={`${shape.id}-label`}
          x={center.x}
          y={center.y}
          fill={shape.style.stroke}
          fontSize={currentFontSize || 12}
          dominantBaseline="middle"
          textAnchor="middle"
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
            textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
            fontFamily
          }}
        >
          {shape.label}
        </text>
      );
    }
  })() : null;

  // Render arrow tips for lines
  if (shape.type === 'line') {
    const lineShape = shape as Shape & { 
      points: Point[]; 
      arrowTipStart?: ArrowTipStyle; 
      arrowTipEnd?: ArrowTipStyle; 
      arrowTipSize?: number 
    };
    const hasStartArrow = lineShape.arrowTipStart && lineShape.arrowTipStart !== 'none' && lineShape.points.length >= 2;
    const hasEndArrow = lineShape.arrowTipEnd && lineShape.arrowTipEnd !== 'none' && lineShape.points.length >= 2;
    const arrowTipSize = lineShape.arrowTipSize || 10;
    const arrowTips = [];
    if (hasStartArrow) {
      const startPoint = lineShape.points[0];
      const directionPoint = lineShape.points[1];
      arrowTips.push(
        renderArrowTip(startPoint, directionPoint, lineShape.arrowTipStart!, arrowTipSize, shape.style.stroke, shape.style.strokeWidth || 2)
      );
    }
    if (hasEndArrow) {
      const endPoint = lineShape.points[lineShape.points.length - 1];
      const directionPoint = lineShape.points[lineShape.points.length - 2];
      arrowTips.push(
        renderArrowTip(endPoint, directionPoint, lineShape.arrowTipEnd!, arrowTipSize, shape.style.stroke, shape.style.strokeWidth || 2)
      );
    }
    return <g key={shape.id + '-overlay'}>
      {arrowTips.map((tip, index) => (
        <React.Fragment key={`${shape.id}-arrow-tip-${index}`}>
          {tip}
        </React.Fragment>
      ))}
      {labelElement}
    </g>;
  }
  return labelElement;
};

// Stable hash function for string ids
export function hashCode(str: string): number {
  let hash = 0, i, chr;
  if (str.length === 0) return hash;
  for (i = 0; i < str.length; i++) {
    chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}
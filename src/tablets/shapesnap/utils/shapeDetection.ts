import { Point, Shape, ShapeType } from '../types';

// Generate a unique ID for shapes
const generateId = (): string => {
  return `shape-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
};

// Calculate the distance between two points
const distance = (p1: Point, p2: Point): number => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

// Calculate the bounding box of a set of points
const getBoundingBox = (points: Point[]): { minX: number; minY: number; maxX: number; maxY: number } => {
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys)
  };
};

// Calculate the aspect ratio of a bounding box
const getAspectRatio = (box: { minX: number; minY: number; maxX: number; maxY: number }): number => {
  const width = box.maxX - box.minX;
  const height = box.maxY - box.minY;
  
  return width / height;
};

// Check if a shape is closed (start and end points are close)
const isClosed = (points: Point[], threshold = 20): boolean => {
  if (points.length < 3) return false;
  
  const start = points[0];
  const end = points[points.length - 1];
  
  return distance(start, end) < threshold;
};

// Calculate the total path length
const getPathLength = (points: Point[]): number => {
  let length = 0;
  
  for (let i = 1; i < points.length; i++) {
    length += distance(points[i - 1], points[i]);
  }
  
  return length;
};

// Calculate the perimeter of the bounding box
const getBoundingBoxPerimeter = (box: { minX: number; minY: number; maxX: number; maxY: number }): number => {
  const width = box.maxX - box.minX;
  const height = box.maxY - box.minY;
  
  return 2 * (width + height);
};

// Detect if points form a line
const isLine = (points: Point[]): boolean => {
  if (points.length < 2) return false;
  
  const box = getBoundingBox(points);
  const width = box.maxX - box.minX;
  const height = box.maxY - box.minY;
  
  // Check if the points are roughly in a straight line
  // by comparing the path length to the distance between endpoints
  const pathLength = getPathLength(points);
  const endpointDistance = distance(points[0], points[points.length - 1]);
  
  // If the path is close to a straight line, the ratio will be close to 1
  const straightness = endpointDistance / pathLength;
  
  // Check if the shape is very narrow in one dimension
  const isNarrow = width < 10 || height < 10;
  
  return straightness > 0.9 || isNarrow;
};

// Detect if points form a rectangle
const isRectangle = (points: Point[]): boolean => {
  if (points.length < 4) return false;
  
  // Check if the shape is closed
  if (!isClosed(points)) return false;
  
  const box = getBoundingBox(points);
  const width = box.maxX - box.minX;
  const height = box.maxY - box.minY;
  
  // Calculate the ratio of the path length to the bounding box perimeter
  // For a perfect rectangle, this ratio should be close to 1
  const pathLength = getPathLength(points);
  const boxPerimeter = getBoundingBoxPerimeter(box);
  
  const perimeterRatio = pathLength / boxPerimeter;
  
  // Check if the shape is roughly rectangular
  return perimeterRatio < 1.2 && perimeterRatio > 0.8;
};

// Detect if points form a square
const isSquare = (points: Point[]): boolean => {
  if (!isRectangle(points)) return false;
  
  const box = getBoundingBox(points);
  const aspectRatio = getAspectRatio(box);
  
  // Check if the aspect ratio is close to 1 (square)
  return aspectRatio > 0.8 && aspectRatio < 1.2;
};

// Detect if points form a circle
const isCircle = (points: Point[]): boolean => {
  if (points.length < 5) return false;
  
  // Check if the shape is closed
  if (!isClosed(points)) return false;
  
  const box = getBoundingBox(points);
  const width = box.maxX - box.minX;
  const height = box.maxY - box.minY;
  
  // Calculate the center of the bounding box
  const centerX = (box.minX + box.maxX) / 2;
  const centerY = (box.minY + box.maxY) / 2;
  
  // Calculate the average radius
  const radius = (width + height) / 4;
  
  // Check if points are roughly equidistant from the center
  let radiusDeviation = 0;
  
  for (const point of points) {
    const pointRadius = distance({ x: centerX, y: centerY }, point);
    radiusDeviation += Math.abs(pointRadius - radius);
  }
  
  // Calculate the average deviation as a percentage of the radius
  const avgDeviation = radiusDeviation / points.length / radius;
  
  // Check if the shape is roughly circular
  return avgDeviation < 0.2;
};

// Detect if points form a diamond (rhombus)
const isDiamond = (points: Point[]): boolean => {
  if (points.length < 4) return false;
  
  // Check if the shape is closed
  if (!isClosed(points)) return false;
  
  // Check if the shape has 4 corners
  // This is a simplified approach - in a real app, you'd use a more robust corner detection algorithm
  
  const box = getBoundingBox(points);
  const width = box.maxX - box.minX;
  const height = box.maxY - box.minY;
  
  // Calculate the center of the bounding box
  const centerX = (box.minX + box.maxX) / 2;
  const centerY = (box.minY + box.maxY) / 2;
  
  // Check if the shape is roughly diamond-shaped
  // by checking if points are distributed in 4 quadrants around the center
  let topLeft = false;
  let topRight = false;
  let bottomLeft = false;
  let bottomRight = false;
  
  for (const point of points) {
    if (point.x < centerX && point.y < centerY) topLeft = true;
    if (point.x > centerX && point.y < centerY) topRight = true;
    if (point.x < centerX && point.y > centerY) bottomLeft = true;
    if (point.x > centerX && point.y > centerY) bottomRight = true;
  }
  
  return topLeft && topRight && bottomLeft && bottomRight;
};

// Detect if points form an arrow
const isArrow = (points: Point[]): boolean => {
  if (points.length < 5) return false;
  
  // Check if the shape is roughly a line
  if (!isLine(points)) return false;
  
  // Get the main direction of the line
  const start = points[0];
  const end = points[points.length - 1];
  
  // Calculate the angle of the line
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  
  // Check if there are points that deviate significantly from the main line
  // which could indicate the arrowhead
  let hasArrowhead = false;
  
  for (let i = 1; i < points.length - 1; i++) {
    const point = points[i];
    
    // Calculate the expected position on the line
    const t = (point.x - start.x) / (end.x - start.x);
    const expectedY = start.y + t * (end.y - start.y);
    
    // Check if the point deviates significantly from the line
    const deviation = Math.abs(point.y - expectedY);
    
    if (deviation > 10) {
      hasArrowhead = true;
      break;
    }
  }
  
  return hasArrowhead;
};

// Main shape detection function
export const detectShape = (points: Point[]): Shape | null => {
  if (points.length < 2) return null;
  
  const box = getBoundingBox(points);
  const width = box.maxX - box.minX;
  const height = box.maxY - box.minY;
  
  // Default style based on dark mode
  const style = {
    stroke: '#ffffff',
    fill: 'transparent',
    strokeWidth: 2
  };
  
  // Detect shape type
  let shapeType: ShapeType | null = null;
  
  if (isArrow(points)) {
    shapeType = 'arrow';
  } else if (isCircle(points)) {
    shapeType = 'circle';
  } else if (isSquare(points)) {
    shapeType = 'rectangle'; // We'll use rectangle for squares too
  } else if (isRectangle(points)) {
    shapeType = 'rectangle';
  } else if (isDiamond(points)) {
    shapeType = 'diamond';
  } else if (isLine(points)) {
    shapeType = 'line';
  }
  
  // Create the appropriate shape object
  if (shapeType) {
    const id = generateId();
    const zIndex = Date.now(); // Use timestamp for z-index to ensure newer shapes are on top
    
    switch (shapeType) {
      case 'line':
        return {
          id,
          type: 'line',
          points,
          style,
          zIndex
        };
        
      case 'rectangle':
        return {
          id,
          type: 'rectangle',
          x: box.minX,
          y: box.minY,
          width,
          height,
          style,
          zIndex
        };
        
      case 'circle':
        const centerX = (box.minX + box.maxX) / 2;
        const centerY = (box.minY + box.maxY) / 2;
        const radius = Math.max(width, height) / 2;
        
        return {
          id,
          type: 'circle',
          x: centerX,
          y: centerY,
          radius,
          style,
          zIndex
        };
        
      case 'diamond':
        return {
          id,
          type: 'diamond',
          x: (box.minX + box.maxX) / 2,
          y: (box.minY + box.maxY) / 2,
          width,
          height,
          style,
          zIndex
        };
        
      case 'arrow':
        return {
          id,
          type: 'arrow',
          from: points[0],
          to: points[points.length - 1],
          style,
          zIndex
        };
    }
  }
  
  // If no specific shape is detected, create a line shape with the raw points
  return {
    id: generateId(),
    type: 'line',
    points,
    style,
    zIndex: Date.now()
  };
};
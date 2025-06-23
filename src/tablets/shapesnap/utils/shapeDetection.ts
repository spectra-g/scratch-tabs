import { Point, Shape } from '../types';

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

// Calculate the path length
const getPathLength = (points: Point[]): number => {
  let length = 0;
  
  for (let i = 1; i < points.length; i++) {
    length += distance(points[i - 1], points[i]);
  }
  
  return length;
};

// Check if a shape is closed (start and end points are close or path crosses itself near the start)
const isClosed = (points: Point[], box: { minX: number; minY: number; maxX: number; maxY: number }): boolean => {
  if (points.length < 3) return false;
  
  const start = points[0];
  const end = points[points.length - 1];
  const diagonal = Math.sqrt(Math.pow(box.maxX - box.minX, 2) + Math.pow(box.maxY - box.minY, 2));
  
  // A shape is closed if the start and end points are closer than 30% of the bounding box diagonal.
  const threshold = diagonal * 0.30; 
  const isClose = distance(start, end) < threshold;

  console.log(`🔍 isClosed check: distance=${distance(start, end).toFixed(2)}, threshold=${threshold.toFixed(2)}, closed=${isClose}`);
  return isClose;
};

// Calculate the aspect ratio of a bounding box
const getAspectRatio = (box: { minX: number; minY: number; maxX: number; maxY: number }): number => {
  const width = box.maxX - box.minX;
  const height = box.maxY - box.minY;
  
  return width / height;
};

// Calculate the perimeter of the bounding box
const getBoundingBoxPerimeter = (box: { minX: number; minY: number; maxX: number; maxY: number }): number => {
  const width = box.maxX - box.minX;
  const height = box.maxY - box.minY;
  
  return 2 * (width + height);
};

// Helper to count sharp corners
const countCorners = (points: Point[], angleThreshold = Math.PI / 4) => {
  let cornerCount = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];
    const angle1 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
    const angle2 = Math.atan2(next.y - curr.y, next.x - curr.x);
    const angleDiff = Math.abs(angle1 - angle2);
    const normalizedAngleDiff = Math.min(angleDiff, 2 * Math.PI - angleDiff);
    if (normalizedAngleDiff > angleThreshold) {
      cornerCount++;
    }
  }
  return cornerCount;
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
  
  const result = straightness > 0.9 || isNarrow;
  
  console.log('📏 isLine check:', {
    pointsLength: points.length,
    width,
    height,
    pathLength,
    endpointDistance,
    straightness,
    isNarrow,
    result
  });
  
  return result;
};

// Detect if points form a rectangle
const isRectangle = (points: Point[]): boolean => {
  if (points.length < 4) return false;
  // Check if the shape is closed
  const box = getBoundingBox(points);
  if (!isClosed(points, box)) return false;
  const width = box.maxX - box.minX;
  const height = box.maxY - box.minY;
  // Calculate the ratio of the path length to the bounding box perimeter
  const pathLength = getPathLength(points);
  const boxPerimeter = getBoundingBoxPerimeter(box);
  const perimeterRatio = pathLength / boxPerimeter;
  // Count sharp corners
  const cornerCount = countCorners(points);
  // Check if the shape is roughly rectangular
  const result = perimeterRatio < 1.2 && perimeterRatio > 0.8 && cornerCount >= 3;
  console.log('⬜ isRectangle check:', {
    pointsLength: points.length,
    width,
    height,
    pathLength,
    boxPerimeter,
    perimeterRatio,
    cornerCount,
    result
  });
  return result;
};

// Detect if points form a square
const isSquare = (points: Point[]): boolean => {
  if (!isRectangle(points)) {
    console.log('🔲 isSquare check: Failed rectangle check');
    return false;
  }
  const box = getBoundingBox(points);
  const aspectRatio = getAspectRatio(box);
  const width = box.maxX - box.minX;
  const height = box.maxY - box.minY;
  // Count sharp corners
  const cornerCount = countCorners(points);
  // Check if the aspect ratio is close to 1 (square) and has at least 4 corners
  const result = aspectRatio > 0.8 && aspectRatio < 1.2 && cornerCount >= 4;
  console.log('🔲 isSquare check:', {
    width,
    height,
    aspectRatio,
    cornerCount,
    result
  });
  return result;
};

// Detect if points form a triangle
const isTriangle = (points: Point[]): boolean => {
  if (points.length < 3) return false;
  
  // Check if the shape is closed
  const box = getBoundingBox(points);
  if (!isClosed(points, box)) return false;
  
  const width = box.maxX - box.minX;
  const height = box.maxY - box.minY;
  
  // Calculate the path length and compare to a theoretical triangle
  const pathLength = getPathLength(points);
  
  // For a triangle, we expect roughly 3 sides
  // Calculate the theoretical perimeter of a triangle with the same bounding box
  const theoreticalPerimeter = width + height + Math.sqrt(width * width + height * height);
  
  const perimeterRatio = pathLength / theoreticalPerimeter;
  
  // Check if the shape has roughly 3 corners by looking for significant direction changes
  let cornerCount = 0;
  const angleThreshold = Math.PI / 4; // 45 degrees
  
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];
    
    const angle1 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
    const angle2 = Math.atan2(next.y - curr.y, next.x - curr.x);
    
    const angleDiff = Math.abs(angle1 - angle2);
    const normalizedAngleDiff = Math.min(angleDiff, 2 * Math.PI - angleDiff);
    
    if (normalizedAngleDiff > angleThreshold) {
      cornerCount++;
    }
  }
  
  const result = perimeterRatio > 0.7 && perimeterRatio < 1.3 && cornerCount >= 2 && cornerCount <= 4;
  
  console.log('🔺 isTriangle check:', {
    pointsLength: points.length,
    width,
    height,
    pathLength,
    theoreticalPerimeter,
    perimeterRatio,
    cornerCount,
    result
  });
  
  return result;
};

// Detect if points form a circle
const isCircle = (points: Point[]): boolean => {
  if (points.length < 5) return false;
  
  // Check if the shape is closed
  const box = getBoundingBox(points);
  if (!isClosed(points, box)) return false;
  
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

  // Count sharp corners: if there are 3 or more, it's not a circle
  let cornerCount = 0;
  const angleThreshold = Math.PI / 4; // 45 degrees
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];
    const angle1 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
    const angle2 = Math.atan2(next.y - curr.y, next.x - curr.x);
    const angleDiff = Math.abs(angle1 - angle2);
    const normalizedAngleDiff = Math.min(angleDiff, 2 * Math.PI - angleDiff);
    if (normalizedAngleDiff > angleThreshold) {
      cornerCount++;
    }
  }
  if (cornerCount >= 3) {
    console.log('⭕ isCircle check: too many corners, not a circle', {cornerCount});
    return false;
  }

  // Check if the shape is roughly circular
  const result = avgDeviation < 0.2;
  
  console.log('⭕ isCircle check:', {
    pointsLength: points.length,
    width,
    height,
    centerX,
    centerY,
    radius,
    radiusDeviation,
    avgDeviation,
    cornerCount,
    result
  });
  
  return result;
};

// Detect if points form a diamond (rhombus)
const isDiamond = (points: Point[]): boolean => {
  if (points.length < 4) return false;
  
  // Check if the shape is closed
  const box = getBoundingBox(points);
  if (!isClosed(points, box)) return false;
  
  // Check if the shape has 4 corners
  // This is a simplified approach - in a real app, you'd use a more robust corner detection algorithm
  
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
  
  const result = topLeft && topRight && bottomLeft && bottomRight;
  
  console.log('💎 isDiamond check:', {
    pointsLength: points.length,
    width,
    height,
    centerX,
    centerY,
    topLeft,
    topRight,
    bottomLeft,
    bottomRight,
    result
  });
  
  return result;
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
  
  console.log('➡️ isArrow check:', {
    pointsLength: points.length,
    angle,
    hasArrowhead,
    result: hasArrowhead
  });
  
  return hasArrowhead;
};

// Fit a circle to the points and calculate its properties
function getCircleProperties(points: Point[]) {
  const n = points.length;
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  const center = { x: sum.x / n, y: sum.y / n };
  const radii = points.map(p => distance(center, p));
  const avgRadius = radii.reduce((acc, r) => acc + r, 0) / n;
  const variance = radii.reduce((acc, r) => acc + Math.pow(r - avgRadius, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  const normalizedStdDev = avgRadius > 1 ? stdDev / avgRadius : stdDev;
  return { center, radius: avgRadius, normalizedStdDev };
}

function getCircleCenter(points: Point[]) {
  const n = points.length;
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / n, y: sum.y / n };
}

// Returns only geometry, not style/id/zIndex
export const detectShape = (points: Point[]): any | null => {
  if (points.length < 20) return null;
  const box = getBoundingBox(points);
  const width = box.maxX - box.minX;
  const height = box.maxY - box.minY;
  const pathLength = getPathLength(points);
  if (width < 15 || height < 15 || pathLength < 30) return null;
  const endpointDistance = distance(points[0], points[points.length - 1]);
  const straightness = endpointDistance / pathLength;
  if (!isClosed(points, box) && straightness > 0.95) {
    return { type: 'line', points: [points[0], points[points.length-1]] };
  }
  const aspectRatio = width / height;
  const boxPerimeter = 2 * (width + height);
  const perimeterRatio = pathLength / boxPerimeter;
  const IDEAL_CIRCLE_RATIO = Math.PI / 4;
  const IDEAL_RECT_RATIO = 1.0;
  const circleError = Math.abs(perimeterRatio - IDEAL_CIRCLE_RATIO);
  const rectangleError = Math.abs(perimeterRatio - IDEAL_RECT_RATIO);
  let detectedType: 'circle' | 'rectangle' | 'square' = 'rectangle';
  if (circleError < rectangleError) {
    if (aspectRatio > 0.7 && aspectRatio < 1.4) {
      detectedType = 'circle';
    } else {
      detectedType = 'rectangle';
    }
  } else {
    if(aspectRatio > 0.85 && aspectRatio < 1.15) {
      detectedType = 'square';
    } else {
      detectedType = 'rectangle';
    }
  }
  switch (detectedType) {
    case 'circle': {
      const center = getCircleCenter(points);
      const radius = (width + height) / 4;
      return { type: 'circle', x: center.x, y: center.y, radius };
    }
    case 'square': {
      const size = Math.max(width, height);
      const centerX = box.minX + width / 2;
      const centerY = box.minY + height / 2;
      return { type: 'square', x: centerX - size / 2, y: centerY - size / 2, width: size, height: size };
    }
    case 'rectangle': {
      return { type: 'rectangle', x: box.minX, y: box.minY, width, height };
    }
    default:
      return { type: 'line', points };
  }
};
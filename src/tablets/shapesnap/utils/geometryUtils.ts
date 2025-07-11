import { Point, Shape } from "../types";

/**
 * Calculates the distance between two points
 * @param p1 - First point
 * @param p2 - Second point
 * @returns The distance between the points
 */
export const distance = (p1: Point, p2: Point): number =>
  Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

/**
 * Gets the center point of a shape
 * @param shape - The shape to get the center of
 * @returns The center point of the shape
 */
export const getShapeCenter = (shape: Shape): Point => {
  switch (shape.type) {
    case "orthogonal-arrow":
    case "line":
      const midIndex = Math.floor(shape.points.length / 2);
      return shape.points[midIndex] || { x: 0, y: 0 };
    case "rectangle":
    case "square":
      return { x: shape.x + shape.width / 2, y: shape.y + shape.height / 2 };
    case "circle":
      return { x: shape.x, y: shape.y };
    case "diamond":
    case "triangle":
      // For diamond and triangle, x and y represent the center, not top-left corner
      return { x: shape.x, y: shape.y };
    case "curved-arrow":
      return {
        x: (shape.from.x + shape.to.x) / 2,
        y: (shape.from.y + shape.to.y) / 2,
      };
    case "arrow":
      return {
        x: (shape.from.x + shape.to.x) / 2,
        y: (shape.from.y + shape.to.y) / 2,
      };
    case "text":
      return { x: shape.x, y: shape.y };
    default:
      return { x: 0, y: 0 };
  }
};

/**
 * Gets the bounding box of a shape
 * @param shape - The shape to get the bounding box of
 * @returns The bounding box coordinates
 */
export const getShapeBoundingBox = (
  shape: Shape,
): { left: number; right: number; top: number; bottom: number } => {
  switch (shape.type) {
    case "rectangle":
    case "square": {
      const rectShape = shape as Shape & {
        x: number;
        y: number;
        width: number;
        height: number;
      };
      return {
        left: rectShape.x,
        right: rectShape.x + rectShape.width,
        top: rectShape.y,
        bottom: rectShape.y + rectShape.height,
      };
    }
    case "circle": {
      const circleShape = shape as Shape & {
        x: number;
        y: number;
        radius: number;
      };
      const radius = circleShape.radius || 20;
      return {
        left: circleShape.x - radius,
        right: circleShape.x + radius,
        top: circleShape.y - radius,
        bottom: circleShape.y + radius,
      };
    }
    case "diamond":
    case "triangle": {
      const polyShape = shape as Shape & {
        x: number;
        y: number;
        width: number;
        height: number;
      };
      const halfWidth = (polyShape.width || 40) / 2;
      const halfHeight = (polyShape.height || 40) / 2;
      return {
        left: polyShape.x - halfWidth,
        right: polyShape.x + halfWidth,
        top: polyShape.y - halfHeight,
        bottom: polyShape.y + halfHeight,
      };
    }
    case "text": {
      const textShape = shape as Shape & {
        x: number;
        y: number;
        fontSize?: number;
      };
      const fontSize = textShape.fontSize || 16;
      const textWidth = (textShape as any).text
        ? (textShape as any).text.length * fontSize * 0.6
        : 50; // rough estimate
      const textHeight = fontSize;
      return {
        left: textShape.x - textWidth / 2,
        right: textShape.x + textWidth / 2,
        top: textShape.y - textHeight / 2,
        bottom: textShape.y + textHeight / 2,
      };
    }
    case "orthogonal-arrow":
    case "line": {
      const lineShape = shape as Shape & { points: Point[] };
      if (!lineShape.points || lineShape.points.length === 0) {
        return { left: 0, right: 0, top: 0, bottom: 0 };
      }
      const xCoords = lineShape.points.map((p) => p.x);
      const yCoords = lineShape.points.map((p) => p.y);
      return {
        left: Math.min(...xCoords),
        right: Math.max(...xCoords),
        top: Math.min(...yCoords),
        bottom: Math.max(...yCoords),
      };
    }
    case "curved-arrow": {
      const curvedArrow = shape as any;
      const { from, to, control } = curvedArrow;
      const xCoords = [from.x, to.x, control.x];
      const yCoords = [from.y, to.y, control.y];
      return {
        left: Math.min(...xCoords),
        right: Math.max(...xCoords),
        top: Math.min(...yCoords),
        bottom: Math.max(...yCoords),
      };
    }
    case "arrow": {
      const arrowShape = shape as Shape & { from: Point; to: Point };
      const xCoords = [arrowShape.from.x, arrowShape.to.x];
      const yCoords = [arrowShape.from.y, arrowShape.to.y];
      return {
        left: Math.min(...xCoords),
        right: Math.max(...xCoords),
        top: Math.min(...yCoords),
        bottom: Math.max(...yCoords),
      };
    }
    default:
      return { left: 0, right: 0, top: 0, bottom: 0 };
  }
};

/**
 * Snaps a value to the nearest grid
 * @param value - The value to snap
 * @param grid - The grid size
 * @param enabled - Whether grid snapping is enabled
 * @returns The snapped value
 */
export const snapToGrid = (
  value: number,
  grid: number,
  enabled: boolean = true,
): number => (enabled ? Math.round(value / grid) * grid : value);

/**
 * Calculates the angle between two points
 * @param from - Starting point
 * @param to - Ending point
 * @returns The angle in radians
 */
export const calculateAngle = (from: Point, to: Point): number =>
  Math.atan2(to.y - from.y, to.x - from.x);

/**
 * Checks if a point is within a threshold distance of another point
 * @param point1 - First point
 * @param point2 - Second point
 * @param threshold - Distance threshold
 * @returns True if the points are within the threshold
 */
export const isWithinThreshold = (
  point1: Point,
  point2: Point,
  threshold: number,
): boolean => distance(point1, point2) <= threshold;

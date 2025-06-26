import { 
  distance, 
  getShapeCenter, 
  getShapeBoundingBox, 
  snapToGrid, 
  calculateAngle, 
  isWithinThreshold 
} from '../utils/geometryUtils';
import { Shape, Point } from '../types';

describe('geometryUtils', () => {
  describe('distance', () => {
    it('should calculate distance between two points', () => {
      const p1: Point = { x: 0, y: 0 };
      const p2: Point = { x: 3, y: 4 };
      expect(distance(p1, p2)).toBe(5);
    });

    it('should return 0 for identical points', () => {
      const p1: Point = { x: 5, y: 10 };
      const p2: Point = { x: 5, y: 10 };
      expect(distance(p1, p2)).toBe(0);
    });

    it('should handle negative coordinates', () => {
      const p1: Point = { x: -3, y: -4 };
      const p2: Point = { x: 0, y: 0 };
      expect(distance(p1, p2)).toBe(5);
    });

    it('should handle decimal coordinates', () => {
      const p1: Point = { x: 1.5, y: 2.5 };
      const p2: Point = { x: 4.5, y: 6.5 };
      expect(distance(p1, p2)).toBeCloseTo(5, 1);
    });
  });

  describe('getShapeCenter', () => {
    it('should get center of rectangle', () => {
      const shape: Shape = {
        id: 'test',
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        style: { stroke: '#000' },
        zIndex: 1
      };
      const center = getShapeCenter(shape);
      expect(center).toEqual({ x: 50, y: 25 });
    });

    it('should get center of circle', () => {
      const shape: Shape = {
        id: 'test',
        type: 'circle',
        x: 100,
        y: 100,
        radius: 25,
        style: { stroke: '#000' },
        zIndex: 1
      };
      const center = getShapeCenter(shape);
      expect(center).toEqual({ x: 100, y: 100 });
    });

    it('should get center of line', () => {
      const shape: Shape = {
        id: 'test',
        type: 'line',
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 100 }
        ],
        style: { stroke: '#000' },
        zIndex: 1
      };
      const center = getShapeCenter(shape);
      expect(center).toEqual({ x: 100, y: 100 }); // Middle point of the line (index 1)
    });

    it('should get center of diamond', () => {
      const shape: Shape = {
        id: 'test',
        type: 'diamond',
        x: 50,
        y: 50,
        width: 40,
        height: 40,
        style: { stroke: '#000' },
        zIndex: 1
      };
      const center = getShapeCenter(shape);
      expect(center).toEqual({ x: 50, y: 50 });
    });

    it('should get center of text', () => {
      const shape: Shape = {
        id: 'test',
        type: 'text',
        x: 100,
        y: 100,
        text: 'Hello',
        style: { stroke: '#000' },
        zIndex: 1
      };
      const center = getShapeCenter(shape);
      expect(center).toEqual({ x: 100, y: 100 });
    });
  });

  describe('getShapeBoundingBox', () => {
    it('should get bounding box of rectangle', () => {
      const shape: Shape = {
        id: 'test',
        type: 'rectangle',
        x: 10,
        y: 20,
        width: 100,
        height: 50,
        style: { stroke: '#000' },
        zIndex: 1
      };
      const bounds = getShapeBoundingBox(shape);
      expect(bounds).toEqual({
        left: 10,
        right: 110,
        top: 20,
        bottom: 70
      });
    });

    it('should get bounding box of circle', () => {
      const shape: Shape = {
        id: 'test',
        type: 'circle',
        x: 100,
        y: 100,
        radius: 25,
        style: { stroke: '#000' },
        zIndex: 1
      };
      const bounds = getShapeBoundingBox(shape);
      expect(bounds).toEqual({
        left: 75,
        right: 125,
        top: 75,
        bottom: 125
      });
    });

    it('should get bounding box of line', () => {
      const shape: Shape = {
        id: 'test',
        type: 'line',
        points: [
          { x: 10, y: 20 },
          { x: 100, y: 80 }
        ],
        style: { stroke: '#000' },
        zIndex: 1
      };
      const bounds = getShapeBoundingBox(shape);
      expect(bounds).toEqual({
        left: 10,
        right: 100,
        top: 20,
        bottom: 80
      });
    });

    it('should handle empty line points', () => {
      const shape: Shape = {
        id: 'test',
        type: 'line',
        points: [],
        style: { stroke: '#000' },
        zIndex: 1
      };
      const bounds = getShapeBoundingBox(shape);
      expect(bounds).toEqual({
        left: 0,
        right: 0,
        top: 0,
        bottom: 0
      });
    });
  });

  describe('snapToGrid', () => {
    it('should snap to grid when enabled', () => {
      expect(snapToGrid(23, 20, true)).toBe(20);
      expect(snapToGrid(25, 20, true)).toBe(20);
      expect(snapToGrid(30, 20, true)).toBe(40);
      expect(snapToGrid(35, 20, true)).toBe(40);
    });

    it('should not snap when disabled', () => {
      expect(snapToGrid(23, 20, false)).toBe(23);
      expect(snapToGrid(25, 20, false)).toBe(25);
      expect(snapToGrid(30, 20, false)).toBe(30);
    });

    it('should default to enabled', () => {
      expect(snapToGrid(23, 20)).toBe(20);
      expect(snapToGrid(25, 20)).toBe(20);
    });

    it('should handle different grid sizes', () => {
      expect(snapToGrid(23, 10, true)).toBe(20);
      expect(snapToGrid(23, 5, true)).toBe(25);
      expect(snapToGrid(23, 50, true)).toBe(0);
    });
  });

  describe('calculateAngle', () => {
    it('should calculate angle between two points', () => {
      const from: Point = { x: 0, y: 0 };
      const to: Point = { x: 1, y: 0 };
      expect(calculateAngle(from, to)).toBe(0);
    });

    it('should calculate 90 degree angle', () => {
      const from: Point = { x: 0, y: 0 };
      const to: Point = { x: 0, y: 1 };
      expect(calculateAngle(from, to)).toBeCloseTo(Math.PI / 2, 3);
    });

    it('should calculate 45 degree angle', () => {
      const from: Point = { x: 0, y: 0 };
      const to: Point = { x: 1, y: 1 };
      expect(calculateAngle(from, to)).toBeCloseTo(Math.PI / 4, 3);
    });

    it('should handle negative angles', () => {
      const from: Point = { x: 0, y: 0 };
      const to: Point = { x: 0, y: -1 };
      expect(calculateAngle(from, to)).toBeCloseTo(-Math.PI / 2, 3);
    });
  });

  describe('isWithinThreshold', () => {
    it('should return true when points are within threshold', () => {
      const p1: Point = { x: 0, y: 0 };
      const p2: Point = { x: 3, y: 4 };
      expect(isWithinThreshold(p1, p2, 6)).toBe(true);
    });

    it('should return false when points are outside threshold', () => {
      const p1: Point = { x: 0, y: 0 };
      const p2: Point = { x: 3, y: 4 };
      expect(isWithinThreshold(p1, p2, 4)).toBe(false);
    });

    it('should return true when points are exactly at threshold', () => {
      const p1: Point = { x: 0, y: 0 };
      const p2: Point = { x: 3, y: 4 };
      expect(isWithinThreshold(p1, p2, 5)).toBe(true);
    });

    it('should handle zero threshold', () => {
      const p1: Point = { x: 0, y: 0 };
      const p2: Point = { x: 0, y: 0 };
      expect(isWithinThreshold(p1, p2, 0)).toBe(true);
    });
  });
}); 
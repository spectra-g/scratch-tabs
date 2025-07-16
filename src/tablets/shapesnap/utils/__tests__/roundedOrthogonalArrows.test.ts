import { detectShape } from "../shapeDetection";
import { Point } from "../../types";

// Helper function to create a more realistic drawing path with interpolated points
const createDrawingPath = (keyPoints: Point[]): Point[] => {
  const path: Point[] = [];
  
  for (let i = 0; i < keyPoints.length - 1; i++) {
    const start = keyPoints[i];
    const end = keyPoints[i + 1];
    
    // Add start point
    path.push(start);
    
    // Add interpolated points between start and end
    const steps = 8; // More points for realistic drawing
    for (let j = 1; j < steps; j++) {
      const t = j / steps;
      const x = start.x + (end.x - start.x) * t;
      const y = start.y + (end.y - start.y) * t;
      path.push({ x, y });
    }
  }
  
  // Add final point
  path.push(keyPoints[keyPoints.length - 1]);
  
  return path;
};

describe("Rounded Orthogonal Arrow Detection", () => {
  describe("Detection with corner radius", () => {
    it("should detect simple L-shaped orthogonal arrow with cornerRadius", () => {
      const keyPoints: Point[] = [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 50, y: 50 }
      ];
      const points = createDrawingPath(keyPoints);
      
      const result = detectShape(points);
      
      expect(result).toEqual({
        type: "orthogonal-arrow",
        points: expect.arrayContaining([
          { x: 0, y: 0 },
          { x: 50, y: 0 },
          { x: 50, y: 50 }
        ]),
        cornerRadius: 8
      });
    });

    it("should detect U-shaped orthogonal arrow with cornerRadius", () => {
      const keyPoints: Point[] = [
        { x: 0, y: 0 },
        { x: 0, y: 50 },
        { x: 50, y: 50 },
        { x: 50, y: 0 }
      ];
      const points = createDrawingPath(keyPoints);
      
      const result = detectShape(points);
      
      expect(result).toEqual({
        type: "orthogonal-arrow",
        points: expect.arrayContaining([
          { x: 0, y: 0 },
          { x: 0, y: 50 },
          { x: 50, y: 50 },
          { x: 50, y: 0 }
        ]),
        cornerRadius: 8
      });
    });

    it("should detect Z-shaped orthogonal arrow with cornerRadius", () => {
      const keyPoints: Point[] = [
        { x: 0, y: 0 },
        { x: 40, y: 0 },
        { x: 40, y: 30 },
        { x: 80, y: 30 }
      ];
      const points = createDrawingPath(keyPoints);
      
      const result = detectShape(points);
      
      expect(result).toEqual({
        type: "orthogonal-arrow",
        points: expect.arrayContaining([
          { x: 0, y: 0 },
          { x: 40, y: 0 },
          { x: 40, y: 30 },
          { x: 80, y: 30 }
        ]),
        cornerRadius: 8
      });
    });

    it("should detect complex orthogonal arrow with multiple corners", () => {
      const keyPoints: Point[] = [
        { x: 0, y: 0 },
        { x: 60, y: 0 },
        { x: 60, y: 30 },
        { x: 120, y: 30 },
        { x: 120, y: 60 }
      ];
      const points = createDrawingPath(keyPoints);
      
      const result = detectShape(points);
      
      expect(result).not.toBeNull();
      // For complex shapes with multiple corners, it might be detected as curved-arrow or orthogonal-arrow
      expect(["orthogonal-arrow", "curved-arrow"]).toContain(result?.type);
      if (result?.type === "orthogonal-arrow") {
        expect(result).toHaveProperty("cornerRadius", 8);
      }
    });
  });

  describe("Detection accuracy", () => {
    it("should detect right-angled corners accurately", () => {
      const keyPoints: Point[] = [
        { x: 10, y: 10 },
        { x: 60, y: 10 },
        { x: 60, y: 60 }
      ];
      const points = createDrawingPath(keyPoints);
      
      const result = detectShape(points);
      
      expect(result).toEqual({
        type: "orthogonal-arrow",
        points: [
          { x: 10, y: 10 },
          { x: 60, y: 10 },
          { x: 60, y: 60 }
        ],
        cornerRadius: 8
      });
    });

    it("should detect horizontal-to-vertical transitions", () => {
      const keyPoints: Point[] = [
        { x: 0, y: 100 },
        { x: 100, y: 100 },
        { x: 100, y: 0 }
      ];
      const points = createDrawingPath(keyPoints);
      
      const result = detectShape(points);
      
      expect(result).toEqual({
        type: "orthogonal-arrow",
        points: [
          { x: 0, y: 100 },
          { x: 100, y: 100 },
          { x: 100, y: 0 }
        ],
        cornerRadius: 8
      });
    });

    it("should detect vertical-to-horizontal transitions", () => {
      const keyPoints: Point[] = [
        { x: 50, y: 0 },
        { x: 50, y: 75 },
        { x: 150, y: 75 }
      ];
      const points = createDrawingPath(keyPoints);
      
      const result = detectShape(points);
      
      expect(result).toEqual({
        type: "orthogonal-arrow",
        points: [
          { x: 50, y: 0 },
          { x: 50, y: 75 },
          { x: 150, y: 75 }
        ],
        cornerRadius: 8
      });
    });
  });

  describe("Edge cases", () => {
    it("should still detect orthogonal arrows with slight imperfections", () => {
      // Points with slight deviations that should still be detected
      const keyPoints: Point[] = [
        { x: 0, y: 0 },
        { x: 49, y: 1 }, // Slight deviation
        { x: 51, y: 50 } // Slight deviation
      ];
      const points = createDrawingPath(keyPoints);
      
      const result = detectShape(points);
      
      expect(result).not.toBeNull();
      if (result) {
        expect(result.type).toBe("orthogonal-arrow");
        expect(result).toHaveProperty("cornerRadius", 8);
      }
    });

    it("should not detect shapes that are too curved to be orthogonal", () => {
      const keyPoints: Point[] = [
        { x: 0, y: 0 },
        { x: 25, y: 25 }, // 45-degree angle, too curved
        { x: 50, y: 50 }
      ];
      const points = createDrawingPath(keyPoints);
      
      const result = detectShape(points);
      
      expect(result?.type).not.toBe("orthogonal-arrow");
    });

    it("should not detect shapes with segments too short", () => {
      const keyPoints: Point[] = [
        { x: 0, y: 0 },
        { x: 10, y: 0 }, // Very short segment
        { x: 10, y: 5 }  // Very short segment
      ];
      const points = createDrawingPath(keyPoints);
      
      const result = detectShape(points);
      
      expect(result?.type).not.toBe("orthogonal-arrow");
    });
  });

  describe("Different orientations", () => {
    it("should detect orthogonal arrows in all four directions", () => {
      // Right then down
      const rightDown = [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 50, y: 50 }
      ];
      
      // Down then right
      const downRight = [
        { x: 0, y: 0 },
        { x: 0, y: 50 },
        { x: 50, y: 50 }
      ];
      
      // Left then down
      const leftDown = [
        { x: 50, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 50 }
      ];
      
      // Up then right
      const upRight = [
        { x: 0, y: 50 },
        { x: 0, y: 0 },
        { x: 50, y: 0 }
      ];
      
      const orientations = [rightDown, downRight, leftDown, upRight];
      
      orientations.forEach((keyPoints, index) => {
        const points = createDrawingPath(keyPoints);
        const result = detectShape(points);
        expect(result?.type).toBe("orthogonal-arrow");
        expect(result).toHaveProperty("cornerRadius", 8);
      });
    });
  });

  describe("Integration with arrow tips", () => {
    it("should detect orthogonal arrows that will have arrow tips", () => {
      const keyPoints: Point[] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 }
      ];
      const points = createDrawingPath(keyPoints);
      
      const result = detectShape(points);
      
      expect(result).toEqual({
        type: "orthogonal-arrow",
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 100 }
        ],
        cornerRadius: 8
      });
    });
  });

  describe("Minimum viable shapes", () => {
    it("should detect minimal L-shape", () => {
      const keyPoints: Point[] = [
        { x: 0, y: 0 },
        { x: 25, y: 0 },
        { x: 25, y: 25 }
      ];
      const points = createDrawingPath(keyPoints);
      
      const result = detectShape(points);
      
      expect(result).toEqual({
        type: "orthogonal-arrow",
        points: [
          { x: 0, y: 0 },
          { x: 25, y: 0 },
          { x: 25, y: 25 }
        ],
        cornerRadius: 8
      });
    });
  });
});
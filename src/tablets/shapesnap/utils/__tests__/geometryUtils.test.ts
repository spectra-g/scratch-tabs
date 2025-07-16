import { createRoundedOrthogonalPath } from "../geometryUtils";
import { Point } from "../../types";

describe("createRoundedOrthogonalPath", () => {
  describe("Basic functionality", () => {
    it("should return empty string for empty points array", () => {
      const result = createRoundedOrthogonalPath([], 8);
      expect(result).toBe("");
    });

    it("should return simple path for single point", () => {
      const points: Point[] = [{ x: 10, y: 10 }];
      const result = createRoundedOrthogonalPath(points, 8);
      expect(result).toBe("");
    });

    it("should return straight line for two points", () => {
      const points: Point[] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 }
      ];
      const result = createRoundedOrthogonalPath(points, 8);
      expect(result).toBe("M 0,0 L 100,0");
    });

    it("should return straight line when radius is zero", () => {
      const points: Point[] = [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 50, y: 50 }
      ];
      const result = createRoundedOrthogonalPath(points, 0);
      expect(result).toBe("M 0,0 L 50,0 L 50,50");
    });

    it("should return straight line when radius is negative", () => {
      const points: Point[] = [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 50, y: 50 }
      ];
      const result = createRoundedOrthogonalPath(points, -5);
      expect(result).toBe("M 0,0 L 50,0 L 50,50");
    });
  });

  describe("Rounded corners", () => {
    it("should create rounded corner for L-shaped path", () => {
      const points: Point[] = [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 50, y: 50 }
      ];
      const result = createRoundedOrthogonalPath(points, 8);
      
      expect(result).toContain("M 0,0");
      expect(result).toContain("L 42,0");
      expect(result).toContain("Q 50,0 50,8");
      expect(result).toContain("L 50,50");
    });

    it("should create rounded corners for U-shaped path", () => {
      const points: Point[] = [
        { x: 0, y: 0 },
        { x: 0, y: 50 },
        { x: 50, y: 50 },
        { x: 50, y: 0 }
      ];
      const result = createRoundedOrthogonalPath(points, 8);
      
      expect(result).toContain("M 0,0");
      expect(result).toContain("Q 0,50");
      expect(result).toContain("Q 50,50");
      expect(result).toContain("L 50,0");
    });

    it("should create rounded corners for Z-shaped path", () => {
      const points: Point[] = [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 50, y: 25 },
        { x: 100, y: 25 }
      ];
      const result = createRoundedOrthogonalPath(points, 8);
      
      expect(result).toContain("M 0,0");
      expect(result).toContain("Q 50,0");
      expect(result).toContain("Q 50,25");
      expect(result).toContain("L 100,25");
    });
  });

  describe("Adaptive radius", () => {
    it("should reduce radius when segment is shorter than 2x radius", () => {
      const points: Point[] = [
        { x: 0, y: 0 },
        { x: 10, y: 0 }, // Short segment (10 units)
        { x: 10, y: 50 }
      ];
      const result = createRoundedOrthogonalPath(points, 8);
      
      // Should use radius of 5 (half of 10) instead of 8
      expect(result).toContain("L 5,0");
      expect(result).toContain("Q 10,0 10,5");
    });

    it("should handle very short segments gracefully", () => {
      const points: Point[] = [
        { x: 0, y: 0 },
        { x: 4, y: 0 }, // Very short segment (4 units)
        { x: 4, y: 10 }
      ];
      const result = createRoundedOrthogonalPath(points, 8);
      
      // Should use radius of 2 (half of 4) instead of 8
      expect(result).toContain("L 2,0");
      expect(result).toContain("Q 4,0 4,2");
    });
  });

  describe("Complex orthogonal paths", () => {
    it("should handle path with multiple corners", () => {
      const points: Point[] = [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 50, y: 25 },
        { x: 75, y: 25 },
        { x: 75, y: 50 }
      ];
      const result = createRoundedOrthogonalPath(points, 8);
      
      expect(result).toContain("M 0,0");
      expect(result).toContain("Q 50,0");
      expect(result).toContain("Q 50,25");
      expect(result).toContain("Q 75,25");
      expect(result).toContain("L 75,50");
    });

    it("should handle rectangular path", () => {
      const points: Point[] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 50 },
        { x: 0, y: 50 },
        { x: 0, y: 0 }
      ];
      const result = createRoundedOrthogonalPath(points, 8);
      
      expect(result).toContain("M 0,0");
      expect(result).toContain("Q 100,0");
      expect(result).toContain("Q 100,50");
      expect(result).toContain("Q 0,50");
      expect(result).toContain("L 0,0");
    });
  });

  describe("Edge cases", () => {
    it("should handle zero-length segments", () => {
      const points: Point[] = [
        { x: 0, y: 0 },
        { x: 0, y: 0 }, // Duplicate point
        { x: 50, y: 0 }
      ];
      const result = createRoundedOrthogonalPath(points, 8);
      
      // Should still work despite duplicate point
      expect(result).toContain("M 0,0");
      expect(result).toContain("L 50,0");
    });

    it("should handle collinear points", () => {
      const points: Point[] = [
        { x: 0, y: 0 },
        { x: 25, y: 0 },
        { x: 50, y: 0 }
      ];
      const result = createRoundedOrthogonalPath(points, 8);
      
      // Should create a curved path even for collinear points
      expect(result).toContain("M 0,0");
      expect(result).toContain("Q 25,0");
      expect(result).toContain("L 50,0");
    });
  });

  describe("Different corner angles", () => {
    it("should handle 90-degree corner (right turn)", () => {
      const points: Point[] = [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 50, y: 50 }
      ];
      const result = createRoundedOrthogonalPath(points, 8);
      
      expect(result).toContain("Q 50,0 50,8");
    });

    it("should handle 90-degree corner (left turn)", () => {
      const points: Point[] = [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 50, y: -50 }
      ];
      const result = createRoundedOrthogonalPath(points, 8);
      
      expect(result).toContain("Q 50,0 50,-8");
    });

    it("should handle 90-degree corner (upward turn)", () => {
      const points: Point[] = [
        { x: 0, y: 0 },
        { x: 0, y: 50 },
        { x: 50, y: 50 }
      ];
      const result = createRoundedOrthogonalPath(points, 8);
      
      expect(result).toContain("Q 0,50 8,50");
    });

    it("should handle 90-degree corner (downward turn)", () => {
      const points: Point[] = [
        { x: 0, y: 0 },
        { x: 0, y: 50 },
        { x: -50, y: 50 }
      ];
      const result = createRoundedOrthogonalPath(points, 8);
      
      expect(result).toContain("Q 0,50 -8,50");
    });
  });

  describe("Variable radius", () => {
    it("should work with different radius values", () => {
      const points: Point[] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 }
      ];
      
      const result4 = createRoundedOrthogonalPath(points, 4);
      expect(result4).toContain("L 96,0");
      expect(result4).toContain("Q 100,0 100,4");
      
      const result12 = createRoundedOrthogonalPath(points, 12);
      expect(result12).toContain("L 88,0");
      expect(result12).toContain("Q 100,0 100,12");
    });
  });
});
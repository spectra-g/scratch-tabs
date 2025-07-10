import { shapeRegistry, ShapeRegistry } from "../core/ShapeRegistry";
import { Shape, ShapeType } from "../types";

describe("ShapeRegistry", () => {
  let registry: ShapeRegistry;

  beforeEach(() => {
    registry = ShapeRegistry.getInstance();
  });

  describe("Shape Definitions", () => {
    it("should have definitions for all basic shape types", () => {
      const expectedShapes: ShapeType[] = [
        "line",
        "rectangle",
        "circle",
        "diamond",
        "triangle",
        "square",
        "text",
        "arrow",
      ];

      expectedShapes.forEach((shapeType) => {
        const definition = registry.getShapeDefinition(shapeType);
        expect(definition).toBeDefined();
        expect(definition?.type).toBe(shapeType);
      });
    });

    it("should return undefined for unknown shape types", () => {
      const definition = registry.getShapeDefinition("unknown" as ShapeType);
      expect(definition).toBeUndefined();
    });
  });

  describe("Shape Capabilities", () => {
    it("should define capabilities for all shape types", () => {
      const shapeTypes = registry.getAllShapeTypes();

      shapeTypes.forEach((shapeType) => {
        const capabilities = registry.getShapeCapabilities(shapeType);
        expect(capabilities).toBeDefined();
        expect(typeof capabilities?.canMove).toBe("boolean");
        expect(typeof capabilities?.canResize).toBe("boolean");
        expect(typeof capabilities?.canRotate).toBe("boolean");
      });
    });

    it("should correctly identify shape capabilities", () => {
      const lineCapabilities = registry.getShapeCapabilities("line");
      expect(lineCapabilities?.canMove).toBe(true);
      expect(lineCapabilities?.canResize).toBe(true);
      expect(lineCapabilities?.supportsMultipoint).toBe(true);
      expect(lineCapabilities?.supportsFill).toBe(false);

      const rectangleCapabilities = registry.getShapeCapabilities("rectangle");
      expect(rectangleCapabilities?.canMove).toBe(true);
      expect(rectangleCapabilities?.canResize).toBe(true);
      expect(rectangleCapabilities?.supportsFill).toBe(true);
      expect(rectangleCapabilities?.supportsMultipoint).toBe(false);
    });
  });

  describe("Shape Creation", () => {
    it("should create default shapes with all required properties", () => {
      const rectangle = registry.createDefaultShape("rectangle");

      expect(rectangle.type).toBe("rectangle");
      expect(rectangle.id).toBeDefined();
      expect(rectangle.zIndex).toBeDefined();
      expect(rectangle.style).toBeDefined();
      expect(rectangle.x).toBeDefined();
      expect(rectangle.y).toBeDefined();
      expect(rectangle.width).toBeDefined();
      expect(rectangle.height).toBeDefined();
    });

    it("should apply overrides when creating shapes", () => {
      const rectangle = registry.createDefaultShape("rectangle", {
        x: 100,
        y: 200,
        width: 300,
        height: 400,
      });

      expect(rectangle.x).toBe(100);
      expect(rectangle.y).toBe(200);
      expect(rectangle.width).toBe(300);
      expect(rectangle.height).toBe(400);
    });

    it("should throw error for unknown shape types", () => {
      expect(() => {
        registry.createDefaultShape("unknown" as ShapeType);
      }).toThrow("Unknown shape type: unknown");
    });
  });

  describe("Shape Validation", () => {
    it("should validate complete shapes", () => {
      const validRectangle = registry.createDefaultShape("rectangle") as Shape;
      expect(registry.validateShape(validRectangle)).toBe(true);
    });

    it("should reject invalid shapes", () => {
      const invalidRectangle = {
        id: "test",
        type: "rectangle",
        style: { stroke: "#000" },
        zIndex: 1,
        // Missing required properties: x, y, width, height
      } as Shape;

      expect(registry.validateShape(invalidRectangle)).toBe(false);
    });
  });

  describe("Operation Support", () => {
    it("should correctly identify supported operations", () => {
      const rectangle = registry.createDefaultShape("rectangle") as Shape;

      expect(registry.canPerformOperation(rectangle, "move")).toBe(true);
      expect(registry.canPerformOperation(rectangle, "resize")).toBe(true);
      expect(registry.canPerformOperation(rectangle, "copy")).toBe(true);
      expect(registry.canPerformOperation(rectangle, "delete")).toBe(true);
    });

    it("should return supported operations list", () => {
      const operations = registry.getSupportedOperations("rectangle");
      expect(operations).toContain("move");
      expect(operations).toContain("resize");
      expect(operations).toContain("copy");
      expect(operations).toContain("delete");
    });
  });

  describe("Shape Type Specific Properties", () => {
    it("should create line shapes with correct properties", () => {
      const line = registry.createDefaultShape("line");

      expect(line.type).toBe("line");
      expect(line.points).toBeDefined();
      expect(Array.isArray(line.points)).toBe(true);
      expect(line.arrowTipEnd).toBeDefined();
      expect(line.arrowTipStart).toBeDefined();
    });

    it("should create circle shapes with correct properties", () => {
      const circle = registry.createDefaultShape("circle");

      expect(circle.type).toBe("circle");
      expect(circle.x).toBeDefined();
      expect(circle.y).toBeDefined();
      expect(circle.radius).toBeDefined();
      expect(typeof circle.radius).toBe("number");
    });

    it("should create text shapes with correct properties", () => {
      const text = registry.createDefaultShape("text");

      expect(text.type).toBe("text");
      expect(text.x).toBeDefined();
      expect(text.y).toBeDefined();
      expect(text.text).toBeDefined();
      expect(text.fontSize).toBeDefined();
    });
  });

  describe("Future Feature Support", () => {
    it("should identify shapes that support fill colors", () => {
      const fillSupportedTypes = [
        "rectangle",
        "circle",
        "square",
        "diamond",
        "triangle",
      ];
      const fillNotSupportedTypes = ["line", "text", "arrow"];

      fillSupportedTypes.forEach((type) => {
        const capabilities = registry.getShapeCapabilities(type as ShapeType);
        expect(capabilities?.supportsFill).toBe(true);
      });

      fillNotSupportedTypes.forEach((type) => {
        const capabilities = registry.getShapeCapabilities(type as ShapeType);
        expect(capabilities?.supportsFill).toBe(false);
      });
    });

    it("should identify shapes that support borders", () => {
      const borderSupportedTypes = [
        "rectangle",
        "circle",
        "square",
        "diamond",
        "triangle",
        "line",
        "arrow",
      ];
      const borderNotSupportedTypes = ["text"];

      borderSupportedTypes.forEach((type) => {
        const capabilities = registry.getShapeCapabilities(type as ShapeType);
        expect(capabilities?.supportsBorder).toBe(true);
      });

      borderNotSupportedTypes.forEach((type) => {
        const capabilities = registry.getShapeCapabilities(type as ShapeType);
        expect(capabilities?.supportsBorder).toBe(false);
      });
    });
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance", () => {
      const instance1 = ShapeRegistry.getInstance();
      const instance2 = ShapeRegistry.getInstance();

      expect(instance1).toBe(instance2);
    });
  });
});

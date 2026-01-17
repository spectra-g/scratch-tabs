import { describe, it, expect, beforeEach } from "@jest/globals";
import { operationRegistry } from "../OperationRegistry";
import { OperationDefinition, OperationCategory } from "../types";

describe("OperationRegistry", () => {
  beforeEach(() => {
    // Clear the registry before each test
    operationRegistry.clear();
  });

  describe("Operation Registration", () => {
    it("should register a valid operation", () => {
      const operation: OperationDefinition = {
        id: "test.operation",
        name: "Test Operation",
        description: "A test operation",
        categories: ["test"],
        parameters: [],
        execute: (input) => input.toUpperCase(),
      };

      operationRegistry.register(operation);

      expect(operationRegistry.has("test.operation")).toBe(true);
      expect(operationRegistry.getById("test.operation")).toEqual(operation);
    });

    it("should not register duplicate operations", () => {
      const operation: OperationDefinition = {
        id: "test.duplicate",
        name: "Duplicate",
        description: "First registration",
        categories: ["test"],
        parameters: [],
        execute: (input) => input,
      };

      operationRegistry.register(operation);
      operationRegistry.register({
        ...operation,
        description: "Second registration",
      });

      // Should still have the first registration
      expect(operationRegistry.getById("test.duplicate")?.description).toBe(
        "First registration",
      );
      expect(operationRegistry.size).toBe(1);
    });

    it("should add uncategorized to operations without categories", () => {
      const operation: OperationDefinition = {
        id: "test.nocategory",
        name: "No Category",
        description: "Operation without categories",
        categories: [],
        parameters: [],
        execute: (input) => input,
      };

      operationRegistry.register(operation);

      const registered = operationRegistry.getById("test.nocategory");
      expect(registered?.categories).toContain("uncategorized");
    });

    it("should register multiple operations at once", () => {
      const operations: OperationDefinition[] = [
        {
          id: "test.op1",
          name: "Op 1",
          description: "First",
          categories: ["test"],
          parameters: [],
          execute: (input) => input,
        },
        {
          id: "test.op2",
          name: "Op 2",
          description: "Second",
          categories: ["test"],
          parameters: [],
          execute: (input) => input,
        },
      ];

      operationRegistry.registerAll(operations);

      expect(operationRegistry.size).toBe(2);
      expect(operationRegistry.has("test.op1")).toBe(true);
      expect(operationRegistry.has("test.op2")).toBe(true);
    });
  });

  describe("Category Registration", () => {
    it("should register a category", () => {
      const category: OperationCategory = {
        id: "test",
        name: "Test Category",
        icon: "Test",
        order: 1,
      };

      operationRegistry.registerCategory(category);

      const categories = operationRegistry.getAllCategories();
      expect(categories).toHaveLength(1);
      expect(categories[0].name).toBe("Test Category");
    });

    it("should sort categories by order", () => {
      operationRegistry.registerCategory({
        id: "cat3",
        name: "Third",
        order: 30,
      });
      operationRegistry.registerCategory({
        id: "cat1",
        name: "First",
        order: 10,
      });
      operationRegistry.registerCategory({
        id: "cat2",
        name: "Second",
        order: 20,
      });

      const categories = operationRegistry.getAllCategories();
      expect(categories[0].name).toBe("First");
      expect(categories[1].name).toBe("Second");
      expect(categories[2].name).toBe("Third");
    });

    it("should allow updating existing categories", () => {
      operationRegistry.registerCategory({
        id: "test",
        name: "Original",
        order: 1,
      });
      operationRegistry.registerCategory({
        id: "test",
        name: "Updated",
        order: 2,
      });

      const categories = operationRegistry.getAllCategories();
      expect(categories).toHaveLength(1);
      expect(categories[0].name).toBe("Updated");
      expect(categories[0].order).toBe(2);
    });
  });

  describe("Category-Based Queries", () => {
    beforeEach(() => {
      operationRegistry.register({
        id: "json.format",
        name: "Format JSON",
        description: "Format",
        categories: ["json", "formatting"],
        parameters: [],
        execute: (input) => input,
      });
      operationRegistry.register({
        id: "json.minify",
        name: "Minify JSON",
        description: "Minify",
        categories: ["json", "formatting"],
        parameters: [],
        execute: (input) => input,
      });
      operationRegistry.register({
        id: "text.trim",
        name: "Trim",
        description: "Trim whitespace",
        categories: ["text"],
        parameters: [],
        execute: (input) => input.trim(),
      });
    });

    it("should get operations by category", () => {
      const jsonOps = operationRegistry.getByCategory("json");
      expect(jsonOps).toHaveLength(2);

      const textOps = operationRegistry.getByCategory("text");
      expect(textOps).toHaveLength(1);
    });

    it("should handle operations in multiple categories", () => {
      const formattingOps = operationRegistry.getByCategory("formatting");
      expect(formattingOps).toHaveLength(2);

      // Same operations should appear in both json and formatting
      const jsonOps = operationRegistry.getByCategory("json");
      expect(jsonOps).toHaveLength(2);
    });

    it("should return empty array for unknown category", () => {
      const unknown = operationRegistry.getByCategory("nonexistent");
      expect(unknown).toHaveLength(0);
    });

    it("should be case-insensitive for category lookup", () => {
      const jsonOps1 = operationRegistry.getByCategory("JSON");
      const jsonOps2 = operationRegistry.getByCategory("json");
      expect(jsonOps1).toHaveLength(jsonOps2.length);
    });
  });

  describe("Search", () => {
    beforeEach(() => {
      operationRegistry.register({
        id: "json.format",
        name: "Format JSON",
        description: "Pretty-print JSON with indentation",
        categories: ["json"],
        parameters: [],
        execute: (input) => input,
        keywords: ["pretty", "beautify"],
      });
      operationRegistry.register({
        id: "text.uppercase",
        name: "Uppercase",
        description: "Convert text to uppercase",
        categories: ["text"],
        parameters: [],
        execute: (input) => input.toUpperCase(),
        keywords: ["upper", "capital"],
      });
    });

    it("should search by name", () => {
      const results = operationRegistry.search("format");
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("json.format");
    });

    it("should search by description", () => {
      const results = operationRegistry.search("pretty");
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("json.format");
    });

    it("should search by keywords", () => {
      const results = operationRegistry.search("capital");
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("text.uppercase");
    });

    it("should search by category", () => {
      const results = operationRegistry.search("json");
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("json.format");
    });

    it("should be case-insensitive", () => {
      const results = operationRegistry.search("UPPERCASE");
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("text.uppercase");
    });

    it("should return all operations for empty query", () => {
      const results = operationRegistry.search("");
      expect(results).toHaveLength(2);
    });

    it("should prioritize name matches", () => {
      operationRegistry.register({
        id: "json.query",
        name: "JSON Query",
        description: "Format and query JSON",
        categories: ["json"],
        parameters: [],
        execute: (input) => input,
      });

      const results = operationRegistry.search("json");
      // Both match, but "JSON Query" starts with "json" while "Format JSON" just contains it
      expect(results[0].name).toBe("JSON Query");
    });
  });

  describe("Debug Info", () => {
    it("should return correct debug info", () => {
      operationRegistry.registerCategory({
        id: "json",
        name: "JSON",
        order: 1,
      });
      operationRegistry.register({
        id: "json.format",
        name: "Format",
        description: "Format JSON",
        categories: ["json"],
        parameters: [],
        execute: (input) => input,
        source: "format",
      });
      operationRegistry.register({
        id: "base64.encode",
        name: "Encode",
        description: "Encode Base64",
        categories: ["encoding"],
        parameters: [],
        execute: (input) => input,
        source: "tablet",
      });

      const info = operationRegistry.getDebugInfo();

      expect(info.operationCount).toBe(2);
      expect(info.categoryCount).toBe(1);
      expect(info.operationsByCategory["json"]).toBe(1);
      expect(info.operationsByCategory["encoding"]).toBe(1);
      expect(info.operationsBySource["format"]).toBe(1);
      expect(info.operationsBySource["tablet"]).toBe(1);
    });
  });

  describe("Subscription", () => {
    it("should notify subscribers on registration", () => {
      let notified = false;
      const unsubscribe = operationRegistry.subscribe(() => {
        notified = true;
      });

      operationRegistry.register({
        id: "test.op",
        name: "Test",
        description: "Test",
        categories: ["test"],
        parameters: [],
        execute: (input) => input,
      });

      unsubscribe();

      expect(notified).toBe(true);
    });

    it("should allow unsubscribing", () => {
      let callCount = 0;
      const unsubscribe = operationRegistry.subscribe(() => {
        callCount++;
      });

      operationRegistry.register({
        id: "test.op1",
        name: "Test 1",
        description: "Test",
        categories: ["test"],
        parameters: [],
        execute: (input) => input,
      });

      unsubscribe();

      operationRegistry.register({
        id: "test.op2",
        name: "Test 2",
        description: "Test",
        categories: ["test"],
        parameters: [],
        execute: (input) => input,
      });

      expect(callCount).toBe(1); // Only called once before unsubscribe
    });
  });
});
